import asyncio
import json
from pathlib import Path
from typing import Any, Dict, List, Optional

class JsonStorageService:
    """
    Quản lý đọc/ghi các file dữ liệu JSON trong hệ thống với asyncio.Lock()
    để đảm bảo tính an toàn dữ liệu và tránh race condition khi ghi đồng thời.
    """
    def __init__(self, base_data_dir: Optional[Path] = None):
        if base_data_dir:
            self.base_dir = base_data_dir
        else:
            # Tự động tìm thư mục data của backend
            current = Path(__file__).resolve().parent.parent
            self.base_dir = current / "data"
        self._locks: Dict[str, asyncio.Lock] = {}
        self._master_lock = asyncio.Lock()

    async def _get_lock(self, file_path_str: str) -> asyncio.Lock:
        async with self._master_lock:
            if file_path_str not in self._locks:
                self._locks[file_path_str] = asyncio.Lock()
            return self._locks[file_path_str]

    def _resolve_path(self, relative_path: str) -> Path:
        return self.base_dir / relative_path

    async def read_json(self, relative_path: str) -> Any:
        path = self._resolve_path(relative_path)
        if not path.exists():
            raise FileNotFoundError(f"Tệp không tồn tại: {path}")
        
        lock = await self._get_lock(str(path))
        async with lock:
            # Chạy file I/O trong threadpool để tránh chặn event loop
            def _read():
                with open(path, "r", encoding="utf-8") as f:
                    return json.load(f)
            return await asyncio.to_thread(_read)

    async def write_json(self, relative_path: str, data: Any) -> None:
        path = self._resolve_path(relative_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        
        lock = await self._get_lock(str(path))
        async with lock:
            def _write():
                # Ghi ra file tạm rồi atomic replace để tránh hỏng file nếu crash giữa chừng
                temp_path = path.with_suffix(f"{path.suffix}.tmp")
                with open(temp_path, "w", encoding="utf-8") as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
                temp_path.replace(path)
            await asyncio.to_thread(_write)

# Singleton storage instance dùng xuyên suốt ứng dụng
storage_service = JsonStorageService()
