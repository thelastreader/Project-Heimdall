import re
from sqlalchemy.exc import IntegrityError
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field, field_validator

from app.config import (
    CORS_ORIGINS, REMEMBER_SESSION_DAYS, SESSION_COOKIE_NAME,
    SESSION_COOKIE_SECURE, SESSION_DURATION_HOURS,
)
from app.utils.auth import device_category, hash_password, new_session_token, session_token_hash, verify_password
from app.utils.database import (
    create_session, create_user, delete_session, get_session_user,
    get_user_by_email, get_user_by_username, record_login_event,
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


class RegistrationInput(BaseModel):
    first_name: str = Field(min_length=1, max_length=80)
    last_name: str = Field(min_length=1, max_length=80)
    username: str = Field(min_length=3, max_length=32, pattern=r"^[A-Za-z0-9_.-]+$")
    email: str = Field(min_length=5, max_length=254)
    password: str = Field(min_length=8, max_length=128)
    remember_me: bool = False

    @field_validator("first_name", "last_name", "username", "email")
    @classmethod
    def trim_values(cls, value: str) -> str:
        return value.strip()

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        value = value.lower()
        if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", value):
            raise ValueError("Enter a valid email address")
        return value


class LoginInput(BaseModel):
    email: str = Field(min_length=1, max_length=254)
    password: str = Field(min_length=1, max_length=128)
    remember_me: bool = False


def public_user(user: dict) -> dict:
    return {key: user[key] for key in ("id", "first_name", "last_name", "username", "email", "role", "created_at", "updated_at")}


def require_same_origin(request: Request):
    origin = request.headers.get("origin")
    if origin and origin not in CORS_ORIGINS:
        raise HTTPException(status_code=403, detail="Request origin is not allowed")


async def current_user(request: Request, response: Response):
    if request.method not in {"GET", "HEAD", "OPTIONS"}:
        require_same_origin(request)
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="Authentication required")
    user = await get_session_user(session_token_hash(token))
    if not user:
        response.delete_cookie(SESSION_COOKIE_NAME, path="/", httponly=True,
                               secure=SESSION_COOKIE_SECURE, samesite="lax")
        raise HTTPException(status_code=401, detail="Session expired. Please log in again.")
    return user


async def admin_user(user: dict = Depends(current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Administrator access required")
    return user


async def _start_session(response: Response, user_id: int, remember_me: bool):
    token = new_session_token()
    now = datetime.now(timezone.utc)
    duration = timedelta(days=REMEMBER_SESSION_DAYS) if remember_me else timedelta(hours=SESSION_DURATION_HOURS)
    await create_session(session_token_hash(token), user_id, (now + duration).isoformat(), remember_me)
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=SESSION_COOKIE_SECURE,
        samesite="lax",
        path="/",
        max_age=int(duration.total_seconds()) if remember_me else None,
    )


def _request_metadata(request: Request):
    agent = request.headers.get("user-agent", "")
                                                                                  
                                                                         
    ip_address = request.client.host if request.client else None
    return ip_address, agent[:512], device_category(agent)


@router.post("/register")
async def register(data: RegistrationInput, request: Request, response: Response):
    require_same_origin(request)
    if await get_user_by_email(data.email):
        raise HTTPException(409, "An account with that email already exists")
    if await get_user_by_username(data.username):
        raise HTTPException(409, "That username is already taken")
    try:
        user_id = await create_user(
            data.first_name, data.last_name, data.username, data.email,
            hash_password(data.password), "user",
        )
    except IntegrityError:
        raise HTTPException(409, "That email or username is already registered") from None

    ip_address, agent, device = _request_metadata(request)
    await record_login_event(user_id, data.email, True, ip_address, agent, device)
    await _start_session(response, user_id, data.remember_me)
    user = await get_user_by_email(data.email)
    return {"status": "success", "user": public_user(user)}


@router.post("/login")
async def login(data: LoginInput, request: Request, response: Response):
    require_same_origin(request)
    email = data.email.strip().lower()
    user = await get_user_by_email(email)
    ip_address, agent, device = _request_metadata(request)
    valid = bool(user and verify_password(data.password, user["password_hash"]))
    await record_login_event(user["id"] if user else None, email, valid, ip_address, agent, device)
    if not valid:
        raise HTTPException(status_code=401, detail="Email or password is incorrect")
    await _start_session(response, user["id"], data.remember_me)
    return {"status": "success", "user": public_user(user)}


@router.get("/me")
async def me(user: dict = Depends(current_user)):
    return {"status": "success", "user": public_user(user)}


@router.post("/logout")
async def logout(request: Request, response: Response):
    require_same_origin(request)
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if token:
        await delete_session(session_token_hash(token))
    response.delete_cookie(SESSION_COOKIE_NAME, path="/", httponly=True,
                           secure=SESSION_COOKIE_SECURE, samesite="lax")
    return {"status": "success"}
