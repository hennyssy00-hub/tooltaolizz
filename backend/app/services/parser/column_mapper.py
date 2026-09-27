"""
Smart Column Mapper: Auto-detects column mappings from uploaded files
by matching column names against known keywords in multiple languages.
"""
from typing import Optional


class ColumnMapper:
    """Maps raw DataFrame columns to standard CasinoGuard field names."""

    # Standard field -> list of known keywords (lowercase)
    KEYWORDS: dict[str, list[str]] = {
        'round_id': [
            'round', 'ván', 'phiên', 'mã ván', 'game no', '游戏编号',
            'round id', 'round no', 'round_id', 'roundid', 'game_no',
            'bill no', 'bet id', 'wager id',
        ],
        'player_id': [
            'user', 'player', 'username', 'tên', 'member', '会员',
            'account', 'tài khoản', 'player_id', 'userid', 'user_id',
            'login', 'memberid', 'member_id', '会员账号',
        ],
        'game_type': [
            'game', 'trò', 'loại game', 'game type', '游戏类型', 'product',
            'game_type', 'gametype', 'category', 'game name', 'gamename',
        ],
        'bet_choice': [
            'bet', 'cửa', 'choice', 'selection', '下注', 'bet on', 'bet type',
            'bet_choice', 'betchoice', 'bet_type', 'wager', 'bet content',
        ],
        'stake': [
            'stake', 'tiền', 'amount', 'bet amount', '下注金额', 'số tiền',
            'cược', 'bet_amount', 'betamount', 'wager amount', 'valid bet',
            'valid_bet', 'turnover',
        ],
        'payout': [
            'payout', 'win', 'thắng', 'winloss', 'win/loss', '输赢',
            'profit', 'win_loss', 'win amount', 'winamount', 'net',
        ],
        'bet_timestamp': [
            'time', 'date', 'thời gian', 'ngày', 'bet time', '下注时间',
            'timestamp', 'bet_time', 'bettime', 'created', 'bet date',
            'transaction time', 'settle time',
        ],
        'result': [
            'result', 'kết quả', 'status', 'outcome', '结果',
            'win_status', 'settle', 'settlement',
        ],
        'table_id': [
            'table', 'bàn', 'desk', '桌号', 'table name', 'table id',
            'table_id', 'tableid', 'table_name', 'tablename', 'room',
        ],
        'provider': [
            'provider', 'sảnh', 'platform', 'vendor', '平台',
            'game provider', 'supplier', 'lobby', 'bookmaker', 'nhà cái',
        ],
        'odds': [
            'odds', 'odd', 'tỷ lệ', 'tỷ lệ kèo', 'kèo', 'rate', 'price', 'tỉ lệ', 'odds_rate',
        ],
        'event_name': [
            'match', 'trận', 'trận đấu', 'event', 'fixture', 'game_name', 'teams', 'vs',
            'home vs away', 'match_name', 'sự kiện', 'cuộc đấu',
        ],
        'league': [
            'league', 'giải', 'giải đấu', 'tournament', 'competition', 'cup',
        ],
        'ip_address': [
            'ip', 'ip_address', 'bet_ip', 'login_ip', 'user_ip', 'cụm ip', 'địa chỉ ip',
            'ip address', 'client ip', 'ipaddress', 'client_ip', 'player_ip', 'ip_addr',
            'ip_login', 'ip_bet', 'ip cược', 'ip đăng nhập', 'ip người chơi', 'ip_thực',
            'real_ip', 'remote_ip', 'ip地址', '投注ip', '登录ip', 'ip_location',
        ],
        'device_id': [
            'device', 'device_id', 'deviceid', 'thiết bị', 'mã thiết bị', 'fingerprint',
            'mac', 'mac_address', 'imei', 'hardware_id', 'uuid', 'user_agent', 'trình duyệt',
            'browser', 'os', 'hệ điều hành', 'hđh', 'client_device', 'device_type', '设备', '设备号', '设备指纹',
        ],
        'agent_id': [
            'agent', 'agent_id', 'agentid', 'đại lý', 'mã đại lý', 'tuyến trên', 'upline',
            'affiliate', 'affiliate_id', 'master', 'master_id', 'sub_agent', 'tổng',
            'đại lý cấp 1', 'cấp trên', 'agency', '代理', '代理账号', '上级', 'partner',
        ],
        'bet_type_detail': [
            'bet_type_detail', 'loại cược', 'loại vé cược', 'loại kèo', 'cược rung', 'kèo rung',
            'running', 'in_play', 'inplay', 'live_bet', 'early', 'kèo sớm', 'parlay', 'cược xiên',
            'market', 'market_type', 'thị trường', 'cược đơn', 'single_bet', '盘口', '玩法',
        ],
        'valid_bet': [
            'valid_bet', 'cược hợp lệ', 'cược hiệu lực', 'tiền cược hợp lệ', 'validbet',
            'valid_amount', 'turnover', 'doanh thu', 'effective_bet', '有效投注', '有效下注',
        ],
    }

    def detect_mapping(self, columns: list[str]) -> dict[str, str]:
        """
        Auto-detect column mappings from raw column names.

        Returns dict mapping standard_field -> original_column_name.
        """
        mapping: dict[str, str] = {}
        used_columns: set[str] = set()

        for col in columns:
            col_lower = col.lower().strip()
            for std_field, keywords in self.KEYWORDS.items():
                if std_field in mapping:
                    continue
                if col in used_columns:
                    continue
                # Exact match first
                if col_lower in keywords:
                    mapping[std_field] = col
                    used_columns.add(col)
                    break
                # Partial match (keyword contained in column name)
                if any(kw in col_lower for kw in keywords):
                    mapping[std_field] = col
                    used_columns.add(col)
                    break

        return mapping

    def apply_mapping(
        self, data: list[dict], mapping: dict[str, str]
    ) -> list[dict]:
        """
        Apply column mapping to raw data records.

        Args:
            data: List of raw row dicts from parsed file.
            mapping: Dict of standard_field -> original_column_name.

        Returns:
            List of dicts with standardized field names.
        """
        reverse_map = {v: k for k, v in mapping.items()}
        result = []
        for row in data:
            mapped_row = {}
            for orig_col, value in row.items():
                std_field = reverse_map.get(orig_col)
                if std_field:
                    mapped_row[std_field] = value
                # Also keep unmapped columns in raw_data
            mapped_row['_raw'] = dict(row)
            result.append(mapped_row)
        return result

    def get_unmapped_fields(self, mapping: dict[str, str]) -> list[str]:
        """Return list of standard fields not yet mapped."""
        all_fields = set(self.KEYWORDS.keys())
        mapped_fields = set(mapping.keys())
        return list(all_fields - mapped_fields)

    def get_confidence(self, mapping: dict[str, str]) -> float:
        """Return mapping confidence as fraction of required fields mapped."""
        required = {'round_id', 'player_id', 'game_type', 'bet_choice', 'stake', 'bet_timestamp'}
        mapped = set(mapping.keys()) & required
        return len(mapped) / len(required)
