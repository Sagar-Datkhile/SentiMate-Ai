from pydantic import BaseModel, Field
from typing import Optional, Dict, List, Union

class StudentContext(BaseModel):
    current_semester: Optional[int] = Field(None, ge=1, le=8)
    sgpa_avg: Optional[float] = Field(None, ge=0.0, le=10.0)
    recent_mood_avg: Optional[float] = Field(None, ge=1.0, le=5.0)
    recent_sleep_avg: Optional[float] = Field(None, ge=0.0, le=24.0)
    recent_stress_avg: Optional[float] = Field(None, ge=1.0, le=5.0)

class AnalyzeRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=10000)
    student_context: Optional[StudentContext] = None

class TextSignals(BaseModel):
    sentiment: str
    sentiment_score: float
    emotions: Dict[str, float]
    linguistic_cues: List[str]
    model_checkpoint: str

class ShapExplanation(BaseModel):
    feature: str
    shap_value: float
    feature_value: Union[str, float, int]
    human_explanation: str
    importance_rank: int

class SupportAssessment(BaseModel):
    risk_level: str  # 'low', 'moderate', 'elevated', 'high'
    confidence_score: float
    model_version: str
    is_rules_based_fallback: bool

class AnalyzeResponse(BaseModel):
    is_available: bool
    service_status: str
    text_signals: Optional[TextSignals] = None
    support_assessment: Optional[SupportAssessment] = None
    shap_explanations: Optional[List[ShapExplanation]] = None
    notice: Optional[str] = None

class HealthResponse(BaseModel):
    status: str
    version: str
    distilbert_loaded: bool
    xgboost_loaded: bool
    timestamp: str
