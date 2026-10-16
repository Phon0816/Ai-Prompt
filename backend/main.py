import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
try:
    from dotenv import load_dotenv
except ImportError:
    def load_dotenv(dotenv_path=None, override=False):
        p = Path(dotenv_path) if dotenv_path else Path(".env")
        if p.exists():
            for line in p.read_text(encoding="utf-8", errors="ignore").splitlines():
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                k, v = k.strip(), v.strip().strip('"').strip("'")
                if override or k not in os.environ:
                    os.environ[k] = v

# Tải biến môi trường từ .env
load_dotenv()
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from .schemas import HealthStatusResponse
from .routers import domains, recommend, optimize, history, settings
from .services.storage import storage_service
from .services.skill_registry import skill_registry
from .services.llm_client import close_http_client

app = FastAPI(
    title="AI-Prompt-Manager Architecture v2",
    description="Hệ thống Khuyến nghị mô hình AI và Tối ưu hóa câu lệnh (Prompt) theo ngữ cảnh cho chuyên ngành IT và Y tế",
    version="2.0.0"
)


@app.on_event("startup")
async def load_skill_registry() -> None:
    skill_registry.load()


@app.on_event("shutdown")
async def close_shared_http_client() -> None:
    await close_http_client()

# Cấu hình CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Đăng ký các router
app.include_router(domains.router)
app.include_router(recommend.router)
app.include_router(optimize.router)
app.include_router(history.router)
app.include_router(settings.router)

@app.get("/")
def root():
    return {
        "app": "AI-Prompt-Manager Backend",
        "version": "2.0.0",
        "architecture": "Wizard 4-Steps + Domain Packs",
        "docs_url": "/docs"
    }

@app.get("/api/health", response_model=HealthStatusResponse)
async def health_check():
    """
    Kiểm tra trạng thái Backend cloud và số lượng models/domains.
    """
    domains_list = ["it", "healthcare"]
    models_count = 0
    try:
        models_data = await storage_service.read_json("models.json")
        models_count = len(models_data)
    except Exception:
        models_count = 0

    return HealthStatusResponse(
        status="ok",
        version="2.0.0",
        cloud_ready=True,
        domains_available=domains_list,
        models_count=models_count
    )

@app.get("/api/models")
async def list_models():
    """Lấy danh sách toàn bộ mô hình AI có trong data/models.json"""
    return await storage_service.read_json("models.json")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
