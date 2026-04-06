import { Context, InputFile } from 'grammy';
import { chat, chatWithCustomPrompt } from './ai';
import { getAllContext, setContext, getRecentMessages, addDecision, getDecisions, addTask, getTasks, completeTask, saveMessage, getMessagesSince } from './context';
import { searchWeb } from './tools/search';
import { formatCodeReview } from './tools/code';
import { generatePdf } from './tools/pdf';
import fs from 'fs';

export async function handleCommand(ctx: Context): Promise<void> {
  const text = ctx.message?.text?.trim();
  if (!text) return;
  const username = ctx.message?.from?.username ?? ctx.message?.from?.first_name ?? 'unknown';
  const parts = text.split(/\s+/);
  const command = parts[0].toLowerCase().replace(/@\w+/, '');
  const args = parts.slice(1).join(' ');
  try {
    switch (command) {
      case '/idea': await handleIdea(ctx, args, username); break;
      case '/summary': await handleSummary(ctx, username); break;
      case '/context': await handleContext(ctx, args); break;
      case '/review': await handleReview(ctx, args, username); break;
      case '/search': await handleSearch(ctx, args); break;
      case '/pdf': await handlePdf(ctx); break;
      case '/decide': await handleDecide(ctx, args, username); break;
      case '/decisions': await handleDecisions(ctx); break;
      case '/task': await handleTask(ctx, args); break;
      case '/tasks': await handleTasks(ctx); break;
      case '/done': await handleDone(ctx, args); break;
      case '/standup': await handleStandup(ctx); break;
      case '/arch': await handleArch(ctx); break;
      case '/reset': await handleReset(ctx); break;
      case '/start': case '/help': await handleHelp(ctx); break;
    }
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Error handling ${command}:`, err);
    await ctx.reply('Произошла ошибка, попробуй ещё раз.');
  }
}

export async function handleDocument(
  ctx: Context,
  doc: { file_id: string; file_name?: string; mime_type?: string; file_size?: number },
  caption: string,
  username: string
): Promise<void> {
  const name = doc.file_name ?? 'unknown';
  const mime = doc.mime_type ?? '';
  const size = doc.file_size ?? 0;

  let fileContent = '';
  const isText = mime.startsWith('text/') || mime === 'application/json' || mime === 'application/javascript' ||
    /\.(ts|js|tsx|jsx|rs|py|md|txt|json|toml|yaml|yml|sol|go|java|c|cpp|h|sh)$/i.test(name);

  if (isText && size < 100_000) {
    try {
      const fileInfo = await ctx.api.getFile(doc.file_id);
      const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${fileInfo.file_path}`;
      const resp = await fetch(fileUrl);
      fileContent = await resp.text();
    } catch (e) {
      console.error('Failed to download file:', e);
    }
  }

  let prompt: string;
  if (fileContent) {
    prompt = caption
      ? `User ${username} shared file "${name}" with comment: "${caption}"\n\nContents:\n\`\`\`\n${fileContent.slice(0, 8000)}\n\`\`\`\n\nAnalyze and respond.`
      : `User ${username} shared file "${name}". Analyze and give feedback:\n\`\`\`\n${fileContent.slice(0, 8000)}\n\`\`\``;
  } else {
    prompt = caption
      ? `User ${username} shared file "${name}" (${mime}, ${(size / 1024).toFixed(1)}KB) with comment: "${caption}". Respond in context of the hackathon.`
      : `User ${username} shared file "${name}" (${mime}, ${(size / 1024).toFixed(1)}KB). Acknowledge and ask what they'd like to do.`;
  }

  const reply = await chat(prompt, username);
  await sendLongMessage(ctx, reply);
  saveMessage(ctx.message!.message_id + 1, 0, 'bot', reply, true);
}

export async function handleMention(ctx: Context, text: string): Promise<void> {
  const username = ctx.message?.from?.username ?? ctx.message?.from?.first_name ?? 'unknown';
  const cleanText = text.replace(/@\w+/g, '').trim();
  if (!cleanText) return;
  const reply = await chat(cleanText, username);
  await sendLongMessage(ctx, reply);
  saveMessage(ctx.message!.message_id + 1, 0, 'bot', reply, true);
}

async function handleIdea(ctx: Context, topic: string, username: string): Promise<void> {
  if (!topic) { await ctx.reply('Usage: /idea <topic>'); return; }
  const reply = await chat(`Generate hackathon ideas about: ${topic}`, username);
  await sendLongMessage(ctx, reply);
  saveMessage(ctx.message!.message_id + 1, 0, 'bot', reply, true);
}

async function handleSummary(ctx: Context, username: string): Promise<void> {
  const messages = getRecentMessages(50).reverse();
  if (!messages.length) { await ctx.reply('Нет сообщений для саммари.'); return; }
  const conversation = messages.map(m => `${m.is_bot_response ? 'Bot' : m.username}: ${m.text}`).join('\n');
  const reply = await chatWithCustomPrompt('Summarize the key points, decisions, and action items. Be brief and structured.', conversation);
  await sendLongMessage(ctx, reply);
  saveMessage(ctx.message!.message_id + 1, 0, 'bot', reply, true);
}

