from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.database import Base


class UserPreference(Base):
    __tablename__ = "user_preferences"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    theme = Column(String(30), nullable=False, default="light")
    accent = Column(String(30), nullable=False, default="green")
    font = Column(String(30), nullable=False, default="inter")
    layout = Column(String(30), nullable=False, default="comfortable")
    sidebar = Column(String(30), nullable=False, default="expanded")
    email_notifications = Column(String(10), nullable=False, default="true")
    product_updates = Column(String(10), nullable=False, default="true")
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
