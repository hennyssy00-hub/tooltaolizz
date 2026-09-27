#!/bin/bash
# ====================================================
# BetGuard - Script Triển Khai Chạy 24/7 Tự Động
# ====================================================
set -e

echo "🚀 Đang kiểm tra môi trường máy chủ..."

# 1. Cài đặt Docker & Docker Compose nếu chưa có
if ! command -v docker &> /dev/null; then
    echo "📦 Đang cài đặt Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl start docker
    systemctl enable docker
fi

# 2. Khởi chạy hệ thống BetGuard Production
echo "⚙️ Đang đóng gói và khởi chạy BetGuard 24/7..."
docker compose -f docker-compose.prod.yml down || true
docker compose -f docker-compose.prod.yml up -d --build

# 3. Thông báo kết quả
SERVER_IP=$(curl -s https://api.ipify.org || echo "IP_MAY_CHU")
echo "===================================================="
echo "✅ HỆ THỐNG BETGUARD ĐÃ CHẠY 24/7 THÀNH CÔNG!"
echo "🌐 Truy cập giao diện tại: http://${SERVER_IP}"
echo "===================================================="
