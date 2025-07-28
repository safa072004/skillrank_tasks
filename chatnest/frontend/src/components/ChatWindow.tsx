
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
  getConversationDetails,
  BackendMessage,
  BackendConversation,
} from "@/services/chatApiService";

interface Message {
  id: string;
  text: string;
  sender: "user" | "assistant" | "bot";
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
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
        
        // Use an async function to handle the conversation loading
        const loadConversations = async () => {
          // Try to load conversations from backend first
          let conversationsLoaded = false;
          let retryCount = 0;
          const maxRetries = 3;
          
          while (!conversationsLoaded && retryCount < maxRetries) {
            try {
              console.log(`Loading conversations for user: ${user.uid} (attempt ${retryCount + 1})`);
              const conversations = await getBackendConversations(user.uid);
              console.log("Backend conversations:", conversations);
              
              if (conversations && conversations.length > 0) {
                // Map backend data to Chat[] and fetch details for each conversation
                const mappedChats = await Promise.all(
                  conversations.map(async (conv: BackendConversation) => {
                    try {
                      // Get conversation details including message count and last message
                      const details = await getConversationDetails(conv.conversation_id || conv.id || "");
                      
                      // Get messages for this conversation
                      const messages = await getBackendMessages(conv.conversation_id || conv.id || "");
                      
                      console.log("Raw messages from backend:", messages);
                      
                      // Reverse the messages to ensure correct chronological order
                      const reversedMessages = [...messages].reverse();
                      console.log("Reversed messages:", reversedMessages);
                      
                      // Find the first user message to use as title
                      const firstUserMessage = reversedMessages.find((msg: any) => 
                        msg.user_id === user.uid
                      );
                      
                      // Generate title from first user message or use existing title
                      let chatTitle = conv.title || "New Chat";
                      if (firstUserMessage && !conv.title) {
                        chatTitle = firstUserMessage.content.substring(0, 30) + 
                          (firstUserMessage.content.length > 30 ? "..." : "");
                      }
                      
                      return {
                        id: conv.conversation_id || conv.id || "",
                        title: chatTitle,
                        lastMessage: details.last_message || "",
                        timestamp: conv.created_at ? new Date(conv.created_at) : new Date(),
                        messages: reversedMessages.map((msg: any) => {
                          // Determine sender based on user_id
                          let sender: "user" | "assistant" | "bot" = "user";
                          if (msg.user_id === "assistant" || msg.user_id === "ai" || msg.user_id === "bot" || msg.user_id === "system") {
                            sender = "assistant";
                          } else if (msg.user_id === user.uid) {
                            sender = "user";
                          } else {
                            // If it's not the current user and not explicitly assistant, it's likely an assistant message
                            sender = "assistant";
                          }
                          
                          console.log(`Message mapping: user_id=${msg.user_id}, current_user=${user.uid}, sender=${sender}, timestamp=${msg.timestamp}`);
                          
                          return {
                            id: msg.id || "",
                            text: msg.content,
                            sender: sender,
                            timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
                          };
                        }),
                      };
                    } catch (err) {
                      console.error(`Error fetching details for conversation ${conv.conversation_id}:`, err);
                      
                      // Try to get messages even if details fail
                      let chatTitle = conv.title || "New Chat";
                      try {
                        const messages = await getBackendMessages(conv.conversation_id || conv.id || "");
                        const reversedMessages = [...messages].reverse();
                        const firstUserMessage = reversedMessages.find((msg: any) => 
                          msg.user_id === user.uid
                        );
                        if (firstUserMessage && !conv.title) {
                          chatTitle = firstUserMessage.content.substring(0, 30) + 
                            (firstUserMessage.content.length > 30 ? "..." : "");
                        }
                      } catch (msgErr) {
                        console.error("Error getting messages for title:", msgErr);
                      }
                      
                      return {
                        id: conv.conversation_id || conv.id || "",
                        title: chatTitle,
                        lastMessage: "",
                        timestamp: conv.created_at ? new Date(conv.created_at) : new Date(),
                        messages: [],
                      };
                    }
                  })
                );
                
                console.log("Mapped chats with details and messages:", mappedChats);
                setChats(mappedChats);
                
                // Set the first conversation as current, but don't automatically create new ones
                setCurrentChatId(mappedChats[0].id);
                setShowReadyState(false);
                conversationsLoaded = true;
                
                // Sync with localStorage as backup
                saveUserChats(mappedChats);
                
                toast({
                  title: "Chats loaded",
                  description: `Loaded ${mappedChats.length} previous conversations.`,
                });
              } else {
                console.log("No conversations found in backend, checking localStorage...");
                // Try to load from localStorage as fallback
                const savedChats = localStorage.getItem(`chats_${user.uid}`);
                if (savedChats) {
                  try {
                    const parsedChats = JSON.parse(savedChats).map((chat: any) => ({
                      ...chat,
                      timestamp: new Date(chat.timestamp),
                      messages: chat.messages.map((msg: any) => ({
                        ...msg,
                        timestamp: new Date(msg.timestamp)
                      }))
                    }));
                    console.log("Loaded chats from localStorage:", parsedChats);
                    setChats(parsedChats);
                    if (parsedChats.length > 0) {
                      setCurrentChatId(parsedChats[0].id);
                      setShowReadyState(false);
                      toast({
                        title: "Chats loaded",
                        description: "Your previous chats have been loaded from local storage.",
                      });
                    } else {
                      setShowReadyState(true);
                    }
                    conversationsLoaded = true;
                  } catch (localStorageErr) {
                    console.error("Error parsing localStorage chats:", localStorageErr);
                    setChats([]);
                    setCurrentChatId("");
                    setShowReadyState(true);
                    conversationsLoaded = true;
                  }
                } else {
                  console.log("No conversations found in backend or localStorage, showing ready state");
                  setChats([]);
                  setCurrentChatId("");
                  setShowReadyState(true);
                  conversationsLoaded = true;
                }
              }
            } catch (err) {
              console.error(`Error loading conversations (attempt ${retryCount + 1}):`, err);
              retryCount++;
              
              if (retryCount >= maxRetries) {
                console.log("Max retries reached, trying localStorage fallback...");
                // Final fallback to localStorage
                try {
                  const savedChats = localStorage.getItem(`chats_${user.uid}`);
                  if (savedChats) {
                    const parsedChats = JSON.parse(savedChats).map((chat: any) => ({
                      ...chat,
                      timestamp: new Date(chat.timestamp),
                      messages: chat.messages.map((msg: any) => ({
                        ...msg,
                        timestamp: new Date(msg.timestamp)
                      }))
                    }));
                    console.log("Loaded chats from localStorage as fallback:", parsedChats);
                    setChats(parsedChats);
                    if (parsedChats.length > 0) {
                      setCurrentChatId(parsedChats[0].id);
                      setShowReadyState(false);
                      toast({
                        title: "Chats loaded",
                        description: "Your previous chats have been loaded from local storage.",
                      });
                    } else {
                      setShowReadyState(true);
                    }
                  } else {
                    console.log("No localStorage chats found, showing ready state");
                    setChats([]);
                    setCurrentChatId("");
                    setShowReadyState(true);
                  }
                  conversationsLoaded = true;
                } catch (localStorageErr) {
                  console.error("Error loading from localStorage:", localStorageErr);
                  setChats([]);
                  setCurrentChatId("");
                  setShowReadyState(true);
                  conversationsLoaded = true;
                }
              } else {
                // Wait before retrying
                setTimeout(() => {
                  // Continue with next retry
                }, 1000 * retryCount);
              }
            }
          }
        };
        
