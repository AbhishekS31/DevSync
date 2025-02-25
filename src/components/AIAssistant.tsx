import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Loader, X, Minimize2, Maximize2, Send, Copy, Check } from 'lucide-react';
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

export const AIAssistant: React.FC<AIAssistantProps> = ({ onClose, aiResponse, onAskAI }) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
                  Thinking...
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
                  placeholder="Ask me anything..."
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