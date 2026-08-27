import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Shield,
  Eye,
  Cpu,
  Radio,
  Lock,
  Camera,
  QrCode,
  Send,
  Download,
  Zap,
  HelpCircle,
  Laptop,
  Smartphone,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  FileCode,
  Flame,
  Check,
  Copy
} from 'lucide-react';
import { sompiToKas } from '../../crypto/kaspaTx';

interface InteractiveTutorialProps {
  onNavigateToStudio?: (initialStep?: number) => void;
}

export const InteractiveTutorial: React.FC<InteractiveTutorialProps> = ({
  onNavigateToStudio,
}) => {
  const [activeStep, setActiveStep] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<string | null>('what-is-kspt');

  // Auto-play animation timer
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setActiveStep(prev => (prev >= 4 ? 1 : prev + 1));
    }, 4500);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const steps = [
    {
      num: 1,
      title: 'Export KPUB (Pairing)',
      subtitle: 'Share Public Keys without Exposing Private Seeds',
      deviceSource: 'Mobile Phone (KasSigner)',
      deviceTarget: 'Desktop PC (KasSee)',
      color: '#F27D26',
      icon: QrCode,
      summary:
        'Your offline KasSigner phone generates an Extended Public Key (KPUB) QR code. Your online desktop KasSee wallet scans it. KasSee can now watch your balances and fetch UTXOs—with ZERO private key exposure.',
      actionPrompt: 'KasSigner displays KPUB QR ➔ KasSee desktop scans it',
    },
    {
      num: 2,
      title: 'Build Unsigned Tx (KSPT)',
      subtitle: 'Desktop Prepares the Payment Details',
      deviceSource: 'Desktop PC (KasSee)',
      deviceTarget: 'Displaying on Monitor',
      color: '#3B82F6',
      icon: Send,
      summary:
        'On desktop KasSee, you enter recipient address & amount (e.g. 50 KAS). KasSee fetches your unspent coins (UTXOs) from the Kaspa network, calculates fees, and generates an Unsigned Kaspa Transaction (KSPT) as an animated QR code.',
      actionPrompt: 'KasSee constructs KSPT ➔ Shows animated QR on PC monitor',
    },
    {
      num: 3,
      title: 'Air-Gap Scan & Sign',
      subtitle: 'Mobile Phone Verifies & Schnorr Signs in RAM',
      deviceSource: 'Mobile Phone (KasSigner)',
      deviceTarget: 'Signing in Volatile RAM',
      color: '#10B981',
      icon: Shield,
      summary:
        'You point your offline phone camera at the PC monitor. KasSigner verifies the recipient address, amount, fee, and change address. When you confirm and tap "SIGN", KasSigner computes Schnorr signatures entirely in RAM.',
      actionPrompt: 'KasSigner scans PC monitor ➔ Verifies details ➔ Signs with Schnorr',
    },
    {
      num: 4,
      title: 'Broadcast to Kaspa DAG',
      subtitle: 'Desktop Scans Signed QR & Sends to Network',
      deviceSource: 'Desktop PC (KasSee)',
      deviceTarget: 'Kaspa BlockDAG Network',
      color: '#8B5CF6',
      icon: Zap,
      summary:
        'KasSigner displays the Signed QR code on its screen. Your desktop KasSee webcam or scanner captures it. KasSee broadcasts the signed transaction to Kaspa DAG nodes. Funds transfer in sub-second time!',
      actionPrompt: 'KasSee scans phone screen ➔ Broadcasts signed tx to Kaspa DAG',
    },
  ];

  return (
    <div id="interactive-tutorial-container" className="w-full max-w-6xl mx-auto space-y-8 pb-12">
      {/* Header Banner */}
      <div className="bg-[#161920] border border-[#222630] rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#F27D26]/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F27D26]/10 border border-[#F27D26]/30 text-[#F27D26] text-xs font-mono font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            STEP-BY-STEP VISUAL GUIDE
          </div>

          <h2 className="text-2xl sm:text-3xl font-black font-mono text-white tracking-tight">
            How KasSigner & KasSee Work Together
          </h2>

          <p className="text-sm sm:text-base text-[#94A3B8] max-w-3xl leading-relaxed">
            Understand the seamless air-gapped workflow between your <strong className="text-white">Online Desktop Browser (KasSee)</strong> and your <strong className="text-[#F27D26]">Offline Mobile Signer (KasSigner)</strong> using optical QR codes.
          </p>

          {/* Quick Action Navigation Buttons */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              id="btn-tut-go-to-studio"
              onClick={() => onNavigateToStudio && onNavigateToStudio(1)}
              className="px-4 py-2.5 bg-[#F27D26] hover:bg-[#E06A14] text-slate-950 font-mono font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-[#F27D26]/20 transition-all cursor-pointer"
            >
              <Zap className="w-4 h-4" />
              Launch Dual Air-Gap Studio
            </button>

            <button
              id="btn-tut-toggle-play"
              onClick={() => setIsPlaying(!isPlaying)}
              className="px-4 py-2.5 bg-[#12151B] hover:bg-[#222630] text-[#E2E8F0] border border-[#222630] font-mono font-semibold rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 text-amber-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
              {isPlaying ? 'Pause Animation' : 'Auto-Play Walkthrough'}
            </button>
          </div>
        </div>
      </div>

      {/* WEB ANIMATION STAGE: Desktop Monitor + Air-Gap Photons + Mobile Phone */}
      <div className="bg-[#12151B] border border-[#222630] rounded-3xl p-6 shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-[#222630]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#F27D26]/20 border border-[#F27D26]/40 flex items-center justify-center text-[#F27D26] font-mono font-bold text-sm">
              {activeStep}
            </div>
            <div>
              <h3 className="font-mono text-sm font-bold text-white">
                Step {activeStep}: {steps[activeStep - 1].title}
              </h3>
              <p className="text-xs text-[#94A3B8] font-mono">
                {steps[activeStep - 1].actionPrompt}
              </p>
            </div>
          </div>

          {/* Stepper Navigation Pills */}
          <div className="flex items-center gap-1 bg-[#161920] p-1 rounded-xl border border-[#222630]">
            {[1, 2, 3, 4].map(s => (
              <button
                key={s}
                onClick={() => {
                  setActiveStep(s);
                  setIsPlaying(false);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-1 cursor-pointer ${
                  activeStep === s
                    ? 'bg-[#F27D26] text-slate-950 font-bold shadow-sm'
                    : 'text-[#94A3B8] hover:text-white hover:bg-[#222630]'
                }`}
              >
                <span>Step {s}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Interactive Stage */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center py-4">
          {/* LEFT DEVICE: Desktop Browser (KasSee) */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="w-full bg-[#161920] border-2 border-[#222630] rounded-2xl shadow-xl overflow-hidden flex flex-col">
              {/* Browser Window Header */}
              <div className="bg-[#0F1115] px-3 py-2 border-b border-[#222630] flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></div>
                </div>
                <div className="px-3 py-0.5 rounded-md bg-[#161920] border border-[#222630] text-[10px] font-mono text-[#94A3B8] flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5 text-emerald-400" />
                  https://kassee.wallet/app
                </div>
                <span className="text-[10px] font-mono text-[#3B82F6] font-bold">ONLINE</span>
              </div>

              {/* Browser Screen Content by Step */}
              <div className="p-4 bg-[#0F1115] min-h-[260px] flex flex-col justify-between font-mono text-xs">
                {/* Step 1 Screen */}
                {activeStep === 1 && (
                  <div className="space-y-3 flex-1 flex flex-col justify-center text-center">
                    <div className="p-3 bg-[#161920] border border-[#222630] rounded-xl space-y-2">
                      <div className="text-[11px] text-[#94A3B8]">1. Watch-Only Companion</div>
                      <div className="text-sm font-bold text-white">Import KasSigner KPUB</div>
                      <div className="p-2 bg-[#0F1115] rounded-lg border border-dashed border-[#F27D26]/40 text-[#F27D26] text-[10px] animate-pulse">
                        📷 Scanning KPUB QR from phone camera...
                      </div>
                    </div>
                    <p className="text-[10px] text-[#64748B]">
                      Zero private keys needed. Only imports derivation public path.
                    </p>
                  </div>
                )}

                {/* Step 2 Screen */}
                {activeStep === 2 && (
                  <div className="space-y-3 flex-1 flex flex-col justify-center">
                    <div className="p-3 bg-[#161920] border border-[#222630] rounded-xl space-y-2">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-[#94A3B8]">Balance: 250.00 KAS</span>
                        <span className="text-[#3B82F6] font-bold">Build KSPT</span>
                      </div>
                      <div className="space-y-1 text-[11px]">
                        <div className="text-[#94A3B8]">To: kaspa:qr48d9w2y... (Alice)</div>
                        <div className="text-white font-bold">Amount: 50.00 KAS</div>
                      </div>
                      <div className="p-2 bg-[#0F1115] rounded-lg border border-[#3B82F6]/40 text-center">
                        <div className="text-[10px] font-bold text-[#3B82F6]">Unsigned KSPT QR Displayed</div>
                        <div className="text-[9px] text-[#94A3B8]">KS1 Animated Protocol Active</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3 Screen */}
                {activeStep === 3 && (
                  <div className="space-y-3 flex-1 flex flex-col justify-center text-center">
                    <div className="p-3 bg-[#161920] border border-[#222630] rounded-xl space-y-2">
                      <div className="text-xs font-bold text-white">Awaiting Air-Gap Signature</div>
                      <div className="w-16 h-16 mx-auto bg-white p-1 rounded-lg flex items-center justify-center text-slate-950 font-black text-2xl shadow-md">
                        ▦
                      </div>
                      <div className="text-[10px] text-emerald-400 font-bold animate-pulse">
                        🖥️ Holding animated QR for phone camera
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 4 Screen */}
                {activeStep === 4 && (
                  <div className="space-y-3 flex-1 flex flex-col justify-center text-center">
                    <div className="p-3 bg-[#161920] border border-emerald-500/40 rounded-xl space-y-2">
                      <div className="text-xs font-bold text-emerald-400 flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Transaction Broadcasted!
                      </div>
                      <div className="text-[10px] text-[#94A3B8] break-all">
                        TxID: 8d7a7da7c540494c...
                      </div>
                      <div className="text-[10px] text-white font-bold bg-emerald-500/10 py-1 rounded border border-emerald-500/20">
                        Accepted by Kaspa BlockDAG
                      </div>
                    </div>
                  </div>
                )}

                {/* Desktop Label Bar */}
                <div className="pt-2 border-t border-[#222630] flex items-center justify-between text-[11px]">
                  <span className="text-[#94A3B8] flex items-center gap-1">
                    <Laptop className="w-3.5 h-3.5 text-[#3B82F6]" /> Desktop (KasSee)
                  </span>
                  <span className="text-[#64748B]">Port 3000 / Web</span>
                </div>
              </div>
            </div>
          </div>

          {/* CENTER: Optical Air-Gap Channel Ray Animation */}
          <div className="lg:col-span-2 flex flex-col items-center justify-center space-y-2 py-4">
            <div className="relative flex flex-col items-center">
              {/* Animated Light Beam */}
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                  activeStep === 1 || activeStep === 4
                    ? 'bg-[#F27D26]/20 border-2 border-[#F27D26] text-[#F27D26] shadow-[0_0_20px_rgba(242,125,38,0.3)]'
                    : 'bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                }`}
              >
                <Radio className="w-6 h-6 animate-pulse" />
              </div>

              {/* Direction Arrows */}
              <div className="flex items-center gap-1 my-2 text-xs font-mono font-bold">
                {activeStep === 1 && (
                  <span className="text-[#F27D26] flex items-center gap-1">
                    <ArrowLeft className="w-4 h-4 animate-bounce" /> KPUB
                  </span>
                )}
                {activeStep === 2 && (
                  <span className="text-[#3B82F6] flex items-center gap-1">
                    KSPT <ArrowRight className="w-4 h-4 animate-bounce" />
                  </span>
                )}
                {activeStep === 3 && (
                  <span className="text-emerald-400 flex items-center gap-1">
                    Scan <ArrowLeft className="w-4 h-4 animate-bounce" />
                  </span>
                )}
                {activeStep === 4 && (
                  <span className="text-purple-400 flex items-center gap-1">
                    Signed <ArrowLeft className="w-4 h-4 animate-bounce" />
                  </span>
                )}
              </div>

              <div className="px-2 py-0.5 rounded-full bg-[#161920] border border-[#222630] text-[9px] font-mono text-[#94A3B8] text-center whitespace-nowrap">
                Photons Only (Air-Gap)
              </div>
            </div>
          </div>

          {/* RIGHT DEVICE: Mobile Phone (KasSigner Hardware Device) */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="w-full max-w-[280px] bg-[#161920] border-4 border-[#222630] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
              {/* Phone Speaker & Notch Header */}
              <div className="bg-[#0F1115] px-4 py-2 border-b border-[#222630] flex items-center justify-between">
                <div className="flex items-center gap-1 text-[9px] font-mono text-amber-400 font-bold">
                  <span>✈️ AIRPLANE</span>
                </div>
                <div className="w-12 h-3.5 bg-[#161920] rounded-full border border-[#222630]"></div>
                <span className="text-[9px] font-mono text-[#F27D26] font-bold">100% RAM</span>
              </div>

              {/* Phone Screen Content by Step */}
              <div className="p-4 bg-[#0F1115] min-h-[260px] flex flex-col justify-between font-mono text-xs">
                {/* Step 1 Phone Screen */}
                {activeStep === 1 && (
                  <div className="space-y-2 flex-1 flex flex-col justify-center text-center">
                    <div className="text-[10px] font-bold text-[#F27D26] uppercase">Export KPUB QR</div>
                    <div className="w-20 h-20 mx-auto bg-white p-1 rounded-lg flex items-center justify-center text-slate-950 font-black text-3xl shadow">
                      ▦
                    </div>
                    <div className="text-[9px] text-[#94A3B8] truncate">
                      kpub:44'/111111'/0'/...
                    </div>
                  </div>
                )}

                {/* Step 2 Phone Screen */}
                {activeStep === 2 && (
                  <div className="space-y-3 flex-1 flex flex-col justify-center text-center">
                    <div className="p-3 bg-[#161920] border border-[#222630] rounded-xl space-y-2">
                      <div className="text-xs font-bold text-white">Standby for KSPT</div>
                      <div className="text-[10px] text-[#94A3B8]">
                        Tap "Scan QR" to open camera and read desktop transaction
                      </div>
                      <div className="w-8 h-8 mx-auto rounded-full bg-[#F27D26]/20 flex items-center justify-center text-[#F27D26]">
                        <Camera className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3 Phone Screen */}
                {activeStep === 3 && (
                  <div className="space-y-2 flex-1 flex flex-col justify-center">
                    <div className="p-2.5 bg-[#161920] border border-emerald-500/40 rounded-xl space-y-1.5 text-[10px]">
                      <div className="text-emerald-400 font-bold flex items-center justify-between">
                        <span>SECURITY CHECK</span>
                        <CheckCircle2 className="w-3 h-3" />
                      </div>
                      <div className="text-white font-bold">Send: 50.00 KAS</div>
                      <div className="text-[#94A3B8] text-[9px] truncate">To: kaspa:qr48d9w...</div>
                      <div className="text-emerald-300 text-[9px]">Change: Verified Owned</div>
                      <div className="w-full py-1.5 bg-[#F27D26] text-slate-950 font-bold rounded text-center text-[10px]">
                        SCHNORR SIGN IN RAM
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 4 Phone Screen */}
                {activeStep === 4 && (
                  <div className="space-y-2 flex-1 flex flex-col justify-center text-center">
                    <div className="text-[10px] font-bold text-purple-400 uppercase">Signed QR Ready</div>
                    <div className="w-20 h-20 mx-auto bg-white p-1 rounded-lg flex items-center justify-center text-slate-950 font-black text-3xl shadow">
                      ▦
                    </div>
                    <div className="text-[9px] text-emerald-400 font-bold">
                      ✓ 64-byte Schnorr Attached
                    </div>
                  </div>
                )}

                {/* Phone Device Label Bar */}
                <div className="pt-2 border-t border-[#222630] flex items-center justify-between text-[11px]">
                  <span className="text-[#94A3B8] flex items-center gap-1">
                    <Smartphone className="w-3.5 h-3.5 text-[#F27D26]" /> KasSigner
                  </span>
                  <span className="text-amber-400 text-[10px]">Zero Storage</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step Interactive Controller Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[#222630]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setActiveStep(prev => (prev <= 1 ? 4 : prev - 1));
                setIsPlaying(false);
              }}
              className="px-3 py-1.5 bg-[#161920] hover:bg-[#222630] border border-[#222630] rounded-xl text-xs font-mono text-[#E2E8F0] flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Previous Step
            </button>

            <button
              onClick={() => {
                setActiveStep(prev => (prev >= 4 ? 1 : prev + 1));
                setIsPlaying(false);
              }}
              className="px-3 py-1.5 bg-[#F27D26] hover:bg-[#E06A14] text-slate-950 font-bold rounded-xl text-xs font-mono flex items-center gap-1 shadow-md shadow-[#F27D26]/20 cursor-pointer"
            >
              Next Step <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="text-xs text-[#94A3B8] font-mono text-center sm:text-right">
            {steps[activeStep - 1].summary}
          </p>
        </div>
      </div>

      {/* CLARIFICATION MATRIX: Desktop vs. Mobile Side-by-Side Table */}
      <div className="bg-[#161920] border border-[#222630] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-bold font-mono text-[#F27D26]">
            <HelpCircle className="w-4 h-4" />
            THE FUNDAMENTAL CONCEPT
          </div>
          <h3 className="text-xl font-bold font-mono text-white">
            Which Device Does What? (Desktop vs. Mobile Phone)
          </h3>
          <p className="text-xs text-[#94A3B8] font-mono">
            Clear role boundaries ensure your private seed can NEVER be stolen by malware, phishing, or hackers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* KasSee (Desktop Companion) Card */}
          <div className="p-5 bg-[#12151B] border border-[#3B82F6]/30 rounded-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#222630]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#3B82F6]/20 border border-[#3B82F6]/40 flex items-center justify-center text-[#3B82F6]">
                  <Eye className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-mono text-sm font-bold text-white">KasSee (The "Eyes")</h4>
                  <p className="text-[10px] text-[#94A3B8] font-mono">Watch-Only Desktop / Web App</p>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950/60 text-blue-300 border border-blue-800/40 font-bold">
                ONLINE
              </span>
            </div>

            <ul className="space-y-2 text-xs font-mono text-[#94A3B8]">
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" />
                <span><strong className="text-white">Where:</strong> Runs in your browser on PC/Mac/Laptop.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" />
                <span><strong className="text-white">Internet:</strong> Connected to Kaspa BlockDAG nodes via RPC.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" />
                <span><strong className="text-white">Holds:</strong> Extended Public Key (KPUB) only.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                <span><strong className="text-white">Private Keys:</strong> <span className="text-emerald-400 font-bold">NEVER HELD (Zero risk).</span></span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" />
                <span><strong className="text-white">Function:</strong> Builds Unsigned Transactions (KSPT), creates QR codes, and broadcasts signed transactions to the network.</span>
              </li>
            </ul>
          </div>

          {/* KasSigner (Mobile Hardware Signer) Card */}
          <div className="p-5 bg-[#12151B] border border-[#F27D26]/30 rounded-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#222630]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#F27D26]/20 border border-[#F27D26]/40 flex items-center justify-center text-[#F27D26]">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-mono text-sm font-bold text-white">KasSigner (The "Signer")</h4>
                  <p className="text-[10px] text-[#94A3B8] font-mono">Air-Gapped Mobile / Hardware Device</p>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/40 font-bold">
                100% AIR-GAPPED
              </span>
            </div>

            <ul className="space-y-2 text-xs font-mono text-[#94A3B8]">
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-[#F27D26] mt-0.5 shrink-0" />
                <span><strong className="text-white">Where:</strong> Runs on a dedicated smartphone or device.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-[#F27D26] mt-0.5 shrink-0" />
                <span><strong className="text-white">Internet:</strong> <span className="text-amber-300 font-bold">Airplane Mode (Zero WiFi / BT / USB).</span></span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-[#F27D26] mt-0.5 shrink-0" />
                <span><strong className="text-white">Holds:</strong> 24-Word Mnemonic in <strong className="text-[#F27D26]">Volatile RAM ONLY</strong>.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                <span><strong className="text-white">Safety:</strong> Private keys disappear completely when wiped or powered off.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-[#F27D26] mt-0.5 shrink-0" />
                <span><strong className="text-white">Function:</strong> Scans QR through camera lens, verifies recipient & change math, signs with Schnorr.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* 4-STEP DETAILED WALKTHROUGH WITH REAL PRACTICE BUTTONS */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold font-mono text-white flex items-center gap-2">
          <FileCode className="w-5 h-5 text-[#F27D26]" />
          Detailed Step-by-Step Instructions & Real Buttons
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Detailed Step 1 */}
          <div className="p-5 bg-[#161920] border border-[#222630] rounded-2xl space-y-3">
            <div className="flex items-center gap-2 text-[#F27D26] font-mono font-bold text-xs">
              <span className="w-6 h-6 rounded-lg bg-[#F27D26]/20 border border-[#F27D26]/40 flex items-center justify-center">1</span>
              Step 1: Export KPUB from KasSigner
            </div>
            <p className="text-xs text-[#94A3B8] leading-relaxed font-mono">
              On your KasSigner device, tap <strong className="text-white">"Export KPUB"</strong>. It presents an Extended Public Key QR code (<code className="text-[#F27D26]">kpub:44'/111111'/0'...</code>). On KasSee desktop, tap <strong className="text-white">"Scan KPUB"</strong> to link the watch-only wallet.
            </p>
            <div className="pt-2 flex items-center gap-2">
              <button
                onClick={() => onNavigateToStudio && onNavigateToStudio(1)}
                className="px-3 py-1.5 bg-[#12151B] hover:bg-[#222630] border border-[#222630] text-[#F27D26] font-mono text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5" /> Try Pairing in Studio
              </button>
            </div>
          </div>

          {/* Detailed Step 2 */}
          <div className="p-5 bg-[#161920] border border-[#222630] rounded-2xl space-y-3">
            <div className="flex items-center gap-2 text-[#3B82F6] font-mono font-bold text-xs">
              <span className="w-6 h-6 rounded-lg bg-[#3B82F6]/20 border border-[#3B82F6]/40 flex items-center justify-center">2</span>
              Step 2: Construct KSPT on KasSee
            </div>
            <p className="text-xs text-[#94A3B8] leading-relaxed font-mono">
              In KasSee, click the <strong className="text-white">"Send (KSPT)"</strong> tab. Paste recipient address and amount. Click <strong className="text-white">"Generate Unsigned QR"</strong>. KasSee selects your spendable UTXOs and renders an animated QR payload.
            </p>
            <div className="pt-2 flex items-center gap-2">
              <button
                onClick={() => onNavigateToStudio && onNavigateToStudio(2)}
                className="px-3 py-1.5 bg-[#12151B] hover:bg-[#222630] border border-[#222630] text-[#3B82F6] font-mono text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" /> Open Send Tab in Studio
              </button>
            </div>
          </div>

          {/* Detailed Step 3 */}
          <div className="p-5 bg-[#161920] border border-[#222630] rounded-2xl space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 font-mono font-bold text-xs">
              <span className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">3</span>
              Step 3: Point Camera & Sign in RAM
            </div>
            <p className="text-xs text-[#94A3B8] leading-relaxed font-mono">
              On KasSigner, tap <strong className="text-white">"Scan Transaction"</strong> and point the camera at your desktop monitor. Review the recipient, fee, and change output. Tap <strong className="text-white">"SIGN TRANSACTION"</strong>. Signatures are calculated in volatile RAM.
            </p>
            <div className="pt-2 flex items-center gap-2">
              <button
                onClick={() => onNavigateToStudio && onNavigateToStudio(3)}
                className="px-3 py-1.5 bg-[#12151B] hover:bg-[#222630] border border-[#222630] text-emerald-400 font-mono text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5" /> Test Signer Review
              </button>
            </div>
          </div>

          {/* Detailed Step 4 */}
          <div className="p-5 bg-[#161920] border border-[#222630] rounded-2xl space-y-3">
            <div className="flex items-center gap-2 text-purple-400 font-mono font-bold text-xs">
              <span className="w-6 h-6 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center">4</span>
              Step 4: Scan Signed QR & Broadcast
            </div>
            <p className="text-xs text-[#94A3B8] leading-relaxed font-mono">
              KasSigner displays the animated Signed QR code. On KasSee desktop, go to <strong className="text-white">"Broadcast"</strong> tab and scan the signed QR code. Click <strong className="text-white">"Broadcast to Kaspa DAG"</strong>. Done!
            </p>
            <div className="pt-2 flex items-center gap-2">
              <button
                onClick={() => onNavigateToStudio && onNavigateToStudio(4)}
                className="px-3 py-1.5 bg-[#12151B] hover:bg-[#222630] border border-[#222630] text-purple-400 font-mono text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5" /> Test Broadcast Screen
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* FREQUENTLY ASKED QUESTIONS & GLOSSARY */}
      <div className="bg-[#161920] border border-[#222630] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-4 font-mono">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-[#F27D26]" />
          Frequently Asked Questions & Plain-English Glossary
        </h3>

        <div className="space-y-2 text-xs">
          {/* FAQ 1 */}
          <div className="border border-[#222630] rounded-2xl overflow-hidden bg-[#12151B]">
            <button
              onClick={() => setOpenFaq(openFaq === 'what-is-kspt' ? null : 'what-is-kspt')}
              className="w-full p-4 text-left font-bold text-white flex items-center justify-between hover:bg-[#161920] transition-colors cursor-pointer"
            >
              <span>What is a KSPT / PSKB? (Kaspa Partially Signed Transaction)</span>
              {openFaq === 'what-is-kspt' ? <ChevronDown className="w-4 h-4 text-[#F27D26]" /> : <ChevronRight className="w-4 h-4 text-[#94A3B8]" />}
            </button>
            {openFaq === 'what-is-kspt' && (
              <div className="p-4 pt-0 text-[#94A3B8] leading-relaxed border-t border-[#222630]/60 space-y-2">
                <p>
                  KSPT stands for <strong className="text-white">Kaspa Serialized Partially-Signed (or Unsigned) Transaction</strong>, equivalent to Bitcoin's BIP-174 PSBT standard.
                </p>
                <p>
                  It packages all required transaction components (input UTXOs, outpoint transaction IDs, sompi amounts, recipient script, and change script) into a compact standard JSON or binary format. KasSee builds it, and KasSigner attaches Schnorr signatures to it without needing internet access.
                </p>
              </div>
            )}
          </div>

          {/* FAQ 2 */}
          <div className="border border-[#222630] rounded-2xl overflow-hidden bg-[#12151B]">
            <button
              onClick={() => setOpenFaq(openFaq === 'what-is-kpub' ? null : 'what-is-kpub')}
              className="w-full p-4 text-left font-bold text-white flex items-center justify-between hover:bg-[#161920] transition-colors cursor-pointer"
            >
              <span>What is a KPUB and why is it 100% safe to export to KasSee?</span>
              {openFaq === 'what-is-kpub' ? <ChevronDown className="w-4 h-4 text-[#F27D26]" /> : <ChevronRight className="w-4 h-4 text-[#94A3B8]" />}
            </button>
            {openFaq === 'what-is-kpub' && (
              <div className="p-4 pt-0 text-[#94A3B8] leading-relaxed border-t border-[#222630]/60 space-y-2">
                <p>
                  A <strong className="text-white">KPUB (Kaspa Extended Public Key)</strong> contains only public curve points and chain codes for derivation path <code className="text-[#F27D26]">m/44'/111111'/0'</code>.
                </p>
                <p>
                  It allows KasSee to calculate your public addresses (#0, #1, #2...) and query their balances on the Kaspa DAG. Mathematically, it is <strong className="text-emerald-400">impossible</strong> to reverse a KPUB into a private key or spend funds with it.
                </p>
              </div>
            )}
          </div>

          {/* FAQ 3 */}
          <div className="border border-[#222630] rounded-2xl overflow-hidden bg-[#12151B]">
            <button
              onClick={() => setOpenFaq(openFaq === 'why-ram' ? null : 'why-ram')}
              className="w-full p-4 text-left font-bold text-white flex items-center justify-between hover:bg-[#161920] transition-colors cursor-pointer"
            >
              <span>Why Stateless Volatile RAM instead of storing on device storage?</span>
              {openFaq === 'why-ram' ? <ChevronDown className="w-4 h-4 text-[#F27D26]" /> : <ChevronRight className="w-4 h-4 text-[#94A3B8]" />}
            </button>
            {openFaq === 'why-ram' && (
              <div className="p-4 pt-0 text-[#94A3B8] leading-relaxed border-t border-[#222630]/60 space-y-2">
                <p>
                  Traditional hardware wallets store private keys in flash memory or secure elements, making them vulnerable to physical extraction, chip decapping, or side-channel fault injection if lost or stolen.
                </p>
                <p>
                  KasSigner operates on a <strong className="text-white">stateless paradigm</strong>: private keys exist solely in transient memory. When you tap "Wipe RAM" or power down the device, the secrets vanish with zero forensic trace.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
