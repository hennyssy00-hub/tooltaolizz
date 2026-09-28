"""
arbitrage.py — API endpoints cho quét đối đả / arbitrage.

Endpoints:
  POST /api/arbitrage/upload     — Upload file game của 1 đài
  POST /api/arbitrage/scan       — Chạy quét đối đả
  GET  /api/arbitrage/results    — Lấy kết quả quét gần nhất
  GET  /api/arbitrage/download/{file_type} — Download XLSX
"""

from __future__ import annotations

import os
import json
import uuid
import shutil
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse, JSONResponse

from ..services.arbitrage.data_loader import (
    load_platform_file,
    aggregate_round_bets,
    RoundBets,
)
from ..services.arbitrage.detector import ArbitrageDetector, DetectionResult
from ..services.arbitrage.report import generate_report
from ..services.arbitrage.rules import display_platform

router = APIRouter(prefix="/api/arbitrage", tags=["arbitrage"])

# ---------------------------------------------------------------------------
# In-memory storage (cho single-instance deployment)
# ---------------------------------------------------------------------------

# Lưu file đã upload: {session_id: {platform_name: file_path}}
_sessions: dict[str, dict] = {}

# Kết quả quét gần nhất
_last_result: dict | None = None
_last_report_paths: dict[str, str] | None = None

# Upload directory
_UPLOAD_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "uploads", "arbitrage"
)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/session")
async def create_session():
    """Tạo session mới để upload nhiều file."""
    session_id = str(uuid.uuid4())[:8]
    _sessions[session_id] = {
        "platforms": {},
        "created_at": datetime.now().isoformat(),
    }
    return {"session_id": session_id}


@router.post("/upload")
async def upload_platform_file(
    file: UploadFile = File(...),
    platform_name: str = Form(...),
    session_id: str = Form(...),
    column_mapping: Optional[str] = Form(None),
):
    """Upload file game của 1 đài.

    Args:
        file: File Excel (.xlsx/.xls) hoặc CSV
        platform_name: Tên đài (ví dụ: "22", "87", "AG")
        session_id: Session ID từ /session
        column_mapping: JSON string mapping cột (optional)
    """
    if session_id not in _sessions:
        raise HTTPException(status_code=404, detail="Session không tồn tại")

    # Validate file type
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in (".xlsx", ".xls", ".csv"):
        raise HTTPException(
            status_code=400,
            detail=f"Chỉ hỗ trợ file .xlsx, .xls, .csv. Nhận được: {ext}"
        )

    # Save file
    session_dir = os.path.join(_UPLOAD_DIR, session_id)
    os.makedirs(session_dir, exist_ok=True)

    safe_name = f"{platform_name}_{uuid.uuid4().hex[:6]}{ext}"
    file_path = os.path.join(session_dir, safe_name)

    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)

    # Parse column mapping
    col_map = None
    if column_mapping:
        try:
            col_map = json.loads(column_mapping)
        except json.JSONDecodeError:
            pass

    # Try loading to validate
    try:
        records = load_platform_file(
            file_path=file_path,
            platform_name=platform_name,
            column_mapping=col_map,
        )
    except ValueError as e:
        os.remove(file_path)
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        os.remove(file_path)
        raise HTTPException(
            status_code=400,
            detail=f"Lỗi đọc file: {str(e)}"
        )

    # Store in session
    _sessions[session_id]["platforms"][platform_name] = {
        "file_path": file_path,
        "column_mapping": col_map,
        "filename": file.filename,
        "total_records": len(records),
        "unique_accounts": len({r.account for r in records}),
        "unique_rounds": len({r.round_id for r in records}),
    }

    disp = display_platform(platform_name)

    return {
        "status": "ok",
        "platform": platform_name,
        "display_name": disp,
        "filename": file.filename,
        "total_records": len(records),
        "unique_accounts": len({r.account for r in records}),
        "unique_rounds": len({r.round_id for r in records}),
        "session_platforms": list(_sessions[session_id]["platforms"].keys()),
    }


@router.get("/session/{session_id}")
async def get_session(session_id: str):
    """Xem thông tin session hiện tại."""
    if session_id not in _sessions:
        raise HTTPException(status_code=404, detail="Session không tồn tại")

    session = _sessions[session_id]
    platforms_info = {}
    for name, info in session["platforms"].items():
        platforms_info[name] = {
            "display_name": display_platform(name),
            "filename": info["filename"],
            "total_records": info["total_records"],
            "unique_accounts": info["unique_accounts"],
            "unique_rounds": info["unique_rounds"],
        }

    return {
        "session_id": session_id,
        "created_at": session["created_at"],
        "platforms": platforms_info,
        "total_platforms": len(platforms_info),
    }


