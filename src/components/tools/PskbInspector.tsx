import React, { useState } from 'react';
import { Shield, CheckCircle2, AlertTriangle, FileCode, Copy, Check, Search, Code, ArrowRight } from 'lucide-react';
import { UnsignedKaspaTx, SignedKaspaTx } from '../../types/kaspa';
import { sompiToKas, sompiToKasRaw, calculateKaspaInputSighash, calculateTxId } from '../../crypto/kaspaTx';
import { decodeKaspaAddress, bytesToHex } from '../../crypto/kaspaKeys';

export const PskbInspector: React.FC = () => {
  const [inputPayload, setInputPayload] = useState<string>('');
  const [parsedTx, setParsedTx] = useState<UnsignedKaspaTx | SignedKaspaTx | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const sampleTx: UnsignedKaspaTx = {
    version: 0,
    inputs: [
      {
        previousOutpoint: {
          transactionId: '5f91e4a3c467a503a7a9726dc6a06141be1b4f4c2c56b7c53cb70cb27d81a911',
          index: 0,
        },
        sequence: '0',
        sigOpCount: 1,
        utxoAmount: '25000000000', // 250 KAS
        utxoScriptPublicKey: '20757a3e7a0e3a67d0a2f44101eb64e9a16f2c79a95781a5385208643806be44d9ac',
        address: 'kaspa:qqw0v78696j94j7h60s800q2x26w5g5s0j6v3t6385q0d603v78696j94j7h6',
      },
    ],
    outputs: [
      {
        amount: '10000000000', // 100 KAS
        scriptPublicKey: {
          version: 0,
          scriptPublicKey: '205566778899aabbccddeeff00112233445566778899aabbccddeeff00112233ac',
        },
        address: 'kaspa:qrv2a6d7q59scl33q5f7h8k8u305y7l5s2p8d447f5s80q3h6j2x7f9a2k4',
        isChange: false,
      },
      {
        amount: '14999980000', // 149.9998 KAS
        scriptPublicKey: {
          version: 0,
          scriptPublicKey: '20757a3e7a0e3a67d0a2f44101eb64e9a16f2c79a95781a5385208643806be44d9ac',
        },
        address: 'kaspa:qqw0v78696j94j7h60s800q2x26w5g5s0j6v3t6385q0d603v78696j94j7h6',
        isChange: true,
      },
    ],
    lockTime: '0',
    subnetworkId: '0000000000000000000000000000000000000000',
    gas: '0',
    payload: '',
    network: 'mainnet',
    feeSompi: '20000',
    totalInputSompi: '25000000000',
    totalOutputSompi: '24999980000',
    createdAt: Date.now(),
  };

  const handleInspect = (rawString: string) => {
    setInputPayload(rawString);
    setParseError(null);
    setParsedTx(null);

    if (!rawString.trim()) return;

    try {
      // Clean KS1 format if present
      let cleanJson = rawString.trim();
      if (cleanJson.startsWith('KS1|')) {
        const parts = cleanJson.split('|');
        cleanJson = parts.slice(5).join('|');
      }

      const tx = JSON.parse(cleanJson);
      if (!tx.inputs || !tx.outputs) {
        throw new Error('JSON is missing "inputs" or "outputs" arrays.');
      }
      setParsedTx(tx);
    } catch (err: any) {
      setParseError(err.message || 'Invalid JSON syntax');
    }
  };

  const handleCopy = () => {
    if (!parsedTx) return;
    navigator.clipboard.writeText(JSON.stringify(parsedTx, null, 2));
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div
      id="pskb-inspector-container"
      className="max-w-3xl mx-auto w-full bg-[#161920] border border-[#222630] rounded-3xl shadow-2xl overflow-hidden text-[#E2E8F0] flex flex-col"
    >
      {/* Header */}
      <div className="bg-[#12151B] px-6 py-4 border-b border-[#222630] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#F27D26] to-amber-700 flex items-center justify-center text-slate-950 font-black shadow-lg">
            🔍
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-mono text-sm font-bold text-white tracking-wide">PSKB / KSPT Inspector</h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#F27D26]/20 text-[#F27D26] font-bold">
                Kaspa Tx Debugger
              </span>
            </div>
            <p className="text-[11px] text-[#94A3B8]">Inspect Sighash, ScriptPublicKey, UTXO Outpoints, and Schnorr Signatures</p>
          </div>
        </div>

        <button
          onClick={() => handleInspect(JSON.stringify(sampleTx, null, 2))}
          className="px-3 py-1.5 bg-[#0F1115] hover:bg-[#222630] border border-[#222630] text-[#F27D26] rounded-xl text-xs font-mono font-semibold transition-colors"
        >
          Load Sample KSPT
        </button>
      </div>

      <div className="p-6 space-y-6 bg-[#0F1115]">
        {/* Input Area */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs font-mono text-[#E2E8F0]">
            <label className="font-bold flex items-center gap-1.5 text-[#F27D26]">
              <FileCode className="w-3.5 h-3.5" /> Paste Raw KSPT JSON or QR Payload:
            </label>
            {parsedTx && (
              <button onClick={handleCopy} className="text-[#F27D26] hover:underline flex items-center gap-1">
                {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                Copy Formatted JSON
              </button>
            )}
          </div>
          <textarea
            id="txt-pskb-raw-input"
            rows={4}
            value={inputPayload}
            onChange={e => handleInspect(e.target.value)}
            placeholder='{"version":0,"inputs":[{"previousOutpoint":{"transactionId":"...","index":0},"utxoAmount":"..."}],"outputs":[...]}'
            className="w-full bg-[#161920] border border-[#222630] focus:border-[#F27D26] rounded-xl p-3 text-xs font-mono text-[#E2E8F0] outline-none resize-none"
          />
          {parseError && (
            <div className="p-3 bg-red-950/40 border border-red-800/50 rounded-xl text-red-300 text-xs font-mono flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Parse error: {parseError}</span>
            </div>
          )}
        </div>

        {/* Parsed Breakdown */}
        {parsedTx && (
          <div className="space-y-4 font-mono text-xs">
            {/* Overview Card */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 bg-[#161920] border border-[#222630] rounded-xl space-y-0.5">
                <div className="text-[10px] text-[#94A3B8]">NETWORK</div>
                <div className="font-bold text-white uppercase">{parsedTx.network || 'MAINNET'}</div>
              </div>
              <div className="p-3 bg-[#161920] border border-[#222630] rounded-xl space-y-0.5">
                <div className="text-[10px] text-[#94A3B8]">TOTAL INPUT</div>
                <div className="font-bold text-[#F27D26]">
                  {sompiToKas(parsedTx.totalInputSompi || '0')} KAS
                </div>
              </div>
              <div className="p-3 bg-[#161920] border border-[#222630] rounded-xl space-y-0.5">
                <div className="text-[10px] text-[#94A3B8]">TOTAL OUTPUT</div>
                <div className="font-bold text-white">
                  {sompiToKas(parsedTx.totalOutputSompi || '0')} KAS
                </div>
              </div>
              <div className="p-3 bg-[#161920] border border-[#222630] rounded-xl space-y-0.5">
                <div className="text-[10px] text-[#94A3B8]">NETWORK FEE</div>
                <div className="font-bold text-amber-300">
                  {sompiToKas(parsedTx.feeSompi || '0')} KAS
                </div>
              </div>
            </div>

            {/* Inputs Inspector */}
            <div className="p-4 bg-[#161920] border border-[#222630] rounded-2xl space-y-3">
              <div className="flex justify-between items-center text-xs font-bold text-[#E2E8F0]">
                <span>INPUTS ({parsedTx.inputs.length})</span>
                <span className="text-[10px] text-[#64748B]">UTXO Outpoints & Sighashes</span>
              </div>
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {parsedTx.inputs.map((inp, idx) => {
                  let sighashHex = 'N/A';
                  try {
                    sighashHex = bytesToHex(calculateKaspaInputSighash(parsedTx, idx));
                  } catch {}

                  return (
                    <div key={idx} className="p-3 bg-[#0F1115] border border-[#222630] rounded-xl space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-[#F27D26] font-bold">Input #{idx}</span>
                        <span className="text-white font-bold">{sompiToKas(inp.utxoAmount)} KAS</span>
                      </div>
                      <div className="text-[10px] text-[#94A3B8] break-all">
                        Outpoint: {inp.previousOutpoint.transactionId}:{inp.previousOutpoint.index}
                      </div>
                      <div className="text-[10px] text-[#64748B] break-all">
                        Sighash: {sighashHex}
                      </div>
                      {inp.address && (
                        <div className="text-[10px] text-emerald-400 break-all">
                          Address: {inp.address}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Outputs Inspector */}
            <div className="p-4 bg-[#161920] border border-[#222630] rounded-2xl space-y-3">
              <div className="flex justify-between items-center text-xs font-bold text-[#E2E8F0]">
                <span>OUTPUTS ({parsedTx.outputs.length})</span>
                <span className="text-[10px] text-[#64748B]">Recipients & Change Destinations</span>
              </div>
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {parsedTx.outputs.map((out, idx) => (
                  <div key={idx} className="p-3 bg-[#0F1115] border border-[#222630] rounded-xl space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#F27D26] font-bold">Output #{idx}</span>
                        {out.isChange && (
                          <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-bold">
                            CHANGE RETURN
                          </span>
                        )}
                      </div>
                      <span className="text-white font-bold">{sompiToKas(out.amount)} KAS</span>
                    </div>
                    <div className="text-[10px] text-[#E2E8F0] break-all">
                      {out.address}
                    </div>
                    <div className="text-[9px] text-[#64748B] break-all">
                      ScriptPublicKey: {out.scriptPublicKey?.scriptPublicKey}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Schnorr Signatures if Signed */}
            {(parsedTx as SignedKaspaTx).signatures && (
              <div className="p-4 bg-emerald-950/20 border border-emerald-800/40 rounded-2xl space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-emerald-400">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    SCHNORR SECP256K1 SIGNATURES ({(parsedTx as SignedKaspaTx).signatures.length})
                  </span>
                  <span className="text-[10px] text-[#94A3B8]">64-Byte Signatures Attached</span>
                </div>
                {(parsedTx as SignedKaspaTx).signatures.map((sig, i) => (
                  <div key={i} className="p-2 bg-[#0F1115] rounded-lg text-[10px] space-y-0.5 border border-[#222630]">
                    <div className="text-[#94A3B8]">Input #{sig.inputIndex} Pubkey: {sig.publicKey}</div>
                    <div className="text-emerald-300 break-all">Sig: {sig.signature}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
