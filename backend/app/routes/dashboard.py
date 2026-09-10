from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.dependencies import get_current_user
from app.auth.csrf import verify_csrf
from app.models.workspace import WorkspaceMember
from app.models.activity import ActivityLog
from app.models.notification import Notification
from app.models.subscription import Subscription
from app.models.preferences import UserPreference
from app.models.project import Project
from app.services import get_or_create_workspace, add_activity, add_notification, serialize_dt

router = APIRouter(prefix="/api", tags=["dashboard"])

class ProjectCreate(BaseModel):
    name: str

class InviteCreate(BaseModel):
    email: EmailStr

class PreferenceUpdate(BaseModel):
    theme: str
    accent: str
    font: str
    layout: str
    sidebar: str
    email_notifications: bool
    product_updates: bool


def membership_for(db, user, workspace_id):
    return db.query(WorkspaceMember).filter(WorkspaceMember.user_id == user.id, WorkspaceMember.workspace_id == workspace_id).first()


def current_workspace(db, user):
    return get_or_create_workspace(db, user)

@router.get("/dashboard")
def dashboard(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    workspace = current_workspace(db, current_user)
    membership_count = db.query(WorkspaceMember).filter(WorkspaceMember.workspace_id == workspace.id).count()
    active_cutoff = datetime.now(timezone.utc) - timedelta(minutes=5)
    sessions = db.query(WorkspaceMember, ).filter(WorkspaceMember.workspace_id == workspace.id).all()
    member_ids = [m.user_id for m in sessions]
    active_members = 0
    if member_ids:
        from app.models.session import Session as UserSession
        active_members = db.query(UserSession).filter(UserSession.user_id.in_(member_ids), UserSession.last_seen_at >= active_cutoff).count()
    activity_count = db.query(ActivityLog).filter(ActivityLog.user_id == current_user.id).count()
    unread = db.query(Notification).filter(Notification.user_id == current_user.id, Notification.is_read == False).count()
    projects = db.query(Project).filter(Project.workspace_id == workspace.id).count()
    subscription = db.query(Subscription).filter(Subscription.user_id == current_user.id).first()
    if not subscription:
        subscription = Subscription(user_id=current_user.id, plan="Free", usage_limit=100, usage_count=0)
        db.add(subscription)
        db.commit()
    usage_percent = round((subscription.usage_count / subscription.usage_limit) * 100) if subscription.usage_limit else 0
    return {"workspace": {"id": workspace.id, "name": workspace.name}, "stats": {"activity": activity_count, "projects": projects, "members": membership_count, "active_members": active_members, "unread_notifications": unread, "usage_percent": usage_percent}, "subscription": {"plan": subscription.plan, "status": subscription.status, "usage_count": subscription.usage_count, "usage_limit": subscription.usage_limit}}

@router.post("/heartbeat")
def heartbeat(request: Request, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    token = request.cookies.get("vertofi_session")
    from app.auth.session_manager import hash_session_token
    from app.models.session import Session as UserSession
    session = db.query(UserSession).filter(UserSession.token_hash == hash_session_token(token)).first() if token else None
    if session:
        session.last_seen_at = datetime.now(timezone.utc)
        db.commit()
    return {"ok": True}

@router.get("/activity")
def activity(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.query(ActivityLog).filter(ActivityLog.user_id == current_user.id).order_by(ActivityLog.created_at.desc()).limit(100).all()
    return [{"id": r.id, "title": r.action, "description": r.description, "timestamp": serialize_dt(r.created_at)} for r in rows]

@router.get("/notifications")
def notifications(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.query(Notification).filter(Notification.user_id == current_user.id).order_by(Notification.created_at.desc()).limit(100).all()
    return [{"id": r.id, "title": r.title, "message": r.message, "unread": not r.is_read, "timestamp": serialize_dt(r.created_at)} for r in rows]

@router.post("/notifications/{notification_id}/read")
def mark_notification(notification_id: int, current_user=Depends(get_current_user), db: Session = Depends(get_db), _csrf=Depends(verify_csrf)):
    row = db.query(Notification).filter(Notification.id == notification_id, Notification.user_id == current_user.id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Notification not found")
    row.is_read = True
    db.commit()
    return {"ok": True}

@router.get("/workspace")
def workspace(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    ws = current_workspace(db, current_user)
    members = db.query(WorkspaceMember).filter(WorkspaceMember.workspace_id == ws.id).all()
    from app.models.user import User
    result = []
    for m in members:
        u = db.query(User).filter(User.id == m.user_id).first()
        result.append({"id": m.id, "user_id": m.user_id, "name": u.name if u else "Unknown", "email": u.email if u else "", "role": m.role, "joined_at": serialize_dt(m.joined_at)})
    return {"id": ws.id, "name": ws.name, "members": result}

@router.get("/projects")
def projects(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    ws = current_workspace(db, current_user)
    rows = db.query(Project).filter(Project.workspace_id == ws.id).order_by(Project.created_at.desc()).all()
    return [{"id": r.id, "name": r.name, "status": r.status, "created_at": serialize_dt(r.created_at)} for r in rows]

@router.post("/projects", status_code=201)
def create_project(payload: ProjectCreate, current_user=Depends(get_current_user), db: Session = Depends(get_db), _csrf=Depends(verify_csrf)):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Project name is required")
    ws = current_workspace(db, current_user)
    project = Project(workspace_id=ws.id, created_by_user_id=current_user.id, name=name)
    db.add(project)
    db.commit()
    add_activity(db, current_user.id, ws.id, "Created a project", f"Created {name}")
    add_notification(db, current_user.id, ws.id, "Project created", f"{name} is now active in your workspace.")
    return {"id": project.id, "name": project.name, "status": project.status}

@router.delete("/projects/{project_id}")
def delete_project(project_id: int, current_user=Depends(get_current_user), db: Session = Depends(get_db), _csrf=Depends(verify_csrf)):
    ws = current_workspace(db, current_user)
    project = db.query(Project).filter(Project.id == project_id, Project.workspace_id == ws.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    name = project.name
    db.delete(project)
    db.commit()
    add_activity(db, current_user.id, ws.id, "Deleted a project", f"Removed {name}")
    return {"ok": True}

@router.get("/subscription")
def subscription(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    row = db.query(Subscription).filter(Subscription.user_id == current_user.id).first()
    if not row:
        row = Subscription(user_id=current_user.id)
        db.add(row); db.commit(); db.refresh(row)
    return {"plan": row.plan, "status": row.status, "usage_count": row.usage_count, "usage_limit": row.usage_limit}

@router.post("/subscription")
def change_subscription(payload: dict, current_user=Depends(get_current_user), db: Session = Depends(get_db), _csrf=Depends(verify_csrf)):
    plan = str(payload.get("plan", "Free"))
    if plan not in {"Free", "Pro", "Business"}:
        raise HTTPException(status_code=400, detail="Invalid plan")
    row = db.query(Subscription).filter(Subscription.user_id == current_user.id).first()
    if not row:
        row = Subscription(user_id=current_user.id); db.add(row)
    limits = {"Free": 100, "Pro": 1000, "Business": 10000}
    row.plan = plan; row.usage_limit = limits[plan]
    db.commit()
    ws = current_workspace(db, current_user)
    add_activity(db, current_user.id, ws.id, "Changed subscription plan", f"Selected the {plan} plan")
    return {"plan": row.plan, "status": row.status, "usage_count": row.usage_count, "usage_limit": row.usage_limit}

@router.get("/preferences")
def preferences(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    row = db.query(UserPreference).filter(UserPreference.user_id == current_user.id).first()
    if not row:
        row = UserPreference(user_id=current_user.id); db.add(row); db.commit(); db.refresh(row)
    return {"theme": row.theme, "accent": row.accent, "font": row.font, "layout": row.layout, "sidebar": row.sidebar, "email_notifications": row.email_notifications == "true", "product_updates": row.product_updates == "true"}

@router.put("/preferences")
def update_preferences(payload: PreferenceUpdate, current_user=Depends(get_current_user), db: Session = Depends(get_db), _csrf=Depends(verify_csrf)):
    allowed = {"theme": {"light", "dark", "system"}, "accent": {"green", "blue", "purple", "gold", "rose"}, "font": {"inter", "system", "serif", "mono"}, "layout": {"comfortable", "compact", "spacious"}, "sidebar": {"expanded", "compact"}}
    for field, values in allowed.items():
        if getattr(payload, field) not in values:
            raise HTTPException(status_code=400, detail=f"Invalid {field}")
    row = db.query(UserPreference).filter(UserPreference.user_id == current_user.id).first()
    if not row:
        row = UserPreference(user_id=current_user.id); db.add(row)
    row.theme = payload.theme; row.accent = payload.accent; row.font = payload.font; row.layout = payload.layout; row.sidebar = payload.sidebar
    row.email_notifications = "true" if payload.email_notifications else "false"
    row.product_updates = "true" if payload.product_updates else "false"
    db.commit()
    return {"ok": True}
