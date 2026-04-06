import { Bot } from 'grammy';
import { saveMessage } from './context';
import { handleCommand, handleMention, handleDocument } from './router';
import { isRateLimited } from './ratelimit';

const BOT_USERNAME = (process.env.BOT_USERNAME ?? '').replace(/^@/, '');
const ALLOWED_CHATS = new Set(
  (process.env.CHAT_ID ?? '').split(',').map(s => s.trim()).filter(Boolean)
);

function isAllowed(chatId: number): boolean {
  return ALLOWED_CHATS.size === 0 || ALLOWED_CHATS.has(chatId.toString());
}

function isMentioned(text: string, entities: { type: string; offset: number; length: number }[]): boolean {
  if (!BOT_USERNAME) return false;
  const byEntity = entities.some((e) => {
    if (e.type === 'mention') {
      const m = text.slice(e.offset, e.offset + e.length);
      return m.toLowerCase() === `@${BOT_USERNAME.toLowerCase()}`;
    }
    return false;
  });
  return byEntity || new RegExp(`@${BOT_USERNAME}`, 'i').test(text);
}

export function createBot(): Bot {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not set');

  const bot = new Bot(token);

  bot.api.setMyCommands([
    { command: 'idea', description: 'Brainstorm ideas — /idea <topic>' },
    { command: 'summary', description: 'Summarize recent discussion' },
    { command: 'context', description: 'Show/update project context' },
    { command: 'review', description: 'Code review — /review <code>' },
    { command: 'search', description: 'Web search — /search <query>' },
    { command: 'pdf', description: 'Generate PDF summary' },
    { command: 'decide', description: 'Log a decision — /decide <text>' },
    { command: 'decisions', description: 'List all decisions' },
    { command: 'task', description: 'Create a task — /task <text>' },
    { command: 'tasks', description: 'List open tasks' },
    { command: 'done', description: 'Complete a task — /done <id>' },
    { command: 'standup', description: 'Async standup summary' },
    { command: 'arch', description: 'Show architecture' },
    { command: 'reset', description: 'Clear chat history' },
    { command: 'help', description: 'Show all commands' },
  ]).then(() => console.log(`[${new Date().toISOString()}] Commands registered`))
    .catch((err) => console.error(`[${new Date().toISOString()}] Commands registration failed:`, err));

  // Text messages
  bot.on('message:text', async (ctx) => {
    const msg = ctx.message;
    const text = msg.text;
    const userId = msg.from.id;
    const username = msg.from.username ?? msg.from.first_name ?? 'unknown';
    const chatId = ctx.chat.id;

    console.log(`[${new Date().toISOString()}] text from ${username}(${userId}) in ${chatId}: ${text.slice(0, 80)}`);
    if (!isAllowed(chatId)) return;
    if (isRateLimited(userId)) return;

    saveMessage(msg.message_id, userId, username, text, false);

    if (text.startsWith('/')) { await handleCommand(ctx); return; }

    try {
      const { isRelevant } = await import('./ai');
      console.log(`[${new Date().toISOString()}] Checking relevance...`);
      const relevant = await isRelevant(text);
      console.log(`[${new Date().toISOString()}] Relevant: ${relevant}`);
      if (relevant) await handleMention(ctx, text);
    } catch (err) {
      console.error(`[${new Date().toISOString()}] Error processing text:`, err);
    }
  });

  // Documents — no rate limit per-file, each processed independently
  bot.on('message:document', async (ctx) => {
    const msg = ctx.message;
    const userId = msg.from.id;
    const username = msg.from.username ?? msg.from.first_name ?? 'unknown';
    const chatId = ctx.chat.id;
    const doc = msg.document;
    const caption = msg.caption ?? '';

    console.log(`[${new Date().toISOString()}] document from ${username}(${userId}) in ${chatId}: ${doc.file_name}`);
    if (!isAllowed(chatId)) return;

    saveMessage(msg.message_id, userId, username, `[file: ${doc.file_name}] ${caption}`, false);

    try {
      const { isRelevant } = await import('./ai');
      const hint = `File: ${doc.file_name}. ${caption}`.trim();
      console.log(`[${new Date().toISOString()}] Checking doc relevance: ${hint}`);
      const relevant = await isRelevant(hint);
      console.log(`[${new Date().toISOString()}] Doc relevant: ${relevant}`);
      if (relevant) await handleDocument(ctx, doc, caption, username);
    } catch (err) {
      console.error(`[${new Date().toISOString()}] Error processing document:`, err);
    }
  });

  // Photos
  bot.on('message:photo', async (ctx) => {
    const msg = ctx.message;
    const userId = msg.from.id;
    const username = msg.from.username ?? msg.from.first_name ?? 'unknown';
    const chatId = ctx.chat.id;
    const caption = msg.caption ?? '';

    console.log(`[${new Date().toISOString()}] photo from ${username}(${userId}) in ${chatId}`);
    if (!isAllowed(chatId)) return;
    if (isRateLimited(userId)) return;

    saveMessage(msg.message_id, userId, username, `[photo] ${caption}`, false);

    if (caption && isMentioned(caption, msg.caption_entities ?? [])) {
      const { chat: aiChat } = await import('./ai');
      const reply = await aiChat(`User shared a photo with caption: "${caption}". Respond in context of the hackathon.`, username);
      await ctx.reply(reply);
    }
  });

  // Stickers — just log
  bot.on('message:sticker', async (ctx) => {
    const msg = ctx.message;
    const username = msg.from.username ?? msg.from.first_name ?? 'unknown';
    saveMessage(msg.message_id, msg.from.id, username, `[sticker: ${msg.sticker.emoji ?? ''}]`, false);
  });

  // Voice / audio — acknowledge
  bot.on('message:voice', async (ctx) => {
    const msg = ctx.message;
    const userId = msg.from.id;
    const username = msg.from.username ?? msg.from.first_name ?? 'unknown';
    const chatId = ctx.chat.id;

    if (!isAllowed(chatId)) return;
    if (isRateLimited(userId)) return;

    saveMessage(msg.message_id, userId, username, '[voice message]', false);
    await ctx.reply('Голосовые сообщения пока не поддерживаю, скинь текстом.');
  });

  bot.catch((err) => {
    console.error(`[${new Date().toISOString()}] Bot error:`, err);
  });

  return bot;
}
