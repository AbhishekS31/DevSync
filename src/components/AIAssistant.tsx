import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Mic, MicOff, Minimize2, Maximize2, Bot, Sparkles } from 'lucide-react';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { getSocket } from '../lib/socket';

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
  const [localAiResponse, setLocalAiResponse] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const browserSupportsSpeechRecognition = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  
  useEffect(() => {
    if (aiResponse) {
      setLocalAiResponse(aiResponse);
    }
  }, [aiResponse]);

  useEffect(() => {
    scrollToBottom();
  }, [localAiResponse]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setIsLoading(true);
    setLocalAiResponse(''); // Clear previous response
    setErrorMessage(null); // Clear error message
    
    try {
      // Use socket to make the API request through the server
      const socket = getSocket();
      if (!socket) {
        throw new Error('Socket connection not available');
      }
      
      socket.emit('ask-ai', { query, model: selectedModel }, (response: any) => {
        if (response.success) {
          setLocalAiResponse(response.data);
        } else {
          setErrorMessage(response.error || 'Failed to get response from AI');
          setLocalAiResponse('Sorry, there was an error processing your request.');
        }
        setIsLoading(false);
      });
      
      setQuery('');
      setTranscript('');
    } catch (error) {
      console.error("Error asking AI:", error);
      setLocalAiResponse("Sorry, there was an error processing your request. Please try again.");
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error occurred');
      setIsLoading(false);
    }
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

  const formatResponse = (response: string) => {
    if (!response) return null;
    
    if (response.includes('```')) {
      const parts = response.split(/```(\w+)?\n/);
      return (
        <>
          {parts.map((part, index) => {
            if (index % 3 === 0) {
              return <p key={index} className="mb-4 whitespace-pre-wrap">{part}</p>;
            } else if (index % 3 === 1) {
              return null;
            } else {
              const language = parts[index - 1] || 'javascript';
              return (
                <div key={index} className="mb-4 rounded overflow-hidden">
                  <SyntaxHighlighter
                    language={language}
                    style={atomOneDark}
                    className="rounded neo-brutal"
                  >
                    {part}
                  </SyntaxHighlighter>
                </div>
              );
            }
          })}
        </>
      );
    }
    
    return <p className="whitespace-pre-wrap">{response}</p>;
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
                </motion.div>
              )}
              
              {localAiResponse ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-lg bg-white dark:bg-gray-700 shadow-sm"
                >
                  {formatResponse(localAiResponse)}
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
