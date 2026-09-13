import { mkdir, writeFile } from 'node:fs/promises';
import { PDFDocument } from 'pdf-lib';

const SOURCE = 'https://rassegna.dominiocliente.it/Areas/Rassegna/Elab/CheckedDownload.aspx?nome_file=PP_RAS_1626482_20260913_16361324.pdf';
const OUTPUT_DIR = new URL('../public/ritagli/2026-09-13/', import.meta.url);
const CLIPS = [
  '56-57',
  '50-51',
  '15-18',
  '34-37',
  '25-26',
  '42-44',
  '59',
  '29-30',
  '38-39',
  '58',
  '40',
  '41',
  '60',
  '78',
  '84',
  '389',
  '214',
  '89',
];

function parsePages(value) {
  const pages = [];
  for (const part of value.split(',').map(v => v.trim()).filter(Boolean)) {
    if (part.includes('-')) {
      const [a, b] = part.split('-').map(Number);
      if (!Number.isInteger(a) || !Number.isInteger(b)) throw new Error(`Invalid page range: ${part}`);
      for (let p = Math.min(a, b); p <= Math.max(a, b); p++) pages.push(p);
    } else {
      const p = Number(part);
      if (!Number.isInteger(p)) throw new Error(`Invalid page: ${part}`);
      pages.push(p);
    }
  }
  return [...new Set(pages)];
}

console.log('Generating static Juventus press-review clips...');
const response = await fetch(SOURCE, { redirect: 'follow' });
if (!response.ok) throw new Error(`Unable to download source PDF: HTTP ${response.status}`);

const sourceBytes = await response.arrayBuffer();
const sourcePdf = await PDFDocument.load(sourceBytes, { ignoreEncryption: true });
await mkdir(OUTPUT_DIR, { recursive: true });

for (const clip of CLIPS) {
  const pages = parsePages(clip);
  const out = await PDFDocument.create();
  const copied = await out.copyPages(sourcePdf, pages.map(page => page - 1));
  copied.forEach(page => out.addPage(page));
  const bytes = await out.save();
  await writeFile(new URL(`p${clip}.pdf`, OUTPUT_DIR), bytes);
  console.log(`  p${clip}.pdf (${pages.length} page${pages.length === 1 ? '' : 's'})`);
}

console.log(`Generated ${CLIPS.length} static clips.`);
