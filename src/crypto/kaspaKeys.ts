import { hmac } from '@noble/hashes/hmac.js';
import { sha512 } from '@noble/hashes/sha2.js';
import * as secp256k1 from '@noble/secp256k1';
import { NetworkId, DerivedAddress, KaspaKpub } from '../types/kaspa';

// Kaspa Address Prefix Mapping
export const NETWORK_PREFIXES: Record<NetworkId, string> = {
  'mainnet': 'kaspa',
  'testnet-10': 'kaspatest',
  'testnet-11': 'kaspatest',
  'devnet': 'kaspadev',
  'simnet': 'kaspasim',
};

// Bech32 charset
const CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
const GENERATOR = [
  0x0098f2bc8e61n,
  0x0079b76d99e2n,
  0x00f33e5fb3c4n,
  0x00ae2eabe2a8n,
  0x001e4f43e470n,
];

function bech32Polymod(values: number[]): bigint {
  let c = 1n;
  for (const v of values) {
    const c0 = c >> 35n;
    c = ((c & 0x07ffffffffn) << 5n) ^ BigInt(v);
    for (let i = 0; i < 5; i++) {
      if ((c0 >> BigInt(i)) & 1n) {
        c ^= GENERATOR[i];
      }
    }
  }
  return c ^ 1n;
}

function prefixExpand(prefix: string): number[] {
  const res: number[] = [];
  for (let i = 0; i < prefix.length; i++) {
    res.push(prefix.charCodeAt(i) & 31);
  }
  res.push(0);
  return res;
}

function convertBits(data: Uint8Array | number[], fromBits: number, toBits: number, pad: boolean): number[] {
  let acc = 0;
  let bits = 0;
  const ret: number[] = [];
  const maxv = (1 << toBits) - 1;
  for (let p = 0; p < data.length; ++p) {
    const value = data[p];
    if (value < 0 || value >> fromBits !== 0) {
      throw new Error('Invalid value for bit conversion');
    }
    acc = (acc << fromBits) | value;
    bits += fromBits;
    while (bits >= toBits) {
      bits -= toBits;
      ret.push((acc >> bits) & maxv);
    }
  }
  if (pad) {
    if (bits > 0) {
      ret.push((acc << (toBits - bits)) & maxv);
    }
  } else if (bits >= fromBits || ((acc << (toBits - bits)) & maxv)) {
    throw new Error('Excessive padding');
  }
  return ret;
}

/**
 * Encode a public key payload to a Kaspa address
 * version: 0 = Schnorr 32-byte pubkey (standard), 1 = ECDSA 33-byte pubkey, 8 = Script
 */
export function encodeKaspaAddress(prefix: string, version: number, pubKeyBytes: Uint8Array): string {
  const versionAndData = [version, ...Array.from(pubKeyBytes)];
  const fiveBitPayload = convertBits(versionAndData, 8, 5, true);

  const prefix5Bit = prefixExpand(prefix);
  const valuesToChecksum = [...prefix5Bit, ...fiveBitPayload, 0, 0, 0, 0, 0, 0, 0, 0];
  const polymod = bech32Polymod(valuesToChecksum);

  const checksum5Bit: number[] = [];
  for (let i = 0; i < 8; i++) {
    const shift = BigInt(5 * (7 - i));
    const val = Number((polymod >> shift) & 0x1fn);
    checksum5Bit.push(val);
  }

  const encodedPayload = [...fiveBitPayload, ...checksum5Bit]
    .map(val => CHARSET[val])
    .join('');

  return `${prefix}:${encodedPayload}`;
}

/**
 * Decode and validate a Kaspa address
 */
export function decodeKaspaAddress(address: string): {
  valid: boolean;
  prefix?: string;
  version?: number;
  pubKeyHex?: string;
  error?: string;
} {
  try {
    const parts = address.toLowerCase().split(':');
    if (parts.length !== 2) {
      return { valid: false, error: 'Address must contain a single colon separating network prefix and payload' };
    }
    const [prefix, payloadStr] = parts;
    if (!['kaspa', 'kaspatest', 'kaspadev', 'kaspasim'].includes(prefix)) {
      return { valid: false, error: `Unknown network prefix: ${prefix}` };
    }

    const payload5Bit: number[] = [];
    for (let i = 0; i < payloadStr.length; i++) {
      const idx = CHARSET.indexOf(payloadStr[i]);
      if (idx === -1) {
        return { valid: false, error: `Invalid character '${payloadStr[i]}' in address` };
      }
      payload5Bit.push(idx);
    }

    if (payload5Bit.length < 9) {
      return { valid: false, error: 'Address payload too short' };
    }

    // Verify checksum
    const prefix5Bit = prefixExpand(prefix);
    const polymod = bech32Polymod([...prefix5Bit, ...payload5Bit]);
    if (polymod !== 0n) {
      return { valid: false, error: 'Invalid address checksum' };
    }

    const data5Bit = payload5Bit.slice(0, payload5Bit.length - 8);
    const data8Bit = convertBits(data5Bit, 5, 8, false);
    const version = data8Bit[0];
    const pubKeyBytes = new Uint8Array(data8Bit.slice(1));
    const pubKeyHex = Array.from(pubKeyBytes).map(b => b.toString(16).padStart(2, '0')).join('');

    return {
      valid: true,
      prefix,
      version,
      pubKeyHex,
    };
  } catch (err: any) {
    return { valid: false, error: err.message || 'Address decode error' };
  }
}

