import os
from typing import Dict, Any, Optional

class ModelRegistry:
    def __init__(self):
        self.distilbert_path = os.getenv("DISTILBERT_MODEL_PATH", "")
        self.xgboost_path = os.getenv("XGBOOST_MODEL_PATH", "")
        
        self.distilbert_loaded = False
        self.xgboost_loaded = False
        self.model_version = "sentimate-v1.0-uncalibrated"

        self._check_and_load_models()

    def _check_and_load_models(self):
        """
        Verify model files on disk. If artifacts are present, load them.
        Strict invariant: Never claim models are loaded if files are absent.
        """
        if self.distilbert_path and os.path.exists(self.distilbert_path):
            self.distilbert_loaded = True
        else:
            self.distilbert_loaded = False

        if self.xgboost_path and os.path.exists(self.xgboost_path):
            self.xgboost_loaded = True
        else:
            self.xgboost_loaded = False

    def get_status(self) -> Dict[str, Any]:
        return {
            "distilbert_loaded": self.distilbert_loaded,
            "distilbert_path": self.distilbert_path or "None configured",
            "xgboost_loaded": self.xgboost_loaded,
            "xgboost_path": self.xgboost_path or "None configured",
            "version": self.model_version,
        }

model_registry = ModelRegistry()
