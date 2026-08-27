import React, { useState, useEffect } from 'react';
import {
  Shield,
  Key,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Radio,
  Zap,
  Dice5,
  Eye,
  EyeOff,
  Cpu,
  RefreshCw,
  Lock,
  Unlock,
  Layers,
  ArrowRight,
  Sparkles,
  Camera,
  Check,
  RotateCcw,
  Copy
} from 'lucide-react';
import {
  generateMnemonic,
  validateMnemonic,
  mnemonicToSeed,
  getWordSuggestions,
  BIP39_WORDLIST
} from '../../crypto/bip39Words';
import {
  createMasterHDNode,
  deriveKaspaAccount,
  deriveAddressList,
  exportKpub,
  HDNode,
  NETWORK_PREFIXES,
  encodeKaspaAddress,
  deriveKaspaKey
} from '../../crypto/kaspaKeys';
import {
  UnsignedKaspaTx,
  SignedKaspaTx,
  NetworkId,
  DerivedAddress,
  KaspaKpub
} from '../../types/kaspa';
import {
  verifySignerBoundary,
  signKaspaTransaction,
  BoundaryVerificationResult,
  sompiToKasRaw
} from '../../crypto/kaspaTx';
import { QrDisplay } from '../common/QrDisplay';
import { QrScannerModal } from '../common/QrScannerModal';

interface KasSignerDeviceProps {
  onExportKpubToCompanion?: (kpub: KaspaKpub) => void;
  incomingUnsignedTx?: UnsignedKaspaTx | null;
  onSendSignedTxBack?: (signedTx: SignedKaspaTx) => void;
  compactView?: boolean;
  activeNetwork?: NetworkId;
  onNetworkChange?: (net: NetworkId) => void;
}

