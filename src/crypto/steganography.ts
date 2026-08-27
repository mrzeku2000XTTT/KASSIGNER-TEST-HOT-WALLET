import { sha256 } from '@noble/hashes/sha2.js';

const MAGIC_HEADER = 'KAS_STEGO_V1:';

export async function encryptData(text: string, passphrase?: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const rawBytes = encoder.encode(text);

  if (!passphrase || passphrase.trim() === '') {
    // Unencrypted wrapper with magic header
    const headerBytes = encoder.encode(MAGIC_HEADER + 'PLAIN:');
    const combined = new Uint8Array(headerBytes.length + rawBytes.length);
    combined.set(headerBytes, 0);
    combined.set(rawBytes, headerBytes.length);
    return combined;
  }

  // Derive AES-GCM key from passphrase using PBKDF2
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    rawBytes
  );

  const ciphertext = new Uint8Array(ciphertextBuffer);

  // Format: MAGIC_HEADER + 'ENC:' + salt(16) + iv(12) + ciphertext
  const headerBytes = encoder.encode(MAGIC_HEADER + 'ENC:');
  const result = new Uint8Array(headerBytes.length + salt.length + iv.length + ciphertext.length);

  let offset = 0;
  result.set(headerBytes, offset); offset += headerBytes.length;
  result.set(salt, offset); offset += salt.length;
  result.set(iv, offset); offset += iv.length;
  result.set(ciphertext, offset);

  return result;
}

export async function decryptData(data: Uint8Array, passphrase?: string): Promise<string> {
  const decoder = new TextDecoder();
  const rawHeader = decoder.decode(data.slice(0, 32));

  if (!rawHeader.startsWith(MAGIC_HEADER)) {
    throw new Error('No valid KasSigner steganographic payload found in this image.');
  }

  if (rawHeader.startsWith(MAGIC_HEADER + 'PLAIN:')) {
    const headerLen = (MAGIC_HEADER + 'PLAIN:').length;
    return decoder.decode(data.slice(headerLen));
  }

  if (rawHeader.startsWith(MAGIC_HEADER + 'ENC:')) {
    if (!passphrase) {
      throw new Error('This stego image is password-protected. Please provide the decryption passphrase.');
    }

    const headerLen = (MAGIC_HEADER + 'ENC:').length;
    const salt = data.slice(headerLen, headerLen + 16);
    const iv = data.slice(headerLen + 16, headerLen + 16 + 12);
    const ciphertext = data.slice(headerLen + 16 + 12);

    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(passphrase),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );

    try {
      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        ciphertext
      );
      return decoder.decode(decryptedBuffer);
    } catch {
      throw new Error('Incorrect passphrase or corrupted stego payload.');
    }
  }

  throw new Error('Unsupported steganography encoding version');
}

/**
 * Embed bytes into an image's pixels using LSB (Least Significant Bit)
 */
