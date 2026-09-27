"""
Anti-Fraud Strictness Profiles:
Reference standards derived from Tier-1 Bookmaker Risk Engines, GLI-19 certification,
and international sportsbook integrity frameworks (Sportradar / IBIA).
"""

PROFILES = {
    "STANDARD": {
        "id": "STANDARD",
        "name": "Chuẩn Quốc Tế (Tier-1 Standard)",
        "badge": "GLI Standard",
        "description": "Cân bằng tối ưu giữa tỷ lệ phát hiện và kiểm soát báo động giả (False Positive Rate < 2%).",
        "cross_hedge": {
            "max_time_diff": 60,
            "max_stake_diff_pct": 0.15,
            "net_exposure_threshold": 0.10,
            "min_persistence": 1,
        },
        "table_coverage": {
            "max_coverage_pct": 0.70,
            "cross_player": True,
        },
        "sports": {
            "max_arb_margin": 1.00,
            "min_profit_pct": 0.5,
            "stake_ratio_tolerance": 0.05,
            "time_window": 300,
            "check_palpable_error": True,
            "check_kelly_stake": True,
        },
        "anomaly": {
            "min_bets": 30,
            "win_rate_threshold": 0.65,
            "timing_std_dev": 2.0,
        }
    },
    "ULTRA_STRICT": {
        "id": "ULTRA_STRICT",
        "name": "Siêu Khắt Khe (Zero Tolerance)",
        "badge": "Audit & Withdrawal",
        "description": "Quét toàn diện với ngưỡng cực ngặt, bắt cả vi mô (Micro-hedging), phù hợp duyệt lệnh rút tiền lớn.",
        "cross_hedge": {
            "max_time_diff": 180,
            "max_stake_diff_pct": 0.35,
            "net_exposure_threshold": 0.25,
            "min_persistence": 1,
        },
        "table_coverage": {
            "max_coverage_pct": 0.60,
            "cross_player": True,
        },
        "sports": {
            "max_arb_margin": 1.02, # Bắt cả kèo hòa vốn 0%
            "min_profit_pct": 0.0,
            "stake_ratio_tolerance": 0.10,
            "time_window": 900,
            "check_palpable_error": True,
            "check_kelly_stake": True,
        },
        "anomaly": {
            "min_bets": 15,
            "win_rate_threshold": 0.58,
            "timing_std_dev": 3.0,
        }
    },
    "REBATE_HUNTER": {
        "id": "REBATE_HUNTER",
        "name": "Chống Bào Hoàn Trả (Rebate & Bonus Wash)",
        "badge": "Promo Protection",
        "description": "Chuyên bắt cược đối nghịch triệt tiêu rủi ro để cày doanh số hoàn trả VIP/khuyến mãi (Churning).",
        "cross_hedge": {
            "max_time_diff": 300,
            "max_stake_diff_pct": 0.10,
            "net_exposure_threshold": 0.05, # Độ lộ rủi ro dưới 5%
            "min_persistence": 2,
        },
        "table_coverage": {
            "max_coverage_pct": 0.65,
            "cross_player": True,
        },
        "sports": {
            "max_arb_margin": 1.01,
            "min_profit_pct": -0.5, # Chấp nhận lỗ 0.5% để cày hoa hồng 1%
            "stake_ratio_tolerance": 0.05,
            "time_window": 600,
            "check_palpable_error": False,
            "check_kelly_stake": True,
        },
        "anomaly": {
            "min_bets": 20,
            "win_rate_threshold": 0.55,
            "timing_std_dev": 2.5,
        }
    },
    "SPORTS_SHARP": {
        "id": "SPORTS_SHARP",
        "name": "Bào Cỏ Thể Thao (Sports Sharp & Arbing)",
        "badge": "Sportsbook Pro",
        "description": "Tập trung bắt Surebets, cược công thức Kelly, cược nhầm giá (Palpable Error) và cược rung trễ.",
        "cross_hedge": {
            "max_time_diff": 60,
            "max_stake_diff_pct": 0.20,
            "net_exposure_threshold": 0.15,
            "min_persistence": 1,
        },
        "table_coverage": {
            "max_coverage_pct": 0.70,
            "cross_player": False,
        },
        "sports": {
            "max_arb_margin": 1.00,
            "min_profit_pct": 0.2, # Bắt cả lợi nhuận nhỏ 0.2%
            "stake_ratio_tolerance": 0.03, # Khớp công thức cực chính xác
            "time_window": 1800, # Kèo trước trận 30 phút
            "check_palpable_error": True,
            "check_kelly_stake": True,
        },
        "anomaly": {
            "min_bets": 20,
            "win_rate_threshold": 0.62,
            "timing_std_dev": 1.5,
        }
    }
}


def get_profile(profile_id: str) -> dict:
    """Retrieve strictness profile configuration, falling back to STANDARD."""
    return PROFILES.get(profile_id.upper(), PROFILES["STANDARD"])
