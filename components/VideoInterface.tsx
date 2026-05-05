import React, { useEffect, useRef, useState } from 'react';
import Peer, { MediaConnection } from 'peerjs';
import Button from './Button';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, Video as VideoIcon, VideoOff, PhoneIncoming, Activity } from 'lucide-react';

interface VideoInterfaceProps {
  peer: Peer;
  remotePeerId: string | null; // This is now used as Room ID or Host ID
  incomingCall: MediaConnection | null;
  onCallEnd: () => void;
}

const VideoInterface: React.FC<VideoInterfaceProps> = ({ peer, remotePeerId, incomingCall, onCallEnd }) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [activeCalls, setActiveCalls] = useState<Map<string, MediaConnection>>(new Map());
  
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);

  // Handle local video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Handle incoming calls
  useEffect(() => {
    if (incomingCall) {
      const handleStream = (stream: MediaStream) => {
        setRemoteStreams(prev => {
          const next = new Map(prev);
          next.set(incomingCall.peer, stream);
          return next;
        });
      };

      const handleClose = () => {
        setRemoteStreams(prev => {
          const next = new Map(prev);
          next.delete(incomingCall.peer);
          return next;
        });
        setActiveCalls(prev => {
          const next = new Map(prev);
          next.delete(incomingCall.peer);
          return next;
        });
      };

      incomingCall.on('stream', handleStream);
      incomingCall.on('close', handleClose);
      incomingCall.on('error', handleClose);
    }
  }, [incomingCall]);

  const answerCall = async () => {
    if (!incomingCall) return;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' }, 
        audio: true 
      });
      setLocalStream(stream);
      incomingCall.answer(stream);
      setActiveCalls(prev => new Map(prev).set(incomingCall.peer, incomingCall));
    } catch (err: any) {
      console.error("Failed to answer call", err);
      // Fallback: answer without stream to just see them
      incomingCall.answer();
    }
  };

  const rejectCall = () => {
    incomingCall?.close();
    onCallEnd();
  };

  const startCall = async () => {
    if (!remotePeerId) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' }, 
        audio: true 
      });
      setLocalStream(stream);
      
      const newCall = peer.call(remotePeerId, stream);
      setActiveCalls(prev => new Map(prev).set(remotePeerId, newCall));

      newCall.on('stream', (remoteStream) => {
        setRemoteStreams(prev => new Map(prev).set(remotePeerId, remoteStream));
      });

      newCall.on('close', () => {
        setRemoteStreams(prev => {
            const next = new Map(prev);
            next.delete(remotePeerId);
            return next;
        });
        setActiveCalls(prev => {
            const next = new Map(prev);
            next.delete(remotePeerId);
            return next;
        });
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
    onCallEnd();
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

  const remoteStreamsArray = Array.from(remoteStreams.entries());

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 relative transition-colors duration-300">
      <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 transition-colors duration-300">
        <h3 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
           <Activity className="w-4 h-4 text-emerald-500" /> Room Feed
        </h3>
        {activeCalls.size > 0 && <div className="text-[10px] font-mono text-emerald-500 animate-pulse uppercase font-bold tracking-widest">{activeCalls.size} Active</div>}
      </div>

      <div className="relative flex-1 bg-slate-100 dark:bg-black overflow-hidden p-2 md:p-4">
        {/* Remote Video Grid */}
        <div className={`w-full h-full grid gap-2 md:gap-4 ${
            remoteStreamsArray.length <= 1 ? 'grid-cols-1' :
            remoteStreamsArray.length <= 4 ? 'grid-cols-2' : 'grid-cols-3'
        }`}>
          <AnimatePresence>
            {remoteStreamsArray.length > 0 ? (
                remoteStreamsArray.map(([peerId, stream]) => (
                    <motion.div 
                        key={peerId}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="relative bg-slate-800 rounded-2xl overflow-hidden border border-slate-700 shadow-lg min-h-[150px]"
                    >
                        <VideoComponent stream={stream} />
                        <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/40 backdrop-blur-md rounded-lg text-[9px] font-mono text-white tracking-widest uppercase">
                            PEER: {peerId.slice(0, 8)}
                        </div>
                    </motion.div>
                ))
            ) : (
                <motion.div 
                    key="no-stream"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="w-full h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500"
                >
                    {incomingCall && activeCalls.size === 0 ? (
                        <div className="text-center">
                            <motion.div 
                                animate={{ scale: [1, 1.1, 1] }} 
                                transition={{ repeat: Infinity, duration: 1.5 }}
                                className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-500/20"
                            >
                                <PhoneIncoming className="w-10 h-10 text-white" />
                            </motion.div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white uppercase tracking-tight">Incoming Request</h3>
                            <p className="text-[9px] text-blue-500 mt-2 font-mono uppercase tracking-widest">{incomingCall.peer}</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center opacity-20">
                            <VideoIcon className="w-12 h-12 mb-4"/>
                            <p className="font-mono text-[9px] tracking-[0.2em] uppercase">No active feeds</p>
                        </div>
                    )}
                </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Local Video (Floating) */}
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`absolute ${remoteStreamsArray.length > 0 ? 'bottom-4 right-4 w-28 h-20 md:w-44 md:h-32' : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-40 md:w-72 md:h-52'} bg-slate-900 rounded-2xl overflow-hidden border-2 border-slate-800 shadow-2xl z-30 group transition-all`}
        >
            {localStream ? (
                <video 
                    ref={localVideoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className={`w-full h-full object-cover transition-opacity duration-500 ${isVideoOff ? 'opacity-0' : 'opacity-100'}`} 
                />
            ) : <div className="w-full h-full flex items-center justify-center bg-slate-900"><VideoIcon className="w-8 h-8 text-slate-800"/></div>}
            {isVideoOff && <div className="absolute inset-0 flex items-center justify-center bg-slate-900 text-slate-600"><VideoOff className="w-8 h-8 opacity-40"/></div>}
            <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/60 rounded text-[8px] font-mono text-slate-300 uppercase">You</div>
        </motion.div>
      </div>

      {/* Controls */}
      <div className="h-20 bg-white dark:bg-slate-950 flex items-center justify-center gap-3 md:gap-5 px-4 md:px-6 border-t border-slate-200 dark:border-slate-800">
        {incomingCall && activeCalls.size === 0 ? (
            <div className="flex gap-3">
                <Button onClick={answerCall} className="bg-emerald-600 hover:bg-emerald-500 rounded-xl px-6 py-4 uppercase font-bold text-[10px] tracking-widest shadow-lg shadow-emerald-500/20">
                    Accept
                </Button>
                <Button onClick={rejectCall} variant="danger" className="rounded-xl px-6 py-4 uppercase font-bold text-[10px] tracking-widest border border-red-500/50">
                    Decline
                </Button>
            </div>
        ) : (
            <div className="flex items-center gap-3">
                <Button 
                    onClick={toggleMute} 
                    variant="ghost"
                    className={`rounded-xl h-10 w-10 md:h-12 md:w-12 p-0 flex items-center justify-center border transition-all ${isMuted ? 'bg-red-500/10 border-red-500/50 text-red-500' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'}`}
                >
                    {isMuted ? <MicOff className="w-4 h-4 md:w-5 md:h-5" /> : <Mic className="w-4 h-4 md:w-5 md:h-5" />}
                </Button>
                
                <Button 
                    onClick={toggleVideo} 
                    variant="ghost"
                    className={`rounded-xl h-10 w-10 md:h-12 md:w-12 p-0 flex items-center justify-center border transition-all ${isVideoOff ? 'bg-red-500/10 border-red-500/50 text-red-500' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'}`}
                >
                    {isVideoOff ? <VideoOff className="w-4 h-4 md:w-5 md:h-5" /> : <VideoIcon className="w-4 h-4 md:w-5 md:h-5" />}
                </Button>

                {activeCalls.size === 0 ? (
                    <Button 
                        onClick={startCall} 
                        disabled={!remotePeerId}
                        className="rounded-full bg-blue-600 hover:bg-blue-500 px-6 py-3 md:py-4 font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20 text-white min-w-[100px]"
                    >
                        Join Call
                    </Button>
                ) : (
                    <Button 
                        onClick={endCall} 
                        variant="danger" 
                        className="rounded-full bg-red-600 hover:bg-red-500 px-6 py-3 md:py-4 font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-red-600/20 text-white min-w-[100px]"
                    >
                        Leave
                    </Button>
                )}
            </div>
        )}
      </div>
    </div>
  );
};

const VideoComponent: React.FC<{ stream: MediaStream }> = ({ stream }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    useEffect(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
    }, [stream]);
    return <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />;
};

export default VideoInterface;
