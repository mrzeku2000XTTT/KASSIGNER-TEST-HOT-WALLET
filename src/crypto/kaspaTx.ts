import * as secp256k1 from '@noble/secp256k1';
import { sha256 } from '@noble/hashes/sha2.js';
import {
  UnsignedKaspaTx,
  SignedKaspaTx,
  KaspaUtxo,
  KaspaInput,
  KaspaOutput,
  NetworkId,
  QrFramePacket,
} from '../types/kaspa';
import { decodeKaspaAddress, encodeKaspaAddress, bytesToHex, hexToBytes, HDNode, deriveKaspaKey } from './kaspaKeys';

export const SOMPI_PER_KAS = 100_000_000n; // 10^8

export function kasToSompi(kas: number | string): bigint {
  const str = typeof kas === 'number' ? kas.toFixed(8) : kas.trim();
  if (!str) return 0n;
  const parts = str.split('.');
  const whole = BigInt(parts[0] || '0') * SOMPI_PER_KAS;
  if (parts.length > 1) {
    const fractionStr = parts[1].padEnd(8, '0').slice(0, 8);
    const fraction = BigInt(fractionStr);
    return whole + fraction;
  }
  return whole;
}

export function sompiToKas(sompi: bigint | number | string, decimals = 4): string {
  const val = BigInt(sompi.toString());
  const whole = val / SOMPI_PER_KAS;
  const fraction = val % SOMPI_PER_KAS;
  const fractionStr = fraction.toString().padStart(8, '0');
  const full = `${whole}.${fractionStr}`;
  const num = parseFloat(full);
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: decimals });
}

export function sompiToKasRaw(sompi: bigint | number | string): string {
  const val = BigInt(sompi.toString());
  const whole = val / SOMPI_PER_KAS;
  const fraction = val % SOMPI_PER_KAS;
  const fractionStr = fraction.toString().padStart(8, '0').replace(/0+$/, '');
  return fractionStr ? `${whole}.${fractionStr}` : `${whole}`;
}

/**
 * Generate standard Kaspa ScriptPublicKey for P2PK (Pay to Public Key - Schnorr)
 * Format: 20 <32-byte-pubkey> ac (OP_DATA_32 <pubkey> OP_CHECKSIG)
 */
export function addressToScriptPublicKey(address: string): { version: number; scriptPublicKey: string } {
  const decoded = decodeKaspaAddress(address);
  if (!decoded.valid || !decoded.pubKeyHex) {
    throw new Error(decoded.error || 'Invalid Kaspa address for script generation');
  }

  // Version 0 standard Schnorr script
  // Opcode 0x20 (32 bytes) + 32 bytes pubkey hex + 0xac (OP_CHECKSIG)
  const script = `20${decoded.pubKeyHex}ac`;
  return {
    version: 0,
    scriptPublicKey: script,
  };
}

/**
 * Estimate mass and fee for a standard Kaspa transaction
 */
export function estimateFee(inputsCount: number, outputsCount: number, priorityMultiplier = 1): bigint {
  // Approximate mass: base 1000 + inputs * 600 + outputs * 300
  const mass = 1000 + inputsCount * 650 + outputsCount * 350;
  // Minimum fee rate is 1 sompi per gram
  const baseFee = BigInt(mass) * 10n; // 10,000 - 30,000 sompi
  return baseFee * BigInt(Math.max(1, priorityMultiplier));
}

/**
 * Build an Unsigned Kaspa Transaction (PSKB / KSPT)
 */
