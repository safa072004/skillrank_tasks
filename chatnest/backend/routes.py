from fastapi import APIRouter, HTTPException, Depends, Request, status, Query
from typing import List, Dict, Any
from datetime import datetime, timedelta
from models import Message, Conversation, User, MCPMessageRequest, MCPToolCallRequest, MCPContextRequest, MCPResponse, UserCreate, UserLogin
from db import db
from bson import ObjectId
import os
import httpx
import jwt
from fastapi.security import OAuth2PasswordBearer
from mcp_integration import mcp_integration
from firebase_config import firebase_config

SECRET_KEY = os.getenv('JWT_SECRET')
if not SECRET_KEY:
    raise ValueError("JWT_SECRET environment variable is required")
ALGORITHM = 'HS256'
ACCESS_TOKEN_EXPIRE_MINUTES = 60

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")

router = APIRouter()

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        uid: str = payload.get("sub")
        if uid is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
    
    # Get user data from MongoDB
    user = await db.users.find_one({"uid": uid})
    if not user:
        # Fallback to Firebase if not in MongoDB
        firebase_user = firebase_config.get_user_by_uid(uid)
        if not firebase_user:
            raise credentials_exception
        return firebase_user
    
    return user

@router.post("/register")
async def register(user_data: UserCreate):
    """Register a new user"""
    try:
        # Use Firebase UID from request body if provided
        firebase_uid = user_data.firebase_uid
        
        if not firebase_uid:
            # Fallback: create a Firebase user
            firebase_result = firebase_config.create_user(
                email=user_data.email or f"{user_data.username}@chatnest.local",
                password=user_data.password,
                display_name=user_data.username
            )
            
            if not firebase_result:
                raise HTTPException(status_code=400, detail="Failed to create user")
            
            firebase_uid = firebase_result["uid"]
        
        # Store user data in MongoDB
        user_doc = {
            "uid": firebase_uid,
            "username": user_data.username,
            "email": user_data.email or f"{user_data.username}@chatnest.local",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # Insert or update user in MongoDB
        await db.users.update_one(
            {"uid": firebase_uid},
            {"$set": user_doc},
            upsert=True
        )
        
        # Generate JWT token
        access_token = create_access_token(
            data={"sub": firebase_uid}
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "uid": firebase_uid,
                "username": user_data.username,
                "email": user_data.email or f"{user_data.username}@chatnest.local"
            }
        }
        
    except Exception as e:
        print(f"Registration error: {e}")
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")

@router.post("/login")
async def login(user_data: UserLogin):
    """Login user"""
    try:
        # Use Firebase UID from request body if provided
        firebase_uid = user_data.firebase_uid
        
        if not firebase_uid:
            # Fallback: verify user with Firebase
            firebase_result = firebase_config.verify_user(
                email=user_data.email or f"{user_data.username}@chatnest.local",
                password=user_data.password
            )
            
            if not firebase_result:
                raise HTTPException(status_code=401, detail="Invalid credentials")
            
            firebase_uid = firebase_result["uid"]
        
        # Store or update user data in MongoDB
        user_doc = {
            "uid": firebase_uid,
            "username": user_data.username,
            "email": user_data.email or f"{user_data.username}@chatnest.local",
            "updated_at": datetime.utcnow()
        }
        
        # Insert or update user in MongoDB
        await db.users.update_one(
            {"uid": firebase_uid},
            {"$set": user_doc},
            upsert=True
        )
        
        # Generate JWT token
        access_token = create_access_token(
            data={"sub": firebase_uid}
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "uid": firebase_uid,
                "username": user_data.username,
                "email": user_data.email or f"{user_data.username}@chatnest.local"
            }
        }
        
    except Exception as e:
        print(f"Login error: {e}")
        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}")

def message_helper(message):
    message["_id"] = str(message["_id"])
    return Message(**message)