@router.post("/scan")
async def run_scan(
    session_id: str = Form(...),
    internal_min_rounds: int = Form(3),
    external_min_rounds: int = Form(4),
    min_equal_stake_ratio: float = Form(0.90),
    max_stake_diff_pct: float = Form(0.10),
    min_payout_pct: float = Form(0.90),
    max_payout_pct: float = Form(1.00),
    max_same_hand: int = Form(1),
):
    """Chạy quét đối đả trên tất cả file đã upload trong session.

    Returns:
        Kết quả tổng hợp + đường dẫn download.
    """
    global _last_result, _last_report_paths

    if session_id not in _sessions:
        raise HTTPException(status_code=404, detail="Session không tồn tại")

    session = _sessions[session_id]
    if not session["platforms"]:
        raise HTTPException(
            status_code=400, detail="Chưa upload file nào"
        )

    # Load tất cả data
    platform_data: dict[str, list[RoundBets]] = {}
    load_errors: list[str] = []

    for platform_name, info in session["platforms"].items():
        try:
            records = load_platform_file(
                file_path=info["file_path"],
                platform_name=platform_name,
                column_mapping=info.get("column_mapping"),
            )
            aggregated = aggregate_round_bets(records)
            platform_data[platform_name] = aggregated
        except Exception as e:
            load_errors.append(f"{platform_name}: {str(e)}")

    if load_errors:
        raise HTTPException(
            status_code=400,
            detail=f"Lỗi đọc dữ liệu: {'; '.join(load_errors)}"
        )

    # Chạy detector
    detector = ArbitrageDetector(
        internal_min_rounds=internal_min_rounds,
        external_min_rounds=external_min_rounds,
        min_equal_stake_ratio=min_equal_stake_ratio,
        max_stake_diff_pct=max_stake_diff_pct,
        min_payout_pct=min_payout_pct,
        max_payout_pct=max_payout_pct,
        max_same_hand=max_same_hand,
    )

    result = detector.detect(platform_data)

    # Xuất report
    report_dir = os.path.join(_UPLOAD_DIR, session_id, "reports")
    report_paths = generate_report(
        result=result,
        output_dir=report_dir,
        filename_prefix="对打结果",
    )

    _last_result = {
        "session_id": session_id,
        "stats": result.stats,
        "platforms": [
            {"name": p, "display": display_platform(p)}
            for p in result.platforms
        ],
        "valid_pairs": [
            {
                "match_type": p.match_type,
                "platform_a": display_platform(p.platform_a),
                "platform_b": display_platform(p.platform_b),
                "account_a": p.account_a,
                "account_b": p.account_b,
                "rounds": p.num_rounds,
                "equal_stake": p.num_equal_stake,
                "equal_stake_ratio": round(p.equal_stake_ratio * 100, 1),
                "total_stake": round(p.total_stake, 2),
                "total_diff": round(p.total_diff, 2),
                "same_hand": p.num_same_hand,
                "remark": p.remark,
            }
            for p in result.valid_pairs
        ],
        "eliminated_pairs": [
            {
                "match_type": p.match_type,
                "platform_a": display_platform(p.platform_a),
                "platform_b": display_platform(p.platform_b),
                "account_a": p.account_a,
                "account_b": p.account_b,
                "arb_rounds": p.num_arb_rounds,
                "equal_stake": p.num_equal_stake,
                "total_stake": round(p.total_stake, 2),
                "total_diff": round(p.total_diff, 2),
                "same_hand": p.num_same_hand,
                "remark": p.remark,
            }
            for p in result.eliminated_pairs
        ],
        "scanned_at": datetime.now().isoformat(),
    }
    _last_report_paths = report_paths

    return _last_result


@router.get("/results")
async def get_results():
    """Lấy kết quả quét gần nhất."""
    if _last_result is None:
        raise HTTPException(
            status_code=404, detail="Chưa có kết quả quét nào"
        )
    return _last_result


@router.get("/download/{file_type}")
async def download_report(file_type: str):
    """Download file XLSX kết quả.

    file_type: "main" hoặc "eliminated"
    """
    if _last_report_paths is None:
        raise HTTPException(
            status_code=404, detail="Chưa có kết quả quét nào"
        )

    if file_type not in _last_report_paths:
        raise HTTPException(
            status_code=400,
            detail=f"Loại file không hợp lệ: {file_type}. Chọn: main, eliminated"
        )

    path = _last_report_paths[file_type]
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File không tồn tại")

    filename = os.path.basename(path)
    return FileResponse(
        path=path,
        filename=filename,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )


@router.delete("/session/{session_id}")
async def delete_session(session_id: str):
    """Xóa session và tất cả file liên quan."""
    if session_id not in _sessions:
        raise HTTPException(status_code=404, detail="Session không tồn tại")

    session_dir = os.path.join(_UPLOAD_DIR, session_id)
    if os.path.exists(session_dir):
        shutil.rmtree(session_dir)

    del _sessions[session_id]
    return {"status": "deleted", "session_id": session_id}
