"""
Upload API: Handles file upload, column detection, parsing, normalization,
and saving bet records to the database.
"""
import uuid
import io
from datetime import datetime
from typing import Optional

import pandas as pd
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.bet import Bet
from app.models.scan import Scan
from app.models.account import Account
from app.services.parser.column_mapper import ColumnMapper
from app.services.parser.normalizer import normalize_game_type, normalize_bet_choice, detect_category

router = APIRouter()
column_mapper = ColumnMapper()


def _read_file(content: bytes, filename: str, nrows: Optional[int] = None) -> pd.DataFrame:
    """Read uploaded file into a pandas DataFrame, with optional nrows for fast preview."""
    try:
        if filename.endswith('.csv'):
            return pd.read_csv(io.BytesIO(content), nrows=nrows)
        elif filename.endswith(('.xlsx', '.xls')):
            return pd.read_excel(io.BytesIO(content), nrows=nrows)
        else:
            raise HTTPException(400, f"Định dạng file không hỗ trợ: {filename}. Vui lòng dùng .csv hoặc .xlsx")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, f"Không thể đọc file {filename}: {str(e)}")


@router.post("/detect-columns")
async def detect_columns(file: UploadFile = File(...)):
    """
    Upload a file and auto-detect column mappings.
    Returns suggested mapping + confidence score for the user to review.
    Uses nrows=10 for ultra-fast header detection on large 50MB+ files.
    """
    content = await file.read()
    df = _read_file(content, file.filename, nrows=10)

    columns = df.columns.tolist()
    mapping = column_mapper.detect_mapping(columns)
    unmapped = column_mapper.get_unmapped_fields(mapping)
    confidence = column_mapper.get_confidence(mapping)

    # Show sample data for user to verify (sanitize NaNs for JSON compliance)
    sample = df.head(3).fillna("").to_dict(orient='records')

    return {
        "columns": columns,
        "suggested_mapping": mapping,
        "unmapped_fields": unmapped,
        "confidence": round(confidence, 2),
        "sample_data": sample,
        "total_rows": len(df),
    }


