export async function readFileAsUint8Array(file: File): Promise<Uint8Array> {
  const buffer = await file.arrayBuffer();
  return new Uint8Array(buffer);
}

export async function readFileAsText(file: File): Promise<string> {
  return await file.text();
}
