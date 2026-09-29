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
            'mã số trò chơi ba chiều', 'trò chơi ba chiều', 'mã trò chơi ba chiều', 'mã số trò chơi 3 chiều',
            'mã số trò chơi', '三方游戏局号', '游戏局号', '局号', '三方局号', 'round', 'ván', 'phiên',
            'mã ván', 'game no', 'round id', 'round no', 'round_id', 'roundid', 'game_no',
            'bill no', 'wager id', '注单号', 'mã phiên cược', 'mã giao dịch', 'số giao dịch',
        ],
        'player_id': [
            'tên tài khoản', 'tài khoản', 'tên người chơi', 'tên đăng nhập', '用户名', '账号', '帐号',
            'user', 'player', 'username', 'tên', 'member', '会员', 'account', 'player_id',
            'userid', 'user_id', 'login', 'memberid', 'member_id', '会员账号', '会员名称',
        ],
        'game_type': [
            'loại trò chơi', 'loại game', 'tên trò chơi', 'trò chơi', 'game', 'trò', 'game type',
            '游戏类型', '游戏种类', 'product', 'game_type', 'gametype', 'category', 'game name', 'gamename',
        ],
        'bet_choice': [
            'khu cá cược', 'khu cược', 'khu vực cược', 'cửa cược', 'cửa đặt', 'nội dung cược',
            '投注区域', '下注区域', '投注内容', '下注内容', '投注类型', '下注类型',
            'bet', 'cửa', 'choice', 'selection', '下注', 'bet on', 'bet type',
            'bet_choice', 'betchoice', 'bet_type', 'wager', 'bet content',
        ],
        'stake': [
            'số tiền cược', 'tiền cược', 'tiền đặt', 'tiền đánh', '投注额', '下注额', '投注金额', '下注金额',
            'stake', 'bet amount', 'số tiền', 'bet_amount', 'betamount', 'wager amount',
        ],
        'payout': [
            'trò chơi thắng/thua', 'trò chơi thắng thua', 'thắng/thua', 'thắng thua', 'tiền thắng thua',
            '游戏输赢', '输赢', '输赢金额', '盈亏', '派彩', 'payout', 'win', 'thắng', 'winloss', 'win/loss',
            'profit', 'win_loss', 'win amount', 'winamount', 'net', 'thanh toán', 'kết toán',
        ],
        'bet_timestamp': [
            'thời gian cược', 'thời gian đặt cược', 'thời gian đặt', 'thời gian tạo', '投注时间', '下注时间',
            'time', 'date', 'thời gian', 'ngày', 'bet time', 'timestamp', 'bet_time', 'bettime',
            'created', 'bet date', 'transaction time', 'thời gian kết toán',
        ],
        'result': [
            'trạng thái', 'kết quả', 'status', 'outcome', '结果', 'result',
            'win_status', 'settle', 'settlement',
        ],
        'table_id': [
            'mã bàn', 'bàn', 'desk', '桌号', 'table name', 'table id',
            'table_id', 'tableid', 'table_name', 'tablename', 'room',
        ],
        'provider': [
            'nhà chế tạo', 'nhà cung cấp', 'hãng game', 'sảnh game', 'sảnh cược', '厂商', '游戏厂商',
            'provider', 'sảnh', 'platform', 'vendor', '平台', 'game provider', 'supplier', 'lobby',
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
            'cược hợp lệ', 'cược hiệu lực', 'tiền cược hợp lệ', 'valid_bet', 'validbet',
            'valid_amount', 'turnover', 'doanh thu', 'effective_bet', '有效投注', '有效下注',
        ],
    }

    def detect_mapping(self, columns: list[str]) -> dict[str, str]:
        """
        Auto-detect column mappings with semantic prioritization.
        Guarantees that compound phrases (e.g. 'thời gian cược', 'trò chơi thắng/thua')
        are disambiguated accurately without false substring collisions.
        """
        mapping: dict[str, str] = {}
        used_columns: set[str] = set()

        # Step 1: Semantic priority matching for tricky multi-meaning columns
        for col in columns:
            low = col.lower().strip()

            # Payout must be checked before game_type to prevent 'Trò chơi Thắng/thua' -> game_type
            if any(w in low for w in ['thắng/thua', 'thắng thua', 'thắng_thua', '输赢', '盈亏', '派彩', 'win/loss', 'win_loss', 'winloss', 'payout', 'profit']):
                if 'payout' not in mapping and col not in used_columns:
                    mapping['payout'] = col
                    used_columns.add(col)
                    continue

            # Timestamp must be checked before stake so 'thời gian cược' is never mapped to stake
            if any(w in low for w in ['thời gian cược', 'thời gian đặt', '投注时间', '下注时间', 'timestamp', 'bet time', 'bet_time', 'bettime']):
                if 'bet_timestamp' not in mapping and col not in used_columns:
                    mapping['bet_timestamp'] = col
                    used_columns.add(col)
                    continue

            # Bet Choice / Area
            if any(w in low for w in ['khu cá cược', 'khu cược', 'khu vực cược', 'cửa cược', 'cửa đặt', '投注区域', '下注区域', '投注内容', '下注内容', 'bet choice', 'bet_choice', 'bet area']):
                if 'bet_choice' not in mapping and col not in used_columns:
                    mapping['bet_choice'] = col
                    used_columns.add(col)
                    continue

            # Stake
            if any(w in low for w in ['số tiền cược', 'tiền cược', 'tiền đặt', 'tiền đánh', '投注金额', '下注金额', '投注额', '下注额', 'stake', 'bet amount', 'bet_amount']) and 'thời gian' not in low and 'hợp lệ' not in low:
                if 'stake' not in mapping and col not in used_columns:
                    mapping['stake'] = col
                    used_columns.add(col)
                    continue

            # Round ID (3D Game round, Ba chiều, 局号)
            if any(w in low for w in ['mã số trò chơi ba chiều', 'trò chơi ba chiều', '三方游戏局号', '游戏局号', '局号', 'mã ván', 'phiên cược', 'round id', 'round_id', 'roundid', 'round no']):
                if 'round_id' not in mapping and col not in used_columns:
                    mapping['round_id'] = col
                    used_columns.add(col)
                    continue

            # Provider
            if any(w in low for w in ['nhà chế tạo', 'nhà cung cấp', 'sảnh game', 'sảnh cược', '厂商', '游戏厂商', 'provider', 'vendor', 'platform']):
                if 'provider' not in mapping and col not in used_columns:
                    mapping['provider'] = col
                    used_columns.add(col)
                    continue

            # Player ID
            if any(w in low for w in ['tên tài khoản', 'tài khoản', 'tên người chơi', 'tên đăng nhập', '用户名', '账号', '帐号', '会员账号', 'player_id', 'username', 'user_id']):
                if 'player_id' not in mapping and col not in used_columns:
                    mapping['player_id'] = col
                    used_columns.add(col)
                    continue

            # Valid Bet
            if any(w in low for w in ['cược hợp lệ', 'tiền cược hợp lệ', '有效投注', '有效下注', 'valid bet', 'valid_bet']):
                if 'valid_bet' not in mapping and col not in used_columns:
                    mapping['valid_bet'] = col
                    used_columns.add(col)
                    continue

            # Game Type (Clean category like 'loại trò chơi', 'loại game')
            if any(w in low for w in ['loại trò chơi', 'loại game', '游戏种类', '游戏类型']) and not any(w in low for w in ['thắng', 'thua', 'win', 'loss']):
                if 'game_type' not in mapping and col not in used_columns:
                    mapping['game_type'] = col
                    used_columns.add(col)
                    continue

        # Step 2: Pass through standard keyword dictionaries for remaining fields
        for col in columns:
            if col in used_columns:
                continue
            col_lower = col.lower().strip()

            for std_field, keywords in self.KEYWORDS.items():
                if std_field in mapping:
                    continue

                # Disambiguation guards
                if std_field == 'game_type' and any(w in col_lower for w in ['thắng', 'thua', 'win', 'loss', 'payout', 'ba chiều']):
                    continue
                if std_field == 'stake' and any(w in col_lower for w in ['thời gian', 'ngày', 'time', 'date', 'khu', 'cửa']):
                    continue

                # Exact match first
                if col_lower in keywords:
                    mapping[std_field] = col
                    used_columns.add(col)
                    break

                # Prefix / Substring match
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
