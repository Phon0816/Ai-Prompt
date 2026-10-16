"""
Launcher tiện ích để khởi động đồng thời cả Backend FastAPI và Frontend React Vite.
Cách chạy:
    python run.py
"""
import subprocess
import sys
import time
import os
import webbrowser
from pathlib import Path

def main():
    root_dir = Path(__file__).resolve().parent
    frontend_dir = root_dir / "frontend"
    backend_dir = root_dir / "backend"

    print("=" * 60)
    print("🚀 ĐANG KHỞI ĐỘNG HỆ THỐNG AI-PROMPT-MANAGER (MVP)")
    print("=" * 60)

    # 1. Khởi động Backend FastAPI
    print("\n[1/3] Khởi động Backend FastAPI tại http://127.0.0.1:8000 ...")
    backend_cmd = [
        sys.executable, "-m", "uvicorn", 
        "backend.main:app", 
        "--host", "127.0.0.1", 
        "--port", "8000", 
        "--reload"
    ]
    backend_proc = subprocess.Popen(
        backend_cmd, 
        cwd=str(root_dir)
    )

    time.sleep(2)

    # 2. Khởi động Frontend Vite
    print("\n[2/3] Khởi động Frontend Vite tại http://localhost:5173 ...")
    # Trên Windows cần shell=True để chạy npm.cmd
    frontend_proc = subprocess.Popen(
        ["npm", "run", "dev"], 
        cwd=str(frontend_dir),
        shell=True
    )

    time.sleep(2)

    # 3. Tự động mở trình duyệt
    print("\n[3/3] Đang mở giao diện người dùng trên trình duyệt...")
    try:
        webbrowser.open("http://localhost:5173")
    except Exception:
        pass

    print("\n" + "=" * 60)
    print("✅ HỆ THỐNG ĐÃ SẴN SÀNG:")
    print("   👉 Frontend Dashboard: http://localhost:5173")
    print("   👉 Backend API Docs:   http://127.0.0.1:8000/docs")
    print("=" * 60)
    print("Nhấn Ctrl + C để dừng toàn bộ hệ thống.\n")

    try:
        backend_proc.wait()
    except KeyboardInterrupt:
        print("\nĐang dừng các tiến trình...")
        backend_proc.terminate()
        frontend_proc.terminate()
        print("Đã tắt hệ thống.")

if __name__ == "__main__":
    main()
