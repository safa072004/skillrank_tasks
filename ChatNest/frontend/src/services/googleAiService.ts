// generateResponse.ts
export const generateResponse = async (message: string): Promise<string> => {
  const apiKey = import.meta.env.VITE_MISTRAL_API_KEY;

  try {
    const systemPrompt = 'You are a helpful AI assistant. Provide responses that are appropriate in length and detail for what the user is asking. Be natural and comprehensive when needed, concise when appropriate.';

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'mistral-large-latest',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: message
          }
        ],
        temperature: 0.7,
        max_tokens: 4000
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();

    if (data.choices && data.choices[0] && data.choices[0].message) {
      return data.choices[0].message.content;
    } else {
      throw new Error('Unexpected response format from Mistral AI');
    }
  } catch (error) {
    console.error('Error calling Mistral AI API:', error);
    throw error;
  }
};
