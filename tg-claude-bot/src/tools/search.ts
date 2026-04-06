const BRAVE_API_KEY = process.env.BRAVE_API_KEY ?? '';

interface BraveResult { title: string; url: string; description: string; }

export async function searchWeb(query: string): Promise<string> {
  if (!BRAVE_API_KEY) return `Search unavailable (no BRAVE_API_KEY). Query: "${query}"`;
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query + ' Solana RWA')}&count=3`;
  const res = await fetch(url, { headers: { Accept: 'application/json', 'X-Subscription-Token': BRAVE_API_KEY } });
  if (!res.ok) return `Search failed: ${res.status}`;
  const data = await res.json() as { web?: { results?: BraveResult[] } };
  const results = data.web?.results ?? [];
  if (!results.length) return 'No results found.';
  return results.slice(0, 3).map((r, i) => `${i + 1}. ${r.title}\n   ${r.url}\n   ${r.description}`).join('\n\n');
}
