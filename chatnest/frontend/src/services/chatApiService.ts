import { getToken, refreshToken } from "@/services/authService";

const API_BASE = "http://localhost:8000";

export interface BackendMessage {
  id?: string;
  user_id: string;
  content: string;
  timestamp?: string;
  conversation_id?: string;
}

export interface BackendConversation {
  id?: string;
  conversation_id?: string;
  title?: string;
  last_message?: string;
  user_ids?: string[];
  messages?: BackendMessage[];
  created_at?: string;
}

const authHeader = async (retryCount = 0) => {
  let token = getToken();
  
  if (!token && retryCount === 0) {
    // Try to refresh token on first attempt
    console.log("No token found, attempting to refresh...");
    token = await refreshToken();
  }
  
  if (!token) {
    throw new Error("User not authenticated");
  }
  
  return { "Authorization": `Bearer ${token}` };
};

export const sendMessage = async (message: BackendMessage) => {
  try {
    const headers = await authHeader();
    const res = await fetch(`${API_BASE}/messages/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(message),
    });
    
    if (res.status === 401) {
      // Token might be expired, try to refresh
      console.log("Token expired, attempting to refresh...");
      const newHeaders = await authHeader(1);
      const retryRes = await fetch(`${API_BASE}/messages/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...newHeaders },
        body: JSON.stringify(message),
      });
      if (!retryRes.ok) throw new Error("Failed to send message after token refresh");
      return retryRes.json();
    }
    
    if (!res.ok) throw new Error("Failed to send message");
    return res.json();
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
};

export const getMessages = async (conversationId: string) => {
  try {
    const headers = await authHeader();
    const res = await fetch(`${API_BASE}/messages/${conversationId}`, {
      headers: { ...headers },
    });
    
    if (res.status === 401) {
      console.log("Token expired, attempting to refresh...");
      const newHeaders = await authHeader(1);
      const retryRes = await fetch(`${API_BASE}/messages/${conversationId}`, {
        headers: { ...newHeaders },
      });
      if (!retryRes.ok) throw new Error("Failed to fetch messages after token refresh");
      return retryRes.json();
    }
    
    if (!res.ok) throw new Error("Failed to fetch messages");
    return res.json();
  } catch (error) {
    console.error("Error fetching messages:", error);
    throw error;
  }
};

export const createConversation = async (conversation: BackendConversation) => {
  try {
    const headers = await authHeader();
    const title = conversation.title || "New Chat";
    const res = await fetch(`${API_BASE}/conversations/new?title=${encodeURIComponent(title)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
    });
    
    if (res.status === 401) {
      console.log("Token expired, attempting to refresh...");
      const newHeaders = await authHeader(1);
      const retryRes = await fetch(`${API_BASE}/conversations/new?title=${encodeURIComponent(title)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...newHeaders },
      });
      if (!retryRes.ok) throw new Error("Failed to create conversation after token refresh");
      return retryRes.json();
    }
    
    if (!res.ok) throw new Error("Failed to create conversation");
    return res.json();
  } catch (error) {
    console.error("Error creating conversation:", error);
    throw error;
  }
};

export const getConversations = async (userId: string) => {
  try {
    const headers = await authHeader();
    const res = await fetch(`${API_BASE}/conversations/`, {
      headers: { ...headers },
    });
    
    if (res.status === 401) {
      console.log("Token expired, attempting to refresh...");
      const newHeaders = await authHeader(1);
      const retryRes = await fetch(`${API_BASE}/conversations/`, {
        headers: { ...newHeaders },
      });
      if (!retryRes.ok) throw new Error("Failed to fetch conversations after token refresh");
      return retryRes.json();
    }
    
    if (!res.ok) throw new Error("Failed to fetch conversations");
    return res.json();
  } catch (error) {
    console.error("Error fetching conversations:", error);
    throw error;
  }
};

export const getConversationDetails = async (conversationId: string) => {
  try {
    const headers = await authHeader();
    const res = await fetch(`${API_BASE}/conversations/${conversationId}/details`, {
      headers: { ...headers },
    });
    
    if (res.status === 401) {
      console.log("Token expired, attempting to refresh...");
      const newHeaders = await authHeader(1);
      const retryRes = await fetch(`${API_BASE}/conversations/${conversationId}/details`, {
        headers: { ...newHeaders },
      });
      if (!retryRes.ok) throw new Error("Failed to fetch conversation details after token refresh");
      return retryRes.json();
    }
    
    if (!res.ok) throw new Error("Failed to fetch conversation details");
    return res.json();
  } catch (error) {
    console.error("Error fetching conversation details:", error);
    throw error;
  }
}; 