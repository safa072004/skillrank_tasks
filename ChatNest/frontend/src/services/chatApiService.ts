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
  user_ids: string[];
  messages?: BackendMessage[];
  created_at?: string;
}

export const sendMessage = async (message: BackendMessage) => {
  const res = await fetch(`${API_BASE}/messages/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(message),
  });
  if (!res.ok) throw new Error("Failed to send message");
  return res.json();
};

export const getMessages = async (conversationId: string) => {
  const res = await fetch(`${API_BASE}/messages/${conversationId}`);
  if (!res.ok) throw new Error("Failed to fetch messages");
  return res.json();
};

export const createConversation = async (conversation: BackendConversation) => {
  const res = await fetch(`${API_BASE}/conversations/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(conversation),
  });
  if (!res.ok) throw new Error("Failed to create conversation");
  return res.json();
};

export const getConversations = async (userId: string) => {
  const res = await fetch(`${API_BASE}/conversations/${userId}`);
  if (!res.ok) throw new Error("Failed to fetch conversations");
  return res.json();
}; 