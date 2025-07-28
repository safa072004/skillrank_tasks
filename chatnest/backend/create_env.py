#!/usr/bin/env python3
"""
Create .env file with proper configuration
"""

import os

def create_env_file():
    """Create .env file with the required environment variables"""
    env_content = """# Database Configuration (MongoDB Atlas for data storage)
# Replace with your actual MongoDB connection string
MONGODB_URL=mongodb+srv://username:password@your-cluster.mongodb.net/?retryWrites=true&w=majority&appName=your-app
MONGO_URI=mongodb+srv://username:password@your-cluster.mongodb.net/?retryWrites=true&w=majority&appName=your-app
DATABASE_NAME=chatnest

# JWT Configuration
# Generate a strong secret key for production
JWT_SECRET=your-super-secret-jwt-key-here-change-this-in-production

# Mistral AI Configuration
# Get your API key from https://console.mistral.ai/
MISTRAL_API_KEY=your-mistral-api-key-here

# MCP Configuration
MCP_CLIENT_ID=your-mcp-client-id
MCP_CLIENT_SECRET=your-mcp-client-secret
MCP_SERVER_URL=http://localhost:9000/mcp

# Firebase Configuration (for authentication only)
# Get these from your Firebase project settings
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_API_KEY=your-firebase-api-key
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
# No credentials file needed - using project ID only
"""
    
    try:
        with open('.env', 'w') as f:
            f.write(env_content)
        print("✅ .env file created successfully!")
        print("📝 Configuration:")
        print("   MongoDB Atlas: Please update with your connection string")
        print("   Firebase: Please update with your project credentials")
        print("   Mistral AI: Please add your API key")
        print("   MCP: Please update with your client credentials")
        print("")
        print("⚠️  IMPORTANT: Update the .env file with your actual credentials!")
        return True
    except Exception as e:
        print(f"❌ Error creating .env file: {e}")
        return False

if __name__ == "__main__":
    print("Setting up environment variables...")
    create_env_file() 