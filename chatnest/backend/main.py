import os
from fastapi import FastAPI
from dotenv import load_dotenv
from db import db
from routes import router
from fastapi.middleware.cors import CORSMiddleware
from mcp_integration import mcp_integration
from firebase_config import firebase_config

load_dotenv()

app = FastAPI(title="ChatNest Backend", description="ChatNest with MCP Integration")

# Add CORS middleware with restricted origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:8080", 
        "http://localhost:8081",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8080",
        "http://127.0.0.1:8081"
    ],  # Restrict to specific frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

@app.on_event("startup")
async def startup_event():
    """Initialize MCP client, Firebase, and MongoDB on startup"""
    print("Initializing MCP integration...")
    await mcp_integration.initialize()
    print("Firebase Auth initialized successfully")
    print("MongoDB connected successfully")

@app.on_event("shutdown")
async def shutdown_event():
    """Clean up MCP client on shutdown"""
    print("Closing MCP integration...")
    await mcp_integration.close()

@app.get("/")
def read_root():
    return {
        "message": "ChatNest backend is running!",
        "mcp_connected": mcp_integration.is_connected,
        "version": "1.0.0"
    }
