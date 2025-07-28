
import { useState } from 'react';
import { Key, Eye, EyeOff, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

interface ApiKeyInputProps {
  apiKey: string;
  onSave: (key: string) => void;
  onClear: () => void;
}

export const ApiKeyInput = ({ apiKey, onSave, onClear }: ApiKeyInputProps) => {
  const [inputValue, setInputValue] = useState(apiKey);
  const [showKey, setShowKey] = useState(false);

  const handleSave = () => {
    onSave(inputValue);
  };

  return (
    <Card className="p-4 mb-4 bg-card border-border">
      <div className="flex items-center gap-2 mb-3">
        <Key className="h-4 w-4 text-chat-primary" />
        <h3 className="text-sm font-medium text-foreground">Google AI API Key</h3>
      </div>
      
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Input
              type={showKey ? "text" : "password"}
              placeholder="Enter your Google AI API key..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
              onClick={() => setShowKey(!showKey)}
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          
          <Button onClick={handleSave} size="sm" disabled={!inputValue.trim()}>
            <Save className="h-4 w-4 mr-1" />
            Save
          </Button>
          
          {apiKey && (
            <Button onClick={onClear} variant="outline" size="sm">
              <Trash2 className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
        
        {!apiKey && (
          <p className="text-xs text-muted-foreground">
            Enter your Google AI API key to enable AI responses. Your key will be stored locally in your browser.
          </p>
        )}
        
        {apiKey && (
          <p className="text-xs text-green-600">
            ✓ API key saved. AI responses are enabled.
          </p>
        )}
      </div>
    </Card>
  );
};
