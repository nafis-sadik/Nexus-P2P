import React, { useEffect, useRef } from 'react';
import { MediaConnection } from 'peerjs';
import Button from './Button';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, Video as VideoIcon, VideoOff, Activity } from 'lucide-react';
import { UserProfile } from '../types';

interface VideoInterfaceProps {
  participants: UserProfile[];
  activeCalls: Map<string, MediaConnection>;
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  onStartCall: () => void;
  onEndCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  isMuted: boolean;
  isVideoOff: boolean;
}

const VideoInterface: React.FC<VideoInterfaceProps> = ({ 
  participants, 
  activeCalls,
  localStream,
  remoteStreams,
  onStartCall,
  onEndCall,
  toggleMute,
  toggleVideo,
  isMuted,
  isVideoOff
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);

  // Handle local video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  const remoteStreamsArray = Array.from(remoteStreams.entries());
  const totalParticipantsInCall = remoteStreamsArray.length + (localStream ? 1 : 0);

  // Responsive Grid Layout Logic
  // 2-4 participants -> up to 2 columns
  // > 4 participants -> up to 3 columns
  const getGridCols = () => {
    const remoteCount = remoteStreamsArray.length;
    if (remoteCount <= 1) return 'grid-cols-1';
    if (totalParticipantsInCall <= 4) return 'grid-cols-2';
    return 'grid-cols-3';
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 relative transition-colors duration-300">
      <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 transition-colors duration-300">
        <h3 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
           <Activity className="w-4 h-4 text-emerald-500" /> Meeting Feed ({participants.length})
        </h3>
        {activeCalls.size > 0 && <div className="text-[10px] font-mono text-emerald-500 animate-pulse uppercase font-bold tracking-widest">{activeCalls.size} Active Feeds</div>}
      </div>

      <div className="relative flex-1 bg-slate-100 dark:bg-black overflow-hidden p-2 md:p-4">
        {/* Remote Video Grid */}
        <div className={`w-full h-full grid gap-2 md:gap-4 transition-all duration-500 ${getGridCols()}`}>
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
                    <div className="flex flex-col items-center opacity-20">
                        <VideoIcon className="w-12 h-12 mb-4"/>
                        <p className="font-mono text-[9px] tracking-[0.2em] uppercase">Waiting for participants...</p>
                    </div>
                </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Local Video (Floating Overlay) */}
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute bottom-4 right-4 w-28 h-20 md:w-44 md:h-32 bg-slate-900 rounded-2xl overflow-hidden border-2 border-slate-800/80 shadow-2xl z-30 group transition-all"
        >
            {localStream ? (
                <video 
                    ref={localVideoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className={`w-full h-full object-cover transition-opacity duration-500 ${isVideoOff ? 'opacity-0' : 'opacity-100'}`} 
                />
            ) : <div className="w-full h-full flex items-center justify-center bg-slate-900"><VideoIcon className="w-8 h-8 text-slate-700"/></div>}
            {isVideoOff && <div className="absolute inset-0 flex items-center justify-center bg-slate-900 text-slate-600"><VideoOff className="w-8 h-8 opacity-40"/></div>}
            <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/60 rounded text-[8px] font-mono text-slate-300 uppercase">You</div>
        </motion.div>
      </div>

      {/* Controls */}
      <div className="h-20 bg-white dark:bg-slate-950 flex items-center justify-center gap-3 md:gap-5 px-4 md:px-6 border-t border-slate-200 dark:border-slate-800">
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
                    onClick={onStartCall} 
                    className="rounded-full bg-blue-600 hover:bg-blue-500 px-6 py-3 md:py-4 font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20 text-white min-w-[120px]"
                >
                    Start Video
                </Button>
            ) : (
                <Button 
                    onClick={onEndCall} 
                    variant="danger" 
                    className="rounded-full bg-red-600 hover:bg-red-500 px-6 py-3 md:py-4 font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-red-600/20 text-white min-w-[120px]"
                >
                    End Call
                </Button>
            )}
        </div>
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
