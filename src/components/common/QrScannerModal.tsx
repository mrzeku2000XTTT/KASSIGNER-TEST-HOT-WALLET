import React, { useState, useRef, useEffect } from 'react';
import jsQR from 'jsqr';
import { Camera, Upload, Clipboard, CheckCircle2, AlertCircle, X, RefreshCw } from 'lucide-react';
import { processQrFrame, FrameAccumulatorState } from '../../crypto/kaspaTx';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedData: string) => void;
  title?: string;
  expectedType?: string;
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  title = 'Scan Kaspa QR Code',
  expectedType,
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'upload' | 'paste'>('camera');
  const [manualText, setManualText] = useState<string>('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scannerState, setScannerState] = useState<FrameAccumulatorState | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Initialize camera
  useEffect(() => {
    if (!isOpen || activeTab !== 'camera') {
      stopCamera();
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab, selectedDeviceId]);

  const stopCamera = () => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const startCamera = async () => {
    stopCamera();
    setCameraError(null);

    try {
      // List video devices
      const devs = await navigator.mediaDevices.enumerateDevices();
      const videoDevs = devs.filter(d => d.kind === 'videoinput');
      setDevices(videoDevs);

      const constraints: MediaStreamConstraints = {
        video: selectedDeviceId
          ? { deviceId: { exact: selectedDeviceId } }
          : { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        requestAnimationFrame(tick);
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access or use File Upload / Paste tab.'
          : 'Unable to start camera stream: ' + (err.message || 'Device error')
      );
    }
  };

  const tick = () => {
    if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
      animFrameIdRef.current = requestAnimationFrame(tick);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });

      if (code && code.data) {
        handleRawScannedText(code.data);
      }
    }

    animFrameIdRef.current = requestAnimationFrame(tick);
  };

  const handleRawScannedText = (raw: string) => {
    try {
      const newState = processQrFrame(raw, scannerState || undefined);
      setScannerState({ ...newState });

      if (newState.isComplete && newState.assembledData) {
        stopCamera();
        onScanSuccess(newState.assembledData);
        onClose();
      }
    } catch (err) {
      // ignore invalid intermediate frame errors
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imgData = ctx.getImageData(0, 0, img.width, img.height);
          const code = jsQR(imgData.data, imgData.width, imgData.height);
          if (code && code.data) {
            handleRawScannedText(code.data);
          } else {
            alert('No readable QR code found in this image.');
          }
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleManualSubmit = () => {
    if (!manualText.trim()) return;
    try {
      const state = processQrFrame(manualText.trim());
      if (state.isComplete && state.assembledData) {
        onScanSuccess(state.assembledData);
        onClose();
      } else {
        alert('Incomplete QR frame packet. Please paste the full payload or all frames.');
      }
    } catch (e: any) {
      onScanSuccess(manualText.trim());
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="qr-scanner-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in"
    >
      <div
        id="qr-scanner-modal-card"
        className="w-full max-w-lg bg-[#161920] border border-[#222630] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#222630] bg-[#12151B]">
          <div className="flex items-center gap-2.5">
            <Camera className="w-5 h-5 text-[#F27D26]" />
            <div>
              <h3 className="text-sm font-semibold text-white">{title}</h3>
              {expectedType && <p className="text-xs text-[#94A3B8]">Target payload: {expectedType}</p>}
            </div>
          </div>
          <button
            id="btn-close-scanner-modal"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#222630] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switchers */}
        <div className="flex border-b border-[#222630] bg-[#12151B]">
          <button
            id="tab-scanner-camera"
            onClick={() => setActiveTab('camera')}
            className={`flex-1 py-2.5 text-xs font-medium flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'camera'
                ? 'border-[#F27D26] text-[#F27D26] bg-[#F27D26]/10 font-bold'
                : 'border-transparent text-[#94A3B8] hover:text-[#E2E8F0]'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            Live Camera
          </button>
          <button
            id="tab-scanner-upload"
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-2.5 text-xs font-medium flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'upload'
                ? 'border-[#F27D26] text-[#F27D26] bg-[#F27D26]/10 font-bold'
                : 'border-transparent text-[#94A3B8] hover:text-[#E2E8F0]'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            File Image
          </button>
          <button
            id="tab-scanner-paste"
            onClick={() => setActiveTab('paste')}
            className={`flex-1 py-2.5 text-xs font-medium flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'paste'
                ? 'border-[#F27D26] text-[#F27D26] bg-[#F27D26]/10 font-bold'
                : 'border-transparent text-[#94A3B8] hover:text-[#E2E8F0]'
            }`}
          >
            <Clipboard className="w-3.5 h-3.5" />
            Paste Raw
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-5 flex-1 flex flex-col items-center">
          {activeTab === 'camera' && (
            <div className="w-full flex flex-col items-center">
              {cameraError ? (
                <div className="w-full p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{cameraError}</span>
                  </div>
                  <button
                    onClick={startCamera}
                    className="self-start px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 rounded-lg text-xs font-medium flex items-center gap-1 mt-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Retry Camera
                  </button>
                </div>
              ) : (
                <div className="relative w-full aspect-square max-w-[320px] rounded-2xl overflow-hidden bg-black border-2 border-[#F27D26]/50 shadow-inner flex items-center justify-center">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    autoPlay
                    muted
                    playsInline
                  />
                  <canvas ref={canvasRef} className="hidden" />

                  {/* Optical scanning reticle overlay */}
                  <div className="absolute inset-8 border-2 border-dashed border-[#F27D26]/80 rounded-xl pointer-events-none animate-pulse flex items-center justify-center">
                    <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-[#F27D26] to-transparent animate-bounce"></div>
                  </div>
                </div>
              )}

              {/* Multi-frame packet progress indicator */}
              {scannerState && scannerState.total > 1 && (
                <div className="w-full mt-4 p-3 bg-[#12151B] border border-[#222630] rounded-xl flex flex-col gap-2">
                  <div className="flex justify-between text-xs text-[#E2E8F0]">
                    <span className="font-mono">
                      Received {scannerState.parts.size} of {scannerState.total} QR frames
                    </span>
                    <span className="text-[#F27D26] font-bold">
                      {Math.round((scannerState.parts.size / scannerState.total) * 100)}%
                    </span>
                  </div>
                  <div className="w-full flex gap-1 h-2 bg-[#0F1115] rounded-full overflow-hidden border border-[#222630]">
                    {Array.from({ length: scannerState.total }).map((_, idx) => (
                      <div
                        key={idx}
                        className={`flex-1 transition-all ${
                          scannerState.parts.has(idx + 1) ? 'bg-[#F27D26]' : 'bg-[#222630]'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Camera device selector if multiple */}
              {devices.length > 1 && (
                <div className="w-full mt-3 flex items-center gap-2">
                  <label className="text-xs text-[#94A3B8]">Camera:</label>
                  <select
                    value={selectedDeviceId}
                    onChange={e => setSelectedDeviceId(e.target.value)}
                    className="flex-1 bg-[#0F1115] border border-[#222630] text-[#E2E8F0] text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-[#F27D26]"
                  >
                    {devices.map(d => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || `Camera ${d.deviceId.slice(0, 5)}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="w-full flex flex-col items-center justify-center p-6 border-2 border-dashed border-[#222630] hover:border-[#F27D26]/50 rounded-2xl bg-[#12151B] transition-colors">
              <Upload className="w-10 h-10 text-[#F27D26] mb-3 opacity-80" />
              <p className="text-xs text-[#E2E8F0] font-medium mb-1">Select an image file with Kaspa QR code</p>
              <p className="text-[11px] text-[#64748B] mb-4">Supports PNG, JPG, WEBP</p>
              <label
                id="lbl-upload-qr-file"
                className="px-4 py-2 bg-[#F27D26] hover:bg-[#E06A14] text-slate-950 font-bold rounded-xl text-xs cursor-pointer shadow transition-transform active:scale-95 shadow-[#F27D26]/20"
              >
                Browse QR Image
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {activeTab === 'paste' && (
            <div className="w-full flex flex-col gap-3">
              <label className="text-xs text-[#E2E8F0] font-medium">
                Paste Raw JSON Payload or KS1 Multipart Packet:
              </label>
              <textarea
                id="txt-manual-qr-payload"
                rows={5}
                value={manualText}
                onChange={e => setManualText(e.target.value)}
                placeholder='e.g. {"version":0,"inputs":[...],"outputs":[...]} or KS1|KSPT|1|1|...'
                className="w-full bg-[#0F1115] border border-[#222630] rounded-xl p-3 text-xs font-mono text-[#E2E8F0] focus:border-[#F27D26] outline-none resize-none"
              />
              <button
                id="btn-submit-manual-payload"
                onClick={handleManualSubmit}
                disabled={!manualText.trim()}
                className="w-full py-2.5 bg-[#F27D26] hover:bg-[#E06A14] disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md shadow-[#F27D26]/20"
              >
                Process & Load Payload
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
