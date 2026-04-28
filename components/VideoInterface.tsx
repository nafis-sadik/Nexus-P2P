import React, { useEffect, useRef, useState } from 'react';
import Peer, { MediaConnection } from 'peerjs';
import Button from './Button';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff, Monitor, MonitorOff, PhoneIncoming, Activity } from 'lucide-react';

interface VideoInterfaceProps {
  peer: Peer;
  remotePeerId: string | null;
  incomingCall: MediaConnection | null;
  onCallEnd: () => void;
}

const VideoInterface: React.FC<VideoInterfaceProps> = ({ peer, remotePeerId, incomingCall, onCallEnd }) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [activeCall, setActiveCall] = useState<MediaConnection | null>(null);
  
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Handle local video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Handle remote video element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Clean up if incoming call is cancelled by caller before we answer
  useEffect(() => {
    if (incomingCall) {
        incomingCall.on('close', () => {
            endCall();
        });
    }
  }, [incomingCall]);

  const answerCall = () => {
    if (!incomingCall) return;
    
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        setLocalStream(stream);
        incomingCall.answer(stream);
        setActiveCall(incomingCall);

        incomingCall.on('stream', (remoteStream) => {
          setRemoteStream(remoteStream);
        });
      })
      .catch(err => {
          console.error("Failed to get local stream", err);
          endCall();
      });
  };

  const rejectCall = () => {
      incomingCall?.close();
      onCallEnd();
  };

  const startCall = () => {
    if (!remotePeerId) return;
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        setLocalStream(stream);
        const newCall = peer.call(remotePeerId, stream);
        setActiveCall(newCall);

        newCall.on('stream', (remoteStream) => {
          setRemoteStream(remoteStream);
        });

        newCall.on('close', () => endCall());
      })
      .catch(err => console.error("Failed to get local stream", err));
  };

  const endCall = () => {
    activeCall?.close();
    localStream?.getTracks().forEach(track => track.stop());
    setLocalStream(null);
    setRemoteStream(null);
    setActiveCall(null);
    setIsScreenSharing(false);
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

  const toggleScreenShare = async () => {
    if (!activeCall || !localStream) return;

    if (isScreenSharing) {
      // Stop screen share, revert to camera
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        const videoTrack = stream.getVideoTracks()[0];
        
        const sender = activeCall.peerConnection.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
            await sender.replaceTrack(videoTrack);
        }

        setLocalStream((prev) => {
            if(!prev) return stream;
            // Stop old tracks (screen share)
            prev.getVideoTracks().forEach(t => t.stop());
            return new MediaStream([videoTrack, ...prev.getAudioTracks()]);
        });
        setIsScreenSharing(false);
        setIsVideoOff(false); 
      } catch (err) {
        console.error("Error reverting to camera", err);
      }
    } else {
      // Start screen share
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = stream.getVideoTracks()[0];

        const sender = activeCall.peerConnection.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
            await sender.replaceTrack(screenTrack);
        }

        screenTrack.onended = () => {
            toggleScreenShare(); 
        };

        setLocalStream((prev) => {
            if (!prev) return stream;
            return new MediaStream([screenTrack, ...prev.getAudioTracks()]);
        });
        setIsScreenSharing(true);
      } catch (err) {
        console.error("Error starting screen share", err);
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 relative transition-colors duration-300">
      <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 transition-colors duration-300">
        <h3 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
           <Activity className="w-4 h-4 text-emerald-500" /> Video Feed
        </h3>
        {activeCall && <div className="text-[10px] font-mono text-emerald-500 animate-pulse uppercase font-bold tracking-widest">In Call</div>}
      </div>

      <div className="relative flex-1 bg-slate-100 dark:bg-black overflow-hidden">
        {/* Remote Video */}
        <AnimatePresence>
          {remoteStream ? (
            <motion.video 
              key="remote-video"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              ref={remoteVideoRef} 
              autoPlay 
              playsInline
              className="w-full h-full object-cover" 
            />
          ) : (
            <motion.div 
              key="remote-placeholder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-950"
            >
              {incomingCall && !activeCall ? (
                  <div className="text-center">
                      <motion.div 
                        animate={{ scale: [1, 1.1, 1] }} 
                        transition={{ repeat: Infinity, duration: 1.5 }}
                        className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(37,99,235,0.4)]"
                      >
                        <PhoneIncoming className="w-12 h-12 text-white" />
                      </motion.div>
                      <h3 className="text-xl font-bold text-slate-800 dark:text-white uppercase tracking-tight">Incoming Call</h3>
                      <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-2 font-mono uppercase tracking-widest bg-blue-50 dark:bg-blue-400/10 px-3 py-1 rounded-full border border-blue-100 dark:border-blue-400/20">{incomingCall.peer}</p>
                  </div>
              ) : activeCall ? (
                  <div className="flex flex-col items-center gap-4">
                     <div className="w-3 h-3 bg-blue-600 rounded-full animate-ping" />
                     <p className="font-mono text-[10px] tracking-[0.3em] uppercase">Connecting...</p>
                  </div>
              ) : (
                  <div className="flex flex-col items-center opacity-30">
                     <VideoIcon className="w-16 h-16 mb-4"/>
                     <p className="font-mono text-[10px] tracking-[0.2em] uppercase">Ready for Video</p>
                  </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Local Video (PiP) */}
        {activeCall && (
            <motion.div 
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="absolute bottom-4 right-4 w-32 h-24 md:w-52 md:h-36 bg-slate-100 dark:bg-slate-900 rounded-xl overflow-hidden border-2 border-slate-200 dark:border-slate-700 shadow-2xl transition-all hover:scale-105 z-20 group"
            >
            {localStream ? (
                <video 
                ref={localVideoRef} 
                autoPlay 
                playsInline 
                muted 
                className={`w-full h-full object-cover transition-opacity duration-500 ${isVideoOff ? 'opacity-0' : 'opacity-100'}`} 
                />
            ) : <div className="w-full h-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center"><VideoIcon className="w-6 h-6 text-slate-400 dark:text-slate-500 opacity-20"/></div>}
            {isVideoOff && <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-500"><VideoOff className="w-8 h-8 opacity-40"/></div>}
            <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/60 backdrop-blur-sm rounded-md text-[8px] font-mono text-slate-300 uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">You</div>
            </motion.div>
        )}
      </div>

      {/* Controls */}
      <div className="h-24 bg-white dark:bg-slate-950 flex items-center justify-center gap-5 px-6 border-t border-slate-200 dark:border-slate-800 transition-colors duration-300">
        
        {/* Case 1: Incoming Call (Ringing) */}
        {incomingCall && !activeCall && (
            <div className="flex gap-4">
                <Button onClick={answerCall} variant="primary" className="bg-emerald-600 hover:bg-emerald-500 rounded-full px-8 py-6 uppercase font-bold text-[10px] tracking-widest shadow-lg shadow-emerald-500/20">
                    Answer
                </Button>
                <Button onClick={rejectCall} variant="danger" className="rounded-full px-8 py-6 uppercase font-bold text-[10px] tracking-widest border border-red-500/50 hover:bg-red-500/20">
                    Decline
                </Button>
            </div>
        )}

        {/* Case 2: No Active Call & No Incoming */}
        {!activeCall && !incomingCall && (
          <Button 
            onClick={startCall} 
            disabled={!remotePeerId}
            className="rounded-full w-14 h-14 p-0 flex items-center justify-center bg-blue-600 hover:bg-blue-500 shadow-xl shadow-blue-600/20 transition-all active:scale-95 disabled:grayscale disabled:opacity-30"
          >
            <VideoIcon className="w-6 h-6 text-white" />
          </Button>
        )}

        {/* Case 3: Active Call */}
        {activeCall && (
          <div className="flex items-center gap-4">
            <Button 
              onClick={toggleMute} 
              variant="ghost"
              className={`rounded-xl w-12 h-12 p-0 flex items-center justify-center border transition-all ${isMuted ? 'bg-red-500/10 border-red-500/50 text-red-600 dark:text-red-500 hover:bg-red-500/20' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </Button>
            
            <Button 
              onClick={toggleVideo} 
              variant="ghost"
              className={`rounded-xl w-12 h-12 p-0 flex items-center justify-center border transition-all ${isVideoOff ? 'bg-red-500/10 border-red-500/50 text-red-600 dark:text-red-500 hover:bg-red-500/20' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
              {isVideoOff ? <VideoOff className="w-5 h-5" /> : <VideoIcon className="w-5 h-5" />}
            </Button>

            <Button 
              onClick={toggleScreenShare} 
              variant="ghost"
              className={`rounded-xl w-12 h-12 p-0 flex items-center justify-center border transition-all ${isScreenSharing ? 'bg-blue-500/10 border-blue-500/50 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
               {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
            </Button>

            <Button 
              onClick={endCall} 
              variant="danger" 
              className="rounded-full w-14 h-14 p-0 flex items-center justify-center bg-red-600 hover:bg-red-500 shadow-xl shadow-red-600/40 ml-2"
            >
              <PhoneOff className="w-6 h-6 text-white" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoInterface;