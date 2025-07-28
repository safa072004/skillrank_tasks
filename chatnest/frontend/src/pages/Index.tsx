
import { useState, useEffect } from "react";
import { ChatWindow } from "@/components/ChatWindow";
import { LoginPage } from "@/components/LoginPage";
import { RegisterPage } from "@/components/RegisterPage";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

const Index = () => {
  console.log("Index component rendering");
  const [authMode, setAuthMode] = useState<"login" | "register" | "chat">("login");
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Monitor Firebase authentication state
  useEffect(() => {
    console.log("Index useEffect running");
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log("Firebase auth state changed:", user ? "logged in" : "logged out");
      if (user) {
        // User is signed in
        setIsAuthenticated(true);
        setAuthMode("chat");
      } else {
        // User is signed out
        setIsAuthenticated(false);
        setAuthMode("login");
      }
    });

    return () => unsubscribe();
  }, []);

  console.log("Index render - authMode:", authMode, "isAuthenticated:", isAuthenticated);

  const handleLoginSuccess = () => {
    // The Firebase auth state change will handle the redirect
    console.log("Login successful, waiting for auth state change...");
  };

  const handleRegisterSuccess = () => {
    // The Firebase auth state change will handle the redirect
    console.log("Registration successful, waiting for auth state change...");
  };

  if (authMode === "chat" && isAuthenticated) {
    console.log("Rendering ChatWindow");
    return <ChatWindow />;
  }

  if (authMode === "register") {
    console.log("Rendering RegisterPage");
    return (
      <RegisterPage
        onRegister={handleRegisterSuccess}
        onSwitchToLogin={() => setAuthMode("login")}
      />
    );
  }

  console.log("Rendering LoginPage");
  return (
    <LoginPage
      onLogin={handleLoginSuccess}
      onSwitchToRegister={() => setAuthMode("register")}
    />
  );
};

export default Index;
