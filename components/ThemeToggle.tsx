import React from 'react';
import { useTheme } from './ThemeProvider';
import { Sun, Moon, Monitor } from 'lucide-react';
import Tooltip from './Tooltip';

const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1 rounded-full border border-slate-200 dark:border-slate-700/50 backdrop-blur-sm self-center">
      <Tooltip content="Light Mode">
        <button
          onClick={() => setTheme('light')}
          className={`p-1.5 rounded-full transition-all ${theme === 'light' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'}`}
        >
          <Sun className="w-4 h-4" />
        </button>
      </Tooltip>
      <Tooltip content="Dark Mode">
        <button
          onClick={() => setTheme('dark')}
          className={`p-1.5 rounded-full transition-all ${theme === 'dark' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'}`}
        >
          <Moon className="w-4 h-4" />
        </button>
      </Tooltip>
      <Tooltip content="System Default">
        <button
          onClick={() => setTheme('system')}
          className={`p-1.5 rounded-full transition-all ${theme === 'system' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'}`}
        >
          <Monitor className="w-4 h-4" />
        </button>
      </Tooltip>
    </div>
  );
};

export default ThemeToggle;
