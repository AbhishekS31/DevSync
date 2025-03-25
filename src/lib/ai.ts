/**
 * Helper functions for AI API calls
 */

/**
 * Makes a direct API call to Groq
 */
export async function queryGroq(
  prompt: string, 
  model: string = 'mixtral-8x7b-32768'
): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    // Get API key and sanitize it (remove any whitespace that might have been added)
    const apiKey = import.meta.env.VITE_GROQ_API_KEY?.trim();
    
    if (!apiKey) {
      throw new Error('API key is missing');
    }

    // Debug output - mask most of the key but show the last 4 chars for verification
    const maskedKey = apiKey.substring(0, apiKey.length - 4).replace(/./g, '*') + apiKey.substring(apiKey.length - 4);
    console.log(`Using API key ending with: ${apiKey.substring(apiKey.length - 4)}`);
    console.log(`Key length: ${apiKey.length}`);
    console.log(`Calling Groq API with model: ${model}`);
    
    // Make the API request
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 1024,
      })
    });

    // Handle specific error cases
    if (response.status === 401) {
      console.error('Authentication error: API key is invalid or expired');
      return { 
        success: false, 
        error: 'Authentication failed. Please update your Groq API key in the .env file and restart the application.' 
      };
    }
    
    if (!response.ok) {
      const errorDetail = await response.text();
      console.error(`Groq API error (${response.status}):`, errorDetail);
      return {
        success: false,
        error: `API error: ${response.status} - ${errorDetail || response.statusText}`
      };
    }

    // Parse successful response
    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      return {
        success: false,
        error: 'Invalid response format from API'
      };
    }
    
    return { 
      success: true, 
      data: data.choices[0].message.content 
    };
  } catch (error) {
    console.error('Error querying Groq:', error);
    
    // Return friendly error message
    return { 
      success: false, 
      error: error instanceof Error 
        ? error.message 
        : 'Unknown error occurred when calling the AI service'
    };
  }
}

/**
 * Alternative method to check API key validity
 */
export async function validateApiKey(): Promise<boolean> {
  try {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY?.trim();
    
    if (!apiKey) {
      console.error('No API key found');
      return false;
    }
    
    // Test the API key with a minimal request
    const response = await fetch('https://api.groq.com/openai/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    return response.ok;
  } catch (error) {
    console.error('Error validating API key:', error);
    return false;
  }
}
