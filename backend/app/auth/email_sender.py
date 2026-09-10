import smtplib
from email.message import EmailMessage
from app.config import settings


def _send(subject: str, recipient: str, html: str, text: str) -> None:
    if not settings.SMTP_HOST or not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        print(f"SMTP is not configured (dev mode). Email for {recipient}:\n{text}")
        return
    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = settings.SMTP_FROM_EMAIL
    message["To"] = recipient
    message.set_content(text)
    message.add_alternative(html, subtype="html")
    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=20) as server:
        if settings.SMTP_USE_TLS:
            server.starttls()
        if settings.SMTP_USER:
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.send_message(message)


def send_verification_email(email: str, name: str, token: str) -> None:
    link = f"{settings.FRONTEND_URL.rstrip('/')}/verify-email?token={token}"
    text = f"Hi {name},\n\nVerify your Vertofi account:\n{link}\n\nThis link expires in {settings.EMAIL_VERIFICATION_EXPIRE_HOURS} hours."
    html = f"<h2>Verify your Vertofi account</h2><p>Hi {name},</p><p>Click the button below to verify your email.</p><p><a href=\"{link}\">Verify Email</a></p><p>This link expires in {settings.EMAIL_VERIFICATION_EXPIRE_HOURS} hours.</p>"
    _send("Verify your Vertofi account", email, html, text)


def send_invitation_email(email: str, inviter_name: str, workspace_name: str, token: str) -> None:
    link = f"{settings.FRONTEND_URL.rstrip('/')}/invite/{token}"
    text = f"Hi,\n\n{inviter_name} invited you to join {workspace_name} on Vertofi.\n\nAccept the invitation:\n{link}\n\nThis invitation expires in 7 days."
    html = f"<h2>You are invited to Vertofi</h2><p>{inviter_name} invited you to join <strong>{workspace_name}</strong>.</p><p><a href=\"{link}\">Accept Invitation</a></p><p>This invitation expires in 7 days.</p>"
    _send(f"You're invited to join {workspace_name} on Vertofi", email, html, text)
