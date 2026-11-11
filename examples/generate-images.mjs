import { deflateSync } from 'node:zlib';
import { mkdir, writeFile } from 'node:fs/promises';

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = crc >>> 1 ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, body) {
  const data = Buffer.concat([Buffer.from(type), body]);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(body.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(data));
  return Buffer.concat([length, data, crc]);
}

const width = 640;
const height = 360;
const colors = { campus: [[213, 230, 177], [29, 80, 63]], palette: [[237, 199, 174], [153, 72, 57]], orbit: [[198, 211, 234], [54, 71, 121]] };
await mkdir(new URL('./images/', import.meta.url), { recursive: true });
for (const [name, [background, foreground]] of Object.entries(colors)) {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - width / 2;
      const dy = y - height / 2;
      const radius = Math.sqrt(dx * dx + dy * dy);
      const shape = name === 'orbit' ? Math.abs(radius - 100) < 10 || radius < 35 :
        name === 'palette' ? Math.abs(dx) + Math.abs(dy) < 120 : Math.abs(dx) < 100 && Math.abs(dy) < 80;
      const color = shape ? foreground : background;
      const offset = y * (width * 3 + 1) + 1 + x * 3;
      color.forEach((channel, i) => { raw[offset + i] = channel; });
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 2;
  const image = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
  await writeFile(new URL(`./images/${name}.png`, import.meta.url), image);
}
console.log('サンプル画像を生成しました。');
