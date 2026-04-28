import React, { useState, useEffect } from 'react';
import Peer, { DataConnection, MediaConnection } from 'peerjs';
import Login from './components/Login';
import ChatInterface from './components/ChatInterface';
import VideoInterface from './components/VideoInterface';
import Button from './components/Button';
import ThemeToggle from './components/ThemeToggle';
import { UserProfile, ChatMessage, PeerState } from './types';
import { LogOut, Copy, Check, Sparkles, Zap, ShieldCheck, Radio } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [peerInstance, setPeerInstance] = useState<Peer | null>(null);
  const [peerState, setPeerState] = useState<PeerState>({
    myId: '',
    connectedPeerId: null,
    isConnectionOpen: false,
    connectionError: null
  });
  
  const [dataConnection, setDataConnection] = useState<DataConnection | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [targetPeerId, setTargetPeerId] = useState('');
  const [incomingCall, setIncomingCall] = useState<MediaConnection | null>(null);
  const [copied, setCopied] = useState(false);

  // Initialize PeerJS when user logs in
  useEffect(() => {
    if (user && !peerInstance) {
      const newPeer = new Peer();

      newPeer.on('open', (id) => {
        setPeerState(prev => ({ ...prev, myId: id, connectionError: null }));
      });

      newPeer.on('connection', (conn) => {
        handleDataConnection(conn);
      });

      newPeer.on('call', (call) => {
        setIncomingCall(call);
      });

      newPeer.on('error', (err) => {
        setPeerState(prev => ({ ...prev, connectionError: err.message }));
      });

      setPeerInstance(newPeer);
    }
  }, [user, peerInstance]);

  const handleDataConnection = (conn: DataConnection) => {
    setDataConnection(conn);
    setPeerState(prev => ({ 
      ...prev, 
      connectedPeerId: conn.peer, 
      isConnectionOpen: true 
    }));

    conn.on('data', (data: any) => {
      const msg = data as ChatMessage;
      setMessages(prev => [...prev, msg]);
    });

    conn.on('close', () => {
      setPeerState(prev => ({ 
        ...prev, 
        connectedPeerId: null, 
        isConnectionOpen: false 
      }));
      setDataConnection(null);
      setMessages(prev => [...prev, {
        id: 'sys-disconnect',
        senderId: 'system',
        senderName: 'System',
        content: 'Peer disconnected.',
        type: 'SYSTEM' as any,
        timestamp: Date.now()
      }]);
    });
  };

  const connectToPeer = () => {
    if (!peerInstance || !targetPeerId) return;
    
    const conn = peerInstance.connect(targetPeerId);
    conn.on('open', () => {
      handleDataConnection(conn);
    });
    conn.on('error', (err) => {
      console.error("Connection Error", err);
      setPeerState(prev => ({ ...prev, connectionError: "Could not connect to peer." }));
    });
  };

  const handleSendMessage = (msg: ChatMessage) => {
    setMessages(prev => [...prev, msg]);
  };

  const copyId = () => {
    navigator.clipboard.writeText(peerState.myId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-blue-500/30 transition-colors duration-300">
      {/* Navigation */}
      <motion.nav 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-950/50 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-50 transition-colors duration-300"
      >
        <div className="flex items-center gap-3">
          <motion.div 
            whileHover={{ rotate: 180 }}
            transition={{ duration: 0.5 }}
            className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20"
          >
            <Zap className="text-white w-6 h-6 fill-white" />
          </motion.div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white uppercase">Nexus-P2P</h1>
            <p className="text-[9px] font-mono text-blue-600 dark:text-blue-400 tracking-[0.3em] uppercase opacity-70">Decentralized_Node</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          
          <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 mx-2 hidden md:block" />

          <div className="hidden md:flex flex-col items-end mr-1">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{user.name}</span>
            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-tighter">Auth_Identity</span>
          </div>
          <motion.div 
            whileHover={{ scale: 1.1 }}
            className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-0.5 flex items-center justify-center overflow-hidden cursor-pointer shadow-sm"
          >
            <img src={user.avatarUrl} alt="Avatar" className="w-full h-full rounded-full object-cover" />
          </motion.div>
          <Button variant="ghost" className="p-2 hover:bg-red-500/10 group border-none" onClick={() => window.location.reload()}>
            <LogOut className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-red-500 transition-colors" />
          </Button>
        </div>
      </motion.nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col md:flex-row p-6 gap-6 max-w-[1600px] mx-auto w-full h-[calc(100vh-64px)] overflow-hidden">
        
        {/* Left Sidebar - Connection Controls */}
        <motion.aside 
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="w-full md:w-80 flex flex-col gap-6 flex-shrink-0"
        >
          {/* Status Card */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden group transition-all duration-300">
            <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
               <ShieldCheck className="w-16 h-16 text-blue-400" />
            </div>
            <h2 className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-5 flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${peerState.myId ? 'bg-blue-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-700'}`} />
              Local_Node_Telemetry
            </h2>
            <div className="space-y-5">
              <div>
                <p className="text-[10px] uppercase text-slate-400 dark:text-slate-600 mb-1.5 font-mono tracking-wider ml-1">Universal_Peer_ID</p>
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-black/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 group/id transition-all hover:border-slate-300 dark:hover:border-slate-700 ring-1 ring-slate-100 dark:ring-slate-800/50 shadow-inner">
                  <p className="font-mono text-[11px] font-medium text-blue-600 dark:text-blue-400/90 truncate flex-1">{peerState.myId || 'GENERATING_HASH...'}</p>
                  <button 
                    onClick={copyId}
                    className="text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-white transition-colors p-1"
                  >
                    <AnimatePresence mode="wait">
                      {copied ? (
                        <motion.div key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                          <Check className="w-4 h-4 text-green-500" />
                        </motion.div>
                      ) : (
                        <motion.div key="copy" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                          <Copy className="w-4 h-4" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </button>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-[10px] pt-1">
                <span className="text-slate-400 dark:text-slate-500 font-mono uppercase tracking-tighter opacity-70">transport_state</span>
                <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[9px] tracking-widest ${
                  peerState.isConnectionOpen ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.1)]' : 
                  peerState.connectionError ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20' : 
                  'bg-slate-100 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-800'
                }`}>
                  {peerState.isConnectionOpen ? 'CONNECTED' : peerState.connectionError ? 'ERROR' : 'IDLE'}
                </span>
              </div>
            </div>
          </section>

          {/* Connection Trigger Card */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl transition-all duration-300">
            <h2 className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-5">Initialize_Uplink</h2>
            {!peerState.isConnectionOpen ? (
              <div className="space-y-4">
                <div className="relative">
                  <input 
                    type="text"
                    placeholder="TARGET_NODE_HASH"
                    value={targetPeerId}
                    onChange={(e) => setTargetPeerId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3.5 text-xs font-mono text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-800 shadow-inner"
                  />
                  <div className="absolute right-3 top-3.5 text-slate-300 dark:text-slate-800">
                    <Radio className="w-4 h-4" />
                  </div>
                </div>
                <Button 
                  onClick={connectToPeer}
                  disabled={!targetPeerId || !peerState.myId}
                  className="w-full py-6 rounded-xl bg-blue-600 hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20 font-bold tracking-[0.2em] text-[10px] uppercase group"
                >
                   {peerState.connectionError ? 'RETRY_HANDSHAKE' : 'INITIATE_HANDSHAKE'}
                </Button>
              </div>
            ) : (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-6 bg-green-500/5 rounded-xl border border-green-500/10 shadow-inner"
                >
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full mx-auto mb-3 shadow-[0_0_12px_rgba(34,197,94,0.6)] animate-pulse"></div>
                  <p className="text-green-600 dark:text-green-400 font-bold text-[10px] tracking-[0.2em] uppercase">Transmission_Active</p>
                  <p className="text-[9px] text-slate-400 dark:text-slate-600 font-mono mt-2 truncate px-4">{peerState.connectedPeerId}</p>
                </motion.div>
            )}
          </section>

          {/* AI Module */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="p-5 border border-indigo-500/10 rounded-2xl bg-indigo-500/5 flex items-start gap-4"
          >
             <div className="bg-indigo-500/10 p-2 rounded-xl mt-1">
               <Sparkles className="w-4 h-4 text-indigo-400" />
             </div>
             <div>
                <p className="text-[10px] font-mono text-indigo-400 uppercase font-bold mb-1 tracking-widest">Cognitive_Engine</p>
                <p className="text-[10px] text-slate-500 leading-relaxed font-medium">Gemini AI is ready for sequence summarization and intelligent response generation.</p>
             </div>
          </motion.div>

          {/* Quick Stats */}
          <div className="mt-auto p-4 border border-slate-800 rounded-2xl opacity-50 space-y-2">
             <div className="flex justify-between text-[8px] font-mono text-slate-500 uppercase tracking-widest">
                <span>Latency</span>
                <span className="text-blue-500">24ms</span>
             </div>
             <div className="flex justify-between text-[8px] font-mono text-slate-500 uppercase tracking-widest">
                <span>Network</span>
                <span className="text-blue-500">P2P_MESH</span>
             </div>
          </div>
        </motion.aside>

        {/* Center Panel - Interaction */}
        <div className="flex-1 flex flex-col gap-6 h-full min-w-0">
          {!peerState.isConnectionOpen ? (
             <div className="flex-1 flex items-center justify-center bg-slate-950/20 rounded-3xl border border-dashed border-slate-800 relative group">
                <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 rounded-3xl" />
                <div className="max-w-md text-center flex flex-col items-center p-8 z-10">
                   <motion.div 
                    animate={{ 
                        scale: [1, 1.05, 1],
                        borderColor: ['rgba(59,130,246,0.1)', 'rgba(59,130,246,0.3)', 'rgba(59,130,246,0.1)']
                    }}
                    transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                    className="w-24 h-24 bg-blue-500/5 rounded-full flex items-center justify-center mb-8 border border-blue-500/10 backdrop-blur-sm"
                   >
                     <Radio className="w-10 h-10 text-blue-500 opacity-30 shadow-2xl" />
                   </motion.div>
                   <h3 className="text-xl font-bold text-slate-200 mb-2 tracking-tight">System_Standby</h3>
                   <p className="text-slate-500 text-xs leading-relaxed font-mono max-w-[280px]">Node is awaiting a valid hand-shake. Distribute your hash signature to establish a secure link.</p>
                </div>
             </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full p-1 overflow-hidden">
              <motion.section
                initial={{ scale: 0.98, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="h-full min-h-0"
              >
                <ChatInterface 
                  connection={dataConnection} 
                  currentUser={user}
                  messages={messages}
                  onSendMessage={handleSendMessage}
                />
              </motion.section>
              
              <motion.section 
                initial={{ scale: 0.98, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="h-full min-h-0"
              >
                <VideoInterface 
                  peer={peerInstance!} 
                  remotePeerId={peerState.connectedPeerId!} 
                  incomingCall={incomingCall}
                  onCallEnd={() => setIncomingCall(null)}
                />
              </motion.section>
            </div>
          )}
        </div>

      </main>
    </div>
  );
};

export default App;
