import React, { useState } from 'react';
import {
  ArrowRight,
  Shield,
  Eye,
  Radio,
  Cpu,
  Sparkles,
  Zap,
  CheckCircle2,
  Lock,
  Camera,
  RefreshCw,
  Layers,
  Repeat
} from 'lucide-react';
import { KasSignerDevice } from '../signer/KasSignerDevice';
import { KasSeeWallet } from '../wallet/KasSeeWallet';
import { KaspaKpub, UnsignedKaspaTx, SignedKaspaTx } from '../../types/kaspa';

interface DualAirGapStudioProps {
  initialStep?: number;
  onOpenTutorial?: () => void;
}

export const DualAirGapStudio: React.FC<DualAirGapStudioProps> = ({
  initialStep = 1,
  onOpenTutorial,
}) => {
  const [syncedKpub, setSyncedKpub] = useState<KaspaKpub | null>(null);
  const [unsignedTxInFlight, setUnsignedTxInFlight] = useState<UnsignedKaspaTx | null>(null);
  const [signedTxInFlight, setSignedTxInFlight] = useState<SignedKaspaTx | null>(null);
  const [activeStep, setActiveStep] = useState<number>(initialStep);
  const [isOpticalTransmitting, setIsOpticalTransmitting] = useState<boolean>(false);

  const handlePairFromSigner = (kpub: KaspaKpub) => {
    setSyncedKpub(kpub);
    setActiveStep(2);
  };

  const handleSendTxFromWallet = (tx: UnsignedKaspaTx) => {
    setUnsignedTxInFlight(tx);
    setActiveStep(3);
  };

  const handleSendSignedBackFromSigner = (signed: SignedKaspaTx) => {
    setSignedTxInFlight(signed);
    setActiveStep(4);
  };

  const handleResetFlow = () => {
    setSyncedKpub(null);
    setUnsignedTxInFlight(null);
    setSignedTxInFlight(null);
    setActiveStep(1);
  };

  return (
    <div id="dual-airgap-studio-container" className="w-full max-w-7xl mx-auto space-y-6">
      {/* Interactive Workflow Progress Stepper */}
      <div className="bg-[#161920] border border-[#222630] rounded-2xl p-4 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#222630]">
          <div>
            <h2 className="text-sm font-bold font-mono text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#F27D26]" />
              Air-Gapped Workflow Simulation
            </h2>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              Experience the end-to-end QR code transaction lifecycle between offline KasSigner and online KasSee.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onOpenTutorial && (
              <button
                onClick={onOpenTutorial}
                className="px-3 py-1.5 rounded-xl bg-[#12151B] hover:bg-[#222630] text-[#F27D26] text-xs font-mono border border-[#F27D26]/30 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" /> How It Works (Animation)
              </button>
            )}
            <button
              onClick={handleResetFlow}
              className="p-1.5 rounded-xl bg-[#12151B] hover:bg-[#222630] text-[#94A3B8] hover:text-white border border-[#222630] text-xs font-mono transition-colors cursor-pointer"
              title="Reset Simulation"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
              <Lock className="w-3 h-3" /> Private Keys Never Leave RAM
            </span>
          </div>
        </div>

        {/* Steps Breadcrumbs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 text-xs font-mono">
          {[
            { step: 1, title: '1. Export KPUB', desc: 'Air-gap pairing', active: activeStep >= 1 },
            { step: 2, title: '2. Build Tx (KasSee)', desc: 'Generate KSPT QR', active: activeStep >= 2 },
            { step: 3, title: '3. Review & Sign', desc: 'Schnorr in RAM', active: activeStep >= 3 },
            { step: 4, title: '4. Broadcast', desc: 'Propagate to DAG', active: activeStep >= 4 },
          ].map(s => (
            <div
              key={s.step}
              className={`p-2.5 rounded-xl border transition-all ${
                activeStep === s.step
                  ? 'bg-[#F27D26]/10 border-[#F27D26] text-white shadow-sm shadow-[#F27D26]/10'
                  : s.active
                  ? 'bg-[#12151B] border-[#222630] text-[#E2E8F0]'
                  : 'bg-[#0F1115] border-[#1A1D23] text-[#64748B]'
              }`}
            >
              <div className="font-bold flex items-center justify-between">
                <span>{s.title}</span>
                {s.active && <CheckCircle2 className="w-3.5 h-3.5 text-[#F27D26]" />}
              </div>
              <div className="text-[10px] text-[#94A3B8]">{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Optical Link Channel Banner */}
      <div className="relative flex items-center justify-center p-3 bg-gradient-to-r from-transparent via-[#F27D26]/10 to-transparent border-y border-[#F27D26]/20">
        <div className="flex items-center gap-4 text-xs font-mono text-[#F27D26]">
          <div className="flex items-center gap-1">
            <Radio className="w-4 h-4 animate-pulse text-[#F27D26]" />
            <span>OPTICAL AIR-GAP CHANNEL</span>
          </div>
          <span className="text-[#64748B]">•</span>
          <span className="text-[#E2E8F0]">Animated Multipart QR (KS1 Protocol)</span>
          <span className="text-[#64748B]">•</span>
          <span className="text-emerald-400 font-bold">100% Stateless RAM</span>
        </div>
      </div>

      {/* Dual Side-by-Side Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* LEFT COLUMN: KasSee Watch-Only Online Wallet */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]"></span>
              <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wider">
                Online Companion (KasSee)
              </h3>
            </div>
            <span className="text-[11px] font-mono text-[#94A3B8] bg-[#161920] border border-[#222630] px-2 py-0.5 rounded">
              Network Connected
            </span>
          </div>

          <KasSeeWallet
            importedKpub={syncedKpub}
            onSendTxToSigner={handleSendTxFromWallet}
            incomingSignedTx={signedTxInFlight}
            compactView={true}
          />
        </div>

        {/* RIGHT COLUMN: KasSigner Offline Hardware Device */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#F27D26] shadow-[0_0_8px_#F27D26]"></span>
              <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wider">
                Air-Gapped Signer (KasSigner)
              </h3>
            </div>
            <span className="text-[11px] font-mono text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40">
              OFFLINE / RAM ONLY
            </span>
          </div>

          <KasSignerDevice
            onExportKpubToCompanion={handlePairFromSigner}
            incomingUnsignedTx={unsignedTxInFlight}
            onSendSignedTxBack={handleSendSignedBackFromSigner}
            compactView={true}
          />
        </div>
      </div>
    </div>
  );
};