// BIP32 HD Node Implementation for Kaspa
export interface HDNode {
  privateKey?: Uint8Array;
  publicKey: Uint8Array; // 33-byte compressed
  chainCode: Uint8Array;
  depth: number;
  index: number;
  fingerprint: number;
}

const ED25519_KEY = new TextEncoder().encode('Bitcoin seed');

export function createMasterHDNode(seed: Uint8Array): HDNode {
  const i = hmac(sha512, ED25519_KEY, seed);
  const il = i.slice(0, 32);
  const ir = i.slice(32, 64);

  const pubKey = secp256k1.getPublicKey(il, true);

  return {
    privateKey: il,
    publicKey: pubKey,
    chainCode: ir,
    depth: 0,
    index: 0,
    fingerprint: 0,
  };
}

export function deriveChild(node: HDNode, index: number, hardened = false): HDNode {
  const actualIndex = hardened ? index + 0x80000000 : index;
  const data = new Uint8Array(37);

  if (hardened) {
    if (!node.privateKey) throw new Error('Cannot derive hardened child from public key');
    data[0] = 0;
    data.set(node.privateKey, 1);
  } else {
    data.set(node.publicKey, 0);
  }

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  view.setUint32(33, actualIndex, false);

  const i = hmac(sha512, node.chainCode, data);
  const il = i.slice(0, 32);
  const ir = i.slice(32, 64);

  let childPrivateKey: Uint8Array | undefined;
  let childPublicKey: Uint8Array;

  if (node.privateKey) {
    // Add il to privateKey mod N
    const SECP256K1_N = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141n;
    const ilNum = bytesToBigInt(il);
    const parentNum = bytesToBigInt(node.privateKey);
    const childNum = (ilNum + parentNum) % SECP256K1_N;
    if (childNum === 0n) throw new Error('Invalid child private key (0)');
    childPrivateKey = bigIntToBytes(childNum, 32);
    childPublicKey = secp256k1.getPublicKey(childPrivateKey, true);
  } else {
    // Point addition for public child derivation
    const p1 = secp256k1.Point.fromHex(bytesToHex(node.publicKey));
    const p2 = secp256k1.Point.BASE.multiply(bytesToBigInt(il));
    const childPoint = p1.add(p2);
    childPublicKey = childPoint.toBytes(true);
  }

  // Calculate fingerprint from parent pubkey
  const pubHash = sha512(node.publicKey).slice(0, 4);
  const fingerprint = new DataView(pubHash.buffer).getUint32(0, false);

  return {
    privateKey: childPrivateKey,
    publicKey: childPublicKey,
    chainCode: ir,
    depth: node.depth + 1,
    index: actualIndex,
    fingerprint,
  };
}

/**
 * Standard Kaspa Account Derivation:
 * Path: m/44'/111111'/0' (account)
 */
export function deriveKaspaAccount(masterNode: HDNode, accountIndex = 0): HDNode {
  // m/44'
  const purpose = deriveChild(masterNode, 44, true);
  // m/44'/111111' (Kaspa coin type 111111)
  const coinType = deriveChild(purpose, 111111, true);
  // m/44'/111111'/0'
  return deriveChild(coinType, accountIndex, true);
}

/**
 * Derive Kaspa address keypair at m/44'/111111'/0' / (isChange ? 1 : 0) / addressIndex
 */
export function deriveKaspaKey(
  accountNode: HDNode,
  addressIndex: number,
  isChange = false
): {
  privateKey?: Uint8Array;
  publicKey: Uint8Array; // 33-byte compressed
  xOnlyPublicKey: Uint8Array; // 32-byte Schnorr
  path: string;
} {
  const branch = deriveChild(accountNode, isChange ? 1 : 0, false);
  const child = deriveChild(branch, addressIndex, false);
  const xOnly = child.publicKey.slice(1, 33); // 32 bytes x-only
  return {
    privateKey: child.privateKey,
    publicKey: child.publicKey,
    xOnlyPublicKey: xOnly,
    path: `m/44'/111111'/0'/${isChange ? 1 : 0}/${addressIndex}`,
  };
}

