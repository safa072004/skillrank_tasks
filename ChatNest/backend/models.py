from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class Message(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    user_id: str
    content: str
    timestamp: Optional[datetime] = None
    conversation_id: Optional[str] = None

class Conversation(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    user_ids: List[str]
    messages: Optional[List[Message]] = []
    created_at: datetime 