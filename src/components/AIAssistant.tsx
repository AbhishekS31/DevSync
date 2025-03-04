import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Loader, X, Minimize2, Maximize2, Send, Copy, Check, ChevronDown } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface AIAssistantProps {
  onClose: () => void;
  aiResponse: string;
  onAskAI: (query: string) => Promise<void>;
}

interface Message {
  type: 'user' | 'ai';
  content: string;
  codeBlocks?: Array<{
    language: string;
    code: string;
  }>;
}

interface Model {
  id: string;
  name: string;
  description: string;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({ onClose, aiResponse, onAskAI }) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<Model>({
    id: 'mixtral-8x7b-32768',
    name: 'Mixtral 8x7B',
    description: 'A powerful mixture-of-experts model with 8x7B parameters'
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const models: Model[] = [
    {
      id: 'mixtral-8x7b-32768',
      name: 'Mixtral 8x7B',
      description: 'A powerful mixture-of-experts model with 8x7B parameters'
    },
    {
      id: 'llama3-70b-8192',
      name: 'Llama 3 70B',
      description: 'Meta\'s largest open source LLM with 70B parameters'
    },
    {
      id: 'llama3-8b-8192',
      name: 'Llama 3 8B',
      description: 'Lightweight and efficient 8B parameter model'
    },
    {
      id: 'gemma-7b-it',
      name: 'Gemma 7B',
      description: 'Google\'s lightweight and efficient 7B parameter model'
    },
    {
      id: 'claude-3-opus-20240229',
      name: 'Claude 3 Opus',
      description: 'Anthropic\'s most powerful model for complex reasoning'
    }
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (aiResponse && messages.length > 0 && messages[messages.length - 1].type === 'user') {
      const processedMessage = processAIResponse(aiResponse);
      setMessages(prev => [...prev, processedMessage]);
      setIsLoading(false);
      scrollToBottom();
    }
  }, [aiResponse]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsModelDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const processAIResponse = (response: string): Message => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const codeBlocks: Array<{ language: string; code: string }> = [];
    let lastIndex = 0;
    let content = '';

    let match;
    while ((match = codeBlockRegex.exec(response)) !== null) {
      content += response.slice(lastIndex, match.index);
      const language = match[1] || 'bash';
      const code = match[2].trim();
      codeBlocks.push({ language, code });
      lastIndex = match.index + match[0].length;
    }
    content += response.slice(lastIndex);

    return {
      type: 'ai',
      content: content.trim(),
      codeBlocks
    };
  };

  const handleCopyCode = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { type: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      await onAskAI(userMessage);
    } catch (error) {
      setMessages(prev => [...prev, { type: 'ai', content: 'Error processing your request.' }]);
      setIsLoading(false);
    }
  };

  const handleModelSelect = (model: Model) => {
    setSelectedModel(model);
    setIsModelDropdownOpen(false);
    
    // Add a system message to indicate model change
    setMessages(prev => [
      ...prev, 
      { 
        type: 'ai', 
        content: `Model switched to ${model.name}. How can I help you?` 
      }
    ]);
  };

  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.95, opacity: 0 }}
      className={`fixed bottom-16 right-4 bg-white dark:bg-gray-900 neo-brutal rounded-lg overflow-hidden shadow-xl ${
        isMinimized ? 'w-64 h-12' : 'w-[600px] h-[600px]'
      } z-50`}
    >
      <div className="flex items-center justify-between p-3 border-b dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Bot size={20} className="text-purple-500" />
          <h3 className="font-semibold">AI Assistant</h3>
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
              className="flex items-center gap-1 text-xs bg-purple-100 dark:bg-purple-900 px-2 py-1 rounded-full"
            >
              {selectedModel.name}
              <ChevronDown size={12} />
            </button>
            {isModelDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden z-50">
                {models.map((model) => (
                  <div
                    key={model.id}
                    className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer ${
                      selectedModel.id === model.id ? 'bg-purple-100 dark:bg-purple-900' : ''
                    }`}
                    onClick={() => handleModelSelect(model)}
                  >
                    <div className="font-medium">{model.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{model.description}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
          >
            {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {!isMinimized && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="h-[500px] overflow-y-auto p-4 space-y-4">
              {messages.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-3 rounded-lg ${
                    message.type === 'ai'
                      ? 'bg-purple-100 dark:bg-purple-900'
                      : 'bg-gray-100 dark:bg-gray-800'
                  }`}
                >
                  <div className="prose dark:prose-invert max-w-none">
                    {message.content}
                  </div>
                  
                  {message.codeBlocks?.map((block, blockIndex) => (
                    <div key={blockIndex} className="mt-3 relative">
                      <div className="absolute right-2 top-2 z-10">
                        <button
                          onClick={() => handleCopyCode(block.code, blockIndex)}
                          className="p-1 bg-gray-800 text-white rounded hover:bg-gray-700"
                        >
                          {copiedIndex === blockIndex ? (
                            <Check size={14} />
                          ) : (
                            <Copy size={14} />
                          )}
                        </button>
                      </div>
                      <SyntaxHighlighter
                        language={block.language}
                        style={vscDarkPlus}
                        className="rounded-lg !mt-0"
                      >
                        {block.code}
                      </SyntaxHighlighter>
                    </div>
                  ))}
                </motion.div>
              ))}
              {isLoading && (
                <div className="flex items-center gap-2 text-gray-500">
                  <Loader className="animate-spin" size={16} />
                  Thinking with {selectedModel.name}...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSubmit} className="p-4 border-t dark:border-gray-700">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={`Ask ${selectedModel.name} anything...`}
                  className="flex-1 p-2 neo-brutal bg-white dark:bg-gray-800 rounded"
                />
                <button
                  type="submit"
                  className="p-2 neo-brutal bg-purple-500 text-white rounded hover:bg-purple-600"
                  disabled={isLoading}
                >
                  <Send size={16} />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};