
import { useState } from "react";
import { ChatWindow } from "@/components/ChatWindow";
import { LoginPage } from "@/components/LoginPage";
import { RegisterPage } from "@/components/RegisterPage";
import { login, register } from "@/services/authService";

const Index = () => {
  const [authMode, setAuthMode] = useState<"login" | "register" | "chat">("login");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      await login(username, password);
        setAuthMode("chat");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      await register(username, password);
      await login(username, password);
    setAuthMode("chat");
    } finally {
      setIsLoading(false);
  }
  };

  if (authMode === "chat") {
    return <ChatWindow />;
  }

  if (authMode === "register") {
    return (
      <RegisterPage
        onRegister={() => setAuthMode("chat")}
        onSwitchToLogin={() => setAuthMode("login")}
      />
    );
  }

  return (
    <LoginPage
      onLogin={() => setAuthMode("chat")}
      onSwitchToRegister={() => setAuthMode("register")}
    />
  );
};

export default Index;
