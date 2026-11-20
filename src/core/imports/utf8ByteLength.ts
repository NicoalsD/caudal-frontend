const encoder = new TextEncoder();

/** Bytes a text takes on the wire (UTF-8). */
export function utf8ByteLength(text: string): number {
  return encoder.encode(text).length;
}
