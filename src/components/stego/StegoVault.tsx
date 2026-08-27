import React, { useState, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Shield,
  Lock,
  Unlock,
  Upload,
  Download,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Eye,
  EyeOff,
  Sparkles,
  RefreshCw,
  FileKey
} from 'lucide-react';
import {
  encodeStegoImage,
  decodeStegoImage,
  generateCoverImage
} from '../../crypto/steganography';
import { validateMnemonic, generateMnemonic } from '../../crypto/bip39Words';

interface StegoVaultProps {
  onLoadSeedIntoSigner?: (seed: string) => void;
}

export const StegoVault: React.FC<StegoVaultProps> = ({ onLoadSeedIntoSigner }) => {
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');

  // Encode State
  const [encodeSeed, setEncodeSeed] = useState<string>('');
  const [encodePassphrase, setEncodePassphrase] = useState<string>('');
  const [encodedResultUrl, setEncodedResultUrl] = useState<string | null>(null);
  const [encodeStats, setEncodeStats] = useState<{ encodedBytes: number; maxCapacityBytes: number } | null>(null);
  const [isEncoding, setIsEncoding] = useState<boolean>(false);
  const [coverSource, setCoverSource] = useState<'generated' | 'custom'>('generated');
  const [customCoverImg, setCustomCoverImg] = useState<HTMLImageElement | null>(null);

  // Decode State
  const [decodePassphrase, setDecodePassphrase] = useState<string>('');
  const [decodedSeedResult, setDecodedSeedResult] = useState<string | null>(null);
  const [isDecoding, setIsDecoding] = useState<boolean>(false);
  const [decodeError, setDecodeError] = useState<string | null>(null);
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const decodeFileInputRef = useRef<HTMLInputElement>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const handleCustomCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        setCustomCoverImg(img);
        setCoverSource('custom');
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleEncode = async () => {
    if (!encodeSeed.trim()) {
      alert('Please enter or generate a seed phrase to hide.');
      return;
    }

    setIsEncoding(true);
    try {
      let coverImage: HTMLImageElement | HTMLCanvasElement;

      if (coverSource === 'custom' && customCoverImg) {
        coverImage = customCoverImg;
      } else {
        coverImage = generateCoverImage(600, 600, 'Kaspa Stego Vault Artifact');
      }

      const result = await encodeStegoImage(coverImage, encodeSeed.trim(), encodePassphrase);
      setEncodedResultUrl(result.dataUrl);
      setEncodeStats({
        encodedBytes: result.encodedBytes,
        maxCapacityBytes: result.maxCapacityBytes,
      });

      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    } catch (err: any) {
      alert('Encoding failed: ' + err.message);
    } finally {
      setIsEncoding(false);
    }
  };

  const handleDecodeFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setUploadedImagePreview(reader.result as string);
      setDecodedSeedResult(null);
      setDecodeError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleExecuteDecode = async () => {
    if (!uploadedImagePreview) {
      alert('Please upload a steganographic image first.');
      return;
    }

    setIsDecoding(true);
    setDecodeError(null);
    setDecodedSeedResult(null);

    try {
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = uploadedImagePreview;
      });

      const extractedText = await decodeStegoImage(img, decodePassphrase);
      setDecodedSeedResult(extractedText);
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
    } catch (err: any) {
      setDecodeError(err.message || 'Failed to extract payload from image');
    } finally {
      setIsDecoding(false);
    }
  };

  const handleCopyDecoded = () => {
    if (!decodedSeedResult) return;
    navigator.clipboard.writeText(decodedSeedResult);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div
      id="stego-vault-container"
      className="max-w-2xl mx-auto w-full bg-[#161920] border border-[#222630] rounded-3xl shadow-2xl overflow-hidden text-[#E2E8F0] flex flex-col"
    >
      {/* Header */}
      <div className="bg-[#12151B] px-6 py-4 border-b border-[#222630] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#F27D26] to-amber-700 flex items-center justify-center text-slate-950 font-black shadow-lg">
            🛡️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-mono text-sm font-bold text-white tracking-wide">StegoVault</h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#F27D26]/20 text-[#F27D26] font-bold">
                LSB + AES-GCM
              </span>
            </div>
            <p className="text-[11px] text-[#94A3B8]">Steganographic Seed Backup & Image Vault</p>
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="flex bg-[#0F1115] p-1 rounded-xl border border-[#222630]">
          <button
            id="btn-stego-mode-encode"
            onClick={() => setMode('encode')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
              mode === 'encode' ? 'bg-[#F27D26] text-slate-950 font-bold shadow-sm shadow-[#F27D26]/20' : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            Hide Seed (Encode)
          </button>
          <button
            id="btn-stego-mode-decode"
            onClick={() => setMode('decode')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
              mode === 'decode' ? 'bg-[#F27D26] text-slate-950 font-bold shadow-sm shadow-[#F27D26]/20' : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            Extract Seed (Decode)
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6 bg-[#0F1115]">
        {/* ENCODE MODE */}
        {mode === 'encode' && (
          <div className="space-y-4">
            {/* Step 1: Input Seed Phrase */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-mono text-[#E2E8F0]">
                <label className="flex items-center gap-1.5 font-bold text-[#F27D26]">
                  <FileKey className="w-3.5 h-3.5" /> 1. Secret Seed Words to Hide:
                </label>
                <button
                  onClick={() => setEncodeSeed(generateMnemonic(24))}
                  className="text-[#F27D26] hover:underline text-[11px] flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" /> Generate Fresh 24 Words
                </button>
              </div>
              <textarea
                id="txt-stego-encode-seed"
                rows={3}
                value={encodeSeed}
                onChange={e => setEncodeSeed(e.target.value)}
                placeholder="abandon ability able about above absent absorb abstract absurd abuse access accident..."
                className="w-full bg-[#161920] border border-[#222630] focus:border-[#F27D26] rounded-xl p-3 text-xs font-mono text-[#E2E8F0] outline-none resize-none"
              />
            </div>

            {/* Step 2: Passphrase (Optional AES-GCM) */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-[#E2E8F0] flex items-center gap-1.5 font-bold">
                <Lock className="w-3.5 h-3.5 text-[#F27D26]" /> 2. Encryption Password (Optional):
              </label>
              <input
                id="inp-stego-encode-pass"
                type="password"
                value={encodePassphrase}
                onChange={e => setEncodePassphrase(e.target.value)}
                placeholder="Optional strong password to AES-256-GCM encrypt payload inside pixels"
                className="w-full bg-[#161920] border border-[#222630] focus:border-[#F27D26] rounded-xl p-2.5 text-xs font-mono text-[#E2E8F0] outline-none"
              />
            </div>

            {/* Step 3: Cover Image Choice */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-[#E2E8F0] flex items-center gap-1.5 font-bold">
                <ImageIcon className="w-3.5 h-3.5 text-[#F27D26]" /> 3. Cover Image Selection:
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setCoverSource('generated')}
                  className={`p-3 rounded-xl border text-left font-mono text-xs transition-colors flex items-center gap-2.5 ${
                    coverSource === 'generated'
                      ? 'bg-[#F27D26]/10 border-[#F27D26] text-[#F27D26]'
                      : 'bg-[#161920] border-[#222630] text-[#94A3B8] hover:text-white'
                  }`}
                >
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <div>
                    <div className="font-bold text-white">Generated Cyber Cover</div>
                    <div className="text-[10px] text-[#94A3B8]">Procedural Kaspa Geometric Card</div>
                  </div>
                </button>

                <label
                  className={`p-3 rounded-xl border text-left font-mono text-xs transition-colors flex items-center gap-2.5 cursor-pointer ${
                    coverSource === 'custom'
                      ? 'bg-[#F27D26]/10 border-[#F27D26] text-[#F27D26]'
                      : 'bg-[#161920] border-[#222630] text-[#94A3B8] hover:text-white'
                  }`}
                >
                  <Upload className="w-4 h-4 shrink-0" />
                  <div className="truncate">
                    <div className="font-bold text-white">Custom Image</div>
                    <div className="text-[10px] text-[#94A3B8]">
                      {customCoverImg ? 'Image loaded' : 'Upload photo'}
                    </div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={handleCustomCoverUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Encode Action */}
            <button
              id="btn-stego-execute-encode"
              onClick={handleEncode}
              disabled={isEncoding || !encodeSeed.trim()}
              className="w-full py-3 bg-[#F27D26] hover:bg-[#E06A14] disabled:opacity-40 text-slate-950 font-mono font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#F27D26]/20"
            >
              {isEncoding ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Embedding Steganographic Payload into Pixels...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  Generate Stego Image Artifact
                </>
              )}
            </button>

            {/* Encoded Result Preview */}
            {encodedResultUrl && (
              <div className="p-4 bg-[#161920] border border-[#222630] rounded-2xl space-y-3 font-mono">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Stego PNG Ready
                  </span>
                  {encodeStats && (
                    <span className="text-[#94A3B8] text-[10px]">
                      {encodeStats.encodedBytes} bytes / {encodeStats.maxCapacityBytes.toLocaleString()} max
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <img
                    src={encodedResultUrl}
                    alt="Stego Result"
                    className="w-32 h-32 rounded-xl object-cover border border-[#222630] shadow"
                  />
                  <div className="space-y-2 flex-1 text-xs text-[#E2E8F0]">
                    <p className="text-[11px] text-[#94A3B8]">
                      Your seed phrase is imperceptibly embedded into the least significant bits of this PNG. Store or print this image safely.
                    </p>
                    <a
                      id="lnk-download-stego-png"
                      href={encodedResultUrl}
                      download="kassigner_stego_seed_vault.png"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download Stego PNG
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* DECODE MODE */}
        {mode === 'decode' && (
          <div className="space-y-4">
            {/* Upload Stego File */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-[#E2E8F0] font-bold flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-[#F27D26]" /> 1. Upload Stego PNG Artifact:
              </label>
              <div
                onClick={() => decodeFileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-[#222630] hover:border-[#F27D26]/50 rounded-2xl p-6 flex flex-col items-center justify-center bg-[#12151B]/50 cursor-pointer transition-colors"
              >
                {uploadedImagePreview ? (
                  <div className="flex items-center gap-3">
                    <img src={uploadedImagePreview} alt="Preview" className="w-16 h-16 rounded-lg object-cover" />
                    <div className="text-left font-mono text-xs">
                      <div className="text-emerald-400 font-bold">Image Loaded</div>
                      <div className="text-[10px] text-[#94A3B8]">Click to replace</div>
                    </div>
                  </div>
                ) : (
                  <>
                    <ImageIcon className="w-8 h-8 text-[#F27D26] mb-2 opacity-80" />
                    <p className="text-xs font-mono text-[#E2E8F0]">Click to select Stego Image file</p>
                    <p className="text-[10px] font-mono text-[#64748B]">Supports PNG artifacts created by KasSigner</p>
                  </>
                )}
                <input
                  ref={decodeFileInputRef}
                  type="file"
                  accept="image/png,image/*"
                  onChange={handleDecodeFile}
                  className="hidden"
                />
              </div>
            </div>

            {/* Passphrase for Decryption */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-[#E2E8F0] font-bold flex items-center gap-1.5">
                <Unlock className="w-3.5 h-3.5 text-[#F27D26]" /> 2. Decryption Password (if encrypted):
              </label>
              <input
                id="inp-stego-decode-pass"
                type="password"
                value={decodePassphrase}
                onChange={e => setDecodePassphrase(e.target.value)}
                placeholder="Enter password used during encoding"
                className="w-full bg-[#161920] border border-[#222630] focus:border-[#F27D26] rounded-xl p-2.5 text-xs font-mono text-[#E2E8F0] outline-none"
              />
            </div>

            {/* Execute Decode Button */}
            <button
              id="btn-stego-execute-decode"
              onClick={handleExecuteDecode}
              disabled={isDecoding || !uploadedImagePreview}
              className="w-full py-3 bg-[#F27D26] hover:bg-[#E06A14] disabled:opacity-40 text-slate-950 font-mono font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#F27D26]/20"
            >
              {isDecoding ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Extracting Pixel Bits & Decrypting...
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4" />
                  Extract Secret Seed
                </>
              )}
            </button>

            {/* Decode Error */}
            {decodeError && (
              <div className="p-3 bg-red-950/40 border border-red-800/50 rounded-xl text-red-300 text-xs font-mono flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{decodeError}</span>
              </div>
            )}

            {/* Extracted Seed Result */}
            {decodedSeedResult && (
              <div className="p-4 bg-emerald-950/30 border border-emerald-700/40 rounded-2xl space-y-3 font-mono">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Secret Seed Extracted Successfully!
                  </span>
                  <button
                    onClick={handleCopyDecoded}
                    className="text-[#F27D26] hover:underline flex items-center gap-1"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    Copy Words
                  </button>
                </div>

                <div className="bg-[#0F1115] p-3 rounded-xl border border-[#222630] text-xs text-[#E2E8F0] break-all select-all">
                  {decodedSeedResult}
                </div>

                {onLoadSeedIntoSigner && (
                  <button
                    onClick={() => onLoadSeedIntoSigner(decodedSeedResult)}
                    className="w-full py-2 bg-[#F27D26] hover:bg-[#E06A14] text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-[#F27D26]/20"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Load Extracted Seed into KasSigner RAM
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
