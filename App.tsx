import React, { useState, useEffect, useRef } from 'react';
import Peer, { DataConnection, MediaConnection } from 'peerjs';
import Login from './components/Login';
import ChatInterface from './components/ChatInterface';
import VideoInterface from './components/VideoInterface';
import Button from './components/Button';
import ThemeToggle from './components/ThemeToggle';
import AiSettings from './components/AiSettings';
import { UserProfile, ChatMessage, PeerState, AiConfig } from './types';
import { LogOut, Copy, Check, Sparkles, Zap, ShieldCheck, Radio, Bot, QrCode, Download, Scan } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { copyToClipboard } from './utils';
import { QRCodeCanvas } from 'qrcode.react';
import QrScanner from './components/QrScanner';

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [peerInstance, setPeerInstance] = useState<Peer | null>(null);
  const [peerState, setPeerState] = useState<PeerState>({
    myId: '',
    roomId: null,
    mode: 'idle',
    isHost: false,
    participants: [],
    connectionError: null
  });
  const peerStateRef = useRef<PeerState>(peerState);
  
  useEffect(() => {
    peerStateRef.current = peerState;
  }, [peerState]);
  
  const [dataConnections, setDataConnections] = useState<Map<string, DataConnection>>(new Map());
  const dataConnectionsRef = useRef<Map<string, DataConnection>>(new Map<string, DataConnection>());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [targetRoomId, setTargetRoomId] = useState('');
  const [incomingCall, setIncomingCall] = useState<MediaConnection | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanOrigin, setScanOrigin] = useState<'meeting' | 'peer'>('meeting');
  const [activeTab, setActiveTab] = useState<'chat' | 'video' | 'info'>('chat');

  // Initialize PeerJS when user logs in
  useEffect(() => {
    if (user && !peerInstance) {
      const newPeer = new Peer();

      newPeer.on('open', (id) => {
        setPeerState(prev => ({ ...prev, myId: id, connectionError: null }));
        setUser(prev => prev ? { ...prev, id } : null);
      });

      newPeer.on('connection', (conn) => {
        // Enforce Peer Mode limit: If we are in peer mode and already have 2 participants (us + someone), reject
        if (peerStateRef.current.mode === 'peer' && peerStateRef.current.participants.length >= 2) {
          console.warn("Rejecting connection: Session full (Peer Mode)");
          conn.on('open', () => {
             conn.send({ type: 'SYSTEM', content: JSON.stringify({ action: 'REJECTED', reason: 'FULL' }) });
             setTimeout(() => conn.close(), 1000);
          });
          return;
        }
        setupDataConnection(conn);
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

  const setupDataConnection = (conn: DataConnection) => {
    conn.on('open', () => {
      // Send our profile info immediately
      conn.send({ 
        type: 'SYSTEM', 
        content: JSON.stringify({ action: 'IDENTITY', user }), 
        senderId: user!.id 
      });
      
      const newMap = new Map<string, DataConnection>(dataConnectionsRef.current).set(conn.peer, conn);
      dataConnectionsRef.current = newMap;
      setDataConnections(newMap);

      // If we were idle, transition to Peer Mode on first incoming connection
      setPeerState(prev => {
        if (prev.mode === 'idle') {
          return { ...prev, mode: 'peer' };
        }
        return prev;
      });
    });

    conn.on('data', (data: any) => {
      if (data.type === 'SYSTEM') {
        try {
          const payload = JSON.parse(data.content);
          
          if (payload.action === 'REJECTED') {
            alert("Connection rejected: " + payload.reason);
            return;
          }

          if (payload.action === 'KICKED') {
            alert("You have been kicked from the meeting by the host.");
            leaveMeeting();
            return;
          }

          if (payload.action === 'ROOM_DESTROYED') {
            alert("The host has ended the meeting.");
            leaveMeeting();
            return;
          }

          if (payload.action === 'IDENTITY') {
            const remoteUser = payload.user;
            setPeerState(prev => {
              const exists = prev.participants.find(p => p.id === remoteUser.id);
              if (exists) return prev;
              
              const newParticipants = [...prev.participants, remoteUser];

              // IF I AM HOST, broadcast this new user to everyone else
              if (prev.isHost) {
                broadcastSystemMessage({
                  action: 'PARTICIPANTS_UPDATE',
                  participants: newParticipants
                });
              }

              return { ...prev, participants: newParticipants };
            });
          }

          if (payload.action === 'PARTICIPANTS_UPDATE') {
            const updatedParticipants = payload.participants;
            const updatedParticipantIds = new Set(updatedParticipants.map((p: any) => p.id));

            // Prune connections to people who left or were kicked
            dataConnectionsRef.current.forEach((conn, id) => {
              // We don't prune the connection to the host if we are a guest
              if (!updatedParticipantIds.has(id)) {
                conn.close();
              }
            });

            setPeerState(prev => {
              // Connect to new peers we don't have connections with yet
              updatedParticipants.forEach((p: any) => {
                const isMe = p.id === user!.id || p.id === prev.myId;
                const alreadyConnected = dataConnectionsRef.current.has(p.id);
                
                if (!isMe && !alreadyConnected) {
                  const newConn = peerInstance!.connect(p.id);
                  setupDataConnection(newConn);
                }
              });
              return { ...prev, participants: updatedParticipants };
            });
          }
        } catch (e) {
          console.error("System message parse error", e);
        }
      } else {
        setMessages(prev => [...prev, data as ChatMessage]);
      }
    });

    conn.on('close', () => {
      const newMap = new Map<string, DataConnection>(dataConnectionsRef.current);
      newMap.delete(conn.peer);
      dataConnectionsRef.current = newMap;
      setDataConnections(newMap);
      
      setPeerState(prev => {
        const nextParticipants = prev.participants.filter(p => p.id !== conn.peer);
        
        // If I am host, broadcast the updated list to everyone else
        if (prev.isHost) {
          const msg = {
            type: 'SYSTEM',
            content: JSON.stringify({
              action: 'PARTICIPANTS_UPDATE',
              participants: nextParticipants
            }),
            senderId: user!.id,
            timestamp: Date.now()
          };
          newMap.forEach((c: DataConnection) => c.send(msg));
        }
        
        return {
          ...prev,
          participants: nextParticipants
        };
      });
    });
  };

  const broadcastSystemMessage = (payload: any) => {
    const msg = {
      type: 'SYSTEM',
      content: JSON.stringify(payload),
      senderId: user!.id,
      timestamp: Date.now()
    };
    dataConnectionsRef.current.forEach((conn: DataConnection) => conn.send(msg));
  };

  const hostMeeting = () => {
    if (!peerState.myId) return;
    setPeerState(prev => ({ 
      ...prev, 
      roomId: prev.myId, 
      isHost: true,
      mode: 'meeting',
      participants: [user!] 
    }));
  };

  const joinMeeting = () => {
    if (!peerInstance || !targetRoomId) return;
    
    const conn = peerInstance.connect(targetRoomId);
    setupDataConnection(conn);
    setPeerState(prev => ({ ...prev, roomId: targetRoomId, isHost: false, mode: 'meeting' }));
  };

  const handleSendMessage = (msg: ChatMessage) => {
    setMessages(prev => [...prev, msg]);
    dataConnectionsRef.current.forEach((conn: DataConnection) => conn.send(msg));
  };

  const directConnect = () => {
    if (!peerInstance || !targetRoomId) return;
    const conn = peerInstance.connect(targetRoomId);
    setPeerState(prev => ({ ...prev, roomId: targetRoomId, mode: 'peer', isHost: false }));
    setupDataConnection(conn);
  };

  const [aiConfig, setAiConfig] = useState<AiConfig | null>(() => {
    const saved = localStorage.getItem('nexus-ai-config');
    return saved ? JSON.parse(saved) : null;
  });

  const handleScan = (decodedText: string) => {
    setTargetRoomId(decodedText);
    setIsScanning(false);
    
    if (decodedText && peerInstance) {
      const conn = peerInstance.connect(decodedText);
      setupDataConnection(conn);
      // Use scanOrigin to determine mode
      setPeerState(prev => ({ 
        ...prev, 
        roomId: decodedText, 
        isHost: false, 
        mode: scanOrigin 
      }));
    }
  };

  const downloadQrCode = () => {
    const canvas = document.getElementById('peer-qr-code') as HTMLCanvasElement;
    if (!canvas) return;
    
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = url;
    link.download = `nexus-meeting-id-${peerState.myId.slice(0, 8)}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const kickParticipant = (participantId: string) => {
    if (!peerState.isHost) return;
    
    const conn = dataConnectionsRef.current.get(participantId);
    if (conn) {
      // Notify the user they are kicked
      conn.send({ 
        type: 'SYSTEM', 
        content: JSON.stringify({ action: 'KICKED' }),
        senderId: user!.id 
      });

      // Update state and broadcast to others
      setPeerState(prev => {
        const nextParticipants = prev.participants.filter(p => p.id !== participantId);
        
        // Broadcast specifically excluding the kicked person (who we are about to close)
        const updateMsg = {
          type: 'SYSTEM',
          content: JSON.stringify({
            action: 'PARTICIPANTS_UPDATE',
            participants: nextParticipants
          }),
          senderId: user!.id,
          timestamp: Date.now()
        };
        
        dataConnectionsRef.current.forEach((c, id) => {
          if (id !== participantId) {
            c.send(updateMsg);
          }
        });

        return { ...prev, participants: nextParticipants };
      });
      
      // Close the connection
      setTimeout(() => conn.close(), 500);
    }
  };

  const leaveMeeting = () => {
    if (peerState.isHost && peerState.mode === 'meeting') {
      broadcastSystemMessage({ action: 'ROOM_DESTROYED' });
    }
    
    dataConnectionsRef.current.forEach((conn: DataConnection) => conn.close());
    dataConnectionsRef.current = new Map<string, DataConnection>();
    setDataConnections(new Map<string, DataConnection>());
    setPeerState(prev => ({ 
      ...prev, 
      roomId: null, 
      isHost: false,
      mode: 'idle',
      participants: [] 
    }));
    setMessages([]);
  };

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  const copyId = async () => {
    const success = await copyToClipboard(peerState.roomId || peerState.myId);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSaveAiConfig = (config: AiConfig) => {
    setAiConfig(config);
    localStorage.setItem('nexus-ai-config', JSON.stringify(config));
    setIsSettingsOpen(false);
  };

  const isConnected = peerState.roomId !== null;

  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-blue-500/30 transition-colors duration-300 overflow-hidden">
      {/* Navigation */}
      <motion.nav 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-950/50 backdrop-blur-md flex items-center justify-between px-3 md:px-6 sticky top-0 z-50 transition-colors duration-300"
      >
        <div className="flex items-center gap-2 md:gap-3">
          <motion.div 
            whileHover={{ rotate: 180 }}
            transition={{ duration: 0.5 }}
            className="w-8 h-8 md:w-10 md:h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20 flex-shrink-0"
          >
            <Zap className="text-white w-5 h-5 md:w-6 md:h-6 fill-white" />
          </motion.div>
          <div className="min-w-0">
            <h1 className="text-sm md:text-lg font-bold tracking-tight text-slate-900 dark:text-white uppercase truncate">Nexus P2P</h1>
            <p className="text-[7px] md:text-[9px] font-mono text-blue-600 dark:text-blue-400 tracking-[0.2em] md:tracking-[0.3em] uppercase opacity-70 truncate">Secure Connection</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 md:gap-4 flex-shrink-0">
          <ThemeToggle />
          
          <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 mx-1 md:mx-2 hidden sm:block" />

          <button
            onClick={() => setIsSettingsOpen(true)}
            className={`p-1.5 md:p-2 rounded-xl transition-all flex items-center gap-2 ${aiConfig ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20' : 'text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            title="AI Settings"
          >
            <Bot className="w-5 h-5 md:w-5 md:h-5" />
            <span className="text-xs font-semibold hidden lg:block">{aiConfig ? 'AI READY' : 'SETUP AI'}</span>
          </button>
          
          <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 mx-1 md:mx-2 hidden md:block" />

          <div className="hidden md:flex flex-col items-end mr-1">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{user.name}</span>
            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-tighter">My Account</span>
          </div>
          <motion.div 
            whileHover={{ scale: 1.1 }}
            className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-0.5 flex items-center justify-center overflow-hidden cursor-pointer shadow-sm flex-shrink-0"
          >
            <img src={user.avatarUrl} alt="Avatar" className="w-full h-full rounded-full object-cover" />
          </motion.div>
          <Button 
            variant="ghost" 
            className="px-1.5 md:px-4 h-9 md:h-11 hover:bg-red-500/10 group border-none flex items-center gap-1.5 transition-all duration-300 rounded-xl flex-shrink-0" 
            onClick={() => {
              if (peerInstance) {
                  peerInstance.destroy();
                  setPeerInstance(null);
              }
              setUser(null);
            }}
          >
            <LogOut className="w-4 h-4 md:w-5 md:h-5 text-slate-400 dark:text-slate-500 group-hover:text-red-500 transition-colors" />
            <span className="text-[10px] md:text-xs font-bold text-slate-500 md:text-slate-400 md:group-hover:text-red-500 uppercase tracking-widest hidden sm:inline">Logout</span>
          </Button>
        </div>
      </motion.nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col md:flex-row p-3 md:p-6 gap-3 md:gap-6 max-w-[1600px] mx-auto w-full h-[calc(100vh-64px)] overflow-hidden">
        
        {/* Mobile View Switcher */}
        {isConnected && (
          <div className="md:hidden flex bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1 mb-1 flex-shrink-0 shadow-sm transition-colors duration-300">
            <button 
              onClick={() => setActiveTab('chat')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${activeTab === 'chat' ? 'bg-blue-500 text-white shadow-lg' : 'text-slate-500 dark:text-slate-400'}`}
            >
              <Bot className="w-4 h-4" />
              Chat
            </button>
            <button 
              onClick={() => setActiveTab('video')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${activeTab === 'video' ? 'bg-blue-500 text-white shadow-lg' : 'text-slate-500 dark:text-slate-400'}`}
            >
              <Zap className="w-4 h-4" />
              Video
            </button>
            <button 
              onClick={() => setActiveTab('info')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${activeTab === 'info' ? 'bg-blue-500 text-white shadow-lg' : 'text-slate-500 dark:text-slate-400'}`}
            >
              <ShieldCheck className="w-4 h-4" />
              Status
            </button>
          </div>
        )}

        {/* Left Sidebar - Connection Controls */}
        <motion.aside 
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className={`w-full md:w-80 flex-1 md:h-full flex flex-col gap-4 md:gap-6 flex-shrink-0 md:overflow-y-auto md:overflow-x-hidden md:pr-2 custom-scrollbar ${isConnected && activeTab !== 'info' && 'hidden md:flex'}`}
        >
          {/* Status Card */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl relative group transition-all duration-300">
            <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity overflow-hidden pointer-events-none">
               <ShieldCheck className="w-16 h-16 text-blue-400" />
            </div>
            <h2 className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-5 flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${peerState.myId ? 'bg-blue-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-700'}`} />
              Meeting Info
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-[10px] uppercase text-slate-400 dark:text-slate-600 mb-1.5 font-mono tracking-wider ml-1">
                  {peerState.isHost ? 'Host ID' : isConnected ? 'Meeting ID' : 'Your Personal ID'}
                </p>
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-black/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 group/id transition-all hover:border-slate-300 dark:hover:border-slate-700 ring-1 ring-slate-100 dark:ring-slate-800/50 shadow-inner">
                  <p className="font-mono text-[11px] font-medium text-blue-600 dark:text-blue-400/90 truncate flex-1">{peerState.roomId || peerState.myId || 'GENERATING ID...'}</p>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => {
                        setScanOrigin('peer');
                        setIsScanning(true);
                      }}
                      className="text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-white transition-colors p-1"
                      title="Scan to Direct Connect (Peer Mode)"
                    >
                      <Scan className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setShowQr(!showQr)}
                      className={`transition-colors p-1 rounded ${showQr ? 'text-blue-600 bg-blue-500/10' : 'text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-white'}`}
                      title={showQr ? "Hide QR Code" : "Show QR Code"}
                    >
                      <QrCode className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={copyId}
                      className="text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-white transition-colors p-1"
                      title="Copy ID"
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
              </div>

              <AnimatePresence>
                {showQr && (peerState.roomId || peerState.myId) && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-visible"
                  >
                    <div className="flex flex-col items-center gap-2.5 bg-slate-50 dark:bg-black/20 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 mt-1">
                      <div className="bg-white p-1.5 rounded-lg shadow-sm w-full max-w-[140px] aspect-square flex items-center justify-center">
                        <QRCodeCanvas 
                          id="peer-qr-code"
                          value={peerState.roomId || peerState.myId} 
                          size={120}
                          level="M"
                          includeMargin={true}
                          style={{ width: '100%', height: '100%' }}
                        />
                      </div>
                      <button 
                        onClick={downloadQrCode}
                        className="flex items-center gap-2 text-[9px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-widest hover:opacity-80 transition-opacity pb-1"
                      >
                        <Download className="w-3 h-3" />
                        Download QR
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              <div className="flex items-center justify-between text-[10px] pt-1">
                <span className="text-slate-400 dark:text-slate-500 font-mono uppercase tracking-tighter opacity-70">
                  {peerState.mode === 'meeting' ? 'Meeting Mode' : 'Peer Mode'}
                </span>
                <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[9px] tracking-widest ${
                  peerState.isHost ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.1)]' : 
                  isConnected ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.1)]' :
                  'bg-slate-100 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-800'
                }`}>
                  {peerState.isHost ? 'HOSTING' : isConnected ? 'GUEST' : 'IDLE'}
                </span>
              </div>
            </div>
          </section>

          {/* Connection Trigger Card */}
          {!isConnected ? (
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Start Meeting</h2>
                <div className="flex items-center gap-2">
                  <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 text-right">Meeting Mode</p>
                  <span className="px-2 py-0.5 rounded-full font-bold uppercase text-[9px] tracking-widest bg-slate-100 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-800">
                    IDLE
                  </span>
                </div>
              </div>
              <div className="space-y-4">
                <Button 
                  onClick={hostMeeting}
                  disabled={!peerState.myId}
                  className="w-full py-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20 font-bold tracking-[0.2em] text-[10px] uppercase group"
                >
                  Host Meeting
                </Button>
                
                <div className="relative flex items-center gap-2">
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                  <span className="text-[8px] font-mono text-slate-400 uppercase tracking-widest">OR</span>
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                </div>

                <div className="relative group/input">
                  <input 
                    type="text"
                    placeholder="ENTER HOST MEETING ID"
                    value={targetRoomId}
                    onChange={(e) => setTargetRoomId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3.5 pr-24 text-xs font-mono text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-800 shadow-inner"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                      onClick={() => {
                        setScanOrigin('meeting');
                        setIsScanning(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                      title="Scan Meeting QR"
                    >
                      <Scan className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    onClick={joinMeeting}
                    disabled={!targetRoomId || !peerState.myId}
                    className="py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/10 transition-all font-bold tracking-[0.1em] text-[8px] uppercase group"
                  >
                    Join Meeting
                  </Button>
                  <Button 
                    onClick={directConnect}
                    disabled={!targetRoomId || !peerState.myId}
                    variant="secondary"
                    className="py-4 rounded-xl font-bold tracking-[0.1em] text-[8px] uppercase ring-1 ring-slate-200 dark:ring-slate-800"
                  >
                    Connect Peer
                  </Button>
                </div>
              </div>
            </section>
          ) : (
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl transition-all duration-300">
              <h2 className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-4 flex items-center justify-between">
                Participants
                <span className="bg-blue-500/10 text-blue-500 px-2 rounded-full">{peerState.participants.length}</span>
              </h2>
              <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                {peerState.participants.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800/50 group/participant">
                    <img src={p.avatarUrl} alt={p.name} className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold truncate">
                        {p.name} 
                        {p.id === user?.id && <span className="text-blue-500 ml-1">(You)</span>}
                        {p.id === peerState.roomId && <span className="text-indigo-500 ml-1 text-[8px] uppercase tracking-tighter opacity-70">Host</span>}
                      </p>
                      <p className="text-[8px] font-mono text-slate-400 truncate tracking-tight">{p.id}</p>
                    </div>
                    {peerState.isHost && p.id !== user?.id && (
                      <button
                        onClick={() => kickParticipant(p.id)}
                        className="opacity-0 group-hover/participant:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all"
                        title="Kick Participant"
                      >
                        <LogOut className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <Button 
                onClick={leaveMeeting}
                className="w-full mt-4 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-500/10 font-bold tracking-widest text-[9px] uppercase transition-all border-none"
              >
                Leave Meeting
              </Button>
            </section>
          )}

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
                <p className="text-[10px] font-mono text-indigo-400 uppercase font-bold mb-1 tracking-widest">AI Tools</p>
                <p className="text-[10px] text-slate-500 leading-relaxed font-medium">AI assistants are available for group summaries and instant smart replies.</p>
             </div>
          </motion.div>
        </motion.aside>

        {/* Right Panel - Private Messages (SWAPPED POSITION with Video Feed as requested) */}
        {isConnected && (
          <motion.aside 
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className={`w-full md:w-80 flex-1 md:h-full flex flex-col gap-6 flex-shrink-0 min-h-0 ${activeTab !== 'chat' && 'hidden md:flex'}`}
          >
            <ChatInterface 
              connections={Array.from(dataConnections.values())} 
              currentUser={user}
              messages={messages}
              onSendMessage={handleSendMessage}
              aiConfig={aiConfig}
            />
          </motion.aside>
        )}

        {/* Center Panel - Interaction (Now Video Feed) */}
        <div className={`flex-1 flex flex-col min-w-0 min-h-0 ${isConnected && activeTab !== 'video' && 'hidden md:flex'}`}>
          {!isConnected ? (
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
                   <h3 className="text-xl font-bold text-slate-200 mb-2 tracking-tight">Meeting Offline</h3>
                   <p className="text-slate-500 text-xs leading-relaxed font-mono max-w-[280px]">Host a new meeting or enter a Host ID to join an existing session.</p>
                </div>
             </div>
          ) : (
            <motion.section
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex-1 min-h-0 flex flex-col"
            >
              <VideoInterface 
                peer={peerInstance!} 
                remotePeerId={peerState.roomId!} 
                incomingCall={incomingCall}
                onCallEnd={() => setIncomingCall(null)}
              />
            </motion.section>
          )}
        </div>
      </main>

      <AnimatePresence>
        {isSettingsOpen && (
          <AiSettings 
            config={aiConfig} 
            onSave={handleSaveAiConfig} 
            onClose={() => setIsSettingsOpen(false)} 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isScanning && (
          <QrScanner 
            onScan={handleScan} 
            onClose={() => setIsScanning(false)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
