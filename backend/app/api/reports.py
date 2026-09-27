"""
Reports API: Generate and download scan reports as Excel files.
"""
import io
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.scan import Scan
from app.models.alert import Alert
from app.models.bet import Bet

router = APIRouter()


@router.get("/scan/{scan_id}/excel")
async def download_excel(scan_id: str, db: AsyncSession = Depends(get_db)):
    """Generate and download Excel report for a scan."""
    import xlsxwriter

    # Verify scan exists
    scan_result = await db.execute(select(Scan).where(Scan.id == scan_id))
    scan = scan_result.scalar_one_or_none()
    if not scan:
        raise HTTPException(404, "Scan not found")

    # Get all alerts for this scan
    alerts_result = await db.execute(
        select(Alert).where(Alert.scan_id == scan_id).order_by(Alert.risk_score.desc())
    )
    alerts = alerts_result.scalars().all()

    # Create Excel in memory
    output = io.BytesIO()
    workbook = xlsxwriter.Workbook(output, {'in_memory': True})

    # Formats
    header_fmt = workbook.add_format({
        'bold': True, 'bg_color': '#1e293b', 'font_color': 'white',
        'border': 1, 'text_wrap': True,
    })
    critical_fmt = workbook.add_format({'bg_color': '#fee2e2', 'border': 1})
    high_fmt = workbook.add_format({'bg_color': '#fef3c7', 'border': 1})
    normal_fmt = workbook.add_format({'border': 1})

    # -- Sheet 1: Summary --
    ws_summary = workbook.add_worksheet('Tổng quan')
    ws_summary.set_column('A:A', 25)
    ws_summary.set_column('B:B', 40)

    summary_data = [
        ('Tên phiên quét', scan.name or ''),
        ('Trạng thái', scan.status or ''),
        ('Ngày tạo', str(scan.created_at) if scan.created_at else ''),
        ('Hoàn tất', str(scan.completed_at) if scan.completed_at else ''),
        ('Tổng vé cược', str(scan.total_bets or 0)),
        ('Tổng cảnh báo', str(scan.total_alerts or 0)),
        ('Nền tảng', ', '.join(scan.platforms) if scan.platforms else ''),
    ]
    for i, (label, value) in enumerate(summary_data):
        ws_summary.write(i, 0, label, header_fmt)
        ws_summary.write(i, 1, value, normal_fmt)

    # -- Sheet 2: Alerts --
    ws_alerts = workbook.add_worksheet('Cảnh báo')
    alert_headers = [
        'Loại', 'Mức độ', 'Risk Score', 'Mô tả',
        'Trạng thái', 'Chênh lệch thời gian (s)', 'Chênh lệch tiền (%)',
    ]
    ws_alerts.set_column('A:A', 18)
    ws_alerts.set_column('B:B', 12)
    ws_alerts.set_column('C:C', 12)
    ws_alerts.set_column('D:D', 60)
    ws_alerts.set_column('E:E', 15)
    ws_alerts.set_column('F:F', 22)
    ws_alerts.set_column('G:G', 22)

    for col, header in enumerate(alert_headers):
        ws_alerts.write(0, col, header, header_fmt)

    for row, alert in enumerate(alerts, start=1):
        fmt = critical_fmt if alert.severity == 'CRITICAL' else (high_fmt if alert.severity == 'HIGH' else normal_fmt)
        ws_alerts.write(row, 0, alert.alert_type, fmt)
        ws_alerts.write(row, 1, alert.severity, fmt)
        ws_alerts.write(row, 2, alert.risk_score or 0, fmt)
        ws_alerts.write(row, 3, alert.description or '', fmt)
        ws_alerts.write(row, 4, alert.status or '', fmt)
        ws_alerts.write(row, 5, alert.time_diff_seconds or '', fmt)
        ws_alerts.write(row, 6, round(alert.stake_diff_pct * 100, 2) if alert.stake_diff_pct else '', fmt)

    # -- Sheet 3: Evidence Pairs --
    ws_evidence = workbook.add_worksheet('Bằng chứng đối soát')
    ev_headers = [
        'Round ID', 'Game', 'Player A', 'Platform A', 'Cửa A', 'Tiền A',
        'Player B', 'Platform B', 'Cửa B', 'Tiền B', 'Lệch thời gian', 'Mức độ',
    ]
    for col, header in enumerate(ev_headers):
        ws_evidence.set_column(col, col, 16)
        ws_evidence.write(0, col, header, header_fmt)

    ev_row = 1
    for alert in alerts:
        bet_a = None
        bet_b = None
        if alert.bet_a_id:
            r = await db.execute(select(Bet).where(Bet.id == alert.bet_a_id))
            bet_a = r.scalar_one_or_none()
        if alert.bet_b_id:
            r = await db.execute(select(Bet).where(Bet.id == alert.bet_b_id))
            bet_b = r.scalar_one_or_none()

        if bet_a:
            fmt = critical_fmt if alert.severity == 'CRITICAL' else normal_fmt
            ws_evidence.write(ev_row, 0, bet_a.round_id or '', fmt)
            ws_evidence.write(ev_row, 1, bet_a.game_type or '', fmt)
            ws_evidence.write(ev_row, 2, bet_a.player_id or '', fmt)
            ws_evidence.write(ev_row, 3, bet_a.platform or '', fmt)
            ws_evidence.write(ev_row, 4, bet_a.bet_choice_normalized or '', fmt)
            ws_evidence.write(ev_row, 5, float(bet_a.stake or 0), fmt)

            if bet_b:
                ws_evidence.write(ev_row, 6, bet_b.player_id or '', fmt)
                ws_evidence.write(ev_row, 7, bet_b.platform or '', fmt)
                ws_evidence.write(ev_row, 8, bet_b.bet_choice_normalized or '', fmt)
                ws_evidence.write(ev_row, 9, float(bet_b.stake or 0), fmt)

            ws_evidence.write(ev_row, 10, alert.time_diff_seconds or '', fmt)
            ws_evidence.write(ev_row, 11, alert.severity or '', fmt)
            ev_row += 1

    workbook.close()
    output.seek(0)

    filename = f"CasinoGuard_Report_{scan.name}_{datetime.now().strftime('%Y%m%d')}.xlsx"

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
