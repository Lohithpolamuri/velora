from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, engine
from app.db_migrate import ensure_columns
from app.models.user import User
from app.models.session import Session
from app.models.email_verification import EmailVerificationToken
from app.models.workspace import Workspace, WorkspaceMember
from app.models.invitation import WorkspaceInvitation
from app.models.activity import ActivityLog
from app.models.notification import Notification
from app.models.subscription import Subscription
from app.models.preferences import UserPreference
from app.models.project import Project
from app.routes import auth, dashboard, invitations


Base.metadata.create_all(bind=engine)
ensure_columns(engine)

app = FastAPI(title="Vertofi SaaS Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", settings.CSRF_HEADER_NAME],
)

app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(invitations.router)


@app.get("/")
def read_root():
    return {"message": "Vertofi backend is running"}