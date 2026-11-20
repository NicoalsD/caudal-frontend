const HEX_WIDTH = 2;
const HEX_RADIX = 16;

/** SHA-256 of a text as 64 lowercase hexadecimal characters (Web Crypto, no dependency). */
export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(HEX_RADIX).padStart(HEX_WIDTH, '0'),
  ).join('');
}
