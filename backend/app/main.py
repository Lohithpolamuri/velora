from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.models.user import User
from app.models.session import Session
from app.routes import auth


Base.metadata.create_all(bind=engine)

app = FastAPI(title="Vertofi SaaS Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type"],
)

app.include_router(auth.router)


@app.get("/")
def read_root():
    return {"message": "Vertofi backend is running"}