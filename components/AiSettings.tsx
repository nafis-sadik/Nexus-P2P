import React, { useState } from 'react';
import { AiConfig, AiProvider } from '../types';
import Button from './Button';
import Tooltip from './Tooltip';
import { Bot, Save, X, Globe, Key, Tag } from 'lucide-react';
import { motion } from 'motion/react';

interface AiSettingsProps {
  config: AiConfig | null;
  onSave: (config: AiConfig) => void;
  onClose: () => void;
}

const AiSettings: React.FC<AiSettingsProps> = ({ config, onSave, onClose }) => {
  const [provider, setProvider] = useState<AiProvider>(config?.provider || 'gemini');
  const [apiKey, setApiKey] = useState(config?.apiKey || '');
  const [baseUrl, setBaseUrl] = useState(config?.baseUrl || '');
  const [modelName, setModelName] = useState(config?.modelName || '');

  const handleSave = () => {
    onSave({
      provider,
      apiKey: apiKey.trim(),
      baseUrl: baseUrl.trim(),
      modelName: modelName.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl"
      >
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-xl">
              <Bot className="w-6 h-6 text-indigo-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">AI Configuration</h2>
          </div>
          <Tooltip content="Close Settings" position="bottom">
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500"
            >
              <X className="w-5 h-5" />
            </button>
          </Tooltip>
        </div>

        <div className="space-y-6">
          {/* Provider Select */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 ml-1">AI Provider</label>
            <div className="grid grid-cols-3 gap-2">
              {(['gemini', 'ollama', 'openrouter'] as AiProvider[]).map((p) => (
                <Tooltip key={p} content={`Switch to ${p === 'gemini' ? 'Google Gemini' : p === 'ollama' ? 'Local Ollama' : 'OpenRouter Unified API'}`}>
                  <button
                    onClick={() => setProvider(p)}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                      provider === p 
                      ? 'bg-indigo-50 text-indigo-600 border-indigo-200 shadow-sm' 
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    {p.toUpperCase()}
                  </button>
                </Tooltip>
              ))}
            </div>
          </div>

          {/* Configuration Fields */}
          <div className="space-y-4">
            {provider !== 'ollama' && (
              <div className="relative group">
                <label className="block text-[10px] font-mono uppercase tracking-tight text-slate-400 dark:text-slate-500 mb-1.5 ml-1">API Key</label>
                <div className="relative">
                  <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter API Key..."
                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all dark:text-white"
                  />
                </div>
              </div>
            )}

            {(provider === 'ollama' || provider === 'openrouter') && (
              <div className="relative group">
                <label className="block text-[10px] font-mono uppercase tracking-tight text-slate-400 dark:text-slate-500 mb-1.5 ml-1">Server URL</label>
                <div className="relative">
                  <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                  <input
                    type="text"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder={provider === 'ollama' ? 'http://localhost:11434' : 'https://openrouter.ai/api/v1'}
                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all dark:text-white"
                  />
                </div>
              </div>
            )}

            <div className="relative group">
              <label className="block text-[10px] font-mono uppercase tracking-tight text-slate-400 dark:text-slate-500 mb-1.5 ml-1">Model Name</label>
              <div className="relative">
                <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <input
                  type="text"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  placeholder={
                    provider === 'gemini' ? 'gemini-1.5-flash' : 
                    provider === 'ollama' ? 'llama3' : 'openai/gpt-3.5-turbo'
                  }
                  className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          <Button 
            onClick={onClose} 
            variant="ghost" 
            className="flex-1 justify-center rounded-xl py-6"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            className="flex-1 justify-center rounded-xl bg-indigo-600 hover:bg-indigo-700 py-6"
            icon={<Save className="w-4 h-4" />}
          >
            Save Config
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default AiSettings;