def conversation_helper(conversation):
    """Helper function to format conversation data"""
    # Get basic conversation info
    conversation_id = conversation.get("conversation_id")
    
    return {
        "id": str(conversation["_id"]),
        "conversation_id": conversation.get("conversation_id"),
        "title": conversation.get("title", "New Chat"),
        "user_id": conversation.get("user_id"),
        "user_ids": conversation.get("user_ids", []),
        "messages": [],  # Messages will be loaded separately
        "created_at": conversation.get("created_at"),
        "last_message": "",  # Will be updated by frontend
        "message_count": 0   # Will be updated by frontend
    }

@router.post("/messages/", response_model=Message)
async def send_message(message: Message, user=Depends(get_current_user)):
    data = message.dict(by_alias=True)
    data["user_id"] = user.get("uid")  # Add current user ID
    if not data.get("timestamp"):
        data["timestamp"] = datetime.utcnow()
    if data.get("_id") is None:
        data.pop("_id")
    result = await db.messages.insert_one(data)
    data["_id"] = result.inserted_id
    return message_helper(data)

@router.get("/messages/{conversation_id}", response_model=List[Message])
async def get_messages(conversation_id: str, user=Depends(get_current_user)):
    """Get messages for a specific conversation (only if user owns the conversation)"""
    user_id = user.get("uid")
    
    # First check if the conversation belongs to the user
    conversation = await db.conversations.find_one({"conversation_id": conversation_id, "user_id": user_id})
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found or access denied")
    
    messages = []
    cursor = db.messages.find({"conversation_id": conversation_id}).sort("timestamp", 1)  # Sort by oldest first
    async for doc in cursor:
        messages.append(message_helper(doc))
    return messages

@router.post("/conversations/", response_model=Conversation)
async def create_conversation(conversation: Conversation, user=Depends(get_current_user)):
    data = conversation.dict(by_alias=True)
    data["user_id"] = user.get("uid")  # Add current user ID
    data["created_at"] = datetime.utcnow()
    result = await db.conversations.insert_one(data)
    data["_id"] = result.inserted_id
    return conversation_helper(data)

@router.get("/conversations/", response_model=List[Conversation])
async def get_conversations(user=Depends(get_current_user)):
    """Get all conversations for the current user"""
    conversations = []
    user_id = user.get("uid")
    cursor = db.conversations.find({"user_id": user_id}).sort("created_at", -1)  # Sort by newest first
    async for doc in cursor:
        conversations.append(conversation_helper(doc))
    return conversations 

@router.post("/conversations/new", response_model=Conversation)
async def create_new_conversation(title: str = Query("New Chat", description="Title for the new conversation"), user=Depends(get_current_user)):
    """Create a new conversation for the current user"""
    import uuid
    
    conversation_data = {
        "conversation_id": str(uuid.uuid4()),
        "title": title,
        "user_id": user.get("uid"),
        "created_at": datetime.utcnow()
    }
    
    result = await db.conversations.insert_one(conversation_data)
    conversation_data["_id"] = result.inserted_id
    return conversation_helper(conversation_data) 