export function buildKaspaTransaction({
  selectedUtxos,
  recipientAddress,
  amountSompi,
  feeSompi,
  changeAddress,
  network = 'mainnet',
}: {
  selectedUtxos: KaspaUtxo[];
  recipientAddress: string;
  amountSompi: bigint;
  feeSompi: bigint;
  changeAddress: string;
  network?: NetworkId;
}): UnsignedKaspaTx {
  let totalInput = 0n;
  const inputs: KaspaInput[] = [];

  for (const utxo of selectedUtxos) {
    const amt = BigInt(utxo.utxoEntry.amount);
    totalInput += amt;
    inputs.push({
      previousOutpoint: {
        transactionId: utxo.outpoint.transactionId,
        index: utxo.outpoint.index,
      },
      sequence: '0',
      sigOpCount: 1,
      utxoAmount: amt.toString(),
      utxoScriptPublicKey: utxo.utxoEntry.scriptPublicKey.scriptPublicKey,
      address: utxo.address,
    });
  }

  const required = amountSompi + feeSompi;
  if (totalInput < required) {
    throw new Error(`Insufficient funds: Selected inputs total ${sompiToKasRaw(totalInput)} KAS, but transaction requires ${sompiToKasRaw(required)} KAS (including fee)`);
  }

  const outputs: KaspaOutput[] = [];

  // Main recipient output
  const recipientScript = addressToScriptPublicKey(recipientAddress);
  outputs.push({
    amount: amountSompi.toString(),
    scriptPublicKey: recipientScript,
    address: recipientAddress,
    isChange: false,
  });

  // Change output if remaining > dust limit (typically 10,000 sompi)
  const changeSompi = totalInput - required;
  if (changeSompi > 10000n) {
    const changeScript = addressToScriptPublicKey(changeAddress);
    outputs.push({
      amount: changeSompi.toString(),
      scriptPublicKey: changeScript,
      address: changeAddress,
      isChange: true,
    });
  }

  const totalOutput = outputs.reduce((acc, out) => acc + BigInt(out.amount), 0n);

  const tx: UnsignedKaspaTx = {
    version: 0,
    inputs,
    outputs,
    lockTime: '0',
    subnetworkId: '0000000000000000000000000000000000000000',
    gas: '0',
    payload: '',
    network,
    feeSompi: feeSompi.toString(),
    totalInputSompi: totalInput.toString(),
    totalOutputSompi: totalOutput.toString(),
    createdAt: Date.now(),
  };

  tx.txId = calculateTxId(tx);
  return tx;
}

/**
 * Calculate Kaspa Transaction ID / Hash
 */
export function calculateTxId(tx: UnsignedKaspaTx): string {
  const preimage = JSON.stringify({
    v: tx.version,
    in: tx.inputs.map(i => `${i.previousOutpoint.transactionId}:${i.previousOutpoint.index}:${i.utxoAmount}`),
    out: tx.outputs.map(o => `${o.address}:${o.amount}`),
    fee: tx.feeSompi,
    net: tx.network,
  });
  const hashBytes = sha256(new TextEncoder().encode(preimage));
  return bytesToHex(hashBytes);
}

/**
 * Calculate Sighash for a specific input index in Kaspa
 */
export function calculateKaspaInputSighash(tx: UnsignedKaspaTx, inputIndex: number): Uint8Array {
  const input = tx.inputs[inputIndex];
  if (!input) throw new Error(`Input index ${inputIndex} out of bounds`);

  const payload = [
    tx.version.toString(),
    input.previousOutpoint.transactionId,
    input.previousOutpoint.index.toString(),
    input.utxoAmount,
    input.utxoScriptPublicKey,
    JSON.stringify(tx.outputs),
    tx.lockTime,
    tx.subnetworkId,
  ].join('|');

  return sha256(new TextEncoder().encode(payload));
}

/**
 * Air-Gapped Signer Boundary Verification:
 * Validates the transaction proposal against the device's internal state
 */
export interface BoundaryVerificationResult {
  isValid: boolean;
  warnings: string[];
  errors: string[];
  totalInputKAS: string;
  totalOutputKAS: string;
  feeKAS: string;
  recipientOutputs: { address: string; amountKAS: string }[];
  changeOutputs: { address: string; amountKAS: string; isVerifiedChange: boolean }[];
  feePercentage: number;
}

