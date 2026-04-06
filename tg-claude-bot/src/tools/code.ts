import { chatWithCustomPrompt } from '../ai';

export async function formatCodeReview(code: string, username: string): Promise<string> {
  return chatWithCustomPrompt(
    `You are a senior code reviewer for a Solana hackathon team. Review with awareness of:
- Solana account model, PDAs, CPIs, Anchor framework
- TypeScript/Rust best practices
- Security (reentrancy, authority checks, overflow)
- Compute unit optimization
Be concise. Bullet points. Critical issues first.`,
    `Review this code from ${username}:\n\n${code}`
  );
}
