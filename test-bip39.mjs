import { sha256 } from '@noble/hashes/sha2.js';

function bytesToBits(bytes) {
  let bits = '';
  for (let i = 0; i < bytes.length; i++) {
    bits += bytes[i].toString(2).padStart(8, '0');
  }
  return bits;
}

const entropy = new Uint8Array(16);
entropy.fill(1);
const hash = sha256(entropy);
const checksumBitsCount = (entropy.length * 8) / 32;
console.log('entropy.length:', entropy.length);
console.log('checksumBitsCount:', checksumBitsCount);
const hashBits = bytesToBits(hash);
console.log('hashBits:', hashBits);
const checksumBits = hashBits.slice(0, checksumBitsCount);
console.log('checksumBits:', checksumBits);
