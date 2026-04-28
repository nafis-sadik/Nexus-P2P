import React, { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X } from 'lucide-react';

interface QrScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

const QrScanner: React.FC<QrScannerProps> = ({ onScan, onClose }) => {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    // Check if camera is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Camera access is not available in this context. Please ensure you are using HTTPS and that your browser supports camera access.");
      onClose();
      return;
    }

    // Timeout to ensure the container is rendered
    const timeoutId = setTimeout(() => {
      scannerRef.current = new Html5QrcodeScanner(
        "qr-reader",
        { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        /* verbose= */ false
      );

      scannerRef.current.render(
        (decodedText) => {
          onScan(decodedText);
          if (scannerRef.current) {
            scannerRef.current.clear().catch(err => console.error("Failed to clear scanner", err));
          }
        },
        (error) => {
          // Ignore transient "not found" errors which happen on every frame without a QR code
          if (error && (error.includes("NotFound") || error.includes("No MultiFormat Readers"))) {
            return;
          }
          
          // Log other actual errors (like permission or hardware issues)
          if (error && (error.includes("NotAllowed") || error.includes("Permission"))) {
            console.error("QR Scan Permission Error:", error);
          } else {
            console.warn("QR Scan debug (transient):", error);
          }
        }
      );
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => console.error("Failed to clear scanner during cleanup", err));
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
          <h3 className="font-bold text-slate-800 dark:text-white">Scan Peer ID</h3>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        
        <div className="p-1">
          <div id="qr-reader" className="w-full"></div>
        </div>
        
        <div className="p-4 bg-slate-50 dark:bg-slate-800/30 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Point your camera at the QR code displayed on another device
          </p>
        </div>
      </div>
    </div>
  );
};

export default QrScanner;
