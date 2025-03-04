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
  Bot,
  Video,
  Zap
} from 'lucide-react';
import { motion } from 'framer-motion';

interface NavbarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onToggleTerminal: () => void;
  onToggleChat: () => void;
  onToggleVideoCall: () => void;
  onToggleAI: () => void;
  onRunCode: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  activeTab, 
  onTabChange,
  onToggleTerminal,
  onToggleChat,
  onToggleVideoCall,
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
    <div className="w-14 bg-gradient-to-b from-gray-900 to-gray-800 flex flex-col items-center py-4 border-r border-black">
      {navItems.map((item) => (
        <motion.button
          key={item.id}
          whileHover={{ scale: 1.1, backgroundColor: '#4B5563' }}
          whileTap={{ scale: 0.9 }}
          className={`p-3 mb-2 rounded-lg transition-colors ${
            activeTab === item.id 
              ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white' 
              : 'text-gray-400 hover:text-white'
          }`}
          onClick={() => onTabChange(item.id)}
          title={item.label}
        >
          <item.icon size={22} />
        </motion.button>
      ))}
      
      <div className="mt-auto flex flex-col gap-3">
        <motion.button
          whileHover={{ scale: 1.1, backgroundColor: '#4B5563' }}
          whileTap={{ scale: 0.9 }}
          className="p-3 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg"
          onClick={onRunCode}
          title="Run Code"
        >
          <Play size={22} />
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.1, backgroundColor: '#4B5563' }}
          whileTap={{ scale: 0.9 }}
          className="p-3 rounded-lg text-gray-400 hover:text-white transition-colors"
          onClick={onToggleTerminal}
          title="Toggle Terminal"
        >
          <Terminal size={22} />
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.1, backgroundColor: '#4B5563' }}
          whileTap={{ scale: 0.9 }}
          className="p-3 rounded-lg text-gray-400 hover:text-white transition-colors"
          onClick={onToggleChat}
          title="Toggle Chat"
        >
          <MessageSquare size={22} />
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.1, backgroundColor: '#4B5563' }}
          whileTap={{ scale: 0.9 }}
          className="p-3 rounded-lg text-gray-400 hover:text-white transition-colors"
          onClick={onToggleVideoCall}
          title="Toggle Video Call"
        >
          <Video size={22} />
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.1, backgroundColor: '#4B5563' }}
          whileTap={{ scale: 0.9 }}
          className="p-3 rounded-lg text-gray-400 hover:text-white transition-colors"
          onClick={onToggleAI}
          title="Toggle AI Assistant"
        >
          <Bot size={22} />
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.1, backgroundColor: '#4B5563' }}
          whileTap={{ scale: 0.9 }}
          className="p-3 rounded-lg text-gray-400 hover:text-white transition-colors mt-2"
          title="Settings"
        >
          <Settings size={22} />
        </motion.button>
      </div>
    </div>
  );
};