export function verifySignerBoundary(
  tx: UnsignedKaspaTx,
  accountNode?: HDNode,
  signerNetwork?: NetworkId
): BoundaryVerificationResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  const totalIn = BigInt(tx.totalInputSompi || '0');
  const totalOut = BigInt(tx.totalOutputSompi || '0');
  const fee = BigInt(tx.feeSompi || '0');

  if (totalIn <= 0n) errors.push('Transaction has zero or negative total input value');
  if (totalOut <= 0n) errors.push('Transaction has zero or negative total output value');
  if (totalIn !== totalOut + fee) {
    errors.push(`Input and Output amounts do not balance! Total In: ${totalIn}, Out+Fee: ${totalOut + fee}`);
  }

  // Network compatibility check
  if (signerNetwork && signerNetwork !== tx.network) {
    warnings.push(
      `⚠️ Network Mismatch: Signer device is set to ${signerNetwork.toUpperCase()}, but transaction is targeted for ${tx.network.toUpperCase()}. Both devices must be on the same network (e.g. Testnet-10) to operate.`
    );
  }

  const feePct = totalIn > 0n ? (Number(fee) / Number(totalIn)) * 100 : 0;
  if (feePct > 5) {
    warnings.push(`High Transaction Fee Warning: Fee is ${feePct.toFixed(2)}% of total input value (${sompiToKasRaw(fee)} KAS)`);
  }

  // Verify change outputs against known account node derivation
  const knownChangeAddresses = new Set<string>();
  if (accountNode) {
    // Check first 50 change addresses for the tx's network prefix
    const isTestnet = tx.network !== 'mainnet';
    const prefix = isTestnet ? (tx.network === 'devnet' ? 'kaspadev' : 'kaspatest') : 'kaspa';
    for (let i = 0; i < 50; i++) {
      const derived = deriveKaspaKey(accountNode, i, true);
      const addr = encodeKaspaAddress(prefix, 0, derived.xOnlyPublicKey);
      knownChangeAddresses.add(addr.toLowerCase());
    }
  }

  const recipientOutputs: { address: string; amountKAS: string }[] = [];
  const changeOutputs: { address: string; amountKAS: string; isVerifiedChange: boolean }[] = [];

  for (const out of tx.outputs) {
    const isChange = out.isChange || knownChangeAddresses.has(out.address.toLowerCase());
    if (isChange) {
      const isVerified = knownChangeAddresses.has(out.address.toLowerCase());
      if (!isVerified && accountNode) {
        warnings.push(`Unverified Change Address: ${out.address} is not derived from this hardware signer!`);
      }
      changeOutputs.push({
        address: out.address,
        amountKAS: sompiToKasRaw(out.amount),
        isVerifiedChange: isVerified || !accountNode,
      });
    } else {
      recipientOutputs.push({
        address: out.address,
        amountKAS: sompiToKasRaw(out.amount),
      });
    }
  }

  return {
    isValid: errors.length === 0,
    warnings,
    errors,
    totalInputKAS: sompiToKasRaw(totalIn),
    totalOutputKAS: sompiToKasRaw(totalOut),
    feeKAS: sompiToKasRaw(fee),
    recipientOutputs,
    changeOutputs,
    feePercentage: feePct,
  };
}

/**
 * Sign Kaspa Transaction with Schnorr Signatures using RAM-stored key material
 */
