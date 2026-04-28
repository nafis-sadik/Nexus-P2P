import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeCameraScanConfig } from 'html5-qrcode';
import { X, Camera, RefreshCw } from 'lucide-react';

interface QrScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

interface CameraDevice {
  id: string;
  label: string;
}

const QrScanner: React.FC<QrScannerProps> = ({ onScan, onClose }) => {
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isInitializing, setIsInitializing] = useState(true);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = "qr-reader-internal";

  const stopScanner = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
    }
  };

  const startScanner = async (cameraId: string) => {
    if (!html5QrCodeRef.current) return;
    
    await stopScanner();

    const config: Html5QrcodeCameraScanConfig = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0
    };

    try {
      await html5QrCodeRef.current.start(
        cameraId,
        config,
        (decodedText) => {
          onScan(decodedText);
          stopScanner().then(() => onClose());
        },
        () => {
          // Ignore transient errors
        }
      );
    } catch (err) {
      console.error("Error starting scanner:", err);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        // Find cameras
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          const formattedDevices = devices.map(d => ({ id: d.id, label: d.label }));
          setCameras(formattedDevices);
          
          // Create scanner instance
          html5QrCodeRef.current = new Html5Qrcode(scannerContainerId);
          
          // Prefer back camera
          const backCamera = devices.find(d => 
            d.label.toLowerCase().includes('back') || 
            d.label.toLowerCase().includes('rear') ||
            d.label.toLowerCase().includes('0')
          );
          
          const defaultId = backCamera ? backCamera.id : devices[0].id;
          setSelectedCameraId(defaultId);
          await startScanner(defaultId);
        } else {
          alert("No cameras found");
          onClose();
        }
      } catch (err) {
        console.error("Camera init error:", err);
        alert("Could not access cameras. Please ensure permissions are granted.");
        onClose();
      } finally {
        setIsInitializing(false);
      }
    };

    init();

    return () => {
      stopScanner();
    };
  }, []);

  const handleCameraChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    setSelectedCameraId(newId);
    startScanner(newId);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 text-slate-800 dark:text-slate-100">
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-blue-500" />
            <h3 className="font-bold">Scan Peer ID</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        
        <div className="p-2 space-y-4">
          {/* Camera Selection */}
          {cameras.length > 1 && (
            <div className="px-2">
              <label className="text-[10px] uppercase font-mono text-slate-400 mb-1 block ml-1">Switch Camera</label>
              <div className="relative">
                <select 
                  value={selectedCameraId}
                  onChange={handleCameraChange}
                  className="w-full bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-slate-800 rounded-lg py-2 px-3 pl-9 text-xs focus:ring-1 focus:ring-blue-500 transition-all appearance-none cursor-pointer"
                >
                  {cameras.map(camera => (
                    <option key={camera.id} value={camera.id}>{camera.label || `Camera ${camera.id}`}</option>
                  ))}
                </select>
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </div>
            </div>
          )}

          <div className="relative aspect-square w-full max-w-[300px] mx-auto rounded-xl overflow-hidden border-2 border-slate-100 dark:border-slate-800 bg-black">
            <div id={scannerContainerId}></div>
            {isInitializing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900/50 backdrop-blur-xs">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs text-white/70">Waking up lens...</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="p-4 bg-slate-50 dark:bg-slate-800/30 text-center">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Point your camera at the QR code displayed on another device's screen
          </p>
        </div>
      </div>
    </div>
  );
};

export default QrScanner;