@router.post("/ai/generate")
async def generate_ai_response(request: Request, body: dict, user=Depends(get_current_user)):
    """Generate AI response using Mistral API"""
    try:
        message = body.get('message')
        if not message:
            raise HTTPException(status_code=400, detail='Message is required')
        
        print(f"AI request from user {user.get('uid')}: {message[:50]}...")
        
        mistral_api_key = os.getenv('MISTRAL_API_KEY')
        if not mistral_api_key or mistral_api_key == "your-mistral-api-key":
            # Fallback response if no API key
            return {
                'response': f"I understand you said: '{message}'. This is a fallback response since the AI API key is not configured. Please set up your Mistral API key in the .env file for full AI functionality.",
                'fallback': True
            }
        
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
        
        print("Making request to Mistral API...")
        async with httpx.AsyncClient(timeout=30.0) as client:  # Increased timeout
            resp = await client.post(
                'https://api.mistral.ai/v1/chat/completions',
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': f'Bearer {mistral_api_key}'
                },
                json=payload
            )
            
            print(f"Mistral API response status: {resp.status_code}")
            
            if resp.status_code != 200:
                error_detail = f'Mistral API error: {resp.status_code}'
                try:
                    error_data = resp.json()
                    error_detail = f'Mistral API error: {error_data.get("error", {}).get("message", "Unknown error")}'
                except:
                    pass
                print(f"AI API error: {error_detail}")
                raise HTTPException(status_code=resp.status_code, detail=error_detail)
            
            data = resp.json()
            try:
                ai_answer = data['choices'][0]['message']['content']
                print(f"AI response generated successfully: {len(ai_answer)} characters")
                return {'response': ai_answer}
            except Exception as e:
                print(f"Error parsing AI response: {e}")
                print(f"Response data: {data}")
                raise HTTPException(status_code=500, detail='Unexpected response format from Mistral AI')
                
    except HTTPException:
        raise
    except Exception as e:
        print(f"Unexpected error in AI generation: {e}")
        raise HTTPException(status_code=500, detail=f'AI generation failed: {str(e)}')

# MCP Integration Endpoints
@router.post("/mcp/initialize", response_model=Dict[str, Any])
async def initialize_mcp(user=Depends(get_current_user)):
    """Initialize MCP client connection"""
    try:
        success = await mcp_integration.initialize()
        return {
            "success": success,
            "client_id": mcp_integration.client_id,
            "server_url": mcp_integration.server_url,
            "message": "MCP client initialized successfully" if success else "Failed to initialize MCP client"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"MCP initialization error: {str(e)}")

@router.post("/mcp/message", response_model=MCPResponse)
async def send_mcp_message(request: MCPMessageRequest, user=Depends(get_current_user)):
    """Send a message to MCP server"""
    try:
        # Add user context to the message
        context = request.context or {}
        context.update({
            "user_id": user.get("username", user.get("uid")),
            "conversation_id": request.conversation_id
        })
        
        result = await mcp_integration.send_message(request.message, context)
        return MCPResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"MCP message error: {str(e)}")

@router.get("/mcp/tools", response_model=List[Dict[str, Any]])
async def get_mcp_tools(user=Depends(get_current_user)):
    """Get available tools from MCP server"""
    try:
        tools = await mcp_integration.get_available_tools()
        return [{"name": tool.name, "description": tool.description} for tool in tools]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get MCP tools: {str(e)}")

@router.post("/mcp/tool", response_model=MCPResponse)
async def call_mcp_tool(request: MCPToolCallRequest, user=Depends(get_current_user)):
    """Call a specific tool on MCP server"""
    try:
        result = await mcp_integration.call_tool(request.tool_name, request.parameters)
        return MCPResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"MCP tool call error: {str(e)}")

@router.post("/mcp/context", response_model=Dict[str, Any])
async def send_mcp_context(request: MCPContextRequest, user=Depends(get_current_user)):
    """Send context data to MCP server"""
    try:
        # Add user context
        context_data = request.context_data.copy()
        context_data["user_id"] = user.get("username", user.get("uid"))
        
        success = await mcp_integration.send_context(context_data)
        return {
            "success": success,
            "message": "Context sent successfully" if success else "Failed to send context"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"MCP context error: {str(e)}")

@router.get("/mcp/status", response_model=Dict[str, Any])
async def get_mcp_status(user=Depends(get_current_user)):
    """Get MCP client status"""
    return {
        "connected": mcp_integration.is_connected,
        "client_id": mcp_integration.client_id,
        "server_url": mcp_integration.server_url
    }

