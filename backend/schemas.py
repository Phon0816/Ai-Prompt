from typing import List, Dict, Any, Optional, Literal
from pydantic import BaseModel, Field
from .config import PRIMARY_MODEL_ID

# ==================== DOMAIN & TEMPLATES ====================

class TemplateItem(BaseModel):
    id: str
    title: str
    category: str
    description: str
    default_task_type: str
    recommended_model_ids: List[str] = Field(default_factory=list)
    system_prompt: str

class DomainCardSummary(BaseModel):
    id: str
    name: str
    short_desc: str
    icon: str
    has_warning_badge: bool
    badge_text: Optional[str] = None
    sample_tasks: List[str]
    templates_count: int

class DomainDetail(BaseModel):
    id: str
    name: str
    short_desc: str
    icon: str
    has_warning_badge: bool
    badge_text: Optional[str] = None
    sample_tasks: List[str]
    glossary: Dict[str, str] = Field(default_factory=dict)
    red_flags: List[str] = Field(default_factory=list)
    required_disclaimer: Optional[str] = None
    default_output_format: str
    templates: List[TemplateItem]

# ==================== MODEL SCHEMAS ====================

class ModelInfo(BaseModel):
    id: str
    name: str
    provider: str
    context_window: int
    cost_tier: str
    cost_per_1m_input: float
    cost_per_1m_output: float
    speed: int
    vietnamese: int
    task_fit: Dict[str, int]
    strengths: List[str]
    weaknesses: List[str]
    recommended_for: List[str]

# ==================== RECOMMENDATION SCHEMAS ====================

class WeightSliders(BaseModel):
    task_fit: float = Field(0.4, ge=0.0, le=1.0)
    vietnamese: float = Field(0.25, ge=0.0, le=1.0)
    cost: float = Field(0.2, ge=0.0, le=1.0)
    speed: float = Field(0.15, ge=0.0, le=1.0)

class RecommendRequest(BaseModel):
    domain_id: str
    template_id: Optional[str] = None
    raw_prompt: Optional[str] = None
    weights: Optional[WeightSliders] = None

class ScoredModel(BaseModel):
    rank: int
    model: ModelInfo
    final_score: float
    score_breakdown: Dict[str, float]
    reasons: List[str]
    is_top_choice: bool

class RecommendResponse(BaseModel):
    top_models: List[ScoredModel]
    unselected_summary: str
    applied_weights: WeightSliders

# ==================== RUBRIC & SCORING SCHEMAS ====================

class RubricScore(BaseModel):
    criterion: str
    name: str
    score: int
    max_score: int
    passed: bool
    feedback: str

class ScorePromptRequest(BaseModel):
    domain_id: str
    raw_prompt: str
    template_id: Optional[str] = None

class PromptScoreResponse(BaseModel):
    total_score: float
    max_score: float = 10.0
    rubric_items: List[RubricScore]
    missing_elements: List[str]
    safety_alerts: List[str] = Field(default_factory=list)

# ==================== OPTIMIZE SCHEMAS ====================

class PromptSlot(BaseModel):
    slot_name: str
    label: str
    badge_type: str
    content: str

class CriticReport(BaseModel):
    enabled: bool = True
    generator_model: str = PRIMARY_MODEL_ID
    critic_model: str = "poolside/laguna-s-2.1:free"
    draft_prompt_v1: str
    critique_points: List[str]
    improvements_applied: List[str]
    v1_score: float
    v2_score: float

class PhaseTiming(BaseModel):
    phase: str
    duration_ms: int
    status: Literal["completed", "skipped"] = "completed"

class ExecutionTelemetry(BaseModel):
    request_id: str
    phases: List[PhaseTiming] = Field(default_factory=list)

class OptimizeRequest(BaseModel):
    domain_id: str
    template_id: str
    raw_prompt: str
    selected_model_id: str
    run_ai_execution: bool = True
    compare_raw: bool = False
    enable_critic: bool = False
    critic_model_id: Optional[str] = None
    execution_mode: Literal["fast", "quality"] = "fast"

class OptimizeResponse(BaseModel):
    optimized_prompt: str
    slots: List[PromptSlot]
    raw_score: float
    optimized_score: float
    diff_added_tokens: int
    ai_raw_response: Optional[str] = None
    ai_optimized_response: Optional[str] = None
    execution_source: str  # "openrouter"
    execution_time_ms: int
    model_used: str
    history_id: Optional[str] = None
    critic_report: Optional[CriticReport] = None
    telemetry: ExecutionTelemetry

# ==================== HEALTH SCHEMAS ====================

class HealthStatusResponse(BaseModel):
    status: str
    version: str
    cloud_ready: bool
    domains_available: List[str]
    models_count: int
