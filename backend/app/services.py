from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.models.workspace import Workspace, WorkspaceMember
from app.models.activity import ActivityLog
from app.models.notification import Notification
from app.models.subscription import Subscription
from app.models.preferences import UserPreference
from app.models.project import Project


def get_or_create_workspace(db: Session, user):
    membership = db.query(WorkspaceMember).filter(WorkspaceMember.user_id == user.id).first()
    if membership:
        workspace = db.query(Workspace).filter(Workspace.id == membership.workspace_id).first()
        if workspace:
            return workspace
    workspace = Workspace(name=f"{user.name}'s Workspace", owner_id=user.id)
    db.add(workspace)
    db.flush()
    db.add(WorkspaceMember(workspace_id=workspace.id, user_id=user.id, role="owner"))
    if not db.query(Subscription).filter(Subscription.user_id == user.id).first():
        db.add(Subscription(user_id=user.id, plan="Free", usage_limit=100, usage_count=0))
    if not db.query(UserPreference).filter(UserPreference.user_id == user.id).first():
        db.add(UserPreference(user_id=user.id))
    db.commit()
    db.refresh(workspace)
    return workspace


def add_activity(db: Session, user_id: int, workspace_id: int | None, action: str, description: str):
    item = ActivityLog(user_id=user_id, workspace_id=workspace_id, action=action, description=description)
    db.add(item)
    db.commit()
    return item


def add_notification(db: Session, user_id: int, workspace_id: int | None, title: str, message: str):
    item = Notification(user_id=user_id, workspace_id=workspace_id, title=title, message=message)
    db.add(item)
    db.commit()
    return item


def serialize_dt(value):
    if not value:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.isoformat()
