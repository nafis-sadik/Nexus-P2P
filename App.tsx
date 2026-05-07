import React, { useState, useEffect, useRef } from 'react';
import Peer, { DataConnection, MediaConnection } from 'peerjs';
import Swal from 'sweetalert2';
import Login from './components/Login';
import ChatInterface from './components/ChatInterface';
import VideoInterface from './components/VideoInterface';
import Button from './components/Button';
import ThemeToggle from './components/ThemeToggle';
import AiSettings from './components/AiSettings';
import { UserProfile, ChatMessage, PeerState, AiConfig } from './types';
import { LogOut, Copy, Check, Sparkles, Zap, ShieldCheck, Share2, Bot, QrCode, Download, Scan, PhoneIncoming } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { copyToClipboard } from './utils';
import { QRCodeCanvas } from 'qrcode.react';
import QrScanner from './components/QrScanner';

import Tooltip from './components/Tooltip';

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
  const [incomingCalls, setIncomingCalls] = useState<MediaConnection[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [activeCalls, setActiveCalls] = useState<Map<string, MediaConnection>>(new Map());
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const [copied, setCopied] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'video' | 'info'>('chat');

  // Handle incoming calls global listener
  useEffect(() => {
    incomingCalls.forEach(call => {
      if (!activeCalls.has(call.peer)) {
        call.on('stream', (stream) => {
          setRemoteStreams(prev => new Map(prev).set(call.peer, stream));
        });
        call.on('close', () => {
          setRemoteStreams(prev => {
            const next = new Map(prev);
            next.delete(call.peer);
            return next;
          });
          setActiveCalls(prev => {
            const next = new Map(prev);
            next.delete(call.peer);
            return next;
          });
          setIncomingCalls(prev => prev.filter(c => c.peer !== call.peer));
        });
      }
    });
  }, [incomingCalls, activeCalls]);

  const answerCall = async (call: MediaConnection) => {
    try {
      let stream = localStream;
      if (!stream) {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user' }, 
          audio: true 
        });
        setLocalStream(stream);
      }
      call.answer(stream);
      setActiveCalls(prev => new Map(prev).set(call.peer, call));
      setIncomingCalls(prev => prev.filter(c => c.peer !== call.peer));
    } catch (err: any) {
      console.error("Failed to answer call", err);
      call.answer();
      setActiveCalls(prev => new Map(prev).set(call.peer, call));
      setIncomingCalls(prev => prev.filter(c => c.peer !== call.peer));
    }
  };

  const rejectCall = (call: MediaConnection) => {
    call.close();
    setIncomingCalls(prev => prev.filter(c => c.peer !== call.peer));
  };

  const startCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' }, 
        audio: true 
      });
      setLocalStream(stream);
      
      peerState.participants.forEach((p) => {
        if (p.id !== user!.id && !activeCalls.has(p.id)) {
          const newCall = peerInstance!.call(p.id, stream);
          setActiveCalls(prev => new Map(prev).set(p.id, newCall));

          newCall.on('stream', (remoteStream) => {
            setRemoteStreams(prev => new Map(prev).set(p.id, remoteStream));
          });

          newCall.on('close', () => {
            setRemoteStreams(prev => {
                const next = new Map(prev);
                next.delete(p.id);
                return next;
            });
            setActiveCalls(prev => {
                const next = new Map(prev);
                next.delete(p.id);
                return next;
            });
          });
        }
      });
    } catch (err: any) {
      console.error("Failed to start call", err);
    }
  };

  const endCall = () => {
    activeCalls.forEach(call => call.close());
    localStream?.getTracks().forEach(track => track.stop());
    setLocalStream(null);
    setRemoteStreams(new Map());
    setActiveCalls(new Map());
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => track.enabled = !track.enabled);
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => track.enabled = !track.enabled);
      setIsVideoOff(!isVideoOff);
    }
  };

  // Initialize PeerJS when user clicks Host, Peer, or Join
  useEffect(() => {
    if (user && !peerInstance && (peerState.mode !== 'idle' || targetRoomId)) {
      console.log("Initializing Peer with ID:", user.id);
      const newPeer = new Peer(user.id, {
        debug: 1, // Reduce spam in production
        pingInterval: 5000,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' },
            { urls: 'stun:stun.services.mozilla.com' },
          ]
        }
      });

      newPeer.on('open', (id) => {
        console.log("Peer signaling open with ID:", id);
        setPeerState(prev => {
          const update = { ...prev, myId: id, connectionError: null };
          // If we were trying to host a meeting, set the roomId to our new ID
          if (prev.isHost && prev.mode === 'meeting') {
            update.roomId = id;
            update.participants = [user];
          } else if (prev.isHost && prev.mode === 'peer') {
            update.participants = [user];
          }
          return update;
        });
        // No longer overwriting user.id since we passed it to constructor
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
        setIncomingCalls(prev => [...prev, call]);
      });

      newPeer.on('error', (err) => {
        console.error("PeerJS Global Error:", err.type, err.message);
        let message = err.message;
        
        // Handle specific errors with more resilience
        switch (err.type) {
          case 'peer-unavailable':
            message = `The Peer [${err.message.split(' ').pop()}] does not exist or is offline.`;
            break;
          case 'network':
            message = "Signaling server connection lost. Check your internet.";
            break;
          case 'webrtc':
            message = "WebRTC negotiation failed. This usually happens behind strict firewalls/NAT. Try using a VPN or different network.";
            break;
          case 'unavailable-id':
            message = "This User ID is already in use. Please refresh or try again.";
            break;
          case 'socket-error':
            message = "Connection to signaling server failed.";
            break;
        }
        
        setPeerState(prev => ({ ...prev, connectionError: message }));
      });

      newPeer.on('disconnected', () => {
        console.warn("Peer disconnected from discovery server. Attempting to reconnect...");
        setTimeout(() => newPeer.reconnect(), 1000);
      });

      setPeerInstance(newPeer);
    }
  }, [user, peerInstance, peerState.mode, targetRoomId]);

  const isDark = () => document.documentElement.classList.contains('dark');

  const swalConfig = (title: string, text: string, icon: 'success' | 'error' | 'warning' | 'info') => ({
    title,
    text,
    icon,
    background: isDark() ? '#0f172a' : '#ffffff',
    color: isDark() ? '#f8fafc' : '#0f172a',
    confirmButtonColor: '#4f46e5',
    customClass: {
      popup: 'rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl'
    }
  });

  const getFormattedMeetingId = (id: string) => `NEX_M_${id}`;
  const getFormattedPersonalId = (id: string) => `NEX_P_${id}`;

  const setupDataConnection = (conn: DataConnection) => {
    console.log(`Setting up data connection with: ${conn.peer}`);
    
    // Prevent multiple listeners on the same connection object
    conn.off('open');
    conn.off('data');
    conn.off('close');
    conn.off('error');

    // Add error handler specific to this connection
    conn.on('error', (err) => {
      console.error(`DataConnection error with ${conn.peer}:`, err);
    });

    conn.on('open', () => {
      console.log(`Connection opened with: ${conn.peer}`);
      // Safety check: Avoid duplicate connections for the same peer
      if (dataConnectionsRef.current.has(conn.peer)) {
        const existing = dataConnectionsRef.current.get(conn.peer);
        if (existing && existing.open) {
          console.warn(`Closing duplicate connection to peer ${conn.peer}`);
          conn.close();
          return;
        }
      }

      // Send our profile info after a small delay to ensure data channel is ready
      setTimeout(() => {
        if (conn.open) {
          console.log(`Sending IDENTITY to: ${conn.peer}`);
          conn.send({ 
            type: 'SYSTEM', 
            content: JSON.stringify({ action: 'IDENTITY', user }), 
            senderId: user!.id 
          });
        }
      }, 800);
      
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
      console.log(`Received data from ${conn.peer}:`, data.type);
      if (data.type === 'SYSTEM') {
        try {
          const payload = JSON.parse(data.content);
          
          if (payload.action === 'REJECTED') {
            Swal.fire(swalConfig('Connection Rejected', payload.reason === 'FULL' ? 'The session is full.' : payload.reason, 'error'));
            return;
          }

          if (payload.action === 'KICKED') {
            leaveMeeting();
            Swal.fire(swalConfig('Removed from Meeting', 'The host has removed you from the meeting.', 'warning'));
            return;
          }

          if (payload.action === 'ROOM_DESTROYED') {
            leaveMeeting();
            Swal.fire(swalConfig('Meeting Ended', 'The host has closed the meeting room.', 'info'));
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
                  // Lexicographical tie-breaker: Only the peer with the "smaller" ID initiates the connection.
                  // This prevents both peers from connecting to each other simultaneously.
                  if (prev.myId < p.id) {
                    const newConn = peerInstance!.connect(p.id, { reliable: true });
                    setupDataConnection(newConn);
                  }
                }
              });
              return { ...prev, participants: updatedParticipants };
            });
          }
        } catch (e) {
          console.error("System message parse error", e);
        }
      } else {
        setMessages(prev => {
          const chatMsg = data as ChatMessage;
          if (prev.some(m => m.id === chatMsg.id)) return prev;
          return [...prev, chatMsg];
        });
      }
    });

    conn.on('error', (err) => {
      console.error(`Data connection error with ${conn.peer}:`, err);
    });

    conn.on('close', () => {
      console.log(`Connection closed with: ${conn.peer}`);
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
      senderId: user?.id,
      timestamp: Date.now()
    };
    dataConnectionsRef.current.forEach((conn: DataConnection) => {
      if (conn.open) conn.send(msg);
    });
  };

  const hostMeeting = () => {
    setPeerState(prev => ({ 
      ...prev, 
      roomId: prev.myId || null, 
      isHost: true,
      mode: 'meeting',
      participants: prev.myId ? [user!] : [] 
    }));
  };

  const hostPeer = () => {
    setPeerState(prev => ({ 
      ...prev, 
      roomId: null, 
      isHost: true,
      mode: 'peer',
      participants: prev.myId ? [user!] : [] 
    }));
  };

  const joinMeeting = () => {
    if (!targetRoomId) return;
    
    const trimmedId = targetRoomId.trim();
    if (!trimmedId.startsWith('NEX_M_')) {
      Swal.fire(swalConfig('Invalid ID', 'Please enter a valid Meeting ID (starts with NEX_M_).', 'error'));
      return;
    }

    const realPeerId = trimmedId.replace('NEX_M_', '');
    
    if (peerInstance) {
      const conn = peerInstance.connect(realPeerId, { reliable: true });
      setupDataConnection(conn);
    }
    
    setPeerState(prev => ({ ...prev, roomId: realPeerId, isHost: false, mode: 'meeting' }));
  };

  const handleSendMessage = (msg: ChatMessage) => {
    setMessages(prev => [...prev, msg]);
    dataConnectionsRef.current.forEach((conn: DataConnection) => conn.send(msg));
  };

  const directConnect = () => {
    if (!targetRoomId) return;

    const trimmedId = targetRoomId.trim();
    if (!trimmedId.startsWith('NEX_P_')) {
      Swal.fire(swalConfig('Invalid ID', 'Please enter a valid Personal ID (starts with NEX_P_).', 'error'));
      return;
    }

    const realPeerId = trimmedId.replace('NEX_P_', '');
    
    if (peerInstance) {
      const conn = peerInstance.connect(realPeerId, { reliable: true });
      setupDataConnection(conn);
    }

    setPeerState(prev => ({ ...prev, roomId: realPeerId, mode: 'peer', isHost: false }));
  };

  const handleJoin = () => {
    if (!targetRoomId) return;
    const trimmedId = targetRoomId.trim();
    if (trimmedId.startsWith('NEX_M_')) {
      joinMeeting();
    } else if (trimmedId.startsWith('NEX_P_')) {
      directConnect();
    } else {
      Swal.fire(swalConfig('Invalid ID', 'Please enter a valid Meeting ID (starts with NEX_M_) or Personal ID (starts with NEX_P_).', 'error'));
    }
  };

  const [aiConfig, setAiConfig] = useState<AiConfig | null>(() => {
    const saved = localStorage.getItem('nexus-ai-config');
    return saved ? JSON.parse(saved) : null;
  });

  const handleScan = (decodedText: string) => {
    setTargetRoomId(decodedText);
    setIsScanning(false);
    
    if (decodedText && peerInstance) {
      const isMeeting = decodedText.startsWith('NEX_M_');
      const isPeer = decodedText.startsWith('NEX_P_');
      
      if (!isMeeting && !isPeer) {
        Swal.fire(swalConfig('Invalid QR', 'The scanned QR code is not a valid Nexus ID.', 'error'));
        return;
      }

      const realId = decodedText.replace('NEX_M_', '').replace('NEX_P_', '');
      const conn = peerInstance.connect(realId, { reliable: true });
      setupDataConnection(conn);
      
      setPeerState(prev => ({ 
        ...prev, 
        roomId: realId, 
        isHost: false, 
        mode: isMeeting ? 'meeting' : 'peer'
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

      // Update state
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
          if (id !== participantId && c.open) {
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
    if (peerState.isHost) {
      broadcastSystemMessage({ action: 'ROOM_DESTROYED' });
      // Give some time for messages to be sent before closing
      setTimeout(() => {
        dataConnectionsRef.current.forEach((conn: DataConnection) => conn.close());
        resetP2PState();
      }, 500);
    } else {
      dataConnectionsRef.current.forEach((conn: DataConnection) => conn.close());
      resetP2PState();
    }
  };

  const resetP2PState = () => {
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
    endCall();
  };

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  const copyId = async () => {
    const rawId = peerState.roomId || peerState.myId;
    if (!rawId) return;

    const formattedId = peerState.mode === 'meeting'
      ? getFormattedMeetingId(rawId)
      : getFormattedPersonalId(rawId);

    const success = await copyToClipboard(formattedId);
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

  const isConnected = peerState.mode !== 'idle';
  const isInitializing = isConnected && (!peerInstance || !peerState.myId);

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
            whileHover={{ scale: 1.1, rotate: 10 }}
            className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 flex-shrink-0"
          >
            <Share2 className="text-white w-5 h-5 md:w-6 md:h-6" />
          </motion.div>
          <div className="min-w-0">
            <h1 className="text-sm md:text-lg font-bold tracking-tight text-slate-900 dark:text-white uppercase truncate">Nexus P2P</h1>
            <p className="text-[7px] md:text-[9px] font-mono text-slate-500 dark:text-slate-400 tracking-[0.15em] md:tracking-[0.2em] uppercase opacity-70 truncate font-semibold">Secure Private Communication</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 md:gap-4 flex-shrink-0">
          <ThemeToggle />
          
          <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 mx-1 md:mx-2 hidden sm:block" />

          <Button
            variant="ghost"
            onClick={() => setIsSettingsOpen(true)}
            className={`p-1.5 md:p-2 rounded-xl transition-all flex items-center gap-2 border-none h-auto ${aiConfig ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20' : 'text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            tooltip="Configure AI & Model Settings"
            tooltipPosition="bottom"
          >
            <Bot className="w-5 h-5 md:w-5 md:h-5" />
            <span className="text-xs font-semibold hidden lg:block">{aiConfig ? 'AI READY' : 'SETUP AI'}</span>
          </Button>
          
          <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 mx-1 md:mx-2 hidden md:block" />

          <div className="hidden md:flex flex-col items-end mr-1">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{user.name}</span>
            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-tighter">My Account</span>
          </div>
          <Tooltip content="Your Profile Info" position="bottom">
            <motion.div 
              whileHover={{ scale: 1.1 }}
              className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-0.5 flex items-center justify-center overflow-hidden cursor-pointer shadow-sm flex-shrink-0"
            >
              <img src={user.avatarUrl} alt="Avatar" className="w-full h-full rounded-full object-cover" />
            </motion.div>
          </Tooltip>
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
            tooltip="Logout from Nexus P2P"
            tooltipPosition="bottom"
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
               <Share2 className="w-16 h-16 text-blue-400" />
            </div>
            <h2 className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-5 flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${peerState.myId ? 'bg-emerald-500 animate-pulse' : (peerState.mode !== 'idle' ? 'bg-amber-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-700')}`} />
              Host
            </h2>
            <div className="space-y-4">
              {(peerState.mode !== 'idle' || isConnected) && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div>
                    <p className="text-[10px] uppercase text-slate-400 dark:text-slate-600 mb-1.5 font-mono tracking-wider ml-1">
                      {peerState.mode === 'meeting' ? (peerState.isHost ? 'Host ID' : 'Meeting ID') : 'Your Personal ID'}
                    </p>
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-black/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 group/id transition-all hover:border-slate-300 dark:hover:border-slate-700 ring-1 ring-slate-100 dark:ring-slate-800/50 shadow-inner">
                      <p className="font-mono text-[11px] font-medium text-blue-600 dark:text-blue-400/90 truncate flex-1">
                        {peerState.mode === 'meeting'
                          ? (peerState.roomId ? getFormattedMeetingId(peerState.roomId) : (peerState.myId ? getFormattedMeetingId(peerState.myId) : 'GENERATING...'))
                          : (peerState.roomId ? getFormattedPersonalId(peerState.roomId) : (peerState.myId ? getFormattedPersonalId(peerState.myId) : 'GENERATING...'))}
                      </p>
                      <div className="flex gap-1">
          <Tooltip content="Scan QR to Connect">
            <button
              onClick={() => {
                setIsScanning(true);
              }}
              className="text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-white transition-colors p-1"
            >
              <Scan className="w-4 h-4" />
            </button>
          </Tooltip>
          <Tooltip content={showQr ? "Hide QR Code" : "Show QR Code"}>
            <button 
              onClick={() => setShowQr(!showQr)}
              className={`transition-colors p-1 rounded ${showQr ? 'text-blue-600 bg-blue-500/10' : 'text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-white'}`}
            >
              <QrCode className="w-4 h-4" />
            </button>
          </Tooltip>
          <Tooltip content={copied ? "Copied!" : "Copy ID"}>
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
          </Tooltip>
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
                              value={peerState.mode === 'meeting'
                                ? getFormattedMeetingId(peerState.roomId || peerState.myId)
                                : getFormattedPersonalId(peerState.roomId || peerState.myId)} 
                              size={120}
                              level="M"
                              includeMargin={true}
                              style={{ width: '100%', height: '100%' }}
                            />
                          </div>
                          <Button 
                            onClick={downloadQrCode}
                            className="flex items-center gap-2 text-[9px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-widest hover:opacity-80 transition-opacity pb-1 border-none bg-transparent h-auto"
                            tooltip="Save QR to Gallery"
                          >
                            <Download className="w-3 h-3" />
                            Download QR
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  <div className="flex items-center justify-between text-[10px] pt-1">
                    <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[9px] tracking-widest ${
                      isInitializing ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20' :
                      peerState.isHost ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.1)]' : 
                      'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.1)]'
                    }`}>
                      {isInitializing ? 'INITIALIZING' : peerState.isHost ? 'HOSTING' : 'GUEST'}
                    </span>
                  </div>
                </motion.div>
              )}

              {peerState.mode === 'idle' && (
                <div className="grid grid-cols-2 gap-2 mt-2 w-full">
                  <Button 
                    onClick={hostMeeting}
                    className="w-full py-3.5 rounded-xl transition-all shadow-lg font-bold tracking-[0.05em] text-[8px] uppercase group whitespace-nowrap bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20"
                    tooltip="Start a Group Meeting"
                    tooltipPosition="bottom"
                  >
                    <Sparkles className="w-3 h-3 mr-1.5 inline-block text-amber-400" />
                    Host
                  </Button>
                  <Button 
                    onClick={hostPeer}
                    variant="secondary"
                    className="w-full py-3.5 text-[8px] font-bold uppercase tracking-widest rounded-xl border transition-all shadow-sm whitespace-nowrap border-indigo-200 dark:border-indigo-900/30 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40"
                    tooltip="Start a Direct Peer Connection"
                    tooltipPosition="bottom"
                  >
                    <Zap className="w-3 h-3 mr-1.5 inline-block text-amber-500" />
                    Peer
                  </Button>
                </div>
              )}
            </div>
          </section>

          {/* Connection Trigger Card */}
          {!isConnected && peerState.mode === 'idle' ? (
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Join</h2>
                <div className="flex items-center gap-2">
                  <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 text-right">Meeting Mode</p>
                  <span className="px-2 py-0.5 rounded-full font-bold uppercase text-[9px] tracking-widest bg-slate-100 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-800">
                    IDLE
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full justify-between">
                <div className="relative flex-1 group/input">
                  <input 
                    type="text"
                    placeholder="ENTER ID (NEX_M_ OR NEX_P_)"
                    value={targetRoomId}
                    onChange={(e) => setTargetRoomId(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                    className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs font-mono text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-800 shadow-inner"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <Tooltip content="Scan QR Code" position="bottom">
                      <button
                        onClick={() => {
                          setIsScanning(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                      >
                        <Scan className="w-4 h-4" />
                      </button>
                    </Tooltip>
                  </div>
                </div>
                <div>
                  <Button 
                    onClick={handleJoin}
                    disabled={!targetRoomId}
                    className="py-3 px-6 h-full rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/10 transition-all font-bold tracking-[0.1em] text-[8px] uppercase group whitespace-nowrap"
                    tooltip="Join Session"
                    tooltipPosition="bottom"
                  >
                    Join
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
                      <Button
                        onClick={() => kickParticipant(p.id)}
                        variant="ghost"
                        className="opacity-0 group-hover/participant:opacity-100 p-1.5 h-auto text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all border-none"
                        tooltip="Kick Participant"
                      >
                        <LogOut className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button 
                onClick={leaveMeeting}
                className="w-full mt-4 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-500/10 font-bold tracking-widest text-[9px] uppercase transition-all border-none"
                tooltip="Leave Current Session"
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
          {isConnected && peerInstance && (
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
                    }}
                    transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                    className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-8 shadow-2xl shadow-blue-500/20"
                   >
                     <Share2 className="w-10 h-10 text-white" />
                   </motion.div>
                   <h3 className="text-xl font-bold text-slate-200 mb-2 tracking-tight">Meeting Offline</h3>
                   <p className="text-slate-500 text-xs leading-relaxed font-mono max-w-[280px]">Host a new meeting or enter a Host ID to join an existing session.</p>
                </div>
             </div>
          ) : isInitializing ? (
            <div className="flex-1 flex items-center justify-center bg-slate-950/20 rounded-3xl border border-dashed border-indigo-500/30">
               <div className="flex flex-col items-center gap-4">
                 <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                 <p className="text-[10px] font-mono text-indigo-400 uppercase tracking-[0.2em] animate-pulse">Initializing Secure Channel...</p>
               </div>
            </div>
          ) : (
            <motion.section
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex-1 min-h-0 flex flex-col"
            >
              <VideoInterface 
                participants={peerState.participants}
                activeCalls={activeCalls}
                localStream={localStream}
                remoteStreams={remoteStreams}
                onStartCall={startCall}
                onEndCall={endCall}
                toggleMute={toggleMute}
                toggleVideo={toggleVideo}
                isMuted={isMuted}
                isVideoOff={isVideoOff}
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

      {/* Global Incoming Call Notifications */}
      <div className="fixed top-20 left-4 z-[100] flex flex-col gap-3 max-w-xs pointer-events-none">
        <AnimatePresence>
          {incomingCalls.map((call) => (
            <motion.div
              key={call.peer}
              initial={{ opacity: 0, x: -30, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -30, scale: 0.9 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xl pointer-events-auto flex flex-col gap-4 ring-1 ring-black/5"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center shadow-inner">
                  <PhoneIncoming className="w-6 h-6 text-blue-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-[11px] font-bold text-slate-900 dark:text-white uppercase tracking-tight">Incoming Request</h4>
                  <p className="text-[9px] font-mono text-slate-400 truncate tracking-tighter">{call.peer}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Tooltip content="Join the call with your video">
                  <button
                    onClick={() => answerCall(call)}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20 active:scale-95 px-4"
                  >
                    Accept
                  </button>
                </Tooltip>
                <Tooltip content="Reject the incoming request">
                  <button
                    onClick={() => rejectCall(call)}
                    className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-red-500/10 hover:text-red-500 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all active:scale-95 px-4"
                  >
                    Decline
                  </button>
                </Tooltip>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default App;
