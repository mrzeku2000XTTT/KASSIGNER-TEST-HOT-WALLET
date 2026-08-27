export type NetworkId = 'mainnet' | 'testnet-10' | 'testnet-11' | 'devnet' | 'simnet';

export interface NetworkConfig {
  id: NetworkId;
  name: string;
  prefix: string;
  apiUrl: string;
  explorerUrl: string;
  defaultFeeSompi: number;
}

export interface KaspaUtxo {
  address: string;
  outpoint: {
    transactionId: string;
    index: number;
  };
  utxoEntry: {
    amount: string; // in sompi
    scriptPublicKey: {
      version: number;
      scriptPublicKey: string;
    };
    blockDaaScore: string;
    isCoinbase: boolean;
  };
}

export interface KaspaInput {
  previousOutpoint: {
    transactionId: string;
    index: number;
  };
  signatureScript?: string;
  sequence: string;
  sigOpCount: number;
  utxoAmount: string; // sompi
  utxoScriptPublicKey: string;
  derivationPath?: string;
  address?: string;
}

export interface KaspaOutput {
  amount: string; // in sompi
  scriptPublicKey: {
    version: number;
    scriptPublicKey: string;
  };
  address: string;
  isChange?: boolean;
}

export interface UnsignedKaspaTx {
  version: number;
  inputs: KaspaInput[];
  outputs: KaspaOutput[];
  lockTime: string;
  subnetworkId: string;
  gas: string;
  payload: string;
  network: NetworkId;
  feeSompi: string;
  totalInputSompi: string;
  totalOutputSompi: string;
  createdAt: number;
  txId?: string;
}

export interface SignedKaspaTx extends UnsignedKaspaTx {
  signatures: {
    inputIndex: number;
    signature: string; // hex Schnorr sig
    publicKey: string;
  }[];
  signedAt: number;
  txHash: string;
}

export interface DerivedAddress {
  index: number;
  address: string;
  publicKeyHex: string;
  path: string;
  isChange: boolean;
  balanceSompi: string;
  utxoCount: number;
}

export interface KaspaKpub {
  kpub: string;
  fingerprint: string;
  depth: number;
  childNumber: number;
  chainCode: string;
  publicKey: string;
  network: NetworkId;
}

export interface StegoImageResult {
  dataUrl: string;
  encodedBytes: number;
  capacityBytes: number;
  timestamp: number;
}

export interface QrFramePacket {
  type: 'KSPT' | 'SIGNED_KSPT' | 'KPUB' | 'ADDRESS';
  part: number;
  total: number;
  payload: string;
  checksum: string;
}