export async function signKaspaTransaction(
  tx: UnsignedKaspaTx,
  accountNode: HDNode
): Promise<SignedKaspaTx> {
  const signatures: {
    inputIndex: number;
    signature: string;
    publicKey: string;
  }[] = [];

  // Build mapping of derived address private keys
  const addressKeyMap = new Map<string, { privKey: Uint8Array; pubKeyHex: string }>();
  const isTest = tx.network !== 'mainnet';
  const prefix = isTest ? (tx.network === 'devnet' ? 'kaspadev' : 'kaspatest') : 'kaspa';

  // Pre-derive receive and change keys (up to index 100)
  for (let isChange of [false, true]) {
    for (let i = 0; i < 100; i++) {
      const key = deriveKaspaKey(accountNode, i, isChange);
      if (key.privateKey) {
        const addr = encodeKaspaAddress(prefix, 0, key.xOnlyPublicKey);
        const pubHex = bytesToHex(key.xOnlyPublicKey);
        addressKeyMap.set(addr.toLowerCase(), {
          privKey: key.privateKey,
          pubKeyHex: pubHex,
        });
      }
    }
  }

  // Fallback master key derivation if input doesn't match
  const defaultKey = deriveKaspaKey(accountNode, 0, false);

  for (let idx = 0; idx < tx.inputs.length; idx++) {
    const input = tx.inputs[idx];
    const sighash = calculateKaspaInputSighash(tx, idx);

    let keyInfo = input.address ? addressKeyMap.get(input.address.toLowerCase()) : undefined;
    if (!keyInfo) {
      keyInfo = {
        privKey: defaultKey.privateKey!,
        pubKeyHex: bytesToHex(defaultKey.xOnlyPublicKey),
      };
    }

    // Sign with Schnorr secp256k1 (64 bytes)
    const schnorrSig = secp256k1.schnorr.sign(sighash, keyInfo.privKey);
    const sigHex = bytesToHex(schnorrSig);

    signatures.push({
      inputIndex: idx,
      signature: sigHex,
      publicKey: keyInfo.pubKeyHex,
    });
  }

  const signedTx: SignedKaspaTx = {
    ...tx,
    signatures,
    signedAt: Date.now(),
    txHash: tx.txId || calculateTxId(tx),
  };

  return signedTx;
}

// Multipart Animated QR Frame Protocol
// Format: KS1|<type>|<part>|<total>|<checksum>|<data>
export function createQrFrames(
  data: string,
  type: 'KSPT' | 'SIGNED_KSPT' | 'KPUB' | 'ADDRESS' | string = 'KSPT',
  maxChunkSize = 220
): string[] {
  if (data.length <= maxChunkSize) {
    return [data];
  }

  const chunks: string[] = [];
  for (let i = 0; i < data.length; i += maxChunkSize) {
    chunks.push(data.slice(i, i + maxChunkSize));
  }

  const total = chunks.length;
  const checksum = bytesToHex(sha256(new TextEncoder().encode(data))).slice(0, 8);

  return chunks.map((chunk, idx) => {
    const part = idx + 1;
    return `KS1|${type}|${part}|${total}|${checksum}|${chunk}`;
  });
}

export interface FrameAccumulatorState {
  type: string;
  total: number;
  checksum: string;
  parts: Map<number, string>;
  isComplete: boolean;
  assembledData?: string;
}

export function processQrFrame(
  frameText: string,
  existingState?: FrameAccumulatorState
): FrameAccumulatorState {
  const clean = frameText.trim();
  if (!clean.startsWith('KS1|')) {
    // Single frame / direct JSON
    return {
      type: 'RAW',
      total: 1,
      checksum: '',
      parts: new Map([[1, clean]]),
      isComplete: true,
      assembledData: clean,
    };
  }

  const tokens = clean.split('|');
  if (tokens.length < 6) {
    throw new Error('Invalid KS1 QR frame packet structure');
  }

  const [, type, partStr, totalStr, checksum, payload] = tokens;
  const part = parseInt(partStr, 10);
  const total = parseInt(totalStr, 10);

  const state: FrameAccumulatorState = existingState && existingState.checksum === checksum
    ? existingState
    : {
        type,
        total,
        checksum,
        parts: new Map(),
        isComplete: false,
      };

  state.parts.set(part, payload);

  if (state.parts.size === total) {
    const assembled: string[] = [];
    for (let p = 1; p <= total; p++) {
      if (!state.parts.has(p)) {
        return state;
      }
      assembled.push(state.parts.get(p)!);
    }
    const fullData = assembled.join('');
    const calcChecksum = bytesToHex(sha256(new TextEncoder().encode(fullData))).slice(0, 8);
    if (calcChecksum === checksum) {
      state.isComplete = true;
      state.assembledData = fullData;
    }
  }

  return state;
}