        // Call the async function
        loadConversations();
      } else {
        setUserId("");
        setChats([]);
        setCurrentChatId("");
        setShowReadyState(true);
      }
    });

    return () => unsubscribe();
  }, []);

  const saveUserChats = (chatsToSave: Chat[]) => {
    if (userId) {
      console.log("Saving chats for user:", userId, chatsToSave);
      try {
        localStorage.setItem(`chats_${userId}`, JSON.stringify(chatsToSave));
        console.log("Chats saved to localStorage successfully");
      } catch (error) {
        console.error("Error saving chats to localStorage:", error);
      }
    }
  };

  // Save chats whenever they change
  useEffect(() => {
    if (userId && chats.length > 0) {
      saveUserChats(chats);
    }
  }, [chats, userId]);

  // Sync chats between backend and localStorage
  const syncChatsWithBackend = async () => {
    if (!userId) return;
    
    try {
      console.log("Syncing chats with backend...");
      const backendConversations = await getBackendConversations(userId);
      
      if (backendConversations && backendConversations.length > 0) {
        // Update localStorage with backend data
        const mappedChats = await Promise.all(
          backendConversations.map(async (conv: BackendConversation) => {
            try {
              const details = await getConversationDetails(conv.conversation_id || conv.id || "");
              const messages = await getBackendMessages(conv.conversation_id || conv.id || "");
              
              // Reverse the messages to ensure correct chronological order
              const reversedMessages = [...messages].reverse();
              
              // Find the first user message to use as title
              const firstUserMessage = reversedMessages.find((msg: any) => 
                msg.user_id === userId
              );
              
              // Generate title from first user message or use existing title
              let chatTitle = conv.title || "New Chat";
              if (firstUserMessage && !conv.title) {
                chatTitle = firstUserMessage.content.substring(0, 30) + 
                  (firstUserMessage.content.length > 30 ? "..." : "");
              }

              return {
                id: conv.conversation_id || conv.id || "",
                title: chatTitle,
                lastMessage: details.last_message || "",
                timestamp: conv.created_at ? new Date(conv.created_at) : new Date(),
                messages: reversedMessages.map((msg: any) => {
                  // Determine sender based on user_id
                  let sender: "user" | "assistant" | "bot" = "user";
                  if (msg.user_id === "assistant" || msg.user_id === "ai" || msg.user_id === "bot" || msg.user_id === "system") {
                    sender = "assistant";
                  } else if (msg.user_id === userId) {
                    sender = "user";
                  } else {
                    // If it's not the current user and not explicitly assistant, it's likely an assistant message
                    sender = "assistant";
                  }
                  
                  console.log(`Message from backend - user_id: "${msg.user_id}", userId: "${userId}", determined sender: "${sender}", content: "${msg.content.substring(0, 30)}..."`);
                  
                  return {
                    id: msg.id || "",
                    text: msg.content,
                    sender: sender,
                    timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
                  };
                }),
              };
            } catch (err) {
              console.error(`Error syncing conversation ${conv.conversation_id}:`, err);
              
              // Try to get messages even if details fail
              let chatTitle = conv.title || "New Chat";
              try {
                const messages = await getBackendMessages(conv.conversation_id || conv.id || "");
                const reversedMessages = [...messages].reverse();
                const firstUserMessage = reversedMessages.find((msg: any) => 
                  msg.user_id === userId
                );
                if (firstUserMessage && !conv.title) {
                  chatTitle = firstUserMessage.content.substring(0, 30) + 
                    (firstUserMessage.content.length > 30 ? "..." : "");
                }
              } catch (msgErr) {
                console.error("Error getting messages for title:", msgErr);
              }
              
              return {
                id: conv.conversation_id || conv.id || "",
                title: chatTitle,
                lastMessage: "",
                timestamp: conv.created_at ? new Date(conv.created_at) : new Date(),
                messages: [],
              };
            }
          })
        );
        
        // Update the chats state with the fresh data
        setChats(mappedChats);
        saveUserChats(mappedChats);
        console.log("Chats synced with backend successfully");
        
        // Force a re-render by updating the current chat
        if (currentChatId) {
          const updatedCurrentChat = mappedChats.find(chat => chat.id === currentChatId);
          if (updatedCurrentChat) {
            console.log("Updated current chat messages:", updatedCurrentChat.messages.map(m => ({
              sender: m.sender,
              text: m.text.substring(0, 30) + "..."
            })));
          }
        }
        
        toast({
          title: "Chats refreshed",
          description: "All chats have been refreshed from the backend.",
        });
      }
    } catch (error) {
      console.error("Error syncing chats with backend:", error);
    }
  };

  // Get current chat
  const currentChat = chats.find(chat => chat.id === currentChatId);
  const messages = currentChat?.messages || [];

  // Sort messages by timestamp to ensure chronological order
  const sortedMessages = [...messages].sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime();
    const timeB = new Date(b.timestamp).getTime();
    return timeA - timeB;
  });

  console.log("Current chat ID:", currentChatId);
  console.log("Current chat:", currentChat?.title);
  console.log("Original messages:", messages.map(m => `${m.sender}: ${m.text.substring(0, 20)}...`));
  console.log("Sorted messages:", sortedMessages.map(m => `${m.sender}: ${m.text.substring(0, 20)}...`));
  
  // Debug: Check if any messages have unexpected sender values
  const unexpectedSenders = messages.filter(m => m.sender !== "user" && m.sender !== "assistant" && m.sender !== "bot");
  if (unexpectedSenders.length > 0) {
    console.warn("Found messages with unexpected sender values:", unexpectedSenders);
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [sortedMessages]);

  const createNewChat = async (initialMessage?: string) => {
    console.log("Creating new chat with initial message:", initialMessage);
    
    try {
      // Create conversation in backend first
      const newConversation = await createBackendConversation({
        title: initialMessage ? (initialMessage.substring(0, 30) + (initialMessage.length > 30 ? "..." : "")) : "New Chat",
        // Don't send user_ids, the backend will add user_id automatically
      });
      
      console.log("Backend conversation created:", newConversation);
      
      const newChatId = newConversation.conversation_id || newConversation.id || Date.now().toString();
      
      // Only add initial messages if there's an initial message
      const initialMessages = [];
      
      if (initialMessage) {
        const userMessage: Message = {
          id: `user_${Date.now()}`,
          text: initialMessage,
          sender: "user",
          timestamp: new Date(),
        };
        initialMessages.push(userMessage);
        
        console.log("Creating initial user message:", userMessage);
        
        // Send the initial message to backend
        try {
          await sendBackendMessage({
            user_id: userId,
            content: initialMessage,
            conversation_id: newChatId,
          });
        } catch (err) {
          console.error("Failed to send initial message to backend:", err);
        }
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
      setShowReadyState(false);
      
      // If there's an initial message, generate AI response immediately
      if (initialMessage) {
        await handleAIResponse(newChatId, initialMessage);
      }
      
      toast({
        title: "New chat started",
        description: "You can now start a fresh conversation.",
      });
    } catch (err) {
      console.error("Failed to create new chat:", err);
      toast({
        title: "Error",
        description: "Failed to create new chat. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleStartChat = async (message: string) => {
    console.log("Starting chat with message:", message);
    await createNewChat(message);
  };

  const handleNewChat = async () => {
    console.log("Creating new empty chat");
    await createNewChat();
  };

  const handleSelectChat = (chatId: string) => {
    console.log("Selecting chat:", chatId);
    setCurrentChatId(chatId);
    setShowReadyState(false);
    
    // Force refresh the current chat data to ensure proper styling
    const selectedChat = chats.find(chat => chat.id === chatId);
    if (selectedChat) {
      console.log("Selected chat messages:", selectedChat.messages.map(m => ({
        sender: m.sender,
        text: m.text.substring(0, 30) + "...",
        timestamp: m.timestamp
      })));
    }
    
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

      // Create assistant message
      const assistantMessage: Message = {
        id: `assistant_${Date.now()}`,
        text: responseText,
        sender: "assistant",
        timestamp: new Date(),
      };

      console.log("Creating assistant message:", assistantMessage);

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

      // Send AI response to backend
      try {
        await sendBackendMessage({
          user_id: "assistant", // Use "assistant" as user_id for AI messages
          content: responseText,
          conversation_id: chatId,
        });
      } catch (err) {
        console.error("Failed to send AI response to backend:", err);
      }
    } catch (error) {
      console.error('Error generating response:', error);
      
      const errorMessage: Message = {
        id: `assistant_error_${Date.now()}`,
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

    // If no current chat, show message to create a new chat manually
    if (!currentChatId) {
      toast({
        title: "No active chat",
        description: "Please click 'New Chat' to start a new conversation.",
        variant: "destructive",
      });
      return;
    }

    const userInput = inputValue;
    setInputValue("");

    // Create user message
    const userMessage: Message = {
      id: `user_${Date.now()}`,
      text: userInput,
      sender: "user",
      timestamp: new Date(),
    };

    console.log("Creating user message:", userMessage);

    // Add user message to current chat immediately
    setChats(prev => prev.map(chat => 
      chat.id === currentChatId 
        ? { 
            ...chat, 
            messages: [...chat.messages, userMessage],
            lastMessage: userInput,
            timestamp: new Date()
          }
        : chat
    ));

    // Update chat title if this is the first user message
    const currentChatMessages = currentChat?.messages || [];
    const isFirstUserMessage = !currentChatMessages.some(msg => msg.sender === "user");
    if (isFirstUserMessage) {
      updateChatTitle(currentChatId, userInput);
    }

    // Send message to backend
    try {
      await sendBackendMessage({
        user_id: userId,
        content: userInput,
        conversation_id: currentChatId,
      });
    } catch (err) {
      console.error("Failed to send message to backend:", err);
    }

    // Generate AI response immediately after user message
    await handleAIResponse(currentChatId, userInput);
  };

  const handleLogout = async () => {
    try {
      await logout();
      // Clear all state
      setChats([]);
      setCurrentChatId("");
      setShowReadyState(true);
      setUserId("");
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Error",
        description: "Failed to logout. Please try again.",
        variant: "destructive",
      });
    }
  };

  console.log("Current state - showReadyState:", showReadyState, "userId:", userId, "chats length:", chats.length, "currentChatId:", currentChatId);

  // Show ready state only if no chats exist or no current chat is selected
  const shouldShowReadyState = showReadyState || !currentChatId || chats.length === 0;

  if (shouldShowReadyState) {
    console.log("Rendering ready state");
    return (
      <div className="flex h-screen bg-gradient-background">
        <ChatSidebar
          onNewChat={handleNewChat}
          onSelectChat={handleSelectChat}
          onDeleteChat={handleDeleteChat}
          onLogout={handleLogout}
          currentChatId={currentChatId}
          chats={chats}
          onSyncChats={syncChatsWithBackend}
        />
        <div className="flex-1">
          <ReadyToChatState onStartChat={handleStartChat} />
        </div>
      </div>
    );
  }

  console.log("Rendering chat interface");
  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <ChatSidebar
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChat}
        onLogout={handleLogout}
        currentChatId={currentChatId}
        chats={chats}
        onSyncChats={syncChatsWithBackend}
      />

      {/* Main Chat Area */}
      <div className="flex flex-col flex-1">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden text-gray-600 hover:text-gray-800"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-100">
          {sortedMessages.map((message, index) => {
            console.log(`Rendering message ${index + 1}: sender=${message.sender}, text="${message.text.substring(0, 30)}..."`);
            
            // Determine if this is a user message
            const isUserMessage = message.sender === "user";
            
            return (
              <div
                key={message.id}
                className={`flex ${isUserMessage ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] px-4 py-3 rounded-xl shadow-md text-sm leading-relaxed ${
                    isUserMessage
                      ? "bg-green-500 text-white rounded-br-none"
                      : "bg-white text-gray-800 rounded-bl-none"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{message.text}</p>
                  <p className="text-[11px] text-gray-400 mt-1 text-right">
                    {message.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })}

          {isTyping && (
            <div className="flex justify-start">
              <div className="max-w-[75%] px-4 py-3 rounded-xl shadow-md bg-white text-gray-800 rounded-bl-none">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-gray-200 bg-white">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <div className="flex-1 relative">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type your message here..."
                className="pr-12 bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-500 focus:ring-green-500 focus:border-green-500 transition-all"
                disabled={isTyping}
              />
            </div>
            <Button
              type="submit"
              size="icon"
              disabled={!inputValue.trim() || isTyping}
              className="bg-green-500 hover:bg-green-600 text-white transition-all disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
