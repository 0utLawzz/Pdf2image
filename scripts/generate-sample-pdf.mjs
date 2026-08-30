import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

function pdfEscape(text) {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function textAt(font, size, x, y, line) {
  return `BT /${font} ${size} Tf ${x} ${y} Td (${pdfEscape(line)}) Tj ET\n`;
}

function fillRect(r, g, b, x, y, w, h) {
  return `${r} ${g} ${b} rg ${x} ${y} ${w} ${h} re f\n`;
}

const page1 = [
  fillRect(0.11, 0.1, 0.09, 0, 732, 612, 60),
  "1 0.99 0.96 rg\n",
  textAt("F2", 13, 36, 754, "INKSHIFT"),
  textAt("F1", 10, 470, 754, "Studio sample"),
  fillRect(0.11, 0.1, 0.09, 0, 0, 0, 0).replace("0 0 0 0 re f\n", ""),
  "0.12 0.11 0.1 rg\n",
  textAt("F2", 32, 48, 660, "Quarterly brief"),
  "0.35 0.33 0.3 rg\n",
  textAt("F1", 12, 48, 632, "Two pages. Recolor the ink, then export as images."),
  fillRect(0.82, 0.8, 0.74, 48, 612, 516, 1),
  "0.16 0.15 0.13 rg\n",
  textAt("F1", 11, 48, 580, "InkShift renders every PDF page to a picture in the browser."),
  textAt("F1", 11, 48, 562, "Nothing is uploaded. Shift ink and paper, then download PNG, JPG, or WebP."),
  textAt("F1", 11, 48, 544, "Use the sample to try Night, Blueprint, Sepia, and custom colors."),
  fillRect(0.93, 0.91, 0.86, 48, 400, 156, 112),
  fillRect(0.88, 0.86, 0.8, 228, 400, 156, 112),
  fillRect(0.22, 0.21, 0.19, 408, 400, 156, 112),
  "0.16 0.15 0.13 rg\n",
  textAt("F2", 10, 60, 486, "PAGES"),
  textAt("F2", 28, 60, 448, "02"),
  textAt("F1", 9, 60, 422, "Letter size"),
  textAt("F2", 10, 240, 486, "EXPORT"),
  textAt("F2", 22, 240, 448, "PNG JPG"),
  textAt("F1", 9, 240, 422, "or a ZIP of all pages"),
  "0.96 0.95 0.92 rg\n",
  textAt("F2", 10, 420, 486, "PRIVACY"),
  textAt("F2", 16, 420, 452, "On-device"),
  textAt("F1", 9, 420, 422, "No server copy"),
  "0.16 0.15 0.13 rg\n",
  textAt("F1", 10, 48, 360, "Try this"),
  "0.35 0.33 0.3 rg\n",
  textAt("F1", 11, 48, 336, "1.  Open Color and pick Blueprint or Night."),
  textAt("F1", 11, 48, 318, "2.  Drag Ink and Paper to any pair you like."),
  textAt("F1", 11, 48, 300, "3.  Export this page, or download the whole file as a ZIP."),
  fillRect(0.11, 0.1, 0.09, 48, 72, 516, 48),
  "0.96 0.95 0.92 rg\n",
  textAt("F1", 10, 64, 92, "Hold Compare on the preview to see the original page."),
].join("");

const page2 = [
  fillRect(0.11, 0.1, 0.09, 0, 732, 612, 60),
  "1 0.99 0.96 rg\n",
  textAt("F2", 13, 36, 754, "INKSHIFT"),
  textAt("F1", 10, 456, 754, "Color notes  ·  2 / 2"),
  "0.12 0.11 0.1 rg\n",
  textAt("F2", 28, 48, 660, "Ink, paper, midtones"),
  "0.35 0.33 0.3 rg\n",
  textAt("F1", 12, 48, 628, "Recolor maps light pixels to paper and dark pixels to ink."),
  fillRect(0.96, 0.95, 0.92, 48, 520, 96, 72),
  fillRect(0.78, 0.76, 0.7, 156, 520, 96, 72),
  fillRect(0.55, 0.53, 0.48, 264, 520, 96, 72),
  fillRect(0.32, 0.3, 0.27, 372, 520, 96, 72),
  fillRect(0.12, 0.11, 0.1, 480, 520, 84, 72),
  "0.16 0.15 0.13 rg\n",
  textAt("F1", 8, 56, 500, "Paper"),
  textAt("F1", 8, 168, 500, "Light"),
  textAt("F1", 8, 280, 500, "Mid"),
  textAt("F1", 8, 388, 500, "Dark"),
  "0.96 0.95 0.92 rg\n",
  textAt("F1", 8, 492, 500, "Ink"),
  "0.16 0.15 0.13 rg\n",
  textAt("F1", 11, 48, 460, "A good pair keeps body text readable and the page quiet."),
  textAt("F1", 11, 48, 442, "Night inverts the studio. Blueprint is for mark-up. Sepia is archival."),
  fillRect(0.93, 0.91, 0.86, 48, 280, 516, 120),
  "0.16 0.15 0.13 rg\n",
  textAt("F2", 12, 68, 368, "Export checklist"),
  "0.35 0.33 0.3 rg\n",
  textAt("F1", 11, 68, 342, "PNG for sharp type. JPG or WebP when the file must stay small."),
  textAt("F1", 11, 68, 324, "2x is the usual screen size. 3x if you need print-adjacent detail."),
  textAt("F1", 11, 68, 306, "Filters apply to the pixels you download, not only the preview."),
  "0.55 0.53 0.48 rg\n",
  textAt("F1", 9, 48, 72, "Generated for InkShift  ·  files never leave this device"),
].join("");

function streamObject(content) {
  const bytes = Buffer.from(content, "ascii");
  return `<< /Length ${bytes.length} >>\nstream\n${content}endstream`;
}

const objects = [
  "<< /Type /Catalog /Pages 2 0 R >>",
  "<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>",
  "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 5 0 R /Resources << /Font << /F1 7 0 R /F2 8 0 R >> >> >>",
  "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 6 0 R /Resources << /Font << /F1 7 0 R /F2 8 0 R >> >> >>",
  streamObject(page1),
  streamObject(page2),
  "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
];

let body = "%PDF-1.4\n";
const offsets = [0];
for (let i = 0; i < objects.length; i++) {
  offsets.push(Buffer.byteLength(body, "ascii"));
  body += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
}
const xrefPos = Buffer.byteLength(body, "ascii");
let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
for (let i = 1; i <= objects.length; i++) {
  xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
}
body += xref;
body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "sample.pdf");
writeFileSync(out, body, "ascii");
console.log("wrote", out, Buffer.byteLength(body, "ascii"), "bytes");
