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
from app.models.user import User
from app.services import (
    get_or_create_workspace,
    add_activity,
    add_notification,
    serialize_dt,
)

router = APIRouter(prefix="/api", tags=["dashboard"])


class ProjectCreate(BaseModel):
    name: str


class MemberAdd(BaseModel):
    email: EmailStr


class PreferenceUpdate(BaseModel):
    theme: str
    accent: str
    font: str
    layout: str
    sidebar: str
    email_notifications: bool
    product_updates: bool


PLAN_ACTION_LIMITS = {
    "Free": 100,
    "Pro": 1000,
    "Business": 10000,
}

PLAN_MEMBER_LIMITS = {
    "Free": 5,
    "Pro": 100,
    "Business": None,
}


def current_workspace(db, user):
    return get_or_create_workspace(db, user)


def subscription_for(db, user):
    row = (
        db.query(Subscription)
        .filter(Subscription.user_id == user.id)
        .first()
    )

    if not row:
        row = Subscription(
            user_id=user.id,
            plan="Free",
            usage_limit=PLAN_ACTION_LIMITS["Free"],
            usage_count=0,
        )
        db.add(row)
        db.commit()
        db.refresh(row)

    return row


def workspace_member_count(db, workspace_id):
    return (
        db.query(WorkspaceMember)
        .filter(
            WorkspaceMember.workspace_id
            == workspace_id
        )
        .count()
    )


