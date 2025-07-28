#!/usr/bin/env python3
"""
Firebase Authentication Configuration
Handles Firebase Auth without Admin SDK
"""
import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()

class FirebaseConfig:
    def __init__(self):
        self.dev_mode = False  # Use real Firebase
        self.api_key = os.getenv('FIREBASE_API_KEY')
        self.project_id = os.getenv('FIREBASE_PROJECT_ID')
        self.auth_domain = os.getenv('FIREBASE_AUTH_DOMAIN')
        self.initialize_firebase()
    
    def initialize_firebase(self):
        """Initialize Firebase configuration"""
        if self.api_key and self.project_id and self.auth_domain:
            print(f"✅ Firebase configured with project: {self.project_id}")
            print(f"   API Key: {self.api_key[:10]}...")
            print(f"   Auth Domain: {self.auth_domain}")
            self.dev_mode = False
        else:
            print("❌ Firebase configuration incomplete")
            print("   Please check your .env file")
            self.dev_mode = True
    
    def create_user(self, email, password, display_name=None):
        """Create a Firebase user using REST API"""
        try:
            if self.dev_mode:
                # Fallback to mock
                import uuid
                uid = str(uuid.uuid4())
                print(f"Mock user created: {uid} ({email})")
                return {"uid": uid, "email": email, "display_name": display_name}
            else:
                # Use Firebase Auth REST API
                url = f"https://identitytoolkit.googleapis.com/v1/accounts:signUp?key={self.api_key}"
                data = {
                    "email": email,
                    "password": password,
                    "returnSecureToken": True
                }
                
                response = requests.post(url, json=data)
                result = response.json()
                
                if response.status_code == 200:
                    uid = result.get("localId")
                    print(f"Real Firebase user created: {uid} ({email})")
                    return {
                        "uid": uid,
                        "email": email,
                        "display_name": display_name
                    }
                else:
                    error = result.get("error", {}).get("message", "Unknown error")
                    print(f"Firebase user creation failed: {error}")
                    if "EMAIL_EXISTS" in error:
                        # User already exists, try to sign in
                        return self.verify_user(email, password)
                    return None
                    
        except Exception as e:
            print(f"User creation failed: {e}")
            return None
    
    def verify_user(self, email, password):
        """Verify user credentials using REST API"""
        try:
            if self.dev_mode:
                # Mock verification
                import uuid
                uid = str(uuid.uuid4())
                display_name = email.split('@')[0]
                print(f"Mock user verified: {uid} ({email})")
                return {"uid": uid, "email": email, "display_name": display_name}
            else:
                # Use Firebase Auth REST API for sign in
                url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={self.api_key}"
                data = {
                    "email": email,
                    "password": password,
                    "returnSecureToken": True
                }
                
                response = requests.post(url, json=data)
                result = response.json()
                
                if response.status_code == 200:
                    uid = result.get("localId")
                    print(f"Real Firebase user verified: {uid} ({email})")
                    return {
                        "uid": uid,
                        "email": email,
                        "display_name": email.split('@')[0]
                    }
                else:
                    error = result.get("error", {}).get("message", "Unknown error")
                    print(f"Firebase user verification failed: {error}")
                    return None
                    
        except Exception as e:
            print(f"User verification failed: {e}")
            return None
    
    def get_user_by_uid(self, uid):
        """Get user info by UID (simplified)"""
        try:
            if self.dev_mode:
                return None
            else:
                # For now, return basic info since we don't have admin SDK
                return {
                    "uid": uid,
                    "email": f"user_{uid}@example.com",
                    "display_name": f"User {uid[:8]}"
                }
        except Exception as e:
            print(f"Get user failed: {e}")
            return None

# Global instance
firebase_config = FirebaseConfig() 