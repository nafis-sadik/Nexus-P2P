import React, { useState, useRef, useEffect } from 'react';
import { DataConnection } from 'peerjs';
import { ChatMessage, MessageType, UserProfile, AiConfig } from '../types';
import Button from './Button';
import { Send, Paperclip, FileText, Download, Sparkles, Bot } from 'lucide-react';
import * as aiService from '../services/aiService';

import { motion, AnimatePresence } from 'motion/react';

interface ChatInterfaceProps {
  connection: DataConnection | null;
  currentUser: UserProfile;
  messages: ChatMessage[];
  onSendMessage: (msg: ChatMessage) => void;
  aiConfig: AiConfig | null;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ connection, currentUser, messages, onSendMessage, aiConfig }) => {
  const [inputText, setInputText] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isAiEnabled, setIsAiEnabled] = useState(true);
  const [suggestedReplies, setSuggestedReplies] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Check if AI is enabled based on config or env
    if (!aiConfig && (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'undefined')) {
      setIsAiEnabled(false);
    } else {
      setIsAiEnabled(true);
    }
  }, [aiConfig]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendText = (text: string = inputText) => {
    if (!text.trim() || !connection) return;

    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      senderId: currentUser.id,
      senderName: currentUser.name,
      content: text,
      type: MessageType.TEXT,
      timestamp: Date.now()
    };

    connection.send(msg);
    onSendMessage(msg);
    setInputText('');
    setSuggestedReplies([]); // Clear suggestions after sending
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !connection) return;

    // Increased limit to 2GB as requested
    const MAX_SIZE = 2 * 1024 * 1024 * 1024; // 2GB
    if (file.size > MAX_SIZE) {
        alert("File too large. Maximum size is 2GB.");
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
    }

    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      senderId: currentUser.id,
      senderName: currentUser.name,
      content: file.name,
      fileData: file, // Send File object directly (PeerJS handles this better than base64)
      fileType: file.type,
      fileSize: file.size,
      type: MessageType.FILE,
      timestamp: Date.now()
    };
    
    connection.send(msg);
    onSendMessage(msg);
    
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const downloadFile = (data: string | Blob | ArrayBuffer, fileName: string) => {
    let url: string;
    if (typeof data === 'string') {
      url = data;
    } else {
      const blob = data instanceof Blob ? data : new Blob([data]);
      url = URL.createObjectURL(blob);
    }
    
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Revoke object URL if it was created
    if (typeof data !== 'string') {
      setTimeout(() => URL.revokeObjectURL(url), 100);
    }
  };

  const handleAiSuggestions = async () => {
    if (!isAiEnabled) {
      return;
    }
    setIsAiThinking(true);
    try {
      const suggestionsRaw = await aiService.generateSmartReply(messages, aiConfig || undefined);
      if (suggestionsRaw) {
          // Parse the pipe-separated list
          const list = suggestionsRaw.split('|').map(s => s.trim()).filter(s => s.length > 0);
          setSuggestedReplies(list);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsAiThinking(false);
    }
  };

  const handleSummarize = async () => {
      if (!isAiEnabled) {
        return;
      }
      setIsAiThinking(true);
      try {
        const summary = await aiService.summarizeConversation(messages, aiConfig || undefined);
        
        // Add as a local system message just for this user
        const msg: ChatMessage = {
            id: crypto.randomUUID(),
            senderId: 'ai-bot',
            senderName: `${aiConfig?.provider ? aiConfig.provider.toUpperCase() : 'Nexus'} AI`,
            content: summary,
            type: MessageType.SYSTEM,
            timestamp: Date.now()
        };
        onSendMessage(msg); 
      } catch (error) {
        console.error(error);
      } finally {
        setIsAiThinking(false);
      }
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 transition-colors duration-300">
      {/* Header */}
      <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 transition-colors duration-300">
        <h3 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
           <Send className="w-4 h-4 text-blue-500" /> Private Messages
        </h3>
        <div className="flex gap-2">
            <Button 
                variant="ghost" 
                className={`text-[10px] py-1 px-2 h-auto rounded-full border transition-all ${isAiEnabled ? 'text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-900/50 hover:bg-purple-50 dark:hover:bg-purple-900/20' : 'text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 cursor-not-allowed opacity-50'}`}
                onClick={handleSummarize}
                disabled={isAiThinking}
            >
                <Bot className="w-3 h-3 mr-1"/> Summarize Chat
            </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-slate-950/20">
        <AnimatePresence initial={false}>
            {messages.map((msg) => {
            const isMe = msg.senderId === currentUser.id;
            const isSystem = msg.type === MessageType.SYSTEM;
            
            if (isSystem) {
                return (
                    <motion.div 
                      key={msg.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex justify-center my-4"
                    >
                        <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-500/20 text-indigo-900 dark:text-indigo-100 text-sm p-4 rounded-2xl max-w-[85%] flex items-start shadow-sm">
                            <Sparkles className="w-4 h-4 mr-3 mt-0.5 flex-shrink-0 text-indigo-600 dark:text-indigo-400" />
                            <div>
                                <p className="font-mono text-[10px] uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-1">Chat Summary</p>
                                <p className="leading-relaxed opacity-90">{msg.content}</p>
                            </div>
                        </div>
                    </motion.div>
                )
            }

            return (
                <motion.div 
                  key={msg.id}
                  initial={{ opacity: 0, x: isMe ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 shadow-sm ${
                    isMe 
                    ? 'bg-blue-600 text-white rounded-br-none' 
                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none border border-slate-200 dark:border-slate-700'
                }`}>
                    {!isMe && <p className="font-mono text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">{msg.senderName}</p>}
                    
                    {msg.type === MessageType.TEXT && <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>}
                    
                    {msg.type === MessageType.FILE && (
                    <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-black/20 rounded-xl mt-1">
                        <div className="bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                            <FileText className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                        </div>
                        <div className="overflow-hidden flex-1">
                        <p className="font-medium text-xs truncate text-slate-900 dark:text-slate-100">{msg.content}</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-tighter">
                          {msg.fileSize ? `${(msg.fileSize / (1024 * 1024)).toFixed(2)} MB` : 'Encrypted File'}
                        </p>
                        </div>
                        {msg.fileData && (
                        <button 
                            onClick={() => downloadFile(msg.fileData!, msg.content)}
                            className="p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full transition-colors text-slate-500 dark:text-slate-300"
                            title="Download"
                        >
                            <Download className="w-4 h-4" />
                        </button>
                        )}
                    </div>
                    )}
                    
                    <p className={`text-[9px] mt-1 opacity-40 font-mono ${isMe ? 'text-right text-blue-100' : 'text-left text-slate-500 dark:text-slate-400'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second: '2-digit'})}
                    </p>
                </div>
                </motion.div>
            );
            })}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Replies */}
      <AnimatePresence>
        {suggestedReplies.length > 0 && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-4 py-2 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex gap-2 overflow-x-auto no-scrollbar"
            >
                {suggestedReplies.map((reply, idx) => (
                    <motion.button 
                        key={idx}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleSendText(reply)}
                        className="flex-shrink-0 text-[11px] bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-600/20 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-500/50 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-full transition-all border border-slate-200 dark:border-slate-700 font-medium"
                    >
                        {reply}
                    </motion.button>
                ))}
            </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
           <Button 
            variant="ghost" 
            className={`p-2 h-10 w-10 rounded-full transition-colors ${isAiEnabled ? 'text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20' : 'text-slate-300 dark:text-slate-600 grayscale opacity-30 cursor-not-allowed'}`}
            onClick={handleAiSuggestions}
            disabled={isAiThinking}
            title={isAiEnabled ? "AI Smart Reply" : "AI Disabled (Configure in Settings)"}
           >
             <Sparkles className={`w-6 h-6 ${isAiThinking ? 'animate-spin' : ''}`} />
           </Button>

          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
            title="Send File (Max 2GB)"
          >
            <Paperclip className="w-6 h-6" />
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleFileSelect}
          />
          
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
            placeholder={connection ? "Type a message..." : "Waiting for connection..."}
            className="flex-1 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-full px-5 py-2.5 focus:ring-1 focus:ring-blue-500/50 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 outline-none transition-all"
            disabled={!connection}
          />
          
          <Button 
            onClick={() => handleSendText()} 
            disabled={!connection || !inputText.trim()}
            className="rounded-full w-10 h-10 p-0 flex items-center justify-center bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/20"
          >
            <Send className="w-6 h-6" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;