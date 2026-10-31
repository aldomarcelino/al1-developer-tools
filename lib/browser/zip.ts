const crcTable = Uint32Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  return crc >>> 0;
});

/** Stored ZIP entries: image formats are already compressed, so recompressing wastes CPU. */
export function createZip(
  files: { name: string; bytes: Uint8Array }[]
): Uint8Array<ArrayBuffer> {
  if (!files.length || files.length > 65535)
    throw new Error("Choose at least one file to archive.");
  const encoder = new TextEncoder();
  const records = files.map(({ name, bytes }) => {
    if (!name || /[\\/\x00]/.test(name) || name === "." || name === "..")
      throw new Error("Archive filenames must not include paths.");
    const filename = encoder.encode(name);
    if (filename.length > 65535) throw new Error("Filename is too long.");
    let crc = 0xffffffff;
    for (const byte of bytes) {
      crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 255];
    }
    return { filename, bytes, crc: (crc ^ 0xffffffff) >>> 0 };
  });
  const localSize = records.reduce(
    (sum, file) => sum + 30 + file.filename.length + file.bytes.length,
    0
  );
  const directorySize = records.reduce((sum, file) => sum + 46 + file.filename.length, 0);
  if (localSize + directorySize + 22 > 0xffffffff)
    throw new Error("Archive exceeds the ZIP size limit.");
  const output = new Uint8Array(localSize + directorySize + 22);
  const view = new DataView(output.buffer);
  let local = 0,
    central = localSize;
  for (const file of records) {
    view.setUint32(local, 0x04034b50, true);
    view.setUint16(local + 4, 20, true);
    view.setUint16(local + 6, 0x0800, true); // UTF-8 filenames
    view.setUint16(local + 12, 33, true); // 1980-01-01
    view.setUint32(local + 14, file.crc, true);
    view.setUint32(local + 18, file.bytes.length, true);
    view.setUint32(local + 22, file.bytes.length, true);
    view.setUint16(local + 26, file.filename.length, true);
    output.set(file.filename, local + 30);
    output.set(file.bytes, local + 30 + file.filename.length);
    view.setUint32(central, 0x02014b50, true);
    view.setUint16(central + 4, 20, true);
    view.setUint16(central + 6, 20, true);
    view.setUint16(central + 8, 0x0800, true);
    view.setUint16(central + 14, 33, true);
    view.setUint32(central + 16, file.crc, true);
    view.setUint32(central + 20, file.bytes.length, true);
    view.setUint32(central + 24, file.bytes.length, true);
    view.setUint16(central + 28, file.filename.length, true);
    view.setUint32(central + 42, local, true);
    output.set(file.filename, central + 46);
    local += 30 + file.filename.length + file.bytes.length;
    central += 46 + file.filename.length;
  }
  view.setUint32(central, 0x06054b50, true);
  view.setUint16(central + 8, records.length, true);
  view.setUint16(central + 10, records.length, true);
  view.setUint32(central + 12, directorySize, true);
  view.setUint32(central + 16, localSize, true);
  return output;
}
