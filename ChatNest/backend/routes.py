from fastapi import APIRouter, HTTPException, Depends, Request, status
from typing import List
from datetime import datetime, timedelta
from models import Message, Conversation, User
from db import db
from bson import ObjectId
import os
import httpx
from passlib.context import CryptContext
import jwt
from fastapi.security import OAuth2PasswordBearer

SECRET_KEY = os.getenv('JWT_SECRET', 'supersecret')
ALGORITHM = 'HS256'
ACCESS_TOKEN_EXPIRE_MINUTES = 60

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")

router = APIRouter()

def get_password_hash(password):
    return pwd_context.hash(password)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
    user = db.users.find_one({"username": username})
    if not user:
        raise credentials_exception
    return user

@router.post("/register")
async def register(user: dict):
    username = user.get("username")
    password = user.get("password")
    if not username or not password:
        raise HTTPException(status_code=400, detail="Username and password required")
    existing = await db.users.find_one({"username": username})
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    hashed_password = get_password_hash(password)
    user_doc = {"username": username, "hashed_password": hashed_password}
    result = await db.users.insert_one(user_doc)
    return {"msg": "User registered successfully"}

@router.post("/login")
async def login(user: dict):
    username = user.get("username")
    password = user.get("password")
    if not username or not password:
        raise HTTPException(status_code=400, detail="Username and password required")
    user_doc = await db.users.find_one({"username": username})
    if not user_doc or not verify_password(password, user_doc["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    access_token = create_access_token(data={"sub": username})
    return {"access_token": access_token, "token_type": "bearer"}

def message_helper(message):
    message["_id"] = str(message["_id"])
    return Message(**message)

def conversation_helper(conversation):
    conversation["_id"] = str(conversation["_id"])
    return Conversation(**conversation)

@router.post("/messages/", response_model=Message)
async def send_message(message: Message, user=Depends(get_current_user)):
    data = message.dict(by_alias=True)
    if not data.get("timestamp"):
        data["timestamp"] = datetime.utcnow()
    if data.get("_id") is None:
        data.pop("_id")
    result = await db.messages.insert_one(data)
    data["_id"] = result.inserted_id
    return message_helper(data)

@router.get("/messages/{conversation_id}", response_model=List[Message])
async def get_messages(conversation_id: str, user=Depends(get_current_user)):
    messages = []
    cursor = db.messages.find({"conversation_id": conversation_id})
    async for doc in cursor:
        messages.append(message_helper(doc))
    return messages

@router.post("/conversations/", response_model=Conversation)
async def create_conversation(conversation: Conversation, user=Depends(get_current_user)):
    data = conversation.dict(by_alias=True)
    data["created_at"] = datetime.utcnow()
    result = await db.conversations.insert_one(data)
    data["_id"] = result.inserted_id
    return conversation_helper(data)

@router.get("/conversations/{user_id}", response_model=List[Conversation])
async def get_conversations(user_id: str, user=Depends(get_current_user)):
    conversations = []
    cursor = db.conversations.find({"user_ids": user_id})
    async for doc in cursor:
        conversations.append(conversation_helper(doc))
    return conversations

@router.post("/ai/generate")
async def generate_ai_response(request: Request, body: dict, user=Depends(get_current_user)):
    message = body.get('message')
    if not message:
        raise HTTPException(status_code=400, detail='Message is required')
    mistral_api_key = os.getenv('MISTRAL_API_KEY')
    if not mistral_api_key:
        raise HTTPException(status_code=500, detail='Mistral API key not configured')
    system_prompt = 'You are a helpful AI assistant. Provide responses that are appropriate in length and detail for what the user is asking. Be natural and comprehensive when needed, concise when appropriate.'
    payload = {
        'model': 'mistral-large-latest',
        'messages': [
            {'role': 'system', 'content': system_prompt},
            {'role': 'user', 'content': message}
        ],
        'temperature': 0.7,
        'max_tokens': 4000
    }
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            'https://api.mistral.ai/v1/chat/completions',
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {mistral_api_key}'
            },
            json=payload
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail='Mistral API error')
        data = resp.json()
        try:
            return {'response': data['choices'][0]['message']['content']}
        except Exception:
            raise HTTPException(status_code=500, detail='Unexpected response format from Mistral AI') 