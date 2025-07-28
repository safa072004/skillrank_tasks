import { useState, useEffect } from 'react';

const DEFAULT_API_KEY = import.meta.env.VITE_MISTRAL_API_KEY || '';

export const useApiKey = () => {
  const [apiKey, setApiKey] = useState<string>('');

  useEffect(() => {
    const savedKey = localStorage.getItem('google-ai-api-key');
    if (savedKey) {
      setApiKey(savedKey);
    } else {
      setApiKey(DEFAULT_API_KEY); // fallback from .env if nothing is saved
    }
  }, []);

  const saveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('google-ai-api-key', key);
  };

  const clearApiKey = () => {
    setApiKey(DEFAULT_API_KEY); // fallback to env key after clear
    localStorage.removeItem('google-ai-api-key');
  };

  return { apiKey, saveApiKey, clearApiKey };
};
