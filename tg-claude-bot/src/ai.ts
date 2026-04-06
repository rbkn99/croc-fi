import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { getAllContext, getRecentMessages } from './context';

let client: Anthropic;
function getClient(): Anthropic {
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

const SYSTEM_PROMPT_PATH = path.join(process.cwd(), 'prompts', 'system.md');
const HISTORY_LIMIT = 20;

function loadSystemPrompt(): string {
  try { return fs.readFileSync(SYSTEM_PROMPT_PATH, 'utf-8'); }
  catch { return 'You are a helpful hackathon team assistant.'; }
}

function buildSystemMessage(): string {
  const template = loadSystemPrompt();
  const ctx = getAllContext();
  const contextBlock = Object.entries(ctx).map(([k, v]) => `- ${k}: ${v}`).join('\n');
  const messages = getRecentMessages(HISTORY_LIMIT).reverse();
  const historyBlock = messages.map(m => `${m.is_bot_response ? 'Bot' : m.username}: ${m.text}`).join('\n');
  return template.replace('{project_context}', contextBlock).replace('{history}', historyBlock);
}

export async function chat(userMessage: string, username: string): Promise<string> {
  const response = await getClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: buildSystemMessage(),
    messages: [{ role: 'user', content: `[${username}]: ${userMessage}` }],
  });
  const textBlock = response.content.find(b => b.type === 'text');
  return textBlock?.text ?? 'No response generated.';
}

export async function isRelevant(text: string): Promise<boolean> {
  const response = await getClient().messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 10,
    system: `You are a relevance filter for a Solana/RWA hackathon team chat assistant named Герман.
Reply with only "yes" or "no".
Reply "yes" if the message:
- asks a question or requests help
- discusses tech, code, architecture, Solana, blockchain, RWA, tokenization
- shares a document, file, or link worth analyzing
- discusses project tasks, decisions, deadlines, team work
- is directed at the assistant or asks for an opinion
Reply "no" if the message:
- is casual small talk with no actionable content
- is a joke, meme, or irrelevant banter
- is a one-word reaction or emoji
- is clearly off-topic (personal chat, unrelated news)`,
    messages: [{ role: 'user', content: text }],
  });
  const answer = (response.content.find(b => b.type === 'text')?.text ?? 'no').toLowerCase().trim();
  return answer.startsWith('yes');
}

export async function chatWithCustomPrompt(systemPromptOverride: string, userMessage: string): Promise<string> {
  const response = await getClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: systemPromptOverride,
    messages: [{ role: 'user', content: userMessage }],
  });
  const textBlock = response.content.find(b => b.type === 'text');
  return textBlock?.text ?? 'No response generated.';
}