export async function encodeStegoImage(
  imageSource: HTMLImageElement | HTMLCanvasElement,
  secretPayload: string,
  passphrase?: string
): Promise<{ dataUrl: string; encodedBytes: number; maxCapacityBytes: number }> {
  const canvas = document.createElement('canvas');
  canvas.width = imageSource.width || 600;
  canvas.height = imageSource.height || 600;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not get 2D canvas context');

  ctx.drawImage(imageSource, 0, 0, canvas.width, canvas.height);
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  const payloadBytes = await encryptData(secretPayload, passphrase);
  const payloadLen = payloadBytes.length;

  // Header has 4 bytes for length (Uint32)
  const totalBytesNeeded = 4 + payloadLen;
  // Each pixel has 3 usable channels (R, G, B) -> 3 bits per pixel
  const totalBitsAvailable = (data.length / 4) * 3;
  const maxCapacityBytes = Math.floor(totalBitsAvailable / 8);

  if (totalBytesNeeded > maxCapacityBytes) {
    throw new Error(`Cover image too small. Required capacity: ${totalBytesNeeded} bytes, available: ${maxCapacityBytes} bytes`);
  }

  // Prepare byte stream: 4 bytes length + payload
  const byteStream = new Uint8Array(4 + payloadLen);
  const view = new DataView(byteStream.buffer);
  view.setUint32(0, payloadLen, false); // big endian
  byteStream.set(payloadBytes, 4);

  // Embed bit by bit into R, G, B channels
  let byteIndex = 0;
  let bitIndex = 0;
  let pixelChannel = 0;

  for (let i = 0; i < data.length; i++) {
    // Skip Alpha channel (every 4th byte)
    if (i % 4 === 3) continue;

    if (byteIndex < byteStream.length) {
      const currentByte = byteStream[byteIndex];
      const bit = (currentByte >> (7 - bitIndex)) & 1;

      // Clear LSB and write bit
      data[i] = (data[i] & 0xfe) | bit;

      bitIndex++;
      if (bitIndex === 8) {
        bitIndex = 0;
        byteIndex++;
      }
    } else {
      break;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  const dataUrl = canvas.toDataURL('image/png');

  return {
    dataUrl,
    encodedBytes: totalBytesNeeded,
    maxCapacityBytes,
  };
}

/**
 * Extract bytes from a stego image using LSB
 */
export async function decodeStegoImage(
  imageSource: HTMLImageElement | HTMLCanvasElement,
  passphrase?: string
): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = imageSource.width;
  canvas.height = imageSource.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not get 2D canvas context');

  ctx.drawImage(imageSource, 0, 0, canvas.width, canvas.height);
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  // Extract length first (32 bits = 4 bytes)
  let lengthBits = '';
  let channelCount = 0;
  let idx = 0;

  while (lengthBits.length < 32 && idx < data.length) {
    if (idx % 4 !== 3) {
      lengthBits += (data[idx] & 1).toString();
    }
    idx++;
  }

  if (lengthBits.length < 32) {
    throw new Error('Image too small to contain valid steganographic metadata.');
  }

  const payloadLen = parseInt(lengthBits, 2);
  const maxReasonableLen = (data.length / 4) * 3 / 8;

  if (payloadLen <= 0 || payloadLen > maxReasonableLen) {
    throw new Error('No valid KasSigner steganographic payload detected in this image.');
  }

  // Extract payload bits
  const totalBitsToRead = payloadLen * 8;
  let currentByte = 0;
  let bitCount = 0;
  const payloadBytes = new Uint8Array(payloadLen);
  let payloadByteIdx = 0;

  while (payloadByteIdx < payloadLen && idx < data.length) {
    if (idx % 4 !== 3) {
      const bit = data[idx] & 1;
      currentByte = (currentByte << 1) | bit;
      bitCount++;

      if (bitCount === 8) {
        payloadBytes[payloadByteIdx] = currentByte;
        payloadByteIdx++;
        currentByte = 0;
        bitCount = 0;
      }
    }
    idx++;
  }

  if (payloadByteIdx < payloadLen) {
    throw new Error('Image data ended unexpectedly before all payload bytes were read.');
  }

  return await decryptData(payloadBytes, passphrase);
}

/**
 * Generate a procedural geometric cover image canvas if user doesn't have an image
 */
export function generateCoverImage(width = 600, height = 600, label = 'Kaspa Vault Stego Artifact'): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Dark cyber gradient
  const grad = ctx.createRadialGradient(width / 2, height / 2, 20, width / 2, height / 2, width);
  grad.addColorStop(0, '#102a27');
  grad.addColorStop(0.5, '#0b161b');
  grad.addColorStop(1, '#050a0d');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Geometric grid and Kaspa teal rings
  ctx.strokeStyle = 'rgba(112, 199, 186, 0.15)';
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Kaspa Diamond Icon in center
  ctx.save();
  ctx.translate(width / 2, height / 2);

  for (let r = 180; r >= 60; r -= 30) {
    ctx.strokeStyle = `rgba(112, 199, 186, ${0.1 + (r / 300)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Diamond shape
  ctx.fillStyle = '#70C7BA';
  ctx.beginPath();
  ctx.moveTo(0, -50);
  ctx.lineTo(50, 0);
  ctx.lineTo(0, 50);
  ctx.lineTo(-50, 0);
  ctx.closePath();
  ctx.fill();

  ctx.restore();

  // Label text
  ctx.fillStyle = '#70C7BA';
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(label, width / 2, height - 30);

  return canvas;
}
