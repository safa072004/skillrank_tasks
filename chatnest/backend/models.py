from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class Message(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    user_id: str
    content: str
    timestamp: Optional[datetime] = None
    conversation_id: Optional[str] = None

class Conversation(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    conversation_id: Optional[str] = None
    title: Optional[str] = None
    user_id: Optional[str] = None
    user_ids: Optional[List[str]] = []
    messages: Optional[List[Message]] = []
    created_at: Optional[datetime] = None

class User(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    username: str
    hashed_password: str 

class UserCreate(BaseModel):
    username: str
    password: str
    email: Optional[str] = None
    firebase_uid: Optional[str] = None

class UserLogin(BaseModel):
    username: str
    password: str
    email: Optional[str] = None
    firebase_uid: Optional[str] = None

# MCP-related models
class MCPMessageRequest(BaseModel):
    message: str
    context: Optional[Dict[str, Any]] = None
    conversation_id: Optional[str] = None

class MCPToolCallRequest(BaseModel):
    tool_name: str
    parameters: Dict[str, Any]

class MCPContextRequest(BaseModel):
    context_data: Dict[str, Any]

class MCPResponse(BaseModel):
    response: str
    success: bool
    timestamp: str
    error: Optional[str] = None 