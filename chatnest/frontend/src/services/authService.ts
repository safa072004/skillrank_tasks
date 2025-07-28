import { signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";

const API_BASE = "http://localhost:8000";

export const register = async (username: string, password: string, email?: string) => {
  try {
    console.log("Registering user:", { username, email });
    
    // Create user in Firebase (frontend)
    const userEmail = email || `${username}@chatnest.local`;
    const userCredential = await createUserWithEmailAndPassword(auth, userEmail, password);
    console.log("Firebase user created:", userCredential.user.uid);
    
    // Register with backend using Firebase UID
  const res = await fetch(`${API_BASE}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        username, 
        password, 
        email: userEmail,
        firebase_uid: userCredential.user.uid 
      }),
  });
    
    console.log("Registration response status:", res.status);
    
    if (!res.ok) {
      const errorData = await res.json();
      console.error("Registration error response:", errorData);
      throw new Error(errorData.detail || "Failed to register");
    }
    
    const data = await res.json();
    console.log("Registration successful:", data);
    
    // Store the JWT token from backend
    if (data.access_token) {
      localStorage.setItem("token", data.access_token);
    }
    
    return data;
  } catch (error: any) {
    console.error("Registration error:", error);
    // If Firebase registration fails, clean up
    if (auth.currentUser) {
      await signOut(auth);
    }
    throw new Error(error.message || "Failed to register");
  }
};

export const login = async (username: string, password: string, email?: string) => {
  try {
    console.log("Logging in user:", { username, email });
    
    // Sign in to Firebase (frontend)
    const userEmail = email || `${username}@chatnest.local`;
    const userCredential = await signInWithEmailAndPassword(auth, userEmail, password);
    console.log("Firebase login successful:", userCredential.user.uid);
    
    // Login with backend using Firebase UID
    const res = await fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        username, 
        password, 
        email: userEmail,
        firebase_uid: userCredential.user.uid 
      }),
    });
    
    console.log("Login response status:", res.status);
    
    if (!res.ok) {
      const errorData = await res.json();
      console.error("Login error response:", errorData);
      throw new Error(errorData.detail || "Failed to login");
    }
    
    const data = await res.json();
    console.log("Login successful:", data);
    
    // Store the JWT token from backend
    if (data.access_token) {
      localStorage.setItem("token", data.access_token);
      console.log("JWT token stored successfully");
    } else {
      console.warn("No access token received from backend");
    }
    
    return data;
  } catch (error: any) {
    console.error("Login error:", error);
    // If login fails, clean up
    if (auth.currentUser) {
      await signOut(auth);
    }
    throw new Error(error.message || "Failed to login");
  }
};

export const logout = async () => {
  try {
    console.log("Logging out user");
    
    // Sign out from Firebase
    await signOut(auth);
    
    // Remove JWT token and other data
    localStorage.removeItem("token");
    localStorage.removeItem("google-ai-api-key");
    
    console.log("Logout successful");
  } catch (error) {
    console.error("Logout error:", error);
    // Even if logout fails, still remove local data
  localStorage.removeItem("token");
    localStorage.removeItem("google-ai-api-key");
    throw error;
  }
};

export const getToken = () => {
  const token = localStorage.getItem("token");
  if (!token) {
    console.log("No token found in localStorage");
    return null;
  }
  
  // Basic token validation (check if it's not empty)
  if (token.trim() === "") {
    console.log("Empty token found, removing from localStorage");
    localStorage.removeItem("token");
    return null;
  }
  
  return token;
};

export const refreshToken = async () => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.log("No current user, cannot refresh token");
      return null;
    }
    
    // Get a fresh Firebase token
    const firebaseToken = await currentUser.getIdToken(true);
    console.log("Refreshed Firebase token");
    
    // Try to get a new JWT token from backend
    const res = await fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        firebase_uid: currentUser.uid,
        refresh: true
      }),
    });
    
    if (res.ok) {
      const data = await res.json();
      if (data.access_token) {
        localStorage.setItem("token", data.access_token);
        console.log("Token refreshed successfully");
        return data.access_token;
      }
    }
    
    console.log("Failed to refresh token from backend");
    return null;
  } catch (error) {
    console.error("Error refreshing token:", error);
    return null;
  }
};

export const getCurrentUser = () => {
  return auth.currentUser;
};

export const isAuthenticated = () => {
  const token = getToken();
  const user = auth.currentUser;
  return !!(token && user);
};
