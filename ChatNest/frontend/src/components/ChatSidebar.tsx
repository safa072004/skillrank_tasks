
import React, { useState } from 'react';
import { Plus, MessageSquare, Settings, LogOut, Trash2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTheme } from '@/hooks/useTheme';
import { SettingsModal } from './SettingsModal';

interface Chat {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
}

interface ChatSidebarProps {
  isOpen?: boolean;
  onNewChat?: () => void;
  onSelectChat?: (chatId: string) => void;
  onDeleteChat?: (chatId: string) => void;
  onLogout?: () => void;
  currentChatId?: string;
  chats?: Chat[];
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  isOpen = true,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  onLogout,
  currentChatId,
  chats = []
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { isDarkMode } = useTheme();

  const truncateTitle = (title: string, maxLength: number = 25) => {
    // Keep only the first sentence for clean display
    const firstSentence = title.split('.')[0];
    return firstSentence.length > maxLength ? firstSentence.substring(0, maxLength) + '...' : firstSentence;
  };

  const filteredChats = chats.filter(chat => 
    chat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) {
    return null;
  }

  return (
    <>
      <div className="flex h-full w-64 flex-col bg-background">
        {/* Header with New Chat Button */}
        <div className="flex flex-col gap-2 p-4 pb-6">
          <Button 
            onClick={onNewChat}
            className="w-full justify-start gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
            size="sm"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-hidden">
          {chats.length > 0 && (
            <>
              {/* Search Input */}
              <div className="px-4 pb-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search chats..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 rounded-2xl border-border bg-muted/50 hover:bg-muted/70 focus:bg-background transition-colors"
                  />
                </div>
              </div>

              <div className="px-4 pb-2">
                <h3 className="text-sm font-medium text-muted-foreground">Recent Chats</h3>
              </div>
              <ScrollArea className="flex-1 px-2">
                <div className="space-y-1">
                  {filteredChats.map((chat) => (
                    <div
                      key={chat.id}
                      className={`group relative flex items-center gap-3 rounded-lg p-3 cursor-pointer transition-colors ${
                        currentChatId === chat.id
                          ? 'bg-accent text-accent-foreground'
                          : 'hover:bg-accent/50'
                      }`}
                      onClick={() => onSelectChat?.(chat.id)}
                    >
                      <MessageSquare className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {truncateTitle(chat.title, 35)}
                        </p>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-6 w-6 hover:bg-destructive/10 hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteChat?.(chat.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}

          {chats.length === 0 && (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              No previous chats
            </div>
          )}

          {chats.length > 0 && filteredChats.length === 0 && searchQuery && (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              No chats found
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 space-y-2">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 hover:bg-accent hover:text-accent-foreground"
            size="sm"
            onClick={() => setIsSettingsOpen(true)}
          >
            <Settings className="h-4 w-4" />
            Settings
          </Button>
          
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 hover:bg-accent hover:text-accent-foreground"
            size="sm"
            onClick={onLogout}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
    </>
  );
};
