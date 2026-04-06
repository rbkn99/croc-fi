import { loadConfig } from "@prooflayer/shared";

export interface YieldData {
  rateBps: number;
  source: string;
  fetchedAt: Date;
}

export async function fetchTreasuryRate(): Promise<YieldData> {
  const config = loadConfig();

  const url = `${config.treasuryDirectApiUrl}?sort=-record_date&page[size]=1&filter=security_desc:eq:Treasury Bills`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Treasury Direct API error: ${res.status}`);
  }

  const data = (await res.json()) as { data?: Array<{ avg_interest_rate_amt: string }> };
  const record = data.data?.[0];

  if (!record) {
    throw new Error("No Treasury rate data found");
  }

  const ratePct = parseFloat(record.avg_interest_rate_amt);
  const rateBps = Math.round(ratePct * 100);

  return {
    rateBps,
    source: "treasury_direct",
    fetchedAt: new Date(),
  };
}

export async function fetchPythSofrRate(): Promise<YieldData> {
  const config = loadConfig();
  const feedId = config.pythSofrFeedId;

  if (!feedId) {
    throw new Error("PYTH_SOFR_FEED_ID not configured");
  }

  const url = `https://hermes.pyth.network/v2/updates/price/latest?ids[]=${feedId}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Pyth Hermes API error: ${res.status}`);
  }

  const data = (await res.json()) as {
    parsed?: Array<{
      price?: { price: string; expo: number };
    }>;
  };

  const priceData = data.parsed?.[0]?.price;
  if (!priceData) {
    throw new Error("No Pyth SOFR price data found");
  }

  // Pyth price: integer * 10^expo. SOFR is ~5.3% → price ~530 with expo -2
  const rateRaw = parseInt(priceData.price, 10);
  const expo = priceData.expo;
  const ratePct = rateRaw * Math.pow(10, expo);
  const rateBps = Math.round(ratePct * 100);

  return {
    rateBps,
    source: "pyth_sofr",
    fetchedAt: new Date(),
  };
}

export async function fetchYieldRate(): Promise<YieldData> {
  try {
    return await fetchTreasuryRate();
  } catch (err) {
    console.warn("Treasury Direct API failed, trying Pyth SOFR...", err);
    return await fetchPythSofrRate();
  }
}