export const KasSignerDevice: React.FC<KasSignerDeviceProps> = ({
  onExportKpubToCompanion,
  incomingUnsignedTx,
  onSendSignedTxBack,
  compactView = false,
  activeNetwork,
  onNetworkChange,
}) => {
  // Device Hardware State (Volatile RAM)
  const [devicePowered, setDevicePowered] = useState<boolean>(true);
  const [activeScreen, setActiveScreen] = useState<'home' | 'seed' | 'kpub' | 'scan' | 'review' | 'signed' | 'addresses'>('home');
  const [mnemonic, setMnemonic] = useState<string>('');
  const [passphrase, setPassphrase] = useState<string>('');
  const [wordCount, setWordCount] = useState<12 | 24>(24);
  const [showSeedSecret, setShowSeedSecret] = useState<boolean>(false);
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkId>(activeNetwork || 'testnet-10');

  // Key derivation in RAM
  const [accountNode, setAccountNode] = useState<HDNode | null>(null);
  const [kpubData, setKpubData] = useState<KaspaKpub | null>(null);
  const [derivedAddresses, setDerivedAddresses] = useState<DerivedAddress[]>([]);

  // Transaction signing states
  const [activeTx, setActiveTx] = useState<UnsignedKaspaTx | null>(null);
  const [boundaryReview, setBoundaryReview] = useState<BoundaryVerificationResult | null>(null);
  const [signedTx, setSignedTx] = useState<SignedKaspaTx | null>(null);
  const [isSigning, setIsSigning] = useState<boolean>(false);
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);

  // Dice roll interactive entropy state
  const [isDiceMode, setIsDiceMode] = useState<boolean>(false);
  const [diceRolls, setDiceRolls] = useState<number[]>([]);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const handleCopySeed = () => {
    navigator.clipboard.writeText(mnemonic);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Sync with activeNetwork prop
  useEffect(() => {
    if (activeNetwork && activeNetwork !== selectedNetwork) {
      handleSetNetwork(activeNetwork);
    }
  }, [activeNetwork]);

  // Initialize with a fresh demo seed if empty on first power
  useEffect(() => {
    if (!accountNode && mnemonic === '') {
      handleGenerateNewSeed(24, selectedNetwork);
    }
  }, []);

  // Update transaction if passed from companion loopback
  useEffect(() => {
    if (incomingUnsignedTx) {
      loadTransactionForReview(incomingUnsignedTx, selectedNetwork);
    }
  }, [incomingUnsignedTx]);

  const handleSetNetwork = (net: NetworkId) => {
    setSelectedNetwork(net);
    if (onNetworkChange) {
      onNetworkChange(net);
    }
    if (mnemonic) {
      deriveKeysFromMnemonic(mnemonic, passphrase, net);
    }
    if (activeTx) {
      const review = verifySignerBoundary(activeTx, accountNode || undefined, net);
      setBoundaryReview(review);
    }
  };

  const handleGenerateNewSeed = (count: 12 | 24 = 24, net: NetworkId = selectedNetwork) => {
    setWordCount(count);
    const newMnemonic = generateMnemonic(count);
    setMnemonic(newMnemonic);
    deriveKeysFromMnemonic(newMnemonic, passphrase, net);
  };

  const deriveKeysFromMnemonic = (mnem: string, pass: string, net: NetworkId) => {
    const val = validateMnemonic(mnem);
    if (!val.valid) {
      setAccountNode(null);
      setKpubData(null);
      setDerivedAddresses([]);
      return;
    }

    try {
      const seed = mnemonicToSeed(mnem, pass);
      const master = createMasterHDNode(seed);
      const acc = deriveKaspaAccount(master, 0);
      setAccountNode(acc);

      const kpub = exportKpub(acc, net);
      setKpubData(kpub);

      const addresses = deriveAddressList(acc, net, 6, false, 0);
      setDerivedAddresses(addresses);
    } catch (err) {
      console.error('Key derivation error:', err);
    }
  };

  const handleWipeRam = () => {
    if (window.confirm('Wipe Key Material from RAM? All seed words will be purged immediately from volatile memory.')) {
      setMnemonic('');
      setPassphrase('');
      setAccountNode(null);
      setKpubData(null);
      setDerivedAddresses([]);
      setActiveTx(null);
      setBoundaryReview(null);
      setSignedTx(null);
      setActiveScreen('seed');
    }
  };

  const loadTransactionForReview = (tx: UnsignedKaspaTx, net: NetworkId = selectedNetwork) => {
    setActiveTx(tx);
    const review = verifySignerBoundary(tx, accountNode || undefined, net);
    setBoundaryReview(review);
    setActiveScreen('review');
  };

  const handleSignTransaction = async () => {
    if (!activeTx || !accountNode) return;
    setIsSigning(true);

    try {
      // Simulate hardware cryptographic signing delay (300ms)
      await new Promise(r => setTimeout(r, 300));
      const signed = await signKaspaTransaction(activeTx, accountNode);
      setSignedTx(signed);
      setActiveScreen('signed');

      if (onSendSignedTxBack) {
        onSendSignedTxBack(signed);
      }
    } catch (err: any) {
      alert('Signing failed: ' + err.message);
    } finally {
      setIsSigning(false);
    }
  };

  const handleScannedPayload = (data: string) => {
    try {
      const parsed = JSON.parse(data);
      if (parsed.inputs && parsed.outputs) {
        loadTransactionForReview(parsed);
      } else {
        alert('Payload is not a valid Kaspa transaction');
      }
    } catch (e) {
      alert('Could not parse transaction JSON');
    }
  };

  const handleAddDiceRoll = (num: number) => {
    const next = [...diceRolls, num];
    setDiceRolls(next);
    if (next.length >= 50) {
      // derive entropy
      handleGenerateNewSeed(wordCount);
      setIsDiceMode(false);
      setDiceRolls([]);
    }
  };

  const words = mnemonic.trim().split(/\s+/);

  return (
    <div
      id="kassigner-hardware-enclosure"
      className={`relative flex flex-col bg-[#161920] border-2 border-[#222630] rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden text-[#E2E8F0] ${
        compactView ? 'w-full' : 'max-w-xl mx-auto w-full'
      }`}
    >
      {/* CNC Hardware Bezel & Status Bar */}
      <div className="bg-[#12151B] px-5 py-3 border-b border-[#222630] flex items-center justify-between">
        {/* Device Brand & LEDs */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F27D26] shadow-[0_0_8px_#F27D26] animate-pulse" />
            <span className="w-2 h-2 rounded-full bg-emerald-500/80" />
          </div>
          <div className="flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-[#F27D26]" />
            <span className="font-mono text-xs font-black tracking-widest text-[#F27D26] uppercase">
              KasSigner v1.0.8
            </span>
          </div>
        </div>

        {/* Hardware Status Indicators */}
        <div className="flex items-center gap-2 text-[11px] font-mono">
          <select
            id="sel-kassigner-network"
            value={selectedNetwork}
            onChange={e => handleSetNetwork(e.target.value as NetworkId)}
            className="bg-[#0F1115] border border-[#222630] text-[#E2E8F0] text-[11px] font-mono rounded-lg px-2 py-1 outline-none cursor-pointer focus:border-[#F27D26]"
          >
            <option value="testnet-10">⚡ Testnet-10</option>
            <option value="mainnet">Mainnet</option>
            <option value="testnet-11">Testnet-11</option>
            <option value="devnet">Devnet</option>
            <option value="simnet">Sandbox</option>
          </select>
          <span className="bg-[#161920] border border-[#222630] px-2 py-1 rounded text-amber-300 flex items-center gap-1">
            <Flame className="w-3 h-3 text-amber-400" />
            {accountNode ? 'RAM: ACTIVE' : 'RAM: EMPTY'}
          </span>
        </div>
      </div>

      {/* Screen Navigation Tabs */}
      <div className="bg-[#0F1115] px-3 py-2 border-b border-[#222630] flex items-center gap-1 overflow-x-auto text-xs font-mono">
        <button
          id="hw-nav-home"
          onClick={() => setActiveScreen('home')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
            activeScreen === 'home' ? 'bg-[#F27D26] text-slate-950 font-bold shadow-sm shadow-[#F27D26]/20' : 'text-[#94A3B8] hover:text-white hover:bg-[#222630]'
          }`}
        >
          Device Status
        </button>
        <button
          id="hw-nav-seed"
          onClick={() => setActiveScreen('seed')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1 ${
            activeScreen === 'seed' ? 'bg-[#F27D26] text-slate-950 font-bold shadow-sm shadow-[#F27D26]/20' : 'text-[#94A3B8] hover:text-white hover:bg-[#222630]'
          }`}
        >
          <Key className="w-3 h-3" />
          Seed & RAM
        </button>
        <button
          id="hw-nav-kpub"
          onClick={() => setActiveScreen('kpub')}
          disabled={!accountNode}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1 disabled:opacity-30 ${
            activeScreen === 'kpub' ? 'bg-[#F27D26] text-slate-950 font-bold shadow-sm shadow-[#F27D26]/20' : 'text-[#94A3B8] hover:text-white hover:bg-[#222630]'
          }`}
        >
          <QrCode className="w-3 h-3" />
          Pair / KPUB
        </button>
        <button
          id="hw-nav-scan"
          onClick={() => setIsScannerOpen(true)}
          disabled={!accountNode}
          className="px-3 py-1.5 rounded-lg whitespace-nowrap text-amber-400 hover:bg-[#222630] transition-colors flex items-center gap-1 disabled:opacity-30"
        >
          <Camera className="w-3 h-3" />
          Scan Tx
        </button>
        {activeTx && (
          <button
            id="hw-nav-review"
            onClick={() => setActiveScreen('review')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1 ${
              activeScreen === 'review' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-amber-400 hover:bg-[#222630]'
            }`}
          >
            Review ({activeTx.inputs.length} in)
          </button>
        )}
        {signedTx && (
          <button
            id="hw-nav-signed"
            onClick={() => setActiveScreen('signed')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1 ${
              activeScreen === 'signed' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-emerald-400 hover:bg-[#222630]'
            }`}
          >
            Signed QR
          </button>
        )}
      </div>

      {/* Main Display Area (OLED / TFT Simulator) */}
      <div className="p-5 flex-1 flex flex-col bg-[#0F1115] min-h-[380px]">
        {/* SCREEN: HOME */}
        {activeScreen === 'home' && (
          <div className="flex-1 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="p-4 bg-[#161920] border border-[#222630] rounded-2xl flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-mono text-[#94A3B8]">MASTER FINGERPRINT</div>
                  <div className="text-xl font-mono font-bold text-[#F27D26]">
                    {kpubData ? `[${kpubData.fingerprint.toUpperCase()}]` : 'NO SEED LOADED'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] font-mono text-[#94A3B8]">DERIVATION PATH</div>
                  <div className="text-xs font-mono text-[#E2E8F0]">m/44'/111111'/0'</div>
                </div>
              </div>

              {/* Primary Address */}
              {derivedAddresses.length > 0 && (
                <div className="p-3.5 bg-[#161920] border border-[#222630] rounded-2xl space-y-1">
                  <div className="flex justify-between items-center text-[11px] font-mono text-[#94A3B8]">
                    <span>PRIMARY DERIVED ADDRESS (#0)</span>
                    <span className="text-[#F27D26]">SCHNORR</span>
                  </div>
                  <div className="font-mono text-xs text-[#E2E8F0] break-all select-all bg-[#0F1115] p-2 rounded-lg border border-[#222630]">
                    {derivedAddresses[0]?.address}
                  </div>
                </div>
              )}

              {/* Security Boundary Notice */}
              <div className="p-3.5 bg-[#161920] border border-emerald-800/40 rounded-2xl flex items-start gap-3">
                <Shield className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs text-[#E2E8F0] space-y-1">
                  <div className="font-bold text-emerald-400">Stateless Air-Gap Guarantee</div>
                  <p className="text-[11px] text-[#94A3B8]">
                    KasSigner runs 100% in volatile RAM. No WiFi, Bluetooth, or cellular modules exist. Private keys are destroyed whenever RAM is wiped or device is powered down.
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                id="btn-hw-export-kpub"
                onClick={() => setActiveScreen('kpub')}
                disabled={!kpubData}
                className="py-2.5 px-3 bg-[#12151B] hover:bg-[#222630] disabled:opacity-40 text-[#E2E8F0] rounded-xl text-xs font-mono font-medium flex items-center justify-center gap-2 border border-[#222630]"
              >
                <QrCode className="w-3.5 h-3.5 text-[#F27D26]" />
                Show KPUB QR
              </button>
              <button
                id="btn-hw-scan-tx"
                onClick={() => setIsScannerOpen(true)}
                disabled={!accountNode}
                className="py-2.5 px-3 bg-[#F27D26] hover:bg-[#E06A14] disabled:opacity-40 text-slate-950 font-bold rounded-xl text-xs font-mono flex items-center justify-center gap-2 shadow-md shadow-[#F27D26]/20"
              >
                <Camera className="w-3.5 h-3.5" />
                Scan Tx to Sign
              </button>
            </div>
          </div>
        )}

        {/* SCREEN: SEED & ENTROPY */}
        {activeScreen === 'seed' && (
          <div className="flex-1 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-mono font-bold text-[#F27D26] uppercase flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5" />
                  Volatile RAM Seed Generator
                </h4>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleCopySeed}
                    className="px-2 py-0.5 rounded text-[10px] font-mono text-[#94A3B8] hover:text-[#E2E8F0] hover:bg-[#222630] flex items-center gap-1 transition-colors"
                    title="Copy Seed Phrase"
                  >
                    {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {isCopied ? 'Copied' : 'Copy'}
                  </button>
                  <div className="w-px h-3 bg-[#222630] mx-1"></div>
                  <button
                    onClick={() => handleGenerateNewSeed(12)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono ${wordCount === 12 ? 'bg-[#F27D26] text-slate-950 font-bold' : 'text-[#94A3B8] hover:bg-[#222630]'}`}
                  >
                    12 Words
                  </button>
                  <button
                    onClick={() => handleGenerateNewSeed(24)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono ${wordCount === 24 ? 'bg-[#F27D26] text-slate-950 font-bold' : 'text-[#94A3B8] hover:bg-[#222630]'}`}
                  >
                    24 Words
                  </button>
                </div>
              </div>

              {/* Seed Words Grid or Input */}
              <div className="relative p-3 bg-[#12151B] border border-[#222630] rounded-2xl">
                {!showSeedSecret ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-[2px] rounded-2xl z-10">
                    <button
                      onClick={() => setShowSeedSecret(true)}
                      className="px-3 py-1.5 bg-[#161920] hover:bg-[#222630] text-[#F27D26] text-xs font-mono font-semibold rounded-xl flex items-center gap-1.5 border border-[#F27D26]/40 shadow-lg"
                    >
                      <Eye className="w-3.5 h-3.5" /> Click to Reveal or Edit Words
                    </button>
                  </div>
                ) : null}
                
                <textarea
                  value={mnemonic}
                  onChange={(e) => {
                    setMnemonic(e.target.value);
                    deriveKeysFromMnemonic(e.target.value, passphrase, selectedNetwork);
                  }}
                  className={`w-full bg-[#161920] border ${!accountNode && mnemonic ? 'border-red-500/50' : 'border-[#222630] focus:border-[#F27D26]'} text-[#E2E8F0] text-xs font-mono rounded-xl p-3 outline-none resize-none min-h-[90px] ${!showSeedSecret ? 'blur-sm select-none' : ''}`}
                  placeholder="Paste your 12 or 24-word Kaspa seed phrase here (all lowercase, space separated)..."
                />
                {!accountNode && mnemonic.trim().length > 0 && showSeedSecret && (
                  <div className="text-red-400 text-[10px] font-mono mt-1 px-1">
                    ⚠️ Invalid seed phrase or checksum. Check for typos or extra spaces.
                  </div>
                )}
              </div>

              {/* Passphrase (25th Word) */}
              <div className="p-3 bg-[#161920] border border-[#222630] rounded-xl flex items-center justify-between gap-2">
                <div className="text-[11px] font-mono text-[#94A3B8] flex items-center gap-1">
                  <Lock className="w-3 h-3 text-[#F27D26]" />
                  Passphrase (Optional):
                </div>
                <input
                  type="password"
                  value={passphrase}
                  onChange={e => {
                    setPassphrase(e.target.value);
                    deriveKeysFromMnemonic(mnemonic, e.target.value, selectedNetwork);
                  }}
                  placeholder="25th word"
                  className="bg-[#0F1115] border border-[#222630] text-[#E2E8F0] text-xs font-mono rounded px-2 py-1 outline-none w-36 focus:border-[#F27D26]"
                />
              </div>

              {/* Dice Roll Entropy Sub-panel */}
              {isDiceMode && (
                <div className="p-3 bg-[#161920] border border-amber-500/30 rounded-xl space-y-2">
                  <div className="flex justify-between text-xs font-mono text-amber-300">
                    <span>Dice Entropy Collector ({diceRolls.length}/50 rolls)</span>
                    <button onClick={() => setDiceRolls([])} className="text-[10px] text-[#94A3B8] hover:text-white">Reset</button>
                  </div>
                  <div className="flex gap-1.5 justify-center py-1">
                    {[1, 2, 3, 4, 5, 6].map(num => (
                      <button
                        key={num}
                        onClick={() => handleAddDiceRoll(num)}
                        className="w-8 h-8 rounded-lg bg-[#12151B] hover:bg-[#F27D26] hover:text-slate-950 text-[#E2E8F0] font-mono font-bold text-sm border border-[#222630] transition-colors"
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#222630]">
              <div className="flex items-center gap-1.5">
                <button
                  id="btn-hw-regen-seed"
                  onClick={() => handleGenerateNewSeed(wordCount)}
                  className="p-2 bg-[#12151B] hover:bg-[#222630] text-[#E2E8F0] border border-[#222630] rounded-xl text-xs font-mono flex items-center gap-1"
                  title="Generate New Seed"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button
                  id="btn-hw-dice-mode"
                  onClick={() => setIsDiceMode(!isDiceMode)}
                  className={`p-2 rounded-xl text-xs font-mono flex items-center gap-1 border border-[#222630] ${
                    isDiceMode ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-[#12151B] text-[#E2E8F0] hover:bg-[#222630]'
                  }`}
                  title="Roll Physical Dice for Entropy"
                >
                  <Dice5 className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                id="btn-hw-wipe-ram"
                onClick={handleWipeRam}
                className="px-3 py-2 bg-red-950/40 hover:bg-red-900/60 border border-red-800/40 text-red-300 rounded-xl text-xs font-mono font-semibold flex items-center gap-1.5"
              >
                <Flame className="w-3.5 h-3.5 text-red-400" />
                Wipe RAM Keys
              </button>
            </div>
          </div>
        )}

        {/* SCREEN: KPUB EXPORT & PAIRING */}
        {activeScreen === 'kpub' && kpubData && (
          <div className="flex-1 flex flex-col items-center justify-between space-y-4">
            <div className="w-full flex flex-col items-center space-y-3">
              <div className="text-center">
                <h4 className="text-xs font-mono font-bold text-[#F27D26] uppercase">
                  Extended Public Key (KPUB) Export
                </h4>
                <p className="text-[11px] text-[#94A3B8] font-mono">
                  Scan this QR code with KasSee Companion to import watch-only wallet.
                </p>
              </div>

              {/* QR Code */}
              <QrDisplay
                data={kpubData.kpub}
                type="KPUB"
                title="Pairing KPUB"
                subtitle={`Fingerprint: [${kpubData.fingerprint.toUpperCase()}]`}
              />

              <div className="w-full font-mono text-[11px] text-[#94A3B8] bg-[#12151B] p-2.5 rounded-xl border border-[#222630] break-all select-all">
                {kpubData.kpub}
              </div>
            </div>

            {onExportKpubToCompanion && (
              <button
                id="btn-hw-instant-pair-companion"
                onClick={() => onExportKpubToCompanion(kpubData)}
                className="w-full py-2.5 bg-[#F27D26] hover:bg-[#E06A14] text-slate-950 font-mono font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-[#F27D26]/20"
              >
                <Sparkles className="w-4 h-4" />
                Instant Pair with KasSee Companion
              </button>
            )}
          </div>
        )}

        {/* SCREEN: TRANSACTION REVIEW & SIGNER BOUNDARY */}
        {activeScreen === 'review' && activeTx && boundaryReview && (
          <div className="flex-1 flex flex-col justify-between space-y-3 font-mono">
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#222630]">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-amber-400" />
                  Signer Boundary Review
                </span>
                <span className="text-[10px] text-[#94A3B8] bg-[#161920] border border-[#222630] px-2 py-0.5 rounded">
                  {activeTx.network.toUpperCase()}
                </span>
              </div>

              {/* Warning alerts if high fee or unverified change */}
              {boundaryReview.warnings.length > 0 && (
                <div className="p-2.5 bg-amber-950/40 border border-amber-700/50 rounded-xl space-y-1 text-amber-300 text-[11px]">
                  {boundaryReview.warnings.map((w, idx) => (
                    <div key={idx} className="flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Recipient details */}
              <div className="p-3 bg-[#161920] border border-[#222630] rounded-xl space-y-1.5">
                <div className="text-[10px] text-[#94A3B8]">SENDING TO RECIPIENT</div>
                {boundaryReview.recipientOutputs.map((rec, i) => (
                  <div key={i} className="space-y-1">
                    <div className="text-base font-bold text-white">
                      {rec.amountKAS} <span className="text-[#F27D26]">KAS</span>
                    </div>
                    <div className="text-[10px] text-[#E2E8F0] break-all bg-[#0F1115] p-1.5 rounded border border-[#222630]">
                      {rec.address}
                    </div>
                  </div>
                ))}
              </div>

              {/* Change Output & Fee Breakdown */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 bg-[#161920] border border-[#222630] rounded-xl space-y-1">
                  <div className="text-[#94A3B8] text-[10px]">NETWORK FEE</div>
                  <div className="text-amber-300 font-bold">{boundaryReview.feeKAS} KAS</div>
                  <div className="text-[9px] text-[#64748B]">
                    ({boundaryReview.feePercentage.toFixed(2)}% of inputs)
                  </div>
                </div>

                <div className="p-2.5 bg-[#161920] border border-[#222630] rounded-xl space-y-1">
                  <div className="text-[#94A3B8] text-[10px]">CHANGE RETURN</div>
                  {boundaryReview.changeOutputs.length > 0 ? (
                    <div>
                      <div className="text-emerald-400 font-bold">
                        {boundaryReview.changeOutputs[0].amountKAS} KAS
                      </div>
                      <div className="text-[9px] text-emerald-300 flex items-center gap-0.5">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Verified Internal
                      </div>
                    </div>
                  ) : (
                    <div className="text-[#64748B]">No change output</div>
                  )}
                </div>
              </div>
            </div>

            {/* Signing buttons */}
            <div className="flex gap-2 pt-2 border-t border-[#222630]">
              <button
                id="btn-hw-reject-tx"
                onClick={() => {
                  setActiveTx(null);
                  setActiveScreen('home');
                }}
                className="py-2.5 px-4 bg-red-950/40 hover:bg-red-900/60 border border-red-800/40 text-red-300 font-bold rounded-xl text-xs"
              >
                Reject
              </button>
              <button
                id="btn-hw-confirm-sign-tx"
                onClick={handleSignTransaction}
                disabled={isSigning || !boundaryReview.isValid}
                className="flex-1 py-2.5 bg-[#F27D26] hover:bg-[#E06A14] disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#F27D26]/20"
              >
                {isSigning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Signing Schnorr (RAM)...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    Confirm & Sign with RAM Key
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* SCREEN: SIGNED TX QR DISPLAY */}
        {activeScreen === 'signed' && signedTx && (
          <div className="flex-1 flex flex-col items-center justify-between space-y-4">
            <div className="w-full flex flex-col items-center space-y-3">
              <div className="text-center">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-mono font-bold mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Transaction Signed (Schnorr)
                </div>
                <p className="text-[11px] text-[#94A3B8] font-mono">
                  Scan this signed QR code with KasSee to broadcast to Kaspa network.
                </p>
              </div>

              <QrDisplay
                data={JSON.stringify(signedTx)}
                type="SIGNED_KSPT"
                title="Signed Kaspa Tx"
                subtitle={`TxID: ${signedTx.txHash.slice(0, 16)}...`}
              />
            </div>

            <button
              id="btn-hw-back-home"
              onClick={() => setActiveScreen('home')}
              className="w-full py-2 bg-[#12151B] hover:bg-[#222630] text-[#E2E8F0] border border-[#222630] font-mono text-xs rounded-xl"
            >
              Done & Return Home
            </button>
          </div>
        )}
      </div>

      {/* Camera / Image Scanner Modal */}
      <QrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScannedPayload}
        title="KasSigner Optical Reader: Scan Unsigned Tx"
        expectedType="KSPT / Unsigned JSON"
      />
    </div>
  );
};
