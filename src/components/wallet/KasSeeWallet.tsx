import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Wallet,
  Send,
  Download,
  Coins,
  History,
  Radio,
  ExternalLink,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Camera,
  RefreshCw,
  Copy,
  Check,
  ChevronRight,
  TrendingUp,
  Plus,
  ShieldCheck,
  Layers,
  Sparkles
} from 'lucide-react';
import {
  NetworkId,
  KaspaUtxo,
  UnsignedKaspaTx,
  SignedKaspaTx,
  KaspaKpub,
  DerivedAddress
} from '../../types/kaspa';
import {
  NETWORKS,
  fetchAddressBalance,
  fetchAddressUtxos,
  fetchNetworkStats,
  requestSandboxFaucet,
  broadcastSignedTransaction,
  getAddressHistory,
  KaspaNetworkStats
} from '../../services/kaspaApi';
import {
  importKpub,
  deriveAddressList,
  deriveKaspaKey,
  encodeKaspaAddress,
  decodeKaspaAddress,
  HDNode
} from '../../crypto/kaspaKeys';
import {
  kasToSompi,
  sompiToKas,
  sompiToKasRaw,
  estimateFee,
  buildKaspaTransaction
} from '../../crypto/kaspaTx';
import { QrDisplay } from '../common/QrDisplay';
import { QrScannerModal } from '../common/QrScannerModal';

interface KasSeeWalletProps {
  importedKpub?: KaspaKpub | null;
  onSendTxToSigner?: (tx: UnsignedKaspaTx) => void;
  incomingSignedTx?: SignedKaspaTx | null;
  compactView?: boolean;
}