@router.post("")
async def upload_file(
    file: UploadFile = File(...),
    platform_name: str = Form(...),
    category: Optional[str] = Form("AUTO"),
    scan_id: Optional[str] = Form(None),
    column_mapping: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload a bet history file, parse it, normalize data, and save bets to DB.

    - file: CSV or Excel file with bet history
    - platform_name: Name of the betting platform (e.g., "Trang A")
    - category: 'CASINO', 'SPORTS', or 'AUTO' (auto-detected)
    - scan_id: Optional existing scan to attach bets to. If None, creates a new scan.
    - column_mapping: Optional JSON string of column mapping overrides.
    """
    import json

    content = await file.read()
    df = _read_file(content, file.filename)

    # Determine column mapping
    if column_mapping:
        mapping = json.loads(column_mapping)
    else:
        mapping = column_mapper.detect_mapping(df.columns.tolist())
        confidence = column_mapper.get_confidence(mapping)
        if confidence < 0.3:
            return {
                "error": "low_confidence",
                "message": "Không thể tự động nhận diện đủ cột. Vui lòng cung cấp column mapping.",
                "suggested_mapping": mapping,
                "confidence": round(confidence, 2),
                "columns": df.columns.tolist(),
            }

    # Create or use existing scan
    if not scan_id:
        scan_id = str(uuid.uuid4())
        scan = Scan(
            id=scan_id,
            name=f"Upload {file.filename}",
            category=category if category != "AUTO" else "CASINO",
            status="PENDING",
            platforms=[platform_name],
            total_bets=0,
            total_alerts=0,
            summary={},
        )
        db.add(scan)
        await db.flush()

    # Standard field normalization mapping
    FIELD_NORM_MAP = {
        'playerid': 'player_id', 'player_id': 'player_id', 'user': 'player_id', 'username': 'player_id',
        'roundid': 'round_id', 'round_id': 'round_id',
        'betchoice': 'bet_choice', 'bet_choice': 'bet_choice',
        'stake': 'stake', 'amount': 'stake',
        'timestamp': 'bet_timestamp', 'bet_timestamp': 'bet_timestamp', 'time': 'bet_timestamp',
        'ipaddress': 'ip_address', 'ip_address': 'ip_address', 'ip': 'ip_address',
        'provider': 'provider', 'platform': 'provider',
        'deviceid': 'device_id', 'device_id': 'device_id',
        'agentid': 'agent_id', 'agent_id': 'agent_id',
        'validbet': 'valid_bet', 'valid_bet': 'valid_bet',
        'payout': 'payout', 'win': 'payout',
        'tableid': 'table_id', 'table_id': 'table_id',
        'gametype': 'game_type', 'game_type': 'game_type',
        'bettypedetail': 'bet_type_detail', 'bet_type_detail': 'bet_type_detail',
        'result': 'result',
        'odds': 'odds',
        'eventname': 'event_name', 'event_name': 'event_name',
        'league': 'league',
    }

    # Build col_to_field: column_in_file -> standard_field_name
    col_to_field: dict[str, str] = {}
    if column_mapping:
        user_mapping = json.loads(column_mapping)
        for k, v in user_mapping.items():
            if not v or v == 'ignore':
                continue
            if k in df.columns:
                target_std = FIELD_NORM_MAP.get(str(v).lower().replace('_', '')) or str(v)
                col_to_field[k] = target_std
            elif v in df.columns:
                target_std = FIELD_NORM_MAP.get(str(k).lower().replace('_', '')) or str(k)
                col_to_field[v] = target_std
    else:
        detected = column_mapper.detect_mapping(df.columns.tolist())
        for std_name, col_name in detected.items():
            target_std = FIELD_NORM_MAP.get(str(std_name).lower().replace('_', '')) or str(std_name)
            col_to_field[col_name] = target_std

    bets_created = 0
    bets_to_add = []
    player_ids_seen = set()
    platforms_seen = set()
    errors = []

    # Fast conversion of DataFrame to list of dicts (avoids pandas iterrows overhead)
    records = df.to_dict(orient='records')
    now = datetime.now()

    for idx, row in enumerate(records):
        try:
            # Map columns
            mapped = {}
            for col, val in row.items():
                std_field = col_to_field.get(col)
                if std_field:
                    mapped[std_field] = val

            # Extract and normalize fields
            raw_game_type = str(mapped.get('game_type', ''))
            raw_bet_choice = str(mapped.get('bet_choice', ''))

            game_type = normalize_game_type(raw_game_type)
            bet_choice_normalized = normalize_bet_choice(raw_bet_choice)

            # Parse timestamp
            raw_ts = mapped.get('bet_timestamp')
            bet_timestamp = now
            if raw_ts:
                if isinstance(raw_ts, str):
                    for fmt in ['%Y-%m-%dT%H:%M:%S', '%Y-%m-%d %H:%M:%S', '%Y/%m/%d %H:%M:%S',
                                '%d/%m/%Y %H:%M:%S', '%m/%d/%Y %H:%M:%S', '%Y-%m-%dT%H:%M:%S.%f']:
                        try:
                            bet_timestamp = datetime.strptime(raw_ts, fmt)
                            break
                        except ValueError:
                            continue
                elif isinstance(raw_ts, datetime):
                    bet_timestamp = raw_ts

            # Parse numeric fields
            try:
                stake = float(mapped.get('stake', 0) or 0)
            except (ValueError, TypeError):
                stake = 0.0

            try:
                payout = float(mapped.get('payout', 0) or 0)
            except (ValueError, TypeError):
                payout = 0.0

            try:
                odds = float(mapped.get('odds', 0) or 0)
            except (ValueError, TypeError):
                odds = 0.0

            bet_category = category if category and category != "AUTO" else detect_category(game_type)
            event_name = str(mapped.get('event_name', '') or '')
            league = str(mapped.get('league', '') or '')

            player_id = str(mapped.get('player_id', f'unknown_{idx}') or f'unknown_{idx}').strip()
            player_ids_seen.add(player_id)

            ip_address = str(mapped.get('ip_address', '') or '').strip()
            device_id = str(mapped.get('device_id', '') or '').strip()
            agent_id = str(mapped.get('agent_id', '') or '').strip()
            bet_type_detail = str(mapped.get('bet_type_detail', '') or '').strip()
            
            try:
                valid_bet = float(mapped.get('valid_bet', stake) or stake)
            except (ValueError, TypeError):
                valid_bet = stake

            row_provider = str(mapped.get('provider', '') or '').strip()
            if platform_name in ['MULTI', 'ALL', 'Tất cả sảnh gộp chung', 'Auto']:
                actual_platform = row_provider if row_provider and row_provider.lower() not in ['unknown', '', 'none', 'nan'] else 'Tổng Hợp'
                actual_provider = actual_platform
            else:
                actual_platform = platform_name
                actual_provider = row_provider if row_provider and row_provider.lower() not in ['unknown', '', 'none', 'nan'] else platform_name

            platforms_seen.add(actual_platform)

            bet = Bet(
                id=str(uuid.uuid4()),
                scan_id=scan_id,
                platform=actual_platform,
                category=bet_category,
                provider=actual_provider,
                game_type=game_type,
                event_name=event_name,
                league=league,
                table_id=str(mapped.get('table_id', '')),
                round_id=str(mapped.get('round_id', '')),
                player_id=player_id,
                bet_choice=raw_bet_choice,
                bet_choice_normalized=bet_choice_normalized,
                odds=odds,
                stake=stake,
                valid_bet=valid_bet,
                payout=payout,
                bet_timestamp=bet_timestamp,
                ip_address=ip_address if ip_address else None,
                device_id=device_id if device_id else None,
                agent_id=agent_id if agent_id else None,
                bet_type_detail=bet_type_detail if bet_type_detail else None,
                result=str(mapped.get('result', 'PENDING')),
                raw_data=row,
            )
            bets_to_add.append(bet)

        except Exception as e:
            errors.append({"row": idx, "error": str(e)})

    # High-speed batch insertion
    for i in range(0, len(bets_to_add), 2000):
        db.add_all(bets_to_add[i:i+2000])
        await db.flush()

    bets_created = len(bets_to_add)

    # Update scan
    scan_result = await db.execute(select(Scan).where(Scan.id == scan_id))
    scan_obj = scan_result.scalar_one_or_none()
    if scan_obj:
        scan_obj.total_bets = (scan_obj.total_bets or 0) + bets_created
        if platforms_seen:
            existing_platforms = set(scan_obj.platforms or [])
            existing_platforms.update(platforms_seen)
            scan_obj.platforms = list(existing_platforms)
        elif platform_name not in (scan_obj.platforms or []):
            platforms = list(scan_obj.platforms or [])
            platforms.append(platform_name)
            scan_obj.platforms = platforms

    # Batch upsert accounts for seen players
    pids_list = list(player_ids_seen)
    for i in range(0, len(pids_list), 500):
        batch_pids = pids_list[i:i+500]
        acc_stmt = select(Account).where(Account.player_id.in_(batch_pids))
        existing_accs = (await db.execute(acc_stmt)).scalars().all()
        existing_map = {a.player_id: a for a in existing_accs}

        for pid in batch_pids:
            if pid in existing_map:
                acc = existing_map[pid]
                acc.last_seen = datetime.utcnow()
                if platform_name not in (acc.platforms or []):
                    platforms = list(acc.platforms or [])
                    platforms.append(platform_name)
                    acc.platforms = platforms
            else:
                new_acc = Account(
                    id=str(uuid.uuid4()),
                    player_id=pid,
                    platforms=[platform_name],
                    total_bets=0,
                    total_alerts=0,
                    risk_score=0,
                    risk_level="SAFE",
                    first_seen=datetime.utcnow(),
                    last_seen=datetime.utcnow(),
                )
                db.add(new_acc)
        await db.flush()

    await db.commit()

    return {
        "scan_id": scan_id,
        "platform": platform_name,
        "filename": file.filename,
        "bets_created": bets_created,
        "players_found": len(player_ids_seen),
        "mapping_used": mapping,
        "errors": errors[:10],  # Show first 10 errors max
    }
