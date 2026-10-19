import os
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from ..schemas.analysis import (
    AnalyzeRequest,
    AnalyzeResponse,
    HealthResponse,
)
from ..services.text_analysis import text_analysis_service
from ..services.prediction import prediction_service
from ..models.model_registry import model_registry

router = APIRouter()
security = HTTPBearer()

EXPECTED_API_KEY = os.getenv("ML_SERVICE_API_KEY", "sentimate-ml-internal-secret-token")

def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    """
    Authenticate requests to the ML microservice.
    Rejects unauthorized access without valid shared secret bearer token.
    """
    if credentials.credentials != EXPECTED_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing ML Service authorization token",
        )
    return credentials.credentials

@router.get("/health", response_model=HealthResponse)
def health_check():
    """
    Unauthenticated service health check.
    Exposes model availability state honestly without leaking internal secrets.
    """
    status_info = model_registry.get_status()
    return HealthResponse(
        status="healthy",
        version=status_info["version"],
        distilbert_loaded=status_info["distilbert_loaded"],
        xgboost_loaded=status_info["xgboost_loaded"],
        timestamp=datetime.now(timezone.utc).isoformat(),
    )

@router.post("/api/v1/analyze", response_model=AnalyzeResponse)
def analyze_student_input(
    payload: AnalyzeRequest,
    token: str = Depends(verify_token)
):
    """
    Protected ML Inference Endpoint:
    1. Extracts sentiment, emotions, and linguistic cues from text.
    2. Runs structured XGBoost risk assessment with student context.
    3. Produces TreeSHAP explanations when model is loaded.
    4. Provides transparent preliminary fallback when models are uncalibrated.
    """
    # 1. Text NLP feature extraction
    text_signals = text_analysis_service.analyze_text(payload.text)

    # 2. Risk prediction and SHAP calculation
    assessment, shap_explanations = prediction_service.predict_risk_and_explain(
        text_signals, payload.student_context
    )

    notice = None
    if assessment.is_rules_based_fallback:
        notice = (
            "Preliminary rules-based indicator. XGBoost weights are uncalibrated or unconfigured. "
            "SHAP explanations are withheld to prevent fabricated explanations."
        )

    return AnalyzeResponse(
        is_available=True,
        service_status="operational",
        text_signals=text_signals,
        support_assessment=assessment,
        shap_explanations=shap_explanations,
        notice=notice,
    )
