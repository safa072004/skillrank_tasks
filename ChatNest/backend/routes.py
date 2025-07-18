from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime
from models import Message, Conversation
from db import db
from bson import ObjectId

router = APIRouter()

# Helper to convert MongoDB document to Pydantic model

def message_helper(message):
    message["_id"] = str(message["_id"])
    return Message(**message)

def conversation_helper(conversation):
    conversation["_id"] = str(conversation["_id"])
    return Conversation(**conversation)

@router.post("/messages/", response_model=Message)
async def send_message(message: Message):
    data = message.dict(by_alias=True)
    if not data.get("timestamp"):
        data["timestamp"] = datetime.utcnow()
    # Remove _id if it's None so MongoDB can auto-generate it
    if data.get("_id") is None:
        data.pop("_id")
    result = await db.messages.insert_one(data)
    data["_id"] = result.inserted_id
    return message_helper(data)

@router.get("/messages/{conversation_id}", response_model=List[Message])
async def get_messages(conversation_id: str):
    messages = []
    cursor = db.messages.find({"conversation_id": conversation_id})
    async for doc in cursor:
        messages.append(message_helper(doc))
    return messages

@router.post("/conversations/", response_model=Conversation)
async def create_conversation(conversation: Conversation):
    data = conversation.dict(by_alias=True)
    data["created_at"] = datetime.utcnow()
    result = await db.conversations.insert_one(data)
    data["_id"] = result.inserted_id
    return conversation_helper(data)

@router.get("/conversations/{user_id}", response_model=List[Conversation])
async def get_conversations(user_id: str):
    conversations = []
    cursor = db.conversations.find({"user_ids": user_id})
    async for doc in cursor:
        conversations.append(conversation_helper(doc))
    return conversations 