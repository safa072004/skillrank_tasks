import os
import json
import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime
import httpx

class MCPIntegration:
    def __init__(self):
        self.client_id = os.getenv("MCP_CLIENT_ID", "chatnest-client")
        self.client_secret = os.getenv("MCP_CLIENT_SECRET", "")
        self.server_url = os.getenv("MCP_SERVER_URL", "http://localhost:9000/mcp")
        self.is_connected = False
        
    async def initialize(self):
        """Initialize MCP client connection"""
        try:
            # Simple HTTP-based MCP client implementation
            # This is a basic implementation that can be extended
            self.is_connected = True
            print(f"MCP client initialized: {self.client_id}")
            return True
        except Exception as e:
            print(f"Failed to initialize MCP client: {str(e)}")
            self.is_connected = False
            return False
    
    async def send_message(self, message: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Send a message to MCP server and get response"""
        if not self.is_connected:
            await self.initialize()
        
        try:
            # Prepare the message payload
            payload = {
                "message": message,
                "context": context or {},
                "client_id": self.client_id,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            # Send message to MCP server via HTTP
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(
                    f"{self.server_url}/message",
                    json=payload,
                    headers={"Content-Type": "application/json"}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return {
                        "response": data.get("response", "No response received"),
                        "success": True,
                        "timestamp": datetime.utcnow().isoformat()
                    }
                else:
                    return {
                        "response": f"MCP server error: {response.status_code}",
                        "success": False,
                        "timestamp": datetime.utcnow().isoformat()
                    }
                    
        except Exception as e:
            return {
                "response": f"Error communicating with MCP server: {str(e)}",
                "success": False,
                "timestamp": datetime.utcnow().isoformat()
            }
    
    async def get_available_tools(self) -> List[Dict[str, Any]]:
        """Get available tools from MCP server"""
        if not self.is_connected:
            await self.initialize()
        
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.get(f"{self.server_url}/tools")
                if response.status_code == 200:
                    return response.json()
                else:
                    return []
        except Exception as e:
            print(f"Failed to get tools: {str(e)}")
            return []
    
    async def call_tool(self, tool_name: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Call a specific tool on the MCP server"""
        if not self.is_connected:
            await self.initialize()
        
        try:
            payload = {
                "tool_name": tool_name,
                "parameters": parameters,
                "client_id": self.client_id
            }
            
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(
                    f"{self.server_url}/tool",
                    json=payload,
                    headers={"Content-Type": "application/json"}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return {
                        "result": data.get("result"),
                        "success": True,
                        "timestamp": datetime.utcnow().isoformat()
                    }
                else:
                    return {
                        "result": None,
                        "success": False,
                        "error": f"Tool call failed: {response.status_code}",
                        "timestamp": datetime.utcnow().isoformat()
                    }
        except Exception as e:
            return {
                "result": None,
                "success": False,
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
    
    async def send_context(self, context_data: Dict[str, Any]) -> bool:
        """Send context data to MCP server"""
        if not self.is_connected:
            await self.initialize()
        
        try:
            payload = {
                "context_data": context_data,
                "client_id": self.client_id,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(
                    f"{self.server_url}/context",
                    json=payload,
                    headers={"Content-Type": "application/json"}
                )
                return response.status_code == 200
        except Exception as e:
            print(f"Failed to send context: {str(e)}")
            return False
    
    async def close(self):
        """Close MCP client connection"""
        self.is_connected = False

# Global MCP integration instance
mcp_integration = MCPIntegration() 