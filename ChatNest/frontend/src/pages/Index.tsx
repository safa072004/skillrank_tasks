
import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { ChatWindow } from "@/components/ChatWindow";
import { LoginPage } from "@/components/LoginPage";
import { RegisterPage } from "@/components/RegisterPage";
import { auth } from "@/lib/firebase";

type AuthMode = "login" | "register" | "chat";

const Index = () => {
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log("User is signed in:", user.email);
        setAuthMode("chat");
      } else {
        console.log("User is signed out");
        setAuthMode("login");
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = () => {
    setAuthMode("chat");
  };

  const handleRegister = () => {
    setAuthMode("chat");
  };

  const handleSwitchToRegister = () => {
    setAuthMode("register");
  };

  const handleSwitchToLogin = () => {
    setAuthMode("login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-chat-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (authMode === "chat") {
    return <ChatWindow />;
  }

  if (authMode === "register") {
    return (
      <RegisterPage
        onRegister={handleRegister}
        onSwitchToLogin={handleSwitchToLogin}
      />
    );
  }

  return (
    <LoginPage
      onLogin={handleLogin}
      onSwitchToRegister={handleSwitchToRegister}
    />
  );
};

export default Index;
