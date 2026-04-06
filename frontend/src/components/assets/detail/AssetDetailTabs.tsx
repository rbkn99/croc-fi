"use client";

import { useState } from "react";
import { Product } from "@/lib/api/types";
import { useAssetMeta } from "@/lib/api/hooks";
import { OverviewTab } from "./OverviewTab";
import { AttestationTab } from "./AttestationTab";
import { LegalDocsTab } from "./LegalDocsTab";
import { PolicyTab } from "./PolicyTab";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "attestation", label: "Attestation" },
  { key: "legal", label: "Legal & Docs" },
  { key: "policy", label: "Policy" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

interface AssetDetailTabsProps {
  product: Product;
}

export function AssetDetailTabs({ product }: AssetDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const { data: meta, isLoading } = useAssetMeta(product.id);

  return (
    <div className="mt-8">
      {/* Tab bar */}
      <div className="flex border-b border-[var(--color-border)] mb-6 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-3 text-sm font-bold uppercase tracking-widest whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? "text-black border-b-2 border-black"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {isLoading && activeTab !== "attestation" && activeTab !== "policy" && (
        <div className="py-12 text-center text-sm text-[var(--color-text-muted)]">
          Loading asset details...
        </div>
      )}

      {activeTab === "overview" && meta && <OverviewTab meta={meta} />}
      {activeTab === "attestation" && <AttestationTab product={product} />}
      {activeTab === "legal" && meta && <LegalDocsTab meta={meta} />}
      {activeTab === "policy" && <PolicyTab assetId={product.id} />}

      {!isLoading &&
        !meta &&
        (activeTab === "overview" || activeTab === "legal") && (
          <div className="py-12 text-center text-sm text-[var(--color-text-muted)]">
            Asset metadata unavailable — backend may be offline
          </div>
        )}
    </div>
  );
}
