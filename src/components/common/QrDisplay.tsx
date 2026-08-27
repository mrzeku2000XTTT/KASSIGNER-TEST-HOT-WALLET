import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Play, Pause, SkipForward, SkipBack, Copy, Check, Maximize2, Minimize2, RefreshCw } from 'lucide-react';
import { createQrFrames } from '../../crypto/kaspaTx';

interface QrDisplayProps {
  data: string;
  type?: 'KSPT' | 'SIGNED_KSPT' | 'KPUB' | 'ADDRESS';
  title?: string;
  subtitle?: string;
  maxChunkSize?: number;
  defaultFps?: number;
}

export const QrDisplay: React.FC<QrDisplayProps> = ({
  data,
  type = 'KSPT',
  title,
  subtitle,
  maxChunkSize = 220,
  defaultFps = 4,
}) => {
  const [fps, setFps] = useState<number>(defaultFps);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentFrame, setCurrentFrame] = useState<number>(0);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [singleFrameMode, setSingleFrameMode] = useState<boolean>(false);

  const frames = React.useMemo(() => {
    if (singleFrameMode) return [data];
    return createQrFrames(data, type, maxChunkSize);
  }, [data, type, maxChunkSize, singleFrameMode]);

  const totalFrames = frames.length;

  useEffect(() => {
    setCurrentFrame(0);
  }, [data, singleFrameMode]);

  useEffect(() => {
    if (!isPlaying || totalFrames <= 1) return;

    const intervalMs = Math.max(100, Math.floor(1000 / fps));
    const timer = setInterval(() => {
      setCurrentFrame(prev => (prev + 1) % totalFrames);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, fps, totalFrames]);

  const handleCopy = () => {
    navigator.clipboard.writeText(data);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleNext = () => {
    setIsPlaying(false);
    setCurrentFrame(prev => (prev + 1) % totalFrames);
  };

  const handlePrev = () => {
    setIsPlaying(false);
    setCurrentFrame(prev => (prev - 1 + totalFrames) % totalFrames);
  };

  return (
    <div
      id={`qr-display-${type.toLowerCase()}`}
      className={`flex flex-col items-center bg-[#161920] border border-[#222630] rounded-2xl p-5 shadow-2xl transition-all ${
        isFullScreen ? 'fixed inset-4 z-50 overflow-y-auto max-w-2xl mx-auto my-auto bg-[#12151B]' : 'w-full max-w-md'
      }`}
    >
      {/* Header */}
      <div className="w-full flex items-center justify-between pb-3 border-b border-[#222630] mb-4">
        <div>
          <h4 className="text-base font-semibold text-[#F27D26] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#F27D26] animate-pulse"></span>
            {title || (totalFrames > 1 ? `Animated QR (${type})` : `QR Code (${type})`)}
          </h4>
          {subtitle && <p className="text-xs text-[#94A3B8] mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            id="btn-qr-copy-payload"
            onClick={handleCopy}
            title="Copy Raw Data"
            className="p-1.5 rounded-lg bg-[#12151B] hover:bg-[#222630] text-[#E2E8F0] border border-[#222630] transition-colors"
          >
            {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
          <button
            id="btn-qr-toggle-fullscreen"
            onClick={() => setIsFullScreen(!isFullScreen)}
            title={isFullScreen ? 'Minimize' : 'Maximize'}
            className="p-1.5 rounded-lg bg-[#12151B] hover:bg-[#222630] text-[#E2E8F0] border border-[#222630] transition-colors"
          >
            {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* QR Code Frame */}
      <div className="relative p-4 bg-white rounded-xl shadow-inner flex items-center justify-center">
        <QRCodeSVG
          value={frames[currentFrame] || data}
          size={isFullScreen ? 320 : 230}
          level="M"
          includeMargin={false}
          bgColor="#FFFFFF"
          fgColor="#000000"
        />
        {totalFrames > 1 && (
          <div className="absolute top-2 right-2 bg-black/85 backdrop-blur-md px-2 py-0.5 rounded text-[11px] font-mono font-bold text-[#F27D26]">
            {currentFrame + 1}/{totalFrames}
          </div>
        )}
      </div>

      {/* Animation & Frame Controls (If Multi-frame) */}
      {totalFrames > 1 && (
        <div className="w-full mt-4 space-y-3">
          {/* Progress Bar */}
          <div className="w-full bg-[#12151B] border border-[#222630] h-2 rounded-full overflow-hidden flex">
            {Array.from({ length: totalFrames }).map((_, idx) => (
              <div
                key={idx}
                className={`h-full flex-1 border-r border-[#161920] transition-colors ${
                  idx === currentFrame ? 'bg-[#F27D26]' : 'bg-[#222630]'
                }`}
              />
            ))}
          </div>

          {/* Controls row */}
          <div className="flex items-center justify-between text-xs text-[#E2E8F0]">
            <div className="flex items-center gap-1.5">
              <button
                id="btn-qr-prev-frame"
                onClick={handlePrev}
                className="p-1.5 rounded bg-[#12151B] hover:bg-[#222630] text-[#E2E8F0] border border-[#222630]"
              >
                <SkipBack className="w-3.5 h-3.5" />
              </button>
              <button
                id="btn-qr-play-pause"
                onClick={() => setIsPlaying(!isPlaying)}
                className="px-2.5 py-1 rounded bg-[#F27D26]/15 text-[#F27D26] hover:bg-[#F27D26]/25 border border-[#F27D26]/30 font-medium flex items-center gap-1"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {isPlaying ? 'Pause' : 'Play'}
              </button>
              <button
                id="btn-qr-next-frame"
                onClick={handleNext}
                className="p-1.5 rounded bg-[#12151B] hover:bg-[#222630] text-[#E2E8F0] border border-[#222630]"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* FPS Selector */}
            <div className="flex items-center gap-2">
              <span className="text-[#94A3B8] text-[11px]">Speed:</span>
              <div className="flex bg-[#12151B] border border-[#222630] rounded p-0.5">
                {[2, 4, 8].map(rate => (
                  <button
                    key={rate}
                    onClick={() => setFps(rate)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                      fps === rate ? 'bg-[#F27D26] text-slate-950 font-bold' : 'text-[#94A3B8] hover:text-white'
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="w-full mt-3 pt-3 border-t border-[#222630] flex items-center justify-between text-[11px] text-[#94A3B8]">
        <span className="font-mono truncate max-w-[200px]">
          Bytes: {new TextEncoder().encode(data).length} | Chunks: {totalFrames}
        </span>
        <button
          id="btn-qr-toggle-mode"
          onClick={() => setSingleFrameMode(!singleFrameMode)}
          className="text-[#94A3B8] hover:text-[#F27D26] transition-colors"
        >
          {singleFrameMode ? 'Use Animated QR' : 'Use Static Single QR'}
        </button>
      </div>
    </div>
  );
};
