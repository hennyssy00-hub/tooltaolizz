from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from app.database import engine, Base
import app.models
from app.api import upload, scan, dashboard, alerts, accounts, blacklist, reports, platform_configs, arbitrage
from contextlib import asynccontextmanager
from datetime import datetime

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield

app = FastAPI(
    title="BetGuard Anti-Fraud API",
    description="Máy chủ xử lý đối soát và phát hiện gian lận cược Live Casino & Thể thao",
    version="2.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/", response_class=HTMLResponse)
async def root():
    return """
    <!DOCTYPE html>
    <html lang="vi">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>BetGuard Engine API - Hoạt động bình thường</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                background-color: #0b1120;
                color: #e2e8f0;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                margin: 0;
                padding: 20px;
            }
            .card {
                background-color: #1e293b;
                border: 1px solid #334155;
                border-radius: 16px;
                padding: 36px;
                max-width: 580px;
                width: 100%;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
            }
            .badge {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                padding: 6px 14px;
                border-radius: 9999px;
                font-size: 13px;
                font-weight: 600;
                background-color: rgba(34, 197, 94, 0.15);
                color: #4ade80;
                border: 1px solid rgba(34, 197, 94, 0.3);
            }
            .pulse {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background-color: #22c55e;
                box-shadow: 0 0 10px #22c55e;
            }
            h1 {
                font-size: 24px;
                font-weight: 700;
                margin: 18px 0 8px 0;
                color: #f8fafc;
            }
            p {
                color: #94a3b8;
                font-size: 14px;
                line-height: 1.6;
                margin: 0 0 24px 0;
            }
            .btn-group {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            .btn {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 12px 18px;
                border-radius: 10px;
                text-decoration: none;
                font-weight: 500;
                font-size: 14px;
                transition: all 0.2s;
            }
            .btn-primary {
                background: linear-gradient(135deg, #2563eb, #1d4ed8);
                color: white;
            }
            .btn-primary:hover {
                background: linear-gradient(135deg, #1d4ed8, #1e40af);
            }
            .btn-secondary {
                background-color: #334155;
                color: #cbd5e1;
            }
            .btn-secondary:hover {
                background-color: #475569;
                color: white;
            }
            .footer {
                margin-top: 24px;
                padding-top: 18px;
                border-top: 1px solid #334155;
                font-size: 12px;
                color: #64748b;
                display: flex;
                justify-content: space-between;
            }
        </style>
    </head>
    <body>
        <div class="card">
            <div class="badge">
                <span class="pulse"></span>
                API Máy Chủ Đang Hoạt Động (Online)
            </div>
            <h1>🛡️ BetGuard Anti-Fraud Engine</h1>
            <p>
                Lõi API đối soát và phát hiện gian lận cược đang sẵn sàng tiếp nhận yêu cầu từ ứng dụng web và các dịch vụ quét dữ liệu.
            </p>

            <div class="btn-group">
                <a href="http://localhost:3000" class="btn btn-primary" target="_blank">
                    <span>🌐 Mở Giao Diện Web (Next.js)</span>
                    <span>http://localhost:3000 &rarr;</span>
                </a>
                <a href="/docs" class="btn btn-secondary">
                    <span>📚 Xem Tài Liệu API (Swagger UI)</span>
                    <span>/docs &rarr;</span>
                </a>
                <a href="/health" class="btn btn-secondary">
                    <span>🩺 Kiểm Tra Sức Khỏe (Health Check)</span>
                    <span>/health &rarr;</span>
                </a>
            </div>

            <div class="footer">
                <span>Phiên bản: 2.0.0 Pro</span>
                <span>Cổng: 8000 (FastAPI / Uvicorn)</span>
            </div>
        </div>
    </body>
    </html>
    """

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "BetGuard Anti-Fraud Engine",
        "version": "2.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }

app.include_router(upload.router, prefix="/api/upload", tags=["Upload"])
app.include_router(scan.router, prefix="/api/scans", tags=["Scans"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["Alerts"])
app.include_router(accounts.router, prefix="/api/accounts", tags=["Accounts"])
app.include_router(blacklist.router, prefix="/api/blacklist", tags=["Blacklist"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])
app.include_router(platform_configs.router, prefix="/api/platform-configs", tags=["Platform Configs"])
app.include_router(arbitrage.router, tags=["Arbitrage"])

