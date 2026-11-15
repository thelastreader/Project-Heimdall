import os
from pathlib import Path

                                                
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
RAW_DATA_DIR = DATA_DIR / "raw"
PROCESSED_DATA_DIR = DATA_DIR / "processed"
MODEL_DIR = DATA_DIR / "models"
LEGACY_UPLOAD_DIR = DATA_DIR / "uploads"
HEATMAP_DIR = DATA_DIR / "heatmaps"
LEGACY_REPORT_DIR = DATA_DIR / "reports"
PATIENTS_DIR = DATA_DIR / "patients"


def patient_scans_dir(patient_id: str) -> Path:
    """Return the patient-scoped scan directory and create it when needed."""
    path = PATIENTS_DIR / str(patient_id) / "scans"
    path.mkdir(parents=True, exist_ok=True)
    return path


def patient_reports_dir(patient_id: str) -> Path:
    """Return the patient-scoped report directory and create it when needed."""
    path = PATIENTS_DIR / str(patient_id) / "reports"
    path.mkdir(parents=True, exist_ok=True)
    return path

                                              
# MySQL is the production system of record.  The SQLite path remains only as the
# explicit source for the one-time ETL script; application code must not use it.
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "mysql+aiomysql://heimdall_app:change-this-in-production@mysql:3306/heimdall",
)
SQLITE_MIGRATION_PATH = DATA_DIR / "tb_detection.db"

                                                    
APP_ENV = os.getenv("APP_ENV", "production").strip().lower()
SESSION_COOKIE_NAME = "tb_session"
SESSION_COOKIE_SECURE = APP_ENV not in {"development", "test", "local"}
SESSION_DURATION_HOURS = int(os.getenv("SESSION_DURATION_HOURS", "12"))
REMEMBER_SESSION_DAYS = int(os.getenv("REMEMBER_SESSION_DAYS", "30"))
AUTH_EVENT_RETENTION_DAYS = int(os.getenv("AUTH_EVENT_RETENTION_DAYS", "180"))
TEST_ADMIN_ENABLED = os.getenv("TB_ENABLE_TEST_ADMIN", "false").lower() == "true"
TEST_ADMIN_EMAIL = os.getenv("TB_TEST_ADMIN_EMAIL", "test@email.com" if APP_ENV != "production" else "")
TEST_ADMIN_PASSWORD = os.getenv("TB_TEST_ADMIN_PASSWORD", "Test" if APP_ENV != "production" else "")

                                                    
                                                                              
                                                                  
MULTIMODAL_MODEL_PATH = Path(os.getenv(
    "MULTIMODAL_MODEL_PATH",
    str(Path(__file__).resolve().parent / "models" / "heimdall_best.pt"),
))
IMAGE_SIZE = 224
NUM_CLASSES_DETECTION = 2                
NUM_CLASSES_SEVERITY = 4                                        
NUM_CLASSES_OUTCOME = 3                            
CLINICAL_FEATURES = 5

                                                
DETECTION_LABELS = {0: "Normal", 1: "TB"}
SEVERITY_LABELS = {0: "Normal", 1: "Early", 2: "Moderate", 3: "Severe"}
OUTCOME_LABELS = {0: "Cure", 1: "Fail", 2: "Relapse"}
SEVERITY_COLORS = {
    "Normal": "#10b981",
    "Early": "#f59e0b",
    "Moderate": "#f97316",
    "Severe": "#ef4444",
}

                                              
BATCH_SIZE = 16
LEARNING_RATE = 5e-4
EPOCHS = 50
EARLY_STOPPING_PATIENCE = 10
TRAIN_SPLIT = 0.70
VAL_SPLIT = 0.15
TEST_SPLIT = 0.15

                                                  
MAX_FILE_SIZE_MB = 10
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".tiff"}
CORS_ORIGINS = [origin.strip().rstrip("/") for origin in os.getenv(
    "TB_CORS_ORIGINS",
    "http://localhost:3000,http://localhost:3001,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:3001,http://127.0.0.1:5173",
).split(",") if origin.strip()]

                                                            
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]

                                                              
for d in [RAW_DATA_DIR, PROCESSED_DATA_DIR, MODEL_DIR, HEATMAP_DIR, PATIENTS_DIR]:
    d.mkdir(parents=True, exist_ok=True)
