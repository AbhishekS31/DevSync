import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Mic, MicOff, Minimize2, Maximize2, Bot, Sparkles } from 'lucide-react';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { queryGroq, validateApiKey } from '../lib/ai';

interface AIAssistantProps {
  onClose: () => void;
  aiResponse: string;
  onAskAI: (query: string) => void;
}

const AI_MODELS = [
  { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', description: 'Powerful open-source model' },
  { id: 'llama3-70b-8192', name: 'LLaMA3 70B', description: 'High-performance model' },
  { id: 'llama2-70b-4096', name: 'LLaMA2 70B', description: 'Advanced reasoning' },
  { id: 'gemma-7b-it', name: 'Gemma 7B', description: 'Google\'s lightweight model' }
];

export const AIAssistant: React.FC<AIAssistantProps> = ({
  onClose,
  aiResponse,
  onAskAI,
}) => {
  const [query, setQuery] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [selectedModel, setSelectedModel] = useState('mixtral-8x7b-32768');
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [localResponse, setLocalResponse] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [apiKeyValid, setApiKeyValid] = useState<boolean | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const browserSupportsSpeechRecognition = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  
  // Update local response when parent provides a response
  useEffect(() => {
    if (aiResponse) {
      setLocalResponse(aiResponse);
    }
  }, [aiResponse]);

  // Auto-scroll to bottom when response changes
  useEffect(() => {
    scrollToBottom();
  }, [localResponse]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Check API key validity on component mount
  useEffect(() => {
    async function checkApiKey() {
      const isValid = await validateApiKey();
      setApiKeyValid(isValid);
      
      if (!isValid) {
        setErrorMessage('API key validation failed. Please update your Groq API key in the .env file and restart the application.');
      }
    }
    
    checkApiKey();
  }, []);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;
    
    setIsLoading(true);
    setErrorMessage(null);
    
    try {
      // Direct API call without going through parent component
      const result = await queryGroq(query, selectedModel);
      
      if (result.success && result.data) {
        setLocalResponse(result.data);
        // Also update parent state if needed
        onAskAI(query);
      } else {
        throw new Error(result.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('Error in AI query:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
      setQuery('');
      setTranscript('');
    }
  };

  // Format the AI response with code blocks
  const formatResponse = (response: string) => {
    if (!response) return null;
    
    if (response.includes('```')) {
      // More accurate regex for code blocks
      const parts = response.split(/(```[\w]*\n[\s\S]*?```)/g);
      return (
        <>
          {parts.map((part, index) => {
            if (part.startsWith('```')) {
              const language = part.match(/```(\w+)?\n/)?.[1] || 'javascript';
              const code = part.replace(/```[\w]*\n/, '').replace(/```$/, '');
              return (
                <div key={index} className="mb-4 rounded overflow-hidden">
                  <SyntaxHighlighter
                    language={language}
                    style={atomOneDark}
                    className="rounded neo-brutal"
                  >
                    {code}
                  </SyntaxHighlighter>
                </div>
              );
            } else {
              return <p key={index} className="mb-4 whitespace-pre-wrap">{part}</p>;
            }
          })}
        </>
      );
    }
    
    return <p className="whitespace-pre-wrap">{response}</p>;
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const startListening = () => {
    if (!browserSupportsSpeechRecognition) return;
    
    setIsListening(true);
    setTranscript('');
    
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      
      recognition.onresult = (event: any) => {
        const current = event.resultIndex;
        const transcript = event.results[current][0].transcript;
        setTranscript(transcript);
        setQuery(transcript);
      };
      
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };
      
      recognition.start();
      
      (window as any).recognitionInstance = recognition;
    } catch (error) {
      console.error('Speech recognition error:', error);
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if ((window as any).recognitionInstance) {
      (window as any).recognitionInstance.stop();
      (window as any).recognitionInstance = null;
    }
    setIsListening(false);
  };

  const startSpeakingAI = () => {
    const scriptTag = document.createElement('script');
    scriptTag.src = 'https://elevenlabs.io/convai-widget/index.js';
    scriptTag.async = true;
    document.body.appendChild(scriptTag);

    const convaiElement = document.createElement('elevenlabs-convai');
    convaiElement.setAttribute('agent-id', 'SzWuI5pMD0pa4N7Leb7d');
    document.body.appendChild(convaiElement);
  };

  useEffect(() => {
    if (isListening) {
      startSpeakingAI();
    }
  }, [isListening]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className={`fixed bottom-4 right-4 bg-white dark:bg-gray-900 neo-brutal rounded-lg overflow-hidden shadow-xl z-40 ${
        isMinimized ? 'w-64 h-12' : 'w-96 h-[515px]'
      }`}
    >
      <div className="flex items-center justify-between p-3 border-b dark:border-gray-700 bg-gradient-to-r from-blue-500 to-purple-500 text-white">
        <div className="flex items-center gap-2">
          <Bot size={20} />
          <h3 className="font-semibold">AI Assistant</h3>
        </div>
        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowModelSelector(!showModelSelector)}
            className="p-1 hover:bg-white/20 rounded"
          >
            <Sparkles size={16} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-white/20 rounded"
          >
            {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded"
          >
            <X size={16} />
          </motion.button>
        </div>
      </div>

      <AnimatePresence>
        {showModelSelector && !isMinimized && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-b dark:border-gray-700"
          >
            <div className="p-3 space-y-2">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Select AI Model</h4>
              <div className="grid grid-cols-2 gap-2">
                {AI_MODELS.map((model) => (
                  <motion.button
                    key={model.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedModel(model.id)}
                    className={`p-2 text-left rounded neo-brutal ${
                      selectedModel === model.id
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="text-xs font-medium">{model.name}</div>
                    <div className="text-xs opacity-70">{model.description}</div>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {!isMinimized && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="h-[400px] overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-800">
              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-900 text-red-800 dark:text-red-300"
                >
                  <p className="text-sm font-medium">Error: {errorMessage}</p>
                  {apiKeyValid === false && (
                    <div className="mt-2 text-xs">
                      <p>Please check that:</p>
                      <ol className="list-decimal pl-4 mt-1 space-y-1">
                        <li>Your API key is correct and active in your Groq account</li>
                        <li>The key is properly set in the .env file without quotes or spaces</li>
                        <li>You've restarted the application after updating the key</li>
                      </ol>
                    </div>
                  )}
                </motion.div>
              )}
              
              {localResponse ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-lg bg-white dark:bg-gray-700 shadow-sm"
                >
                  {formatResponse(localResponse)}
                </motion.div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                  <div className="w-16 h-16 mb-4 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 flex items-center justify-center">
                    <Bot className="w-8 h-8 text-white" />
                  </div>
                  <p className="text-sm">Ask me anything!</p>
                  <p className="text-xs mt-2">Using {AI_MODELS.find(m => m.id === selectedModel)?.name}</p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSubmit} className="p-3 border-t dark:border-gray-700">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={transcript || "Type your message..."}
                  className="flex-1 p-2 neo-brutal bg-white dark:bg-gray-800 rounded text-sm"
                />
                <motion.button
                  type="button"
                  onClick={toggleListening}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`p-2 neo-brutal rounded ${
                    isListening
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-800'
                  }`}
                  disabled={!browserSupportsSpeechRecognition}
                >
                  {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                </motion.button>
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-2 neo-brutal bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="w-[18px] h-[18px] border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send size={18} />
                  )}
                </motion.button>
              </div>
              {transcript && (
                <div className="mt-2 text-xs text-gray-500">
                  Transcript: {transcript}
                </div>
              )}
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
