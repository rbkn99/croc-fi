import dotenv from 'dotenv';
dotenv.config({ override: true });

import { initDB } from './context';
import { createBot } from './bot';

async function main() {
  console.log(`[${new Date().toISOString()}] Starting TG Claude Bot...`);
  console.log(`[${new Date().toISOString()}] ANTHROPIC_API_KEY set: ${!!process.env.ANTHROPIC_API_KEY}`);
  initDB();
  const bot = createBot();
  await bot.start({
    onStart: () => console.log(`[${new Date().toISOString()}] Bot is running (polling mode)`),
  });
}

main().catch((err) => { console.error('Fatal error:', err); process.exit(1); });
