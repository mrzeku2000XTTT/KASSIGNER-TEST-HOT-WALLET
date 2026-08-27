import React, { useState } from 'react';
import {
  Shield,
  Eye,
  Key,
  Radio,
  Cpu,
  Layers,
  Sparkles,
  ExternalLink,
  Github,
  Search,
  BookOpen,
  Lock,
  Zap,
  Flame,
  CheckCircle2,
  FileCode
} from 'lucide-react';
import { DualAirGapStudio } from './components/studio/DualAirGapStudio';
import { KasSignerDevice } from './components/signer/KasSignerDevice';
import { KasSeeWallet } from './components/wallet/KasSeeWallet';
import { StegoVault } from './components/stego/StegoVault';
import { PskbInspector } from './components/tools/PskbInspector';
import { InteractiveTutorial } from './components/tutorial/InteractiveTutorial';

type ActiveView = 'tutorial' | 'studio' | 'kassigner' | 'kassee' | 'stego' | 'pskb' | 'docs';

export default function App() {
  const [currentView, setCurrentView] = useState<ActiveView>('studio');
  const [studioInitialStep, setStudioInitialStep] = useState<number>(1);

  const handleNavigateToStudio = (step: number = 1) => {
    setStudioInitialStep(step);
    setCurrentView('studio');
  };

  return (
    <div className="min-h-screen bg-[#0F1115] text-[#E2E8F0] flex flex-col selection:bg-[#F27D26]/30 selection:text-[#F27D26] font-sans">
      {/* Top Main Navigation Bar */}
      <header className="sticky top-0 z-40 bg-[#12151B]/95 backdrop-blur-md border-b border-[#1A1D23] px-4 lg:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#F27D26] via-[#E06A14] to-amber-900 flex items-center justify-center text-slate-950 font-black text-lg shadow-[0_0_20px_rgba(242,125,38,0.25)]">
              ₭
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-mono text-base font-black tracking-tight text-white">
                  KasSigner <span className="text-[#F27D26] font-light">&</span> KasSee
                </h1>
                <span className="text-[10px] font-mono font-bold bg-[#F27D26]/15 text-[#F27D26] px-2 py-0.5 rounded-full border border-[#F27D26]/30">
                  v1.0.8
                </span>
              </div>
              <p className="text-xs text-[#94A3B8] font-mono">
                Stateless Air-Gapped Signer & Watch-Only Suite for Kaspa
              </p>
            </div>
          </div>

          {/* Main View Switcher Tabs */}
          <nav className="flex items-center gap-1 bg-[#161920] p-1 rounded-2xl border border-[#222630] overflow-x-auto max-w-full text-xs font-mono">
            {[
              { id: 'tutorial', label: 'Tutorial & Guide', icon: Sparkles },
              { id: 'studio', label: 'Air-Gap Studio', icon: Zap },
              { id: 'kassigner', label: 'KasSigner (Hardware)', icon: Cpu },
              { id: 'kassee', label: 'KasSee (Companion)', icon: Eye },
              { id: 'stego', label: 'Stego Vault', icon: Shield },
              { id: 'pskb', label: 'PSKB Inspector', icon: Search },
              { id: 'docs', label: 'Architecture', icon: BookOpen },
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  id={`nav-tab-${tab.id}`}
                  onClick={() => setCurrentView(tab.id as ActiveView)}
                  className={`px-3 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                    currentView === tab.id
                      ? 'bg-[#F27D26] text-slate-950 font-bold shadow-md shadow-[#F27D26]/20'
                      : 'text-[#94A3B8] hover:text-white hover:bg-[#222630]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* GitHub / Repo Link */}
          <div className="hidden lg:flex items-center gap-2">
            <a
              id="lnk-github-repo"
              href="https://github.com/InKasWeRust/KasSigner"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#161920] hover:bg-[#222630] text-[#E2E8F0] hover:text-white text-xs font-mono border border-[#222630] transition-colors"
            >
              <Github className="w-3.5 h-3.5 text-[#F27D26]" />
              InKasWeRust/KasSigner
              <ExternalLink className="w-3 h-3 text-[#64748B]" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col">
        {currentView === 'tutorial' && (
          <InteractiveTutorial onNavigateToStudio={handleNavigateToStudio} />
        )}

        {currentView === 'studio' && (
          <DualAirGapStudio
            initialStep={studioInitialStep}
            onOpenTutorial={() => setCurrentView('tutorial')}
          />
        )}

        {currentView === 'kassigner' && (
          <div className="w-full flex-1 flex flex-col items-center justify-center">
            <KasSignerDevice />
          </div>
        )}

        {currentView === 'kassee' && (
          <div className="w-full flex-1 flex flex-col items-center justify-center">
            <KasSeeWallet />
          </div>
        )}

        {currentView === 'stego' && <StegoVault />}

        {currentView === 'pskb' && <PskbInspector />}

        {/* ARCHITECTURE & SPECS VIEW */}
        {currentView === 'docs' && (
          <div className="max-w-4xl mx-auto w-full bg-[#161920] border border-[#222630] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="space-y-2 border-b border-[#222630] pb-4">
              <h2 className="text-xl font-bold font-mono text-[#F27D26] flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                KasSigner & KasSee Technical Architecture
              </h2>
              <p className="text-xs text-[#94A3B8] font-mono">
                An open-source, stateless, 100% Rust-inspired air-gapped signing environment for Kaspa.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Feature 1 */}
              <div className="p-4 bg-[#12151B] border border-[#222630] rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-sm font-bold text-white font-mono">
                  <Flame className="w-4 h-4 text-amber-400" />
                  Stateless Volatile RAM Storage
                </div>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  Unlike traditional hardware wallets with non-volatile flash or secure elements, KasSigner stores all private key material exclusively in volatile RAM. Powering off or pressing "Wipe RAM" instantly purges master secrets.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="p-4 bg-[#12151B] border border-[#222630] rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-sm font-bold text-white font-mono">
                  <Radio className="w-4 h-4 text-[#F27D26]" />
                  Animated QR & KS1 Multi-frame Protocol
                </div>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  Transactions and extended public keys are chunked into high-density animated QR codes with error-checking checksums (<code className="text-[#F27D26]">KS1|type|part|total|checksum|payload</code>), transferring data between devices in sub-second bursts.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="p-4 bg-[#12151B] border border-[#222630] rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-sm font-bold text-white font-mono">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  Signer Boundary Verification
                </div>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  Before signing, KasSigner independently recalculates sighashes, verifies all input amounts, checks recipient addresses, and strictly confirms that change outputs belong to internal HD derivations (<code className="text-[#F27D26]">m/44'/111111'/0'/1/*</code>).
                </p>
              </div>

              {/* Feature 4 */}
              <div className="p-4 bg-[#12151B] border border-[#222630] rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-sm font-bold text-white font-mono">
                  <Lock className="w-4 h-4 text-orange-400" />
                  Steganographic Seed Vault
                </div>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  Built-in LSB (Least Significant Bit) steganography embeds encrypted BIP39 mnemonics into ordinary PNG image pixel channels with AES-256-GCM authentication, creating undetectable physical or digital backups.
                </p>
              </div>
            </div>

            {/* Cryptographic Specifications Table */}
            <div className="p-5 bg-[#12151B] border border-[#222630] rounded-2xl space-y-3 font-mono text-xs">
              <h3 className="font-bold text-[#F27D26] uppercase">Cryptographic Specifications</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[#94A3B8] text-[11px]">
                <div>• <strong className="text-white">Curve:</strong> Secp256k1 (Schnorr 64-byte signatures)</div>
                <div>• <strong className="text-white">Derivation Path:</strong> m/44'/111111'/0'/*</div>
                <div>• <strong className="text-white">Address Encoding:</strong> Kaspa Bech32 (40-bit polymod checksum)</div>
                <div>• <strong className="text-white">Smallest Unit:</strong> Sompi (1 KAS = 100,000,000 sompi)</div>
                <div>• <strong className="text-white">Stego Encryption:</strong> AES-256-GCM + PBKDF2 (100k rounds)</div>
                <div>• <strong className="text-white">Network Endpoints:</strong> Mainnet, Testnet-10, Testnet-11 (10 BPS)</div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Persistent Status Footer */}
      <footer className="bg-[#12151B] border-t border-[#1A1D23] px-4 lg:px-8 py-3 text-xs font-mono text-[#94A3B8]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Kaspa Network DAG Active
            </span>
            <span className="text-[#222630]">|</span>
            <span>BlockDAG Consensus: GHOSTDAG</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span className="text-[#F27D26]">InKasWeRust / KasSigner</span>
            <span>•</span>
            <span className="text-[#64748B]">Stateless Air-Gap Standard</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