@router.get("/dashboard")
def dashboard(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    workspace = current_workspace(
        db,
        current_user,
    )

    membership_count = workspace_member_count(
        db,
        workspace.id,
    )

    active_cutoff = datetime.now(
        timezone.utc
    ) - timedelta(minutes=5)

    members = (
        db.query(WorkspaceMember)
        .filter(
            WorkspaceMember.workspace_id
            == workspace.id
        )
        .all()
    )

    member_ids = [
        member.user_id
        for member in members
    ]

    active_members = 0

    if member_ids:
        from app.models.session import (
            Session as UserSession,
        )

        active_members = (
            db.query(UserSession)
            .filter(
                UserSession.user_id.in_(
                    member_ids
                ),
                UserSession.last_seen_at
                >= active_cutoff,
            )
            .count()
        )

    activity_count = (
        db.query(ActivityLog)
        .filter(
            ActivityLog.user_id
            == current_user.id
        )
        .count()
    )

    unread = (
        db.query(Notification)
        .filter(
            Notification.user_id
            == current_user.id,
            Notification.is_read == False,
        )
        .count()
    )

    projects = (
        db.query(Project)
        .filter(
            Project.workspace_id
            == workspace.id
        )
        .count()
    )

    subscription = subscription_for(
        db,
        current_user,
    )

    usage_percent = (
        round(
            (
                subscription.usage_count
                / subscription.usage_limit
            )
            * 100
        )
        if subscription.usage_limit
        else 0
    )

    return {
        "workspace": {
            "id": workspace.id,
            "name": workspace.name,
        },
        "stats": {
            "activity": activity_count,
            "projects": projects,
            "members": membership_count,
            "active_members": active_members,
            "unread_notifications": unread,
            "usage_percent": usage_percent,
        },
        "subscription": {
            "plan": subscription.plan,
            "status": subscription.status,
            "usage_count": subscription.usage_count,
            "usage_limit": subscription.usage_limit,
            "member_count": membership_count,
            "member_limit": PLAN_MEMBER_LIMITS[
                subscription.plan
            ],
        },
    }


@router.post("/heartbeat")
def heartbeat(
    request: Request,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    token = request.cookies.get(
        "vertofi_session"
    )

    from app.auth.session_manager import (
        hash_session_token,
    )
    from app.models.session import (
        Session as UserSession,
    )

    session = (
        db.query(UserSession)
        .filter(
            UserSession.token_hash
            == hash_session_token(token)
        )
        .first()
        if token
        else None
    )

    if session:
        session.last_seen_at = (
            datetime.now(timezone.utc)
        )
        db.commit()

    return {"ok": True}


@router.get("/activity")
def activity(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(ActivityLog)
        .filter(
            ActivityLog.user_id
            == current_user.id
        )
        .order_by(
            ActivityLog.created_at.desc()
        )
        .limit(100)
        .all()
    )

    return [
        {
            "id": row.id,
            "title": row.action,
            "description": row.description,
            "timestamp": serialize_dt(
                row.created_at
            ),
        }
        for row in rows
    ]


@router.get("/notifications")
def notifications(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(Notification)
        .filter(
            Notification.user_id
            == current_user.id
        )
        .order_by(
            Notification.created_at.desc()
        )
        .limit(100)
        .all()
    )

    return [
        {
            "id": row.id,
            "title": row.title,
            "message": row.message,
            "unread": not row.is_read,
            "timestamp": serialize_dt(
                row.created_at
            ),
        }
        for row in rows
    ]


@router.post(
    "/notifications/{notification_id}/read"
)
def mark_notification(
    notification_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
    _csrf=Depends(verify_csrf),
):
    row = (
        db.query(Notification)
        .filter(
            Notification.id
            == notification_id,
            Notification.user_id
            == current_user.id,
        )
        .first()
    )

    if not row:
        raise HTTPException(
            status_code=404,
            detail="Notification not found",
        )

    row.is_read = True
    db.commit()

    return {"ok": True}


@router.get("/workspace")
def workspace(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ws = current_workspace(
        db,
        current_user,
    )

    members = (
        db.query(WorkspaceMember)
        .filter(
            WorkspaceMember.workspace_id
            == ws.id
        )
        .all()
    )

    result = []

    for member in members:
        user = (
            db.query(User)
            .filter(User.id == member.user_id)
            .first()
        )

        result.append(
            {
                "id": member.id,
                "user_id": member.user_id,
                "name": (
                    user.name
                    if user
                    else "Unknown"
                ),
                "email": (
                    user.email
                    if user
                    else ""
                ),
                "role": member.role,
                "joined_at": serialize_dt(
                    member.joined_at
                ),
            }
        )

    return {
        "id": ws.id,
        "name": ws.name,
        "members": result,
    }


@router.post("/workspace/members")
def add_workspace_member(
    payload: MemberAdd,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
    _csrf=Depends(verify_csrf),
):
    workspace = current_workspace(
        db,
        current_user,
    )

    email = str(payload.email).strip().lower()

    if email == current_user.email.lower():
        raise HTTPException(
            status_code=400,
            detail="You are already a member of this workspace.",
        )

    target_user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if not target_user:
        raise HTTPException(
            status_code=404,
            detail="No Vertofi account exists with this email. The user must register first.",
        )

    if not target_user.is_verified:
        raise HTTPException(
            status_code=400,
            detail="This Vertofi account has not completed email verification yet.",
        )

    existing = (
        db.query(WorkspaceMember)
        .filter(
            WorkspaceMember.workspace_id
            == workspace.id,
            WorkspaceMember.user_id
            == target_user.id,
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=400,
            detail="This user is already a workspace member.",
        )

    subscription = subscription_for(
        db,
        current_user,
    )

    member_limit = PLAN_MEMBER_LIMITS[
        subscription.plan
    ]

    member_count = workspace_member_count(
        db,
        workspace.id,
    )

    if (
        member_limit is not None
        and member_count >= member_limit
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                f"{subscription.plan} plan allows "
                f"up to {member_limit} workspace members."
            ),
        )

    db.add(
        WorkspaceMember(
            workspace_id=workspace.id,
            user_id=target_user.id,
            role="member",
        )
    )

    db.commit()

    add_activity(
        db,
        current_user.id,
        workspace.id,
        "Added a workspace member",
        f"Added {target_user.name} to {workspace.name}",
    )

    add_notification(
        db,
        target_user.id,
        workspace.id,
        "Added to workspace",
        f"{current_user.name} added you to {workspace.name}.",
    )

    return {
        "message": f"{target_user.name} was added to the workspace.",
        "member": {
            "user_id": target_user.id,
            "name": target_user.name,
            "email": target_user.email,
            "role": "member",
        },
        "member_count": member_count + 1,
        "member_limit": member_limit,
    }


@router.get("/projects")
def projects(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ws = current_workspace(
        db,
        current_user,
    )

    rows = (
        db.query(Project)
        .filter(
            Project.workspace_id
            == ws.id
        )
        .order_by(
            Project.created_at.desc()
        )
        .all()
    )

    return [
        {
            "id": row.id,
            "name": row.name,
            "status": row.status,
            "created_at": serialize_dt(
                row.created_at
            ),
        }
        for row in rows
    ]


@router.post("/projects", status_code=201)
def create_project(
    payload: ProjectCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
    _csrf=Depends(verify_csrf),
):
    name = payload.name.strip()

    if not name:
        raise HTTPException(
            status_code=400,
            detail="Project name is required",
        )

    ws = current_workspace(
        db,
        current_user,
    )

    project = Project(
        workspace_id=ws.id,
        created_by_user_id=current_user.id,
        name=name,
    )

    db.add(project)
    db.commit()
    db.refresh(project)

    add_activity(
        db,
        current_user.id,
        ws.id,
        "Created a project",
        f"Created {name}",
    )

    add_notification(
        db,
        current_user.id,
        ws.id,
        "Project created",
        f"{name} is now active in your workspace.",
    )

    return {
        "id": project.id,
        "name": project.name,
        "status": project.status,
    }


@router.delete("/projects/{project_id}")
def delete_project(
    project_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
    _csrf=Depends(verify_csrf),
):
    ws = current_workspace(
        db,
        current_user,
    )

    project = (
        db.query(Project)
        .filter(
            Project.id == project_id,
            Project.workspace_id
            == ws.id,
        )
        .first()
    )

    if not project:
        raise HTTPException(
            status_code=404,
            detail="Project not found",
        )

    name = project.name

    db.delete(project)
    db.commit()

    add_activity(
        db,
        current_user.id,
        ws.id,
        "Deleted a project",
        f"Removed {name}",
    )

    return {"ok": True}


@router.get("/subscription")
def subscription(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = (
        db.query(Subscription)
        .filter(
            Subscription.user_id
            == current_user.id
        )
        .first()
    )

    if not row:
        row = Subscription(
            user_id=current_user.id,
            plan="Free",
            usage_limit=100,
            usage_count=0,
        )
        db.add(row)
        db.commit()
        db.refresh(row)

    workspace = current_workspace(
        db,
        current_user,
    )

    member_count = (
        db.query(WorkspaceMember)
        .filter(
            WorkspaceMember.workspace_id
            == workspace.id
        )
        .count()
    )

    member_limits = {
        "Free": 5,
        "Pro": 100,
        "Business": None,
    }

    return {
        "plan": row.plan,
        "status": row.status,
        "usage_count": row.usage_count,
        "usage_limit": row.usage_limit,
        "member_count": member_count,
        "member_limit": member_limits[row.plan],
    }


@router.post("/subscription")
def change_subscription(
    payload: dict,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
    _csrf=Depends(verify_csrf),
):
    plan = str(
        payload.get(
            "plan",
            "Free",
        )
    )

    if plan not in PLAN_ACTION_LIMITS:
        raise HTTPException(
            status_code=400,
            detail="Invalid plan",
        )

    ws = current_workspace(
        db,
        current_user,
    )

    current_members = workspace_member_count(
        db,
        ws.id,
    )

    member_limit = PLAN_MEMBER_LIMITS[
        plan
    ]

    if (
        member_limit is not None
        and current_members > member_limit
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                f"Your workspace already has "
                f"{current_members} members. "
                f"The {plan} plan allows only "
                f"{member_limit}."
            ),
        )

    row = subscription_for(
        db,
        current_user,
    )

    row.plan = plan
    row.usage_limit = PLAN_ACTION_LIMITS[
        plan
    ]

    db.commit()
    db.refresh(row)

    add_activity(
        db,
        current_user.id,
        ws.id,
        "Changed subscription plan",
        f"Selected the {plan} plan",
    )

    return {
        "plan": row.plan,
        "status": row.status,
        "usage_count": row.usage_count,
        "usage_limit": row.usage_limit,
        "member_count": current_members,
        "member_limit": member_limit,
        "billing_cycle": (
            "Forever"
            if plan == "Free"
            else "Monthly"
        ),
    }


@router.get("/preferences")
def preferences(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = (
        db.query(UserPreference)
        .filter(
            UserPreference.user_id
            == current_user.id
        )
        .first()
    )

    if not row:
        row = UserPreference(
            user_id=current_user.id
        )
        db.add(row)
        db.commit()
        db.refresh(row)

    return {
        "theme": row.theme,
        "accent": row.accent,
        "font": row.font,
        "layout": row.layout,
        "sidebar": row.sidebar,
        "email_notifications": (
            row.email_notifications
            == "true"
        ),
        "product_updates": (
            row.product_updates
            == "true"
        ),
    }


@router.put("/preferences")
def update_preferences(
    payload: PreferenceUpdate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
    _csrf=Depends(verify_csrf),
):
    allowed = {
        "theme": {
            "light",
            "dark",
            "system",
        },
        "accent": {
            "green",
            "blue",
            "purple",
            "gold",
            "rose",
        },
        "font": {
            "inter",
            "system",
            "serif",
            "mono",
        },
        "layout": {
            "comfortable",
            "compact",
            "spacious",
        },
        "sidebar": {
            "expanded",
            "compact",
        },
    }

    for field, values in allowed.items():
        if getattr(payload, field) not in values:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid {field}",
            )

    row = (
        db.query(UserPreference)
        .filter(
            UserPreference.user_id
            == current_user.id
        )
        .first()
    )

    if not row:
        row = UserPreference(
            user_id=current_user.id
        )
        db.add(row)

    row.theme = payload.theme
    row.accent = payload.accent
    row.font = payload.font
    row.layout = payload.layout
    row.sidebar = payload.sidebar
    row.email_notifications = (
        "true"
        if payload.email_notifications
        else "false"
    )
    row.product_updates = (
        "true"
        if payload.product_updates
        else "false"
    )

    db.commit()
    db.refresh(row)

    return {
        "theme": row.theme,
        "accent": row.accent,
        "font": row.font,
        "layout": row.layout,
        "sidebar": row.sidebar,
        "email_notifications": (
            row.email_notifications
            == "true"
        ),
        "product_updates": (
            row.product_updates
            == "true"
        ),
    }