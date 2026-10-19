from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api.endpoints import router

app = FastAPI(
    title="SentiMate ML & Inference Microservice",
    description="Dedicated microservice for DistilBERT NLP feature extraction, XGBoost risk classification, and TreeSHAP explainability.",
    version="1.0.0",
)

# CORS configuration - restricted to local Next.js origin by default
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
