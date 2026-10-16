from typing import List
from fastapi import APIRouter, HTTPException
from ..schemas import DomainCardSummary, DomainDetail
from ..services.skill_registry import skill_registry

router = APIRouter(prefix="/api/domains", tags=["Domains"])

KNOWN_DOMAINS = ["it", "healthcare"]

@router.get("", response_model=List[DomainCardSummary])
async def list_domains():
    """
    Lấy danh sách tóm tắt các lĩnh vực chuyên ngành (Domain Cards) 
    dùng để hiển thị tại Bước 1 của Wizard. Đọc động từ các file domains/*.json.
    """
    results: List[DomainCardSummary] = []
    for domain_id in KNOWN_DOMAINS:
        try:
            data = skill_registry.get_domain_pack(domain_id)
            templates = data.get("templates", [])
            results.append(
                DomainCardSummary(
                    id=data["id"],
                    name=data["name"],
                    short_desc=data["short_desc"],
                    icon=data.get("icon", "briefcase"),
                    has_warning_badge=data.get("has_warning_badge", False),
                    badge_text=data.get("badge_text"),
                    sample_tasks=data.get("sample_tasks", []),
                    templates_count=len(templates)
                )
            )
        except FileNotFoundError:
            continue
        except Exception as e:
            raise HTTPException(
                status_code=500, 
                detail=f"Lỗi khi đọc dữ liệu lĩnh vực {domain_id}: {str(e)}"
            )

    return results

@router.get("/{domain_id}", response_model=DomainDetail)
async def get_domain_detail(domain_id: str):
    """
    Lấy toàn bộ Domain Pack chi tiết (glossary, templates, red_flags, required_disclaimer, default_output_format).
    """
    clean_id = domain_id.strip().lower()
    # Hỗ trợ alias linh hoạt
    if clean_id in ["health", "medical", "y-te"]:
        clean_id = "healthcare"
    elif clean_id in ["tech", "cntt", "software"]:
        clean_id = "it"

    try:
        data = skill_registry.get_domain_pack(clean_id)
        return DomainDetail(**data)
    except FileNotFoundError:
        raise HTTPException(
            status_code=404,
            detail=f"Lĩnh vực chuyên ngành '{domain_id}' không tồn tại trong hệ thống."
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Lỗi khi tải chi tiết lĩnh vực '{domain_id}': {str(e)}"
        )
