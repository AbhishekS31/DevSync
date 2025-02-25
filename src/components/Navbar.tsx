import React from 'react';
import { 
  Files, 
  Search, 
  GitBranch, 
  Bug, 
  Package, 
  Terminal,
  MessageSquare,
  Settings,
  Play,
  Bot
} from 'lucide-react';
import { motion } from 'framer-motion';

interface NavbarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onToggleTerminal: () => void;
  onToggleChat: () => void;
  onToggleAI: () => void;
  onRunCode: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  activeTab, 
  onTabChange,
  onToggleTerminal,
  onToggleChat,
  onToggleAI,
  onRunCode
}) => {
  const navItems = [
    { id: 'files', icon: Files, label: 'Explorer' },
    { id: 'search', icon: Search, label: 'Search' },
    { id: 'git', icon: GitBranch, label: 'Source Control' },
    { id: 'debug', icon: Bug, label: 'Run and Debug' },
    { id: 'extensions', icon: Package, label: 'Extensions' }
  ];

  return (
    <div className="w-12 bg-[#2C2C2C] flex flex-col items-center py-2 border-r border-black">
      {navItems.map((item) => (
        <motion.button
          key={item.id}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className={`p-2 mb-2 hover:bg-gray-700 rounded ${
            activeTab === item.id ? 'bg-gray-700' : ''
          }`}
          onClick={() => onTabChange(item.id)}
          title={item.label}
        >
          <item.icon size={24} className="text-gray-400" />
        </motion.button>
      ))}
      
      <div className="mt-auto flex flex-col gap-2">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="p-2 hover:bg-gray-700 rounded bg-green-600"
          onClick={onRunCode}
          title="Run Code"
        >
          <Play size={24} className="text-white" />
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="p-2 hover:bg-gray-700 rounded"
          onClick={onToggleTerminal}
          title="Toggle Terminal"
        >
          <Terminal size={24} className="text-gray-400" />
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="p-2 hover:bg-gray-700 rounded"
          onClick={onToggleChat}
          title="Toggle Chat"
        >
          <MessageSquare size={24} className="text-gray-400" />
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="p-2 hover:bg-gray-700 rounded"
          onClick={onToggleAI}
          title="Toggle AI Assistant"
        >
          <Bot size={24} className="text-gray-400" />
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="p-2 hover:bg-gray-700 rounded"
          title="Settings"
        >
          <Settings size={24} className="text-gray-400" />
        </motion.button>
      </div>
    </div>
  );
};