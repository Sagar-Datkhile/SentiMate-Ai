import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)
VALID_TOKEN = "sentimate-ml-internal-secret-token"

def test_health_check():
    """Verify unauthenticated health endpoint returns 200 and truthful status."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data
    assert isinstance(data["distilbert_loaded"], bool)
    assert isinstance(data["xgboost_loaded"], bool)

def test_unauthorized_access_rejected():
    """Verify endpoint rejects requests without valid bearer token."""
    response = client.post(
        "/api/v1/analyze",
        json={"text": "I feel very overwhelmed and stressed."},
    )
    assert response.status_code == 403 or response.status_code == 401

def test_invalid_token_rejected():
    """Verify endpoint rejects requests with invalid bearer token."""
    response = client.post(
        "/api/v1/analyze",
        headers={"Authorization": "Bearer wrong-token"},
        json={"text": "I feel very overwhelmed and stressed."},
    )
    assert response.status_code == 401

def test_authenticated_analyze_fallback_honesty():
    """
    Verify authenticated inference returns valid schema and marks rules-based fallback
    honestly without fabricating SHAP values.
    """
    response = client.post(
        "/api/v1/analyze",
        headers={"Authorization": f"Bearer {VALID_TOKEN}"},
        json={
            "text": "Midterm exams are approaching and I haven't slept more than 4 hours in three nights.",
            "student_context": {
                "recent_sleep_avg": 4.0,
                "recent_stress_avg": 4.5,
                "sgpa_avg": 8.1,
            },
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["is_available"] is True
    assert "text_signals" in data
    assert data["text_signals"]["sentiment"] in ["negative", "neutral", "positive"]

    assessment = data["support_assessment"]
    assert assessment is not None
    assert assessment["risk_level"] in ["low", "moderate", "elevated", "high"]

    if assessment["is_rules_based_fallback"]:
        # Strict requirement: Rules-based output must NEVER be labeled SHAP
        assert data["shap_explanations"] is None
        assert "Preliminary rules-based" in data["notice"]

def test_empty_input_rejected():
    """Verify input validation rejects empty string."""
    response = client.post(
        "/api/v1/analyze",
        headers={"Authorization": f"Bearer {VALID_TOKEN}"},
        json={"text": ""},
    )
    assert response.status_code == 422