/**
 * Derive a list of formatted Kaspa addresses
 */
export function deriveAddressList(
  accountNode: HDNode,
  network: NetworkId = 'mainnet',
  count = 10,
  isChange = false,
  startIndex = 0
): DerivedAddress[] {
  const prefix = NETWORK_PREFIXES[network];
  const list: DerivedAddress[] = [];

  for (let i = 0; i < count; i++) {
    const idx = startIndex + i;
    const derived = deriveKaspaKey(accountNode, idx, isChange);
    const addr = encodeKaspaAddress(prefix, 0, derived.xOnlyPublicKey);
    const pubHex = Array.from(derived.xOnlyPublicKey).map(b => b.toString(16).padStart(2, '0')).join('');

    list.push({
      index: idx,
      address: addr,
      publicKeyHex: pubHex,
      path: derived.path,
      isChange,
      balanceSompi: '0',
      utxoCount: 0,
    });
  }

  return list;
}

/**
 * Format Kaspa Extended Public Key (kpub)
 */
export function exportKpub(accountNode: HDNode, network: NetworkId = 'testnet-10'): KaspaKpub {
  const pubHex = Array.from(accountNode.publicKey).map(b => b.toString(16).padStart(2, '0')).join('');
  const chainCodeHex = Array.from(accountNode.chainCode).map(b => b.toString(16).padStart(2, '0')).join('');
  const fp = accountNode.fingerprint.toString(16).padStart(8, '0');

  // Standard kpub string format (kpub: for mainnet, kpubtest: for testnets)
  const isTest = network !== 'mainnet';
  const serialized = `${isTest ? 'kpubtest' : 'kpub'}:${fp}:${pubHex}:${chainCodeHex}`;

  return {
    kpub: serialized,
    fingerprint: fp,
    depth: accountNode.depth,
    childNumber: accountNode.index,
    chainCode: chainCodeHex,
    publicKey: pubHex,
    network,
  };
}

export interface ParsedKpubResult {
  node: HDNode;
  detectedNetwork?: NetworkId;
  fingerprintHex: string;
  publicKeyHex: string;
  chainCodeHex: string;
}

/**
 * Parse an imported kpub string into an HDNode (Public only) and detect network
 */
export function parseKpubInfo(kpubStr: string, fallbackNetwork: NetworkId = 'testnet-10'): ParsedKpubResult {
  const clean = kpubStr.trim();
  const parts = clean.split(':');
  if (parts.length === 4) {
    const [tag, fpHex, pubHex, chainHex] = parts;
    const isTestnet = tag.toLowerCase().includes('test') || tag.toLowerCase().includes('sim');
    const detectedNetwork: NetworkId = isTestnet ? 'testnet-10' : 'mainnet';

    return {
      node: {
        publicKey: hexToBytes(pubHex),
        chainCode: hexToBytes(chainHex),
        depth: 3,
        index: 0x80000000,
        fingerprint: parseInt(fpHex, 16) || 0,
      },
      detectedNetwork,
      fingerprintHex: fpHex,
      publicKeyHex: pubHex,
      chainCodeHex: chainHex,
    };
  }

  // Fallback if JSON format
  try {
    const json = JSON.parse(clean);
    if (json.publicKey && json.chainCode) {
      const fpHex = (json.fingerprint || '00000000').toString();
      return {
        node: {
          publicKey: hexToBytes(json.publicKey),
          chainCode: hexToBytes(json.chainCode),
          depth: json.depth || 3,
          index: json.childNumber || 0,
          fingerprint: typeof json.fingerprint === 'number' ? json.fingerprint : parseInt(fpHex, 16) || 0,
        },
        detectedNetwork: json.network || fallbackNetwork,
        fingerprintHex: fpHex,
        publicKeyHex: json.publicKey,
        chainCodeHex: json.chainCode,
      };
    }
  } catch {}

  throw new Error('Invalid kpub format. Expected format: kpub:<fp>:<pubkey>:<chaincode> or kpubtest:<fp>:<pubkey>:<chaincode>');
}

export function importKpub(kpubStr: string, network: NetworkId = 'testnet-10'): HDNode {
  return parseKpubInfo(kpubStr, network).node;
}

// Helper conversions
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function bytesToBigInt(bytes: Uint8Array): bigint {
  let res = 0n;
  for (let i = 0; i < bytes.length; i++) {
    res = (res << 8n) + BigInt(bytes[i]);
  }
  return res;
}

function bigIntToBytes(num: bigint, len: number): Uint8Array {
  const bytes = new Uint8Array(len);
  let n = num;
  for (let i = len - 1; i >= 0; i--) {
    bytes[i] = Number(n & 0xffn);
    n >>= 8n;
  }
  return bytes;
}
