// generateResponse.ts
import { getToken } from "@/services/authService";

export const generateResponse = async (message: string): Promise<string> => {
  const token = getToken();
  if (!token) throw new Error("User not authenticated");
  const response = await fetch("http://localhost:8000/ai/generate", {
    method: "POST",
      headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      },
    body: JSON.stringify({ message }),
    });
    if (!response.ok) {
    throw new Error(`Backend AI request failed: ${response.status}`);
    }
    const data = await response.json();
  if (data.response) {
    return data.response;
    } else {
    throw new Error("Unexpected response format from backend AI");
  }
};
