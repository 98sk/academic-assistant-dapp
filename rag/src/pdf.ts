import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
// pdf-parse is CJS; load via require for Node ESM compatibility.
const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>;

/** Extract UTF-8 text from a PDF file (pipeline step 1). */
export async function extractPdfText(filePath: string): Promise<string> {
  const buf = await readFile(filePath);
  const result = await pdfParse(buf);
  const text = (result.text ?? '').trim();
  if (!text) throw new Error('PDF contains no extractable text');
  return text;
}
