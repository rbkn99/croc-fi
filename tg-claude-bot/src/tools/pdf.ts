import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fs from 'fs';
import path from 'path';
import { getAllContext, getDecisions, getTasks, getRecentMessages } from '../context';
import { chatWithCustomPrompt } from '../ai';

const TMP_DIR = '/tmp';
const FONTS_DIR = path.join(process.cwd(), 'fonts');

export async function generatePdf(): Promise<string> {
  const ctx = getAllContext();
  const decisions = getDecisions();
  const tasks = getTasks();
  const messages = getRecentMessages(50).reverse();

  let discussionSummary = 'No recent messages.';
  if (messages.length > 0) {
    const conversation = messages.map(m => `${m.is_bot_response ? 'Bot' : m.username}: ${m.text}`).join('\n');
    discussionSummary = await chatWithCustomPrompt(
      'Summarize this hackathon team conversation into key points, decisions, and next steps. Be structured and concise.',
      conversation
    );
  }

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const regularFontBytes = fs.readFileSync(path.join(FONTS_DIR, 'Roboto-Regular.ttf'));
  const boldFontBytes = fs.readFileSync(path.join(FONTS_DIR, 'Roboto-Bold.ttf'));
  const font = await pdfDoc.embedFont(regularFontBytes);
  const boldFont = await pdfDoc.embedFont(boldFontBytes);

  const PAGE_W = 595, PAGE_H = 842, margin = 50, lineH = 15, fontSize = 10, titleSize = 18, headerSize = 13;
  let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - margin;

  function newPage() { page = pdfDoc.addPage([PAGE_W, PAGE_H]); y = PAGE_H - margin; }
  function ensureSpace(needed: number) { if (y - needed < margin) newPage(); }

  function drawLine(text: string, size: number, f = font, indent = 0) {
    const maxW = PAGE_W - 2 * margin - indent;
    const words = text.split(' ');
    let line = '';
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (f.widthOfTextAtSize(test, size) > maxW && line) {
        ensureSpace(lineH);
        page.drawText(line, { x: margin + indent, y, size, font: f, color: rgb(0, 0, 0) });
        y -= lineH; line = word;
      } else { line = test; }
    }
    if (line) { ensureSpace(lineH); page.drawText(line, { x: margin + indent, y, size, font: f, color: rgb(0, 0, 0) }); y -= lineH; }
  }

  function drawTitle(text: string) { y -= 8; drawLine(text, titleSize, boldFont); y -= 6; }
  function drawHeader(text: string) {
    y -= 12; drawLine(text, headerSize, boldFont);
    const w = Math.min(boldFont.widthOfTextAtSize(text, headerSize), PAGE_W - 2 * margin);
    page.drawLine({ start: { x: margin, y: y + 2 }, end: { x: margin + w, y: y + 2 }, thickness: 0.5, color: rgb(0.5, 0.5, 0.5) });
    y -= 6;
  }
  function drawText(text: string, indent = 0) { drawLine(text, fontSize, font, indent); }
  function drawBlank() { y -= lineH / 2; }

  drawTitle(ctx['project_name'] ?? 'Hackathon Project');
  drawText(`Создан: ${new Date().toLocaleString('ru-RU')}`);

  drawHeader('Обзор проекта');
  drawText(`Кейс: ${ctx['hackathon_case'] ?? 'N/A'}`);
  drawText(`Команда: ${ctx['team_members'] ?? 'N/A'}`);
  drawText(`Цели: ${ctx['goals'] ?? 'N/A'}`);

  drawHeader('Технический стек');
  drawText(ctx['tech_stack'] ?? 'Не задан');

  drawHeader('Архитектура');
  drawText(ctx['architecture_summary'] ?? 'Не задана');

  drawHeader('Ключевые решения');
  if (!decisions.length) { drawText('Решения ещё не зафиксированы.'); }
  else { for (const d of decisions) { drawText(`#${d.id} [${d.logged_by}]: ${d.description}`, 15); drawBlank(); } }

  drawHeader('Открытые задачи');
  if (!tasks.length) { drawText('Нет открытых задач.'); }
  else { for (const t of tasks) { drawText(`#${t.id}: ${t.description}${t.assigned_to ? ` [@${t.assigned_to}]` : ''}`, 15); drawBlank(); } }

  drawHeader('Резюме обсуждения');
  for (const line of discussionSummary.split('\n')) drawText(line || ' ');

  const knownKeys = new Set(['project_name', 'hackathon_case', 'team_members', 'tech_stack', 'architecture_summary', 'goals']);
  const extras = Object.entries(ctx).filter(([k]) => !knownKeys.has(k));
  if (extras.length) { drawHeader('Дополнительные заметки'); for (const [k, v] of extras) drawText(`${k}: ${v}`); }

  const pdfBytes = await pdfDoc.save();
  const outPath = path.join(TMP_DIR, `hackathon_summary_${Date.now()}.pdf`);
  fs.writeFileSync(outPath, pdfBytes);
  return outPath;
}
