
import { Bot, Send } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface ReadyToChatStateProps {
  onStartChat: (message: string) => void;
}

export const ReadyToChatState = ({ onStartChat }: ReadyToChatStateProps) => {
  const [inputValue, setInputValue] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    onStartChat(inputValue.trim());
    setInputValue("");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-4">
      {/* Main Content Container */}
      <div className="w-full max-w-2xl mx-auto text-center space-y-8">
        
        {/* Logo/Brand Section */}
        <div className="space-y-4">
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center shadow-glow">
              <Bot className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
          
          <h1 className="text-4xl font-light text-foreground tracking-tight">
            How can I help you today?
          </h1>
        </div>

        {/* Input Section */}
        <div className="w-full">
          <form onSubmit={handleSubmit} className="relative">
            <div className="relative group">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Message ChatNest..."
                className="w-full h-14 pl-6 pr-14 text-base bg-card border-border rounded-2xl shadow-lg focus:shadow-xl transition-all duration-300 focus:ring-2 focus:ring-chat-primary/20 focus:border-chat-primary/30 hover:shadow-lg"
              />
              <Button
                type="submit"
                size="icon"
                disabled={!inputValue.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-gradient-primary hover:shadow-glow transition-all duration-300 disabled:opacity-30 disabled:hover:shadow-none"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </div>

        {/* Subtle Helper Text */}
        <p className="text-sm text-muted-foreground font-light">
          
        </p>
      </div>

      {/* Footer spacing */}
      <div className="h-20" />
    </div>
  );
};
