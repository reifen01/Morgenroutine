/**
 * PIN/password-based encryption helpers using the browser's Web Crypto API.
 *
 * Key derivation: PBKDF2-SHA256 with 200k iterations against a fixed app salt.
 * Encryption:     AES-GCM-256 with a random 96-bit IV per call.
 *
 * The same secret (PIN or password) reproducibly derives the same key, so
 * encrypted payloads round-trip across devices as long as the user types the
 * same secret. The salt below is constant on purpose — it does not need to be
 * secret, only consistent.
 */

const APP_SALT = "morgenroutine-backup-2026-v1";
const PBKDF2_ITERATIONS = 200_000;
const KEY_LENGTH_BITS = 256;
const IV_LENGTH_BYTES = 12;

const enc = new TextEncoder();
const dec = new TextDecoder();

function bufToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function base64ToBuf(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

async function deriveKey(secret: string): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode(APP_SALT),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: KEY_LENGTH_BITS },
    false,
    ["encrypt", "decrypt"]
  );
}

export interface EncryptedPayload {
  iv: string;
  ciphertext: string;
}

export async function encryptJson(secret: string, payload: unknown): Promise<EncryptedPayload> {
  const key = await deriveKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH_BYTES));
  const data = enc.encode(JSON.stringify(payload));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    data
  );
  return {
    iv: bufToBase64(iv.buffer),
    ciphertext: bufToBase64(ciphertext),
  };
}

export async function decryptJson<T = unknown>(
  secret: string,
  payload: EncryptedPayload
): Promise<T> {
  const key = await deriveKey(secret);
  const iv = new Uint8Array(base64ToBuf(payload.iv));
  const ciphertext = base64ToBuf(payload.ciphertext);
  let plain: ArrayBuffer;
  try {
    plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  } catch {
    throw new Error("Falscher PIN oder beschädigte Datei.");
  }
  const text = dec.decode(plain);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Datei konnte nicht gelesen werden.");
  }
}
