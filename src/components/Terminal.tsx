import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { WebglAddon } from 'xterm-addon-webgl';
import { motion, AnimatePresence } from 'framer-motion';
import { Maximize2, Minimize2, X, Play, Code2 } from 'lucide-react';
import { Rnd } from 'react-rnd';
import { runCode } from '../lib/codeRunner';
import 'xterm/css/xterm.css';

interface TerminalProps {
  isVisible: boolean;
  onClose: () => void;
  currentCode?: string;
}

export const Terminal: React.FC<TerminalProps> = ({ isVisible, onClose, currentCode }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const webglAddonRef = useRef<WebglAddon | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [command, setCommand] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [selectedLanguage, setSelectedLanguage] = useState('python');
  const [terminalSize, setTerminalSize] = useState({ width: '100%', height: 300 });

  useEffect(() => {
    if (!terminalRef.current || !isVisible) return;

    const term = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1E1E1E',
        foreground: '#ffffff',
        cursor: '#ffffff',
        selection: '#5DA5D533',
        black: '#1E1E1E',
        red: '#E06C75',
        green: '#98C379',
        yellow: '#D19A66',
        blue: '#61AFEF',
        magenta: '#C678DD',
        cyan: '#56B6C2',
        white: '#ABB2BF',
      },
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    
    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);

    // Only try to load WebGL addon if we're not cleaning up
    let webglAddon: WebglAddon | null = null;
    try {
      webglAddon = new WebglAddon();
      term.loadAddon(webglAddon);
      webglAddonRef.current = webglAddon;
    } catch (e) {
      console.warn('WebGL addon could not be loaded', e);
    }

    term.open(terminalRef.current);
    fitAddon.fit();

    term.write('\x1b[1;32mCodeCollab Terminal\x1b[0m\r\n');
    term.write('Type "help" for available commands\r\n');
    term.write('$ ');

    term.onKey(({ key, domEvent }) => {
      const printable = !domEvent.altKey && !domEvent.ctrlKey && !domEvent.metaKey;

      if (domEvent.keyCode === 13) { // Enter
        term.write('\r\n');
        if (command.trim()) {
          executeCommand(command.trim(), term);
          setCommandHistory(prev => [...prev, command.trim()]);
          setHistoryIndex(-1);
        }
        term.write('$ ');
        setCommand('');
      } else if (domEvent.keyCode === 8) { // Backspace
        if (command.length > 0) {
          term.write('\b \b');
          setCommand(command.slice(0, -1));
        }
      } else if (domEvent.keyCode === 38) { // Up arrow
        if (commandHistory.length > 0 && historyIndex < commandHistory.length - 1) {
          const newIndex = historyIndex + 1;
          setHistoryIndex(newIndex);
          const newCommand = commandHistory[commandHistory.length - 1 - newIndex];
          term.write('\r$ ' + ' '.repeat(command.length) + '\r$ ' + newCommand);
          setCommand(newCommand);
        }
      } else if (domEvent.keyCode === 40) { // Down arrow
        if (historyIndex > 0) {
          const newIndex = historyIndex - 1;
          setHistoryIndex(newIndex);
          const newCommand = commandHistory[commandHistory.length - 1 - newIndex];
          term.write('\r$ ' + ' '.repeat(command.length) + '\r$ ' + newCommand);
          setCommand(newCommand);
        } else if (historyIndex === 0) {
          setHistoryIndex(-1);
          term.write('\r$ ' + ' '.repeat(command.length) + '\r$ ');
          setCommand('');
        }
      } else if (printable) {
        term.write(key);
        setCommand(command + key);
      }
    });

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    return () => {
      // Clean up addons in reverse order
      if (webglAddonRef.current) {
        try {
          webglAddonRef.current.dispose();
        } catch (e) {
          console.warn('Error disposing WebGL addon:', e);
        }
        webglAddonRef.current = null;
      }

      if (fitAddonRef.current) {
        try {
          fitAddonRef.current.dispose();
        } catch (e) {
          console.warn('Error disposing fit addon:', e);
        }
        fitAddonRef.current = null;
      }

      if (xtermRef.current) {
        try {
          xtermRef.current.dispose();
        } catch (e) {
          console.warn('Error disposing xterm:', e);
        }
        xtermRef.current = null;
      }
    };
  }, [isVisible]);

  useEffect(() => {
    const handleResize = () => {
      if (fitAddonRef.current) {
        try {
          fitAddonRef.current.fit();
        } catch (e) {
          console.warn('Error fitting terminal:', e);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const executeCommand = async (cmd: string, term: XTerm) => {
    const commands: { [key: string]: () => void } = {
      clear: () => {
        term.clear();
      },
      help: () => {
        term.writeln('Available commands:');
        term.writeln('  clear      - Clear the terminal');
        term.writeln('  help       - Show this help message');
        term.writeln('  run        - Run the current code');
        term.writeln('  language   - Show or set programming language');
        term.writeln('  ls         - List files');
      },
      ls: () => {
        term.writeln('src/');
        term.writeln('public/');
        term.writeln('package.json');
        term.writeln('README.md');
      },
    };

    if (cmd === 'run' && currentCode) {
      term.writeln(`Running ${selectedLanguage} code...\r\n`);
      const output = await runCode(currentCode, selectedLanguage);
      term.writeln(output);
    } else if (cmd.startsWith('language')) {
      const parts = cmd.split(' ');
      if (parts.length === 1) {
        term.writeln(`Current language: ${selectedLanguage}`);
        term.writeln('Supported languages: python, javascript');
      } else {
        const newLang = parts[1].toLowerCase();
        if (['python', 'javascript'].includes(newLang)) {
          setSelectedLanguage(newLang);
          term.writeln(`Language set to: ${newLang}`);
        } else {
          term.writeln(`Unsupported language: ${newLang}`);
        }
      }
    } else if (commands[cmd]) {
      commands[cmd]();
    } else {
      term.writeln(`Command not found: ${cmd}`);
    }
  };

  const handleRunCode = async () => {
    if (!currentCode || !xtermRef.current) return;
    
    xtermRef.current.writeln(`\r\nRunning ${selectedLanguage} code...\r\n`);
    const output = await runCode(currentCode, selectedLanguage);
    xtermRef.current.writeln(output);
    xtermRef.current.write('\r\n$ ');
  };

  const handleResizeStop = (e: any, direction: any, ref: HTMLElement, delta: any) => {
    setTerminalSize({
      width: ref.style.width,
      height: parseInt(ref.style.height)
    });
    
    // Fit the terminal to the new size
    if (fitAddonRef.current) {
      setTimeout(() => {
        fitAddonRef.current?.fit();
      }, 0);
    }
  };

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <Rnd
          default={{
            x: 0,
            y: window.innerHeight - 300,
            width: '100%',
            height: 300
          }}
          minHeight={200}
          minWidth={400}
          maxHeight={window.innerHeight - 100}
          dragHandleClassName="terminal-drag-handle"
          bounds="window"
          onResizeStop={handleResizeStop}
          style={{
            position: 'fixed',
            zIndex: 50,
            display: 'flex',
            flexDirection: 'column'
          }}
          disableDragging={isMaximized}
          size={isMaximized ? { width: '100%', height: '100%' } : undefined}
          position={isMaximized ? { x: 0, y: 0 } : undefined}
          enableResizing={!isMaximized}
        >
          <motion.div
            key="terminal"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="flex flex-col h-full bg-[#1E1E1E] neo-brutal"
          >
            <div className="flex justify-between items-center p-2 bg-[#2D2D2D] border-b border-gray-700 terminal-drag-handle cursor-move">
              <div className="flex items-center gap-4">
                <span className="text-white font-mono">Terminal</span>
                <div className="flex items-center gap-2 bg-[#1E1E1E] rounded px-2 py-1">
                  <Code2 className="w-4 h-4 text-white" />
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="bg-transparent text-white text-sm outline-none"
                  >
                    <option value="python">Python</option>
                    <option value="javascript">JavaScript</option>
                  </select>
                </div>
                <button
                  onClick={handleRunCode}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded neo-brutal"
                >
                  <Play className="w-4 h-4" />
                  <span className="text-sm">Run</span>
                </button>
              </div>
              <div className="flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsMaximized(!isMaximized)}
                  className="p-1 hover:bg-gray-600 rounded"
                >
                  {isMaximized ? (
                    <Minimize2 className="w-4 h-4 text-white" />
                  ) : (
                    <Maximize2 className="w-4 h-4 text-white" />
                  )}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onClose}
                  className="p-1 hover:bg-gray-600 rounded"
                >
                  <X className="w-4 h-4 text-white" />
                </motion.button>
              </div>
            </div>
            <div
              ref={terminalRef}
              className="flex-1 overflow-hidden"
            />
          </motion.div>
        </Rnd>
      )}
    </AnimatePresence>
  );
};