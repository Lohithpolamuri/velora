"""
Standalone test — bypasses .env, config.py, and FastAPI entirely.
Fill in the 3 values below directly, then run:  python3 test_smtp.py
"""
import smtplib
from email.message import EmailMessage

SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="lohithpolamuri630@gmail.com"
SMTP_PASSWORD="jaahmraezksprcvt"
SMTP_FROM_EMAIL="lohithpolamuri630@gmail.com"
SMTP_USE_TLS="true"
TEST_RECIPIENT ="lohithpolamuri630@gmail.com"

print(f"Connecting with user={SMTP_USER!r}, password length={len(SMTP_PASSWORD)}")

message = EmailMessage()
message["Subject"] = "Vertofi SMTP test"
message["From"] = SMTP_FROM_EMAIL
message["To"] = TEST_RECIPIENT
message.set_content("This is a standalone SMTP test, no FastAPI involved.")

with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20) as server:
    server.starttls()
    server.login(SMTP_USER, SMTP_PASSWORD)
    server.send_message(message)

print("SUCCESS — email sent.")