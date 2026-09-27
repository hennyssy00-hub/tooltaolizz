# 🛡️ CasinoGuard – Casino Betting Fraud Detection System

Hệ thống phát hiện gian lận đặt cược sảnh Casino đa nền tảng.

## Tính năng chính

- **Phát hiện đánh chéo 2 đầu (Cross Hedging):** Quét các cặp cược đối nghịch (Player vs Banker, Tài vs Xỉu...) cùng mã ván trên nhiều trang cá cược khác nhau
- **Phát hiện bao phủ bàn cược (Table Coverage):** Phát hiện chiến lược chia tiền bao phủ nhiều cửa (Roulette, Sicbo)
- **Phát hiện đánh nhóm (Syndicate Detection):** Tìm các nhóm tài khoản thường xuyên cược cùng lúc
- **Phát hiện bất thường thống kê (Statistical Anomaly):** Tỷ lệ thắng bất thường, mẫu cược bot, phiên chơi phi thường
- **Chấm điểm rủi ro (Risk Scoring):** Tổng hợp đa yếu tố, phân loại 4 mức (Safe/Watch/Suspicious/Critical)
- **Bản đồ mạng lưới gian lận (Fraud Network Graph):** Trực quan hoá quan hệ giữa các tài khoản
- **Smart Parser:** Tự động nhận diện cấu trúc file từ nhiều trang cá cược khác nhau

## Trò chơi hỗ trợ

| Trò chơi | Cửa cược đối kháng |
|-----------|-------------------|
| Baccarat | Player ↔ Banker |
| Rồng Hổ (Dragon Tiger) | Dragon ↔ Tiger |
| Sicbo / Tài Xỉu | Big ↔ Small, Odd ↔ Even |
| Roulette | Red ↔ Black, Odd ↔ Even, Low ↔ High |
| Fan Tan | 1 ↔ 3, 2 ↔ 4 |
| Bull Bull | Player ↔ Banker |

## Cài đặt & Chạy

### Yêu cầu
- Docker & Docker Compose
- Hoặc: Python 3.11+, Node.js 20+, PostgreSQL 16+

### Chạy với Docker (Khuyến nghị)

```bash
# Clone project
cd casino-guard

# Khởi chạy toàn bộ hệ thống
docker-compose up -d

# Truy cập
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### Chạy thủ công (Development)

```bash
# Backend
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend (terminal khác)
cd frontend
npm install
npm run dev
```

### Tạo dữ liệu giả lập để test

```bash
cd backend
python -m app.utils.mock_data
# Output: mock_data/platform_alpha.csv, platform_beta.csv, platform_gamma.csv
```

## Kiến trúc

```
casino-guard/
├── backend/           # FastAPI (Python)
│   ├── app/
│   │   ├── api/       # REST API endpoints
│   │   ├── models/    # SQLAlchemy models
│   │   ├── schemas/   # Pydantic schemas
│   │   ├── services/  # Business logic
│   │   │   ├── parser/     # File parsing & normalization
│   │   │   └── detection/  # Fraud detection algorithms
│   │   └── utils/     # Helpers & mock data
│   └── mock_data/     # Generated test data
├── frontend/          # Next.js (React + TypeScript)
│   └── src/
│       ├── app/       # Pages (App Router)
│       ├── components/# UI components
│       ├── lib/       # API client & utils
│       └── types/     # TypeScript types
└── docker-compose.yml
```

## License

Private – Internal Use Only
