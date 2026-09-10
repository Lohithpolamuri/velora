from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.dependencies import get_current_user
from app.auth.csrf import verify_csrf
from app.auth.invitation_tokens import create_invitation_token, hash_invitation_token, get_invitation_expiry
from app.auth.email_sender import send_invitation_email
from app.models.invitation import WorkspaceInvitation
from app.models.workspace import Workspace, WorkspaceMember
from app.models.user import User
from app.services import get_or_create_workspace, add_activity, add_notification, serialize_dt
from app.auth.rate_limit import enforce_rate_limit
from app.config import settings

router = APIRouter(prefix="/api/invitations", tags=["invitations"])
class InviteCreate(BaseModel):
    email: EmailStr

@router.get("/{token}")
def invitation_details(token: str, db: Session = Depends(get_db)):
    record = db.query(WorkspaceInvitation).filter(WorkspaceInvitation.token_hash == hash_invitation_token(token)).first()
    if not record:
        raise HTTPException(status_code=404, detail="Invitation not found")
    if record.accepted_at:
        raise HTTPException(status_code=400, detail="Invitation already accepted")
    expires = record.expires_at.replace(tzinfo=timezone.utc) if record.expires_at.tzinfo is None else record.expires_at
    if expires <= datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invitation expired")
    ws = db.query(Workspace).filter(Workspace.id == record.workspace_id).first()
    inviter = db.query(User).filter(User.id == record.invited_by_user_id).first()
    return {"email": record.email, "workspace": ws.name if ws else "Workspace", "inviter": inviter.name if inviter else "A Vertofi member", "expires_at": serialize_dt(record.expires_at)}

@router.post("")
def invite(payload: InviteCreate, request: Request, current_user=Depends(get_current_user), db: Session = Depends(get_db), _csrf=Depends(verify_csrf)):
    enforce_rate_limit(request, "invite", settings.INVITE_MAX_ATTEMPTS, settings.INVITE_WINDOW_SECONDS)
    ws = get_or_create_workspace(db, current_user)
    email = str(payload.email).lower()
    if email == current_user.email.lower():
        raise HTTPException(status_code=400, detail="You cannot invite yourself")
    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user and db.query(WorkspaceMember).filter(WorkspaceMember.workspace_id == ws.id, WorkspaceMember.user_id == existing_user.id).first():
        raise HTTPException(status_code=400, detail="This person is already a workspace member")
    raw = create_invitation_token()
    record = WorkspaceInvitation(workspace_id=ws.id, invited_by_user_id=current_user.id, email=email, token_hash=hash_invitation_token(raw), expires_at=get_invitation_expiry())
    db.add(record); db.commit()
    send_invitation_email(email, current_user.name, ws.name, raw)
    if existing_user:
        add_notification(db, existing_user.id, ws.id, "Workspace invitation", f"{current_user.name} invited you to join {ws.name}.")
    add_activity(db, current_user.id, ws.id, "Invited a teammate", f"Invitation sent to {email}")
    return {"message": "Invitation sent", "email": email}

@router.post("/{token}/accept")
def accept(token: str, current_user=Depends(get_current_user), db: Session = Depends(get_db), _csrf=Depends(verify_csrf)):
    record = db.query(WorkspaceInvitation).filter(WorkspaceInvitation.token_hash == hash_invitation_token(token)).first()
    if not record:
        raise HTTPException(status_code=404, detail="Invitation not found")
    if record.accepted_at:
        raise HTTPException(status_code=400, detail="Invitation already accepted")
    expires = record.expires_at.replace(tzinfo=timezone.utc) if record.expires_at.tzinfo is None else record.expires_at
    if expires <= datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invitation expired")
    if current_user.email.lower() != record.email.lower():
        raise HTTPException(status_code=403, detail="This invitation was sent to a different email address")
    existing = db.query(WorkspaceMember).filter(WorkspaceMember.workspace_id == record.workspace_id, WorkspaceMember.user_id == current_user.id).first()
    if not existing:
        db.add(WorkspaceMember(workspace_id=record.workspace_id, user_id=current_user.id, role="member"))
    record.accepted_at = datetime.now(timezone.utc)
    db.commit()
    ws = db.query(Workspace).filter(Workspace.id == record.workspace_id).first()
    add_activity(db, current_user.id, record.workspace_id, "Joined a workspace", f"Joined {ws.name if ws else 'the workspace'}")
    owner = db.query(User).filter(User.id == ws.owner_id).first() if ws else None
    if owner and owner.id != current_user.id:
        add_notification(db, owner.id, ws.id, "New workspace member", f"{current_user.name} joined your workspace.")
    return {"message": "Invitation accepted", "workspace_id": record.workspace_id}
