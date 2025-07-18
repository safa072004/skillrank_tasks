
import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ChatSidebar } from "@/components/ChatSidebar";
import { ReadyToChatState } from "@/components/ReadyToChatState";
import { logout } from "@/services/authService";
import { useToast } from "@/hooks/use-toast";
import { generateResponse } from "@/services/googleAiService";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  sendMessage as sendBackendMessage,
  getMessages as getBackendMessages,
  createConversation as createBackendConversation,
  getConversations as getBackendConversations,
  BackendMessage,
  BackendConversation,
} from "@/services/chatApiService";

interface Message {
  id: string;
  text: string;
  sender: "user" | "assistant";
  timestamp: Date;
}

interface Chat {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  messages: Message[];
}

export const ChatWindow = () => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string>("");
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [userId, setUserId] = useState<string>("");
  const [showReadyState, setShowReadyState] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Load chats from localStorage when user changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        // Load conversations from backend
        try {
          const conversations = await getBackendConversations(user.uid);
          // Map backend data to Chat[]
          const mappedChats = conversations.map((conv: BackendConversation) => ({
            id: conv.id,
            title: conv.messages && conv.messages.length > 0 ? conv.messages[0].content.substring(0, 30) : "New Chat",
            lastMessage: conv.messages && conv.messages.length > 0 ? conv.messages[conv.messages.length - 1].content : "",
            timestamp: conv.created_at ? new Date(conv.created_at) : new Date(),
            messages: (conv.messages || []).map((msg) => ({
              id: msg.id,
              text: msg.content,
              sender: msg.user_id === user.uid ? "user" : "assistant",
              timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
            })),
          }));
          setChats(mappedChats);
          if (mappedChats.length > 0) {
            setCurrentChatId(mappedChats[0].id);
            setShowReadyState(false);
          } else {
            setShowReadyState(true);
          }
        } catch (err) {
          setChats([]);
          setCurrentChatId("");
          setShowReadyState(true);
        }
      } else {
        setUserId("");
        setChats([]);
        setCurrentChatId("");
      }
    });
    return () => unsubscribe();
  }, []);

  const loadUserChats = (uid: string) => {
    console.log("Loading chats for user:", uid);
    const savedChats = localStorage.getItem(`chats_${uid}`);
    if (savedChats) {
      const parsedChats = JSON.parse(savedChats).map((chat: any) => ({
        ...chat,
        timestamp: new Date(chat.timestamp),
        messages: chat.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
      }));
      console.log("Loaded chats:", parsedChats);
      setChats(parsedChats);
      if (parsedChats.length > 0) {
        console.log("Setting current chat to:", parsedChats[0].id);
        setCurrentChatId(parsedChats[0].id);
        setShowReadyState(false);
      } else {
        console.log("No chats found, showing ready state");
        setShowReadyState(true);
      }
    } else {
      console.log("No saved chats found");
      setShowReadyState(true);
    }
  };

  const saveUserChats = (chatsToSave: Chat[]) => {
    if (userId) {
      console.log("Saving chats for user:", userId, chatsToSave);
      localStorage.setItem(`chats_${userId}`, JSON.stringify(chatsToSave));
    }
  };

  // Save chats whenever they change
  useEffect(() => {
    if (userId && chats.length > 0) {
      saveUserChats(chats);
    }
  }, [chats, userId]);

  // Get current chat
  const currentChat = chats.find(chat => chat.id === currentChatId);
  const messages = currentChat?.messages || [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const createNewChat = (initialMessage?: string) => {
    console.log("Creating new chat with initial message:", initialMessage);
    const newChatId = Date.now().toString();
    
    // Only add initial messages if there's an initial message
    const initialMessages = [];
    
    if (initialMessage) {
      const userMessage: Message = {
        id: "1",
        text: initialMessage,
        sender: "user",
        timestamp: new Date(),
      };
      initialMessages.push(userMessage);
    }

    const newChat: Chat = {
      id: newChatId,
      title: initialMessage ? (initialMessage.substring(0, 30) + (initialMessage.length > 30 ? "..." : "")) : "New Chat",
      lastMessage: initialMessage || "New chat started",
      timestamp: new Date(),
      messages: initialMessages
    };

    const updatedChats = [newChat, ...chats];
    console.log("Updated chats:", updatedChats);
    setChats(updatedChats);
    setCurrentChatId(newChatId);
    setShowReadyState(initialMessages.length === 0);
    
    // If there's an initial message, generate AI response
    if (initialMessage) {
      handleAIResponse(newChatId, initialMessage);
    }
    
    toast({
      title: "New chat started",
      description: "You can now start a fresh conversation.",
    });
  };

  const handleStartChat = (message: string) => {
    console.log("Starting chat with message:", message);
    createNewChat(message);
  };

  const handleNewChat = () => {
    console.log("Creating new empty chat");
    createNewChat();
  };

  const handleSelectChat = (chatId: string) => {
    console.log("Selecting chat:", chatId);
    setCurrentChatId(chatId);
    setShowReadyState(false);
    toast({
      title: "Chat selected",
      description: `Switched to chat`,
    });
  };

  const handleDeleteChat = (chatId: string) => {
    console.log("Deleting chat:", chatId);
    setChats(prev => prev.filter(chat => chat.id !== chatId));
    
    // If deleting current chat, switch to another or show ready state
    if (chatId === currentChatId) {
      const remainingChats = chats.filter(chat => chat.id !== chatId);
      console.log("Remaining chats after deletion:", remainingChats);
      if (remainingChats.length > 0) {
        console.log("Switching to remaining chat:", remainingChats[0].id);
        setCurrentChatId(remainingChats[0].id);
        setShowReadyState(false);
      } else {
        console.log("No remaining chats, showing ready state");
        setCurrentChatId("");
        setShowReadyState(true);
      }
    }
    
    toast({
      title: "Chat deleted",
      description: "The chat has been removed from your history.",
    });
  };

  const updateChatTitle = (chatId: string, firstUserMessage: string) => {
    setChats(prev => prev.map(chat => 
      chat.id === chatId 
        ? { ...chat, title: firstUserMessage.substring(0, 30) + (firstUserMessage.length > 30 ? "..." : "") }
        : chat
    ));
  };

  const handleAIResponse = async (chatId: string, userInput: string) => {
    setIsTyping(true);

    try {
      const responseText = await generateResponse(userInput);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: responseText,
        sender: "assistant",
        timestamp: new Date(),
      };

      setChats(prev => prev.map(chat => 
        chat.id === chatId 
          ? { 
              ...chat, 
              messages: [...chat.messages, assistantMessage],
              lastMessage: assistantMessage.text,
              timestamp: new Date()
            }
          : chat
      ));
    } catch (error) {
      console.error('Error generating response:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "Sorry, I encountered an error while generating a response. Please try again.",
        sender: "assistant",
        timestamp: new Date(),
      };

      setChats(prev => prev.map(chat => 
        chat.id === chatId 
          ? { 
              ...chat, 
              messages: [...chat.messages, errorMessage],
              lastMessage: errorMessage.text,
              timestamp: new Date()
            }
          : chat
      ));

      toast({
        title: "Error",
        description: "Failed to generate AI response. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    // If no current chat, create one
    if (!currentChatId) {
      createNewChat(inputValue);
      setInputValue("");
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: "user",
      timestamp: new Date(),
    };

    // Add user message to current chat
    setChats(prev => prev.map(chat => 
      chat.id === currentChatId 
        ? { 
            ...chat, 
            messages: [...chat.messages, userMessage],
            lastMessage: inputValue,
            timestamp: new Date()
          }
        : chat
    ));

    // Update chat title if this is the first user message
    const currentChatMessages = currentChat?.messages || [];
    const isFirstUserMessage = !currentChatMessages.some(msg => msg.sender === "user");
    if (isFirstUserMessage) {
      updateChatTitle(currentChatId, inputValue);
    }

    const userInput = inputValue;
    setInputValue("");

    await handleAIResponse(currentChatId, userInput);

    // Send message to backend
    try {
      await sendBackendMessage({
        user_id: userId,
        content: inputValue,
        conversation_id: currentChatId,
      });
    } catch (err) {
      // Optionally show error toast
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setChats([]);
      setCurrentChatId("");
      setShowReadyState(true);
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to logout. Please try again.",
        variant: "destructive",
      });
    }
  };

  console.log("Current state - showReadyState:", showReadyState, "userId:", userId, "chats length:", chats.length, "currentChatId:", currentChatId);

  // Show ready state if no chats, user is logged in, OR current chat has no messages
  const shouldShowReadyState = (showReadyState && userId) || 
                               (userId && currentChatId && currentChat && currentChat.messages.length === 0);

  if (shouldShowReadyState) {
    console.log("Rendering ready state");
    return (
      <div className="flex h-screen bg-gradient-background">
        <ChatSidebar
          isOpen={isSidebarOpen}
          onNewChat={handleNewChat}
          onSelectChat={handleSelectChat}
          onDeleteChat={handleDeleteChat}
          onLogout={handleLogout}
          currentChatId={currentChatId}
          chats={chats}
        />
        <div className="flex-1">
          <ReadyToChatState onStartChat={handleStartChat} />
        </div>
      </div>
    );
  }

  console.log("Rendering chat interface");
  return (
    <div className="flex h-screen bg-gradient-background">
      {/* Sidebar */}
      <ChatSidebar
        isOpen={isSidebarOpen}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChat}
        onLogout={handleLogout}
        currentChatId={currentChatId}
        chats={chats}
      />

      {/* Main Chat Area */}
      <div className="flex flex-col flex-1">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-card/50 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-4 animate-slide-up ${
                message.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.sender === "assistant" && (
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center">
                  <Bot className="h-5 w-5 text-primary-foreground" />
                </div>
              )}
              
              <Card
                className={`max-w-[75%] p-4 shadow-message transition-smooth ${
                  message.sender === "user"
                    ? "bg-chat-user-bg text-chat-user-text ml-auto"
                    : "bg-chat-assistant-bg text-chat-assistant-text"
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                  {message.text}
                </p>
                <p className="text-xs opacity-70 mt-2">
                  {message.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </Card>

              {message.sender === "user" && (
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-4 animate-fade-in">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center">
                <Bot className="h-5 w-5 text-primary-foreground" />
              </div>
              <Card className="bg-chat-assistant-bg text-chat-assistant-text p-4 shadow-message">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-chat-primary rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-chat-primary rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-chat-primary rounded-full animate-bounce delay-200" />
                </div>
              </Card>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-border bg-card/50 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <div className="flex-1 relative">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type your message here..."
                className="pr-12 bg-chat-input-bg border-border text-foreground placeholder:text-muted-foreground focus:ring-chat-primary focus:border-chat-primary transition-smooth"
                disabled={isTyping}
              />
            </div>
            <Button
              type="submit"
              size="icon"
              disabled={!inputValue.trim() || isTyping}
              className="bg-gradient-primary hover:shadow-glow transition-smooth disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