# Enhanced AI generation endpoint that can use MCP
@router.post("/ai/generate-enhanced")
async def generate_enhanced_ai_response(request: MCPMessageRequest, user=Depends(get_current_user)):
    """Generate AI response using MCP if available, fallback to Mistral"""
    message = request.message
    if not message:
        raise HTTPException(status_code=400, detail='Message is required')
    
    # Try MCP first if available
    if mcp_integration.is_connected:
        try:
            context = request.context or {}
            context.update({
                "user_id": user.get("username", user.get("uid")),
                "conversation_id": request.conversation_id,
                "source": "chatnest"
            })
            
            mcp_result = await mcp_integration.send_message(message, context)
            if mcp_result["success"]:
                return {
                    "response": mcp_result["response"],
                    "source": "mcp",
                    "timestamp": mcp_result["timestamp"]
                }
        except Exception as e:
            print(f"MCP fallback error: {str(e)}")
    
    # Fallback to Mistral API
    mistral_api_key = os.getenv('MISTRAL_API_KEY')
    if not mistral_api_key:
        raise HTTPException(status_code=500, detail='No AI service configured')
    
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
    
    async with httpx.AsyncClient(timeout=10) as client:
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
            ai_answer = data['choices'][0]['message']['content']
            return {
                'response': ai_answer,
                'source': 'mistral',
                'timestamp': datetime.utcnow().isoformat()
            }
        except Exception:
            raise HTTPException(status_code=500, detail='Unexpected response format from Mistral AI') 

@router.get("/conversations/stats", response_model=Dict[str, Any])
async def get_conversation_stats(user=Depends(get_current_user)):
    """Get conversation statistics for the current user"""
    user_id = user.get("uid")
    
    # Get total conversations
    total_conversations = await db.conversations.count_documents({"user_id": user_id})
    
    # Get total messages
    total_messages = await db.messages.count_documents({"user_id": user_id})
    
    # Get recent conversations (last 7 days)
    from datetime import datetime, timedelta
    week_ago = datetime.utcnow() - timedelta(days=7)
    recent_conversations = await db.conversations.count_documents({
        "user_id": user_id,
        "created_at": {"$gte": week_ago}
    })
    
    # Get most active conversation
    pipeline = [
        {"$match": {"user_id": user_id}},
        {"$lookup": {
            "from": "messages",
            "localField": "conversation_id",
            "foreignField": "conversation_id",
            "as": "message_count"
        }},
        {"$addFields": {"message_count": {"$size": "$message_count"}}},
        {"$sort": {"message_count": -1}},
        {"$limit": 1}
    ]
    
    most_active = None
    async for doc in db.conversations.aggregate(pipeline):
        most_active = {
            "conversation_id": doc.get("conversation_id"),
            "title": doc.get("title", "Untitled"),
            "message_count": doc.get("message_count", 0)
        }
        break
    
    return {
        "total_conversations": total_conversations,
        "total_messages": total_messages,
        "recent_conversations": recent_conversations,
        "most_active_conversation": most_active
    } 

@router.get("/conversations/{conversation_id}/details", response_model=Dict[str, Any])
async def get_conversation_details(conversation_id: str, user=Depends(get_current_user)):
    """Get conversation details including message count and last message"""
    user_id = user.get("uid")
    
    # Check if conversation belongs to user
    conversation = await db.conversations.find_one({"conversation_id": conversation_id, "user_id": user_id})
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found or access denied")
    
    # Get message count and last message
    message_count = await db.messages.count_documents({"conversation_id": conversation_id})
    last_message = ""
    
    if message_count > 0:
        # Get the most recent message
        last_message_doc = await db.messages.find_one(
            {"conversation_id": conversation_id},
            sort=[("timestamp", -1)]
        )
        if last_message_doc:
            last_message = last_message_doc.get("content", "")[:100] + "..." if len(last_message_doc.get("content", "")) > 100 else last_message_doc.get("content", "")
    
    return {
        "conversation_id": conversation_id,
        "title": conversation.get("title", "New Chat"),
        "message_count": message_count,
        "last_message": last_message,
        "created_at": conversation.get("created_at")
    } 