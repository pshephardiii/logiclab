import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import type { Tokens } from './types';

export const sessionHash = (value: string) => createHash('sha256').update(value).digest('hex');
export const newSessionId = () => randomBytes(32).toString('base64url');

export function encryptTokens(tokens: Tokens, key: string, session: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
  cipher.setAAD(Buffer.from(session));
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(tokens)), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString('base64url');
}
export function decryptTokens(value: string, key: string, session: string): Tokens {
  const buffer = Buffer.from(value, 'base64url');
  const decipher = createDecipheriv('aes-256-gcm', Buffer.from(key, 'hex'), buffer.subarray(0, 12));
  decipher.setAAD(Buffer.from(session));
  decipher.setAuthTag(buffer.subarray(12, 28));
  return JSON.parse(Buffer.concat([decipher.update(buffer.subarray(28)), decipher.final()]).toString());
}
