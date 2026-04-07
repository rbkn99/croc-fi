"use client";
export const dynamic = "force-dynamic";

import { useIssuerApplications } from "@/lib/api/hooks";

interface IssuerApplication {
  id: string;
  mintPubkey: string;
  issuerWallet: string;
  institutionName: string;
  contactName: string;
  email: string;
  jurisdiction?: string;
  assetType: string;
  aumEstimate?: string;
  description?: string;
  logoUrl?: string;
  minMintAmount: number;
  minRedeemAmount: number;
  createdAt: string;
}

function shortenKey(key: string) {
  return `${key.slice(0, 6)}…${key.slice(-4)}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function ApplicationsPage() {
  const { data, isLoading } = useIssuerApplications();
  const apps = ((data as { applications?: IssuerApplication[] })?.applications ?? []) as IssuerApplication[];

  return (
    <div className="flex-1 min-w-0 p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[var(--color-text-muted)] mb-1">Issuer Portal</p>
          <h1 className="text-3xl font-extrabold uppercase tracking-tight text-[var(--color-text)]">Applications</h1>
        </div>
        <span className="text-xs font-mono text-[var(--color-text-muted)]">{apps.length} total</span>
      </div>

      {isLoading ? (
        <p className="text-xs font-mono tracking-widest text-[var(--color-text-muted)] py-10">Loading…</p>
      ) : apps.length === 0 ? (
        <div className="border border-[var(--color-border)] bg-white px-8 py-16 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-2">No applications yet</p>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Submitted asset deployments will appear here.
          </p>
        </div>
      ) : (
        <div className="border border-[var(--color-border)] bg-white divide-y divide-[var(--color-border)]">
          {/* Header row */}
          <div className="grid grid-cols-[1.5fr_0.8fr_1fr_0.8fr_1.2fr] gap-4 px-5 py-3 bg-[var(--color-surface)]">
            {["Institution", "Asset Type", "Mint", "Submitted", "Contact"].map((h) => (
              <span key={h} className="text-[0.65rem] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">{h}</span>
            ))}
          </div>

          {apps.map((app) => (
            <div key={app.id} className="grid grid-cols-[1.5fr_0.8fr_1fr_0.8fr_1.2fr] gap-4 px-5 py-4 items-start hover:bg-[var(--color-surface)] transition-colors">
              {/* Institution */}
              <div>
                <p className="text-sm font-bold text-[var(--color-text)]">{app.institutionName}</p>
                {app.jurisdiction && (
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{app.jurisdiction}</p>
                )}
                {app.aumEstimate && (
                  <p className="text-xs text-[var(--color-text-muted)]">AUM: {app.aumEstimate}</p>
                )}
              </div>

              {/* Asset type */}
              <div>
                <span className="text-xs font-bold uppercase tracking-widest border border-[var(--color-border)] px-2 py-0.5 text-[var(--color-text-secondary)]">
                  {app.assetType}
                </span>
              </div>

              {/* Mint pubkey */}
              <div>
                <p className="text-xs font-mono text-[var(--color-text-muted)]">{shortenKey(app.mintPubkey)}</p>
                <p className="text-[0.65rem] font-mono text-[var(--color-text-muted)] mt-0.5">{shortenKey(app.issuerWallet)}</p>
              </div>

              {/* Date */}
              <p className="text-xs text-[var(--color-text-muted)]">{formatDate(app.createdAt)}</p>

              {/* Contact */}
              <div>
                <p className="text-xs font-bold text-[var(--color-text)]">{app.contactName}</p>
                <a href={`mailto:${app.email}`} className="text-xs text-[var(--color-accent)] hover:underline">
                  {app.email}
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