export const KasSeeWallet: React.FC<KasSeeWalletProps> = ({
  importedKpub,
  onSendTxToSigner,
  incomingSignedTx,
  compactView = false,
}) => {
  const [network, setNetwork] = useState<NetworkId>('mainnet');
  const [activeTab, setActiveTab] = useState<'overview' | 'send' | 'receive' | 'utxos' | 'history' | 'broadcast'>('overview');

  // KPUB & Address Derivation State
  const [kpubInput, setKpubInput] = useState<string>('');
  const [accountNode, setAccountNode] = useState<HDNode | null>(null);
  const [currentKpub, setCurrentKpub] = useState<KaspaKpub | null>(null);
  const [receiveAddresses, setReceiveAddresses] = useState<DerivedAddress[]>([]);
  const [selectedAddressIndex, setSelectedAddressIndex] = useState<number>(0);

  // Balance & UTXO State
  const [balanceSompi, setBalanceSompi] = useState<string>('0');
  const [utxos, setUtxos] = useState<KaspaUtxo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [networkStats, setNetworkStats] = useState<KaspaNetworkStats>({
    bps: 1,
    daaScore: 79420100,
    hashrate: 420.5,
    kasPriceUsd: 0.152,
    blockReward: 31.25,
  });

  // Send Form State
  const [recipientInput, setRecipientInput] = useState<string>('');
  const [amountInput, setAmountInput] = useState<string>('');
  const [feeRate, setFeeRate] = useState<number>(1); // 1 = normal, 2 = priority, 0.5 = economy
  const [recipientError, setRecipientError] = useState<string | null>(null);
  const [builtUnsignedTx, setBuiltUnsignedTx] = useState<UnsignedKaspaTx | null>(null);

  // Broadcast & Scanner state
  const [signedTxToBroadcast, setSignedTxToBroadcast] = useState<SignedKaspaTx | null>(null);
  const [isBroadcasting, setIsBroadcasting] = useState<boolean>(false);
  const [broadcastResult, setBroadcastResult] = useState<{ success: boolean; txId: string; explorerUrl?: string } | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [scannerMode, setScannerMode] = useState<'kpub' | 'signed_tx'>('kpub');

  // Copy state
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Handle external imported KPUB
  useEffect(() => {
    if (importedKpub) {
      applyKpub(importedKpub.kpub, importedKpub.network || network);
    }
  }, [importedKpub]);

  // Handle incoming signed tx from loopback
  useEffect(() => {
    if (incomingSignedTx) {
      setSignedTxToBroadcast(incomingSignedTx);
      setActiveTab('broadcast');
    }
  }, [incomingSignedTx]);

  // Refresh network stats periodically
  useEffect(() => {
    loadNetworkStats();
    const interval = setInterval(loadNetworkStats, 30000);
    return () => clearInterval(interval);
  }, [network]);

  // Refresh balance whenever addresses or network change
  useEffect(() => {
    if (receiveAddresses.length > 0) {
      refreshWalletData();
    }
  }, [receiveAddresses, network]);

  const loadNetworkStats = async () => {
    const stats = await fetchNetworkStats(network);
    setNetworkStats(stats);
  };

  const applyKpub = (kpubString: string, net: NetworkId = network) => {
    try {
      const node = importKpub(kpubString, net);
      setAccountNode(node);
      setKpubInput(kpubString);

      const addrs = deriveAddressList(node, net, 10, false, 0);
      setReceiveAddresses(addrs);

      setCurrentKpub({
        kpub: kpubString,
        fingerprint: node.fingerprint.toString(16).padStart(8, '0'),
        depth: node.depth,
        childNumber: node.index,
        chainCode: '',
        publicKey: '',
        network: net,
      });
    } catch (err: any) {
      alert('Invalid KPUB format: ' + err.message);
    }
  };

  const refreshWalletData = async () => {
    if (receiveAddresses.length === 0) return;
    setIsLoading(true);

    try {
      const primaryAddr = receiveAddresses[selectedAddressIndex]?.address || receiveAddresses[0]?.address;
      const { balanceSompi: bal } = await fetchAddressBalance(primaryAddr, network);
      setBalanceSompi(bal);

      const utxoList = await fetchAddressUtxos(primaryAddr, network);
      setUtxos(utxoList);
    } catch (err) {
      console.warn('Error refreshing wallet balance:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestFaucet = () => {
    const primaryAddr = receiveAddresses[selectedAddressIndex]?.address || receiveAddresses[0]?.address;
    if (!primaryAddr) {
      alert('Please import a kpub or address first');
      return;
    }

    const newUtxos = requestSandboxFaucet(primaryAddr, 250);
    setUtxos(newUtxos);
    const total = newUtxos.reduce((acc, u) => acc + BigInt(u.utxoEntry.amount), 0n);
    setBalanceSompi(total.toString());
    confetti({ particleCount: 40, spread: 60, origin: { y: 0.8 } });
  };

  const handleRecipientChange = (val: string) => {
    setRecipientInput(val);
    if (!val.trim()) {
      setRecipientError(null);
      return;
    }
    const decoded = decodeKaspaAddress(val.trim());
    if (!decoded.valid) {
      setRecipientError(decoded.error || 'Invalid Kaspa address');
    } else {
      setRecipientError(null);
    }
  };

  const handleBuildTransaction = () => {
    if (!recipientInput || recipientError) {
      alert('Please enter a valid recipient Kaspa address');
      return;
    }

    const amtSompi = kasToSompi(amountInput);
    if (amtSompi <= 0n) {
      alert('Please enter a valid amount greater than 0');
      return;
    }

    if (utxos.length === 0) {
      alert('No UTXOs available to spend. Try requesting faucet coins or depositing KAS.');
      return;
    }

    try {
      // Coin Selection (Greedy / largest UTXOs)
      const sortedUtxos = [...utxos].sort((a, b) =>
        Number(BigInt(b.utxoEntry.amount) - BigInt(a.utxoEntry.amount))
      );

      const fee = estimateFee(sortedUtxos.length, 2, feeRate);
      const totalNeeded = amtSompi + fee;

      let accumulated = 0n;
      const selectedUtxos: KaspaUtxo[] = [];

      for (const u of sortedUtxos) {
        selectedUtxos.push(u);
        accumulated += BigInt(u.utxoEntry.amount);
        if (accumulated >= totalNeeded) break;
      }

      if (accumulated < totalNeeded) {
        alert(`Insufficient balance: Required ${sompiToKasRaw(totalNeeded)} KAS, but you have ${sompiToKasRaw(accumulated)} KAS`);
        return;
      }

      // Change address: derive change address at index 0
      let changeAddr = receiveAddresses[0]?.address;
      if (accountNode) {
        const changeKey = deriveKaspaKey(accountNode, 0, true);
        const prefix = NETWORKS[network].prefix;
        changeAddr = encodeKaspaAddress(prefix, 0, changeKey.xOnlyPublicKey);
      }

      const unsignedTx = buildKaspaTransaction({
        selectedUtxos,
        recipientAddress: recipientInput.trim(),
        amountSompi: amtSompi,
        feeSompi: fee,
        changeAddress: changeAddr || recipientInput.trim(),
        network,
      });

      setBuiltUnsignedTx(unsignedTx);

      if (onSendTxToSigner) {
        onSendTxToSigner(unsignedTx);
      }
    } catch (err: any) {
      alert('Build transaction error: ' + err.message);
    }
  };

  const handleBroadcast = async () => {
    if (!signedTxToBroadcast) return;
    setIsBroadcasting(true);
    setBroadcastResult(null);

    try {
      const result = await broadcastSignedTransaction(signedTxToBroadcast);
      setBroadcastResult(result);
      if (result.success) {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        refreshWalletData();
      }
    } catch (err: any) {
      alert('Broadcast failed: ' + err.message);
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const currentAddress = receiveAddresses[selectedAddressIndex]?.address || '';
  const kasBalanceNumber = Number(BigInt(balanceSompi)) / 100_000_000;
  const usdValue = (kasBalanceNumber * networkStats.kasPriceUsd).toFixed(2);

  return (
    <div
      id="kassee-wallet-container"
      className={`flex flex-col bg-[#161920] border border-[#222630] rounded-3xl shadow-2xl overflow-hidden text-[#E2E8F0] ${
        compactView ? 'w-full' : 'max-w-xl mx-auto w-full'
      }`}
    >
      {/* KasSee Top Bar */}
      <div className="bg-[#12151B] px-5 py-3.5 border-b border-[#222630] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#F27D26] to-amber-700 flex items-center justify-center text-slate-950 font-black shadow-lg">
            👁️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-mono text-sm font-bold text-white tracking-wide">KasSee</h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#F27D26]/20 text-[#F27D26] font-bold">
                WATCH-ONLY
              </span>
            </div>
            <p className="text-[11px] text-[#94A3B8]">Zero Private Keys • Air-Gap Companion</p>
          </div>
        </div>

        {/* Network Switcher */}
        <div className="flex items-center gap-2">
          <select
            id="sel-kassee-network"
            value={network}
            onChange={e => setNetwork(e.target.value as NetworkId)}
            className="bg-[#0F1115] border border-[#222630] text-[#E2E8F0] text-xs font-mono rounded-xl px-2.5 py-1.5 outline-none cursor-pointer focus:border-[#F27D26]"
          >
            <option value="mainnet">Mainnet</option>
            <option value="testnet-10">Testnet-10</option>
            <option value="testnet-11">Testnet-11 (10 BPS)</option>
            <option value="devnet">Devnet</option>
            <option value="simnet">Sandbox Faucet</option>
          </select>
        </div>
      </div>

      {/* Network Live Ticker */}
      <div className="bg-[#0F1115] px-5 py-2 border-b border-[#222630] flex items-center justify-between text-[11px] font-mono text-[#94A3B8]">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-[#F27D26]">
            <TrendingUp className="w-3 h-3" />
            ${networkStats.kasPriceUsd.toFixed(3)} USD
          </span>
          <span>BPS: {networkStats.bps}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>DAA: {networkStats.daaScore.toLocaleString()}</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-[#12151B] px-3 py-2 border-b border-[#222630] flex items-center gap-1 overflow-x-auto text-xs font-mono">
        {[
          { id: 'overview', label: 'Overview', icon: Wallet },
          { id: 'send', label: 'Send (KSPT)', icon: Send },
          { id: 'receive', label: 'Receive', icon: Download },
          { id: 'utxos', label: `UTXOs (${utxos.length})`, icon: Coins },
          { id: 'history', label: 'Activity', icon: History },
          { id: 'broadcast', label: 'Broadcast', icon: Radio },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              id={`tab-kassee-${tab.id}`}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'bg-[#F27D26] text-slate-950 font-bold shadow-sm shadow-[#F27D26]/20'
                  : 'text-[#94A3B8] hover:text-white hover:bg-[#222630]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Wallet Body */}
      <div className="p-5 flex-1 flex flex-col bg-[#0F1115] min-h-[380px]">
        {/* If no KPUB imported yet */}
        {receiveAddresses.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-[#161920] border border-[#222630] flex items-center justify-center text-3xl shadow-inner">
              🔑
            </div>
            <div className="space-y-1 max-w-sm">
              <h4 className="text-base font-bold text-white font-mono">Pair Watch-Only Wallet</h4>
              <p className="text-xs text-[#94A3B8]">
                Import your KasSigner extended public key (KPUB) via QR code or paste to track balances and build air-gapped transactions.
              </p>
            </div>

            <div className="flex flex-col w-full max-w-sm gap-2">
              <button
                id="btn-kassee-scan-kpub"
                onClick={() => {
                  setScannerMode('kpub');
                  setIsScannerOpen(true);
                }}
                className="w-full py-3 bg-[#F27D26] hover:bg-[#E06A14] text-slate-950 font-mono font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#F27D26]/20"
              >
                <Camera className="w-4 h-4" />
                Scan KPUB from KasSigner
              </button>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Or paste kpub:fp:pubkey:chaincode..."
                  value={kpubInput}
                  onChange={e => setKpubInput(e.target.value)}
                  className="flex-1 bg-[#161920] border border-[#222630] text-[#E2E8F0] text-xs font-mono rounded-xl px-3 py-2 outline-none focus:border-[#F27D26]"
                />
                <button
                  onClick={() => applyKpub(kpubInput)}
                  disabled={!kpubInput.trim()}
                  className="px-3 py-2 bg-[#12151B] hover:bg-[#222630] border border-[#222630] disabled:opacity-40 text-[#E2E8F0] text-xs font-mono rounded-xl"
                >
                  Import
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* TAB: OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-4">
                {/* Balance Card */}
                <div className="p-5 bg-[#161920] border border-[#222630] rounded-2xl space-y-3 relative overflow-hidden shadow-inner">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-mono text-[#94A3B8]">AVAILABLE BALANCE</span>
                    <button
                      id="btn-kassee-refresh"
                      onClick={refreshWalletData}
                      className="p-1.5 rounded-lg bg-[#12151B] hover:bg-[#222630] text-[#E2E8F0] border border-[#222630] transition-colors"
                      title="Refresh Balance"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#F27D26]' : ''}`} />
                    </button>
                  </div>

                  <div>
                    <div className="text-3xl font-mono font-black text-white flex items-baseline gap-2">
                      {sompiToKas(balanceSompi, 4)}
                      <span className="text-lg font-bold text-[#F27D26]">KAS</span>
                    </div>
                    <div className="text-xs font-mono text-[#94A3B8] mt-0.5">
                      ≈ ${usdValue} USD ({balanceSompi} sompi)
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#222630] flex items-center justify-between text-xs font-mono">
                    <span className="text-[#94A3B8]">{utxos.length} Spendable UTXOs</span>
                    <button
                      id="btn-kassee-faucet"
                      onClick={handleRequestFaucet}
                      className="px-2.5 py-1 bg-[#F27D26]/15 hover:bg-[#F27D26]/25 border border-[#F27D26]/30 text-[#F27D26] font-bold rounded-lg text-[11px] flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      +250 KAS Faucet
                    </button>
                  </div>
                </div>

                {/* Primary Address Box */}
                <div className="p-4 bg-[#161920] border border-[#222630] rounded-2xl space-y-2">
                  <div className="flex justify-between items-center text-xs font-mono text-[#94A3B8]">
                    <span>RECEIVE ADDRESS (INDEX #{selectedAddressIndex})</span>
                    <button
                      onClick={() => handleCopy(currentAddress)}
                      className="text-[#F27D26] hover:underline text-[11px] flex items-center gap-1"
                    >
                      {copiedText === currentAddress ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      Copy
                    </button>
                  </div>
                  <div className="font-mono text-xs text-[#E2E8F0] break-all bg-[#0F1115] p-2.5 rounded-xl border border-[#222630]">
                    {currentAddress}
                  </div>
                </div>

                {/* Quick Action Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    id="btn-kassee-quick-send"
                    onClick={() => setActiveTab('send')}
                    className="py-3 bg-[#F27D26] hover:bg-[#E06A14] text-slate-950 font-mono font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-[#F27D26]/20"
                  >
                    <Send className="w-4 h-4" />
                    Send KAS (Build KSPT)
                  </button>
                  <button
                    id="btn-kassee-quick-receive"
                    onClick={() => setActiveTab('receive')}
                    className="py-3 bg-[#12151B] hover:bg-[#222630] text-[#E2E8F0] font-mono font-bold rounded-xl text-xs flex items-center justify-center gap-2 border border-[#222630]"
                  >
                    <Download className="w-4 h-4 text-[#F27D26]" />
                    Receive QR
                  </button>
                </div>
              </div>
            )}

            {/* TAB: SEND / BUILD KSPT */}
            {activeTab === 'send' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-mono font-bold text-[#F27D26] uppercase">
                    Build Unsigned Kaspa Transaction (KSPT)
                  </h4>
                  <span className="text-[11px] font-mono text-[#94A3B8]">
                    Bal: {sompiToKas(balanceSompi)} KAS
                  </span>
                </div>

                {/* Recipient Address */}
                <div className="space-y-1">
                  <label className="text-xs font-mono text-[#E2E8F0]">Recipient Kaspa Address:</label>
                  <input
                    id="inp-kassee-recipient"
                    type="text"
                    placeholder="kaspa:qq... or kaspatest:qq..."
                    value={recipientInput}
                    onChange={e => handleRecipientChange(e.target.value)}
                    className={`w-full bg-[#161920] border rounded-xl p-2.5 text-xs font-mono text-[#E2E8F0] outline-none ${
                      recipientError ? 'border-red-500' : 'border-[#222630] focus:border-[#F27D26]'
                    }`}
                  />
                  {recipientError && (
                    <p className="text-[11px] font-mono text-red-400 flex items-center gap-1 mt-0.5">
                      <AlertCircle className="w-3 h-3" /> {recipientError}
                    </p>
                  )}
                </div>

                {/* Amount */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono text-[#E2E8F0]">
                    <label>Amount (KAS):</label>
                    <button
                      onClick={() => setAmountInput(sompiToKasRaw(balanceSompi > 100000n ? BigInt(balanceSompi) - 20000n : 0n))}
                      className="text-[#F27D26] hover:underline text-[10px]"
                    >
                      Max Available
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id="inp-kassee-amount"
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={amountInput}
                      onChange={e => setAmountInput(e.target.value)}
                      className="w-full bg-[#161920] border border-[#222630] focus:border-[#F27D26] rounded-xl p-2.5 text-xs font-mono text-[#E2E8F0] outline-none pr-16"
                    />
                    <span className="absolute right-3 top-2.5 text-xs font-mono font-bold text-[#F27D26]">
                      KAS
                    </span>
                  </div>
                </div>

                {/* Fee Rate Options */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-[#E2E8F0]">Priority Fee Rate:</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { rate: 0.5, label: 'Economy', sompi: '10,000' },
                      { rate: 1, label: 'Standard', sompi: '20,000' },
                      { rate: 2.5, label: 'Priority', sompi: '50,000' },
                    ].map(f => (
                      <button
                        key={f.rate}
                        onClick={() => setFeeRate(f.rate)}
                        className={`p-2 rounded-xl text-left border font-mono text-xs transition-colors ${
                          feeRate === f.rate
                            ? 'bg-[#F27D26]/15 border-[#F27D26] text-white'
                            : 'bg-[#161920] border-[#222630] text-[#94A3B8] hover:text-white'
                        }`}
                      >
                        <div className="font-bold text-[11px]">{f.label}</div>
                        <div className="text-[10px] text-[#64748B]">{f.sompi} sompi</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Build Button */}
                <button
                  id="btn-kassee-generate-kspt"
                  onClick={handleBuildTransaction}
                  disabled={!recipientInput || !amountInput || !!recipientError}
                  className="w-full py-3 bg-[#F27D26] hover:bg-[#E06A14] disabled:opacity-40 text-slate-950 font-mono font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#F27D26]/20"
                >
                  <QrCode className="w-4 h-4" />
                  Generate Unsigned QR (Send to KasSigner)
                </button>

                {/* Built QR Modal/Display */}
                {builtUnsignedTx && (
                  <div className="p-4 bg-[#161920] border border-[#222630] rounded-2xl flex flex-col items-center space-y-3 mt-4">
                    <div className="text-center">
                      <div className="text-xs font-mono font-bold text-[#F27D26]">
                        Ready for Air-Gapped KasSigner Scanning
                      </div>
                      <p className="text-[11px] text-[#94A3B8] font-mono">
                        Point your KasSigner camera at this animated QR code to review & sign.
                      </p>
                    </div>

                    <QrDisplay
                      data={JSON.stringify(builtUnsignedTx)}
                      type="KSPT"
                      title="Unsigned Kaspa Tx (KSPT)"
                      subtitle={`Inputs: ${builtUnsignedTx.inputs.length} • Outputs: ${builtUnsignedTx.outputs.length}`}
                    />
                  </div>
                )}
              </div>
            )}

            {/* TAB: RECEIVE */}
            {activeTab === 'receive' && (
              <div className="space-y-4 flex flex-col items-center">
                <div className="text-center">
                  <h4 className="text-xs font-mono font-bold text-[#F27D26] uppercase">
                    Receive Kaspa Payment
                  </h4>
                  <p className="text-[11px] text-[#94A3B8] font-mono">
                    Share this address or scan the QR code to receive KAS.
                  </p>
                </div>

                {/* Derivation Index Switcher */}
                <div className="w-full flex items-center justify-between text-xs font-mono bg-[#161920] p-2 rounded-xl border border-[#222630]">
                  <span className="text-[#94A3B8]">Derivation Index:</span>
                  <div className="flex gap-1">
                    {receiveAddresses.slice(0, 5).map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedAddressIndex(idx)}
                        className={`w-7 h-7 rounded-lg text-xs font-mono transition-colors ${
                          selectedAddressIndex === idx
                            ? 'bg-[#F27D26] text-slate-950 font-bold'
                            : 'bg-[#12151B] border border-[#222630] text-[#94A3B8] hover:text-white'
                        }`}
                      >
                        #{idx}
                      </button>
                    ))}
                  </div>
                </div>

                {/* QR Display */}
                <QrDisplay
                  data={currentAddress}
                  type="ADDRESS"
                  title="Kaspa Receive Address"
                  subtitle={`Index #${selectedAddressIndex}`}
                />

                <div className="w-full bg-[#161920] p-3 rounded-xl border border-[#222630] flex items-center justify-between gap-2">
                  <div className="font-mono text-xs text-[#E2E8F0] break-all select-all">
                    {currentAddress}
                  </div>
                  <button
                    onClick={() => handleCopy(currentAddress)}
                    className="p-2 rounded-lg bg-[#12151B] hover:bg-[#222630] border border-[#222630] text-[#E2E8F0] shrink-0"
                    title="Copy Address"
                  >
                    {copiedText === currentAddress ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* TAB: UTXOS */}
            {activeTab === 'utxos' && (
              <div className="space-y-3 font-mono">
                <div className="flex justify-between items-center text-xs text-[#94A3B8]">
                  <span>UNSPENT TRANSACTION OUTPUTS ({utxos.length})</span>
                  <button onClick={refreshWalletData} className="text-[#F27D26] hover:underline">
                    Refresh
                  </button>
                </div>

                {utxos.length === 0 ? (
                  <div className="p-8 text-center bg-[#161920] border border-[#222630] rounded-2xl space-y-2">
                    <p className="text-xs text-[#94A3B8]">No unspent outputs found for this address.</p>
                    <button
                      onClick={handleRequestFaucet}
                      className="px-3 py-1.5 bg-[#F27D26] hover:bg-[#E06A14] text-slate-950 font-bold rounded-xl text-xs"
                    >
                      Request 250 KAS Faucet
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                    {utxos.map((u, i) => (
                      <div
                        key={i}
                        className="p-3 bg-[#161920] border border-[#222630] rounded-xl flex items-center justify-between text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="text-sm font-bold text-white">
                            {sompiToKas(u.utxoEntry.amount)} <span className="text-[#F27D26]">KAS</span>
                          </div>
                          <div className="text-[10px] text-[#64748B] truncate max-w-[220px]">
                            Outpoint: {u.outpoint.transactionId.slice(0, 12)}...:{u.outpoint.index}
                          </div>
                        </div>
                        <div className="text-right text-[10px] text-[#94A3B8]">
                          <div>DAA: {u.utxoEntry.blockDaaScore}</div>
                          <span className="text-emerald-400 font-semibold">Spendable</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB: ACTIVITY HISTORY */}
            {activeTab === 'history' && (
              <div className="space-y-3 font-mono">
                <div className="flex justify-between items-center text-xs text-[#94A3B8]">
                  <span>RECENT TRANSACTIONS</span>
                  <button onClick={refreshWalletData} className="text-[#F27D26] hover:underline">
                    Refresh
                  </button>
                </div>

                {getAddressHistory(currentAddress).length === 0 ? (
                  <div className="p-8 text-center bg-[#161920] border border-[#222630] rounded-2xl">
                    <p className="text-xs text-[#94A3B8]">No recent transactions recorded on this node.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                    {getAddressHistory(currentAddress).map((tx, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-[#161920] border border-[#222630] rounded-xl flex items-center justify-between text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="font-bold text-white">
                            {sompiToKas(tx.amountSompi)} <span className="text-[#F27D26]">KAS</span>
                          </div>
                          <div className="text-[10px] text-[#64748B] truncate max-w-[200px]">
                            Tx: {tx.txId.slice(0, 16)}...
                          </div>
                        </div>
                        <div className="text-right text-[10px]">
                          <span className="text-emerald-400 font-bold uppercase">{tx.status}</span>
                          <div className="text-[#64748B]">
                            {new Date(tx.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB: BROADCAST */}
            {activeTab === 'broadcast' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-mono font-bold text-[#F27D26] uppercase">
                    Broadcast Signed Kaspa Transaction
                  </h4>
                  <button
                    onClick={() => {
                      setScannerMode('signed_tx');
                      setIsScannerOpen(true);
                    }}
                    className="px-2.5 py-1 bg-[#12151B] hover:bg-[#222630] border border-[#222630] text-[#F27D26] font-mono text-xs rounded-lg flex items-center gap-1"
                  >
                    <Camera className="w-3 h-3" />
                    Scan Signed QR
                  </button>
                </div>

                {signedTxToBroadcast ? (
                  <div className="p-4 bg-[#161920] border border-[#222630] rounded-2xl space-y-3 font-mono">
                    <div className="flex justify-between items-center pb-2 border-b border-[#222630]">
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        Schnorr Signatures Attached ({signedTxToBroadcast.signatures.length})
                      </span>
                      <span className="text-[10px] text-[#94A3B8]">{signedTxToBroadcast.network.toUpperCase()}</span>
                    </div>

                    <div className="space-y-1.5 text-xs text-[#E2E8F0]">
                      <div className="flex justify-between">
                        <span className="text-[#94A3B8]">Total Outputs:</span>
                        <span className="font-bold text-white">{sompiToKas(signedTxToBroadcast.totalOutputSompi)} KAS</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#94A3B8]">Network Fee:</span>
                        <span className="font-bold text-amber-300">{sompiToKas(signedTxToBroadcast.feeSompi)} KAS</span>
                      </div>
                      <div className="text-[11px] text-[#64748B] break-all bg-[#0F1115] p-2 rounded border border-[#222630]">
                        TxHash: {signedTxToBroadcast.txHash}
                      </div>
                    </div>

                    <button
                      id="btn-kassee-confirm-broadcast"
                      onClick={handleBroadcast}
                      disabled={isBroadcasting}
                      className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg"
                    >
                      {isBroadcasting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Broadcasting to Kaspa P2P Nodes...
                        </>
                      ) : (
                        <>
                          <Radio className="w-4 h-4" />
                          Broadcast Transaction to Network
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="p-8 text-center bg-[#161920] border border-[#222630] rounded-2xl space-y-3">
                    <p className="text-xs text-[#94A3B8] font-mono">
                      No signed transaction loaded. Scan the Signed QR code generated by KasSigner.
                    </p>
                    <button
                      onClick={() => {
                        setScannerMode('signed_tx');
                        setIsScannerOpen(true);
                      }}
                      className="px-4 py-2.5 bg-[#F27D26] hover:bg-[#E06A14] text-slate-950 font-mono font-bold rounded-xl text-xs flex items-center justify-center gap-2 mx-auto shadow-md shadow-[#F27D26]/20"
                    >
                      <Camera className="w-4 h-4" />
                      Scan Signed QR from KasSigner
                    </button>
                  </div>
                )}

                {/* Broadcast Success Banner */}
                {broadcastResult && (
                  <div className="p-4 bg-emerald-950/40 border border-emerald-700/50 rounded-2xl space-y-2 font-mono text-xs">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold">
                      <CheckCircle2 className="w-5 h-5" />
                      Transaction Broadcast Successfully!
                    </div>
                    <div className="text-[#E2E8F0] text-[11px] break-all">
                      Transaction ID: {broadcastResult.txId}
                    </div>
                    {broadcastResult.explorerUrl && (
                      <a
                        href={broadcastResult.explorerUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[#F27D26] hover:underline text-[11px] pt-1"
                      >
                        View in Kaspa Explorer <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* QR Scanner Modal */}
      <QrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={data => {
          if (scannerMode === 'kpub') {
            applyKpub(data);
          } else {
            try {
              const tx = JSON.parse(data);
              setSignedTxToBroadcast(tx);
              setActiveTab('broadcast');
            } catch (e) {
              alert('Could not parse signed transaction payload');
            }
          }
        }}
        title={scannerMode === 'kpub' ? 'Scan KasSigner KPUB' : 'Scan Signed Kaspa Transaction'}
        expectedType={scannerMode === 'kpub' ? 'KPUB string' : 'Signed KSPT JSON'}
      />
    </div>
  );
};
