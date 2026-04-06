import { NAV_BPS_SCALE } from "@prooflayer/shared";

export interface CustodianData {
  totalAssets: number;
  totalShares: number;
  lastUpdated: Date;
}

export function computeNav(custodianData: CustodianData): number {
  if (custodianData.totalShares === 0) {
    return NAV_BPS_SCALE; // 1.00
  }

  return Math.round(
    (custodianData.totalAssets / custodianData.totalShares) * NAV_BPS_SCALE
  );
}

export async function fetchCustodianData(): Promise<CustodianData> {
  // TODO: integrate with actual custodian API
  // For MVP, returns simulated data
  return {
    totalAssets: 1_002_300,
    totalShares: 1_000_000,
    lastUpdated: new Date(),
  };
}
