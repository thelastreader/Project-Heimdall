"""Bootstraps the FastAPI service that serves Heimdall TB screening.

Initializes persistent storage, provisions the configured development administrator, loads the validated binary checkpoint, and mounts authenticated API routes.
"""

import torch
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import (
    APP_ENV, CORS_ORIGINS, MULTIMODAL_MODEL_PATH,
    TEST_ADMIN_ENABLED, TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD,
)
from app.utils.database import close_db, init_db
from app.utils.auth import hash_password
from app.utils.database import ensure_test_admin
from app.routes import auth, upload, predict, patients, report
from app.models.multimodal_model import Heimdall


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initializes database and model state before accepting API requests.

    Raises:
        RuntimeError: If required administrator settings or the Heimdall checkpoint are unavailable.
    """
    print("🚀 Starting TB Detection System...")
    
                         
    await init_db()
    if TEST_ADMIN_ENABLED:
        if not TEST_ADMIN_EMAIL or not TEST_ADMIN_PASSWORD:
            raise RuntimeError("Privileged account provisioning is enabled but TB_TEST_ADMIN_EMAIL/PASSWORD are missing")
        if APP_ENV == "production" and len(TEST_ADMIN_PASSWORD) < 16:
            raise RuntimeError("Production administrator passwords must contain at least 16 characters")
        await ensure_test_admin(TEST_ADMIN_EMAIL, hash_password(TEST_ADMIN_PASSWORD))
        print("🔐 Development test administrator is provisioned")
    
                                                                            
                                                                                
                                                                                                     
    print("📦 Loading Heimdall checkpoint...")
    if not MULTIMODAL_MODEL_PATH.is_file():
        raise RuntimeError(f"Required Heimdall checkpoint not found: {MULTIMODAL_MODEL_PATH}")

    # The weights must be explicitly mapped to CPU since they were trained on a CUDA GPU
    checkpoint = torch.load(
        str(MULTIMODAL_MODEL_PATH),
        map_location=torch.device('cpu'),
        weights_only=True,
    )
    state = checkpoint.get("state_dict", checkpoint) if isinstance(checkpoint, dict) else checkpoint
    multimodal_model = Heimdall(pretrained=False)
    multimodal_model.load_state_dict(state, strict=True)
    multimodal_model.eval()
    print(f"✅ Loaded Heimdall checkpoint: {MULTIMODAL_MODEL_PATH}")
    
    predict.set_model(multimodal_model)

    print("✅ TB Detection System ready!")
    print("📊 API docs available at http://localhost:8000/docs")
    
    yield
    await close_db()
    print("👋 Shutting down TB Detection System...")
app = FastAPI(
    title="TB Severity Assessment System",
    description="Multi-Modal Tuberculosis Detection, Severity Classification, and Progression Tracking",
    version="1.0.0",
    lifespan=lifespan,
)

      
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

        
app.include_router(upload.router)
app.include_router(auth.router)
app.include_router(predict.router)
app.include_router(patients.router)
app.include_router(report.router)


@app.get("/")
async def root():
    """Returns public service metadata for the API root endpoint."""
    return {
        "name": "TB Severity Assessment System",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health")
async def health_check():
    """Returns a lightweight health payload for container probes."""
    return {"status": "healthy"}