async function handleContext(ctx: Context, args: string): Promise<void> {
  if (!args) {
    const allCtx = getAllContext();
    const lines = Object.entries(allCtx).map(([k, v]) => `${k}: ${v || '—'}`).join('\n');
    await ctx.reply(lines || 'Контекст пуст.');
    return;
  }
  if (args.startsWith('set ')) {
    const rest = args.slice(4).trim();
    const spaceIdx = rest.indexOf(' ');
    if (spaceIdx === -1) { await ctx.reply('Usage: /context set <key> <value>'); return; }
    const key = rest.slice(0, spaceIdx);
    const value = rest.slice(spaceIdx + 1);
    setContext(key, value);
    await ctx.reply(`Контекст обновлён: ${key}`);
    return;
  }
  await ctx.reply('Usage: /context или /context set <key> <value>');
}

async function handleReview(ctx: Context, args: string, username: string): Promise<void> {
  const code = args || ctx.message?.reply_to_message?.text;
  if (!code) { await ctx.reply('Usage: /review <code> или реплай на сообщение с кодом'); return; }
  const reply = await formatCodeReview(code, username);
  await sendLongMessage(ctx, reply);
  saveMessage(ctx.message!.message_id + 1, 0, 'bot', reply, true);
}

async function handleSearch(ctx: Context, query: string): Promise<void> {
  if (!query) { await ctx.reply('Usage: /search <query>'); return; }
  await ctx.reply('Ищу...');
  const results = await searchWeb(query);
  await sendLongMessage(ctx, results);
}

async function handlePdf(ctx: Context): Promise<void> {
  await ctx.reply('Генерирую PDF...');
  const pdfPath = await generatePdf();
  await ctx.replyWithDocument(new InputFile(pdfPath));
  fs.unlinkSync(pdfPath);
}

async function handleDecide(ctx: Context, decision: string, username: string): Promise<void> {
  if (!decision) { await ctx.reply('Usage: /decide <описание>'); return; }
  const id = addDecision(decision, username);
  await ctx.reply(`Решение #${id} зафиксировано: ${decision}`);
}

async function handleDecisions(ctx: Context): Promise<void> {
  const decisions = getDecisions();
  if (!decisions.length) { await ctx.reply('Решений нет. /decide <текст> чтобы добавить.'); return; }
  await sendLongMessage(ctx, decisions.map(d => `#${d.id} [${d.logged_by}]: ${d.description}`).join('\n'));
}

async function handleTask(ctx: Context, args: string): Promise<void> {
  if (!args) { await ctx.reply('Usage: /task <описание> [@assignee]'); return; }
  const mentionMatch = args.match(/@(\w+)/);
  const assignee = mentionMatch?.[1];
  const description = args.replace(/@\w+/g, '').trim();
  const id = addTask(description, assignee);
  await ctx.reply(`Задача #${id}: ${description}${assignee ? ` → @${assignee}` : ''}`);
}

async function handleTasks(ctx: Context): Promise<void> {
  const tasks = getTasks();
  if (!tasks.length) { await ctx.reply('Открытых задач нет. /task <текст> чтобы создать.'); return; }
  await sendLongMessage(ctx, tasks.map(t => `#${t.id}: ${t.description}${t.assigned_to ? ` [@${t.assigned_to}]` : ''}`).join('\n'));
}

async function handleDone(ctx: Context, args: string): Promise<void> {
  const id = parseInt(args, 10);
  if (isNaN(id)) { await ctx.reply('Usage: /done <id>'); return; }
  await ctx.reply(completeTask(id) ? `Задача #${id} выполнена!` : `Задача #${id} не найдена.`);
}

async function handleStandup(ctx: Context): Promise<void> {
  const oneDayAgo = Date.now() - 86_400_000;
  const messages = getMessagesSince(oneDayAgo);
  const tasks = getTasks();
  const decisions = getDecisions().filter(d => d.timestamp > oneDayAgo);
  const prompt = `Generate a brief async standup summary:
Messages: ${messages.map(m => `${m.username}: ${m.text}`).join('\n') || 'none'}
Open tasks: ${tasks.map(t => `- ${t.description}`).join('\n') || 'none'}
Decisions: ${decisions.map(d => `- ${d.description}`).join('\n') || 'none'}
Format: What was discussed, Key decisions, Open items.`;
  const reply = await chatWithCustomPrompt('You are a standup summarizer. Be concise and actionable.', prompt);
  await sendLongMessage(ctx, reply);
}

async function handleArch(ctx: Context): Promise<void> {
  const arch = getAllContext()['architecture_summary'] ?? 'Не задана.';
  const stack = getAllContext()['tech_stack'] ?? '';
  await ctx.reply(`Архитектура:\n${arch}\n\nСтек: ${stack}`);
}

async function handleReset(ctx: Context): Promise<void> {
  const { getDB } = await import('./context');
  getDB().exec('DELETE FROM messages');
  await ctx.reply('История чата очищена. Контекст проекта сохранён.');
}

async function handleHelp(ctx: Context): Promise<void> {
  await ctx.reply(`/idea <topic> — идеи
/summary — саммари обсуждения
/context — контекст проекта
/context set <key> <value> — обновить контекст
/review <code> — ревью кода
/search <query> — поиск
/pdf — PDF саммари
/decide <text> — зафиксировать решение
/decisions — список решений
/task <text> — создать задачу
/tasks — открытые задачи
/done <id> — закрыть задачу
/standup — стендап саммари
/arch — архитектура
/reset — очистить историю`);
}

async function sendLongMessage(ctx: Context, text: string): Promise<void> {
  const MAX_LEN = 4000;
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= MAX_LEN) { chunks.push(remaining); break; }
    let splitAt = remaining.lastIndexOf('\n', MAX_LEN);
    if (splitAt === -1 || splitAt < MAX_LEN / 2) splitAt = MAX_LEN;
    chunks.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt);
  }
  for (const chunk of chunks) await ctx.reply(chunk);
}
