"use client";

import { AssetMetadata } from "@/lib/api/types";

interface LegalDocsTabProps {
  meta: AssetMetadata;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  prospectus: "Prospectus / PPM",
  fact_sheet: "Fact Sheet",
  audit_report: "Audit Report",
  legal_opinion: "Legal Opinion",
  subscription_agreement: "Subscription Agreement",
  tax_memo: "Tax Memo",
  other: "Other",
};

const DOC_TYPE_COLORS: Record<string, string> = {
  prospectus: "bg-blue-50 text-blue-700 border-blue-200",
  fact_sheet: "bg-emerald-50 text-emerald-700 border-emerald-200",
  audit_report: "bg-purple-50 text-purple-700 border-purple-200",
  legal_opinion: "bg-amber-50 text-amber-700 border-amber-200",
  subscription_agreement: "bg-pink-50 text-pink-700 border-pink-200",
  tax_memo: "bg-gray-50 text-gray-700 border-gray-200",
  other: "bg-gray-50 text-gray-600 border-gray-200",
};

export function LegalDocsTab({ meta }: LegalDocsTabProps) {
  return (
    <div className="space-y-8">
      {/* Legal Structure */}
      <section>
        <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3 uppercase tracking-wider">
          Legal Structure
        </h3>
        <div className="bg-white rounded-xl border border-[var(--color-border)] divide-y divide-[var(--color-border)]">
          <Row label="Vehicle Type" value={meta.legalStructure.vehicleType} />
          <Row label="Entity Name" value={meta.legalStructure.entityName} />
          <Row label="Jurisdiction" value={meta.legalStructure.jurisdiction} />
          {meta.legalStructure.regulator && (
            <Row label="Regulator" value={meta.legalStructure.regulator} />
          )}
          {meta.legalStructure.registrationNumber && (
            <Row
              label="Registration #"
              value={meta.legalStructure.registrationNumber}
              mono
            />
          )}
          {meta.legalStructure.inceptionDate && (
            <Row label="Inception Date" value={meta.legalStructure.inceptionDate} />
          )}
          {meta.legalStructure.taxTreatment && (
            <Row label="Tax Treatment" value={meta.legalStructure.taxTreatment} />
          )}
        </div>
      </section>

      {/* Investor Restrictions */}
      <section>
        <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3 uppercase tracking-wider">
          Investor Restrictions
        </h3>
        <div className="bg-white rounded-xl border border-[var(--color-border)] px-4 py-3">
          <ul className="space-y-2">
            {meta.legalStructure.investorRestrictions.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-[var(--color-text-secondary)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] mt-1.5 shrink-0" />
                {r}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Documents */}
      <section>
        <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3 uppercase tracking-wider">
          Documents
        </h3>
        <div className="space-y-2">
          {meta.documents.map((doc, i) => (
            <a
              key={i}
              href={doc.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between bg-white rounded-xl border border-[var(--color-border)] px-4 py-3 hover:border-[var(--color-primary)]/30 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[var(--color-surface-secondary)] flex items-center justify-center text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)] transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors">
                    {doc.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className={`inline-block px-1.5 py-0.5 text-[10px] font-semibold rounded border ${
                        DOC_TYPE_COLORS[doc.type] || DOC_TYPE_COLORS.other
                      }`}
                    >
                      {DOC_TYPE_LABELS[doc.type] || doc.type}
                    </span>
                    {doc.publishedAt && (
                      <span className="text-[10px] text-[var(--color-text-muted)]">
                        {doc.publishedAt}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {doc.hash && (
                  <span
                    className="text-[10px] font-mono text-[var(--color-text-muted)] hidden sm:block"
                    title={`SHA-256: ${doc.hash}`}
                  >
                    {doc.hash.slice(0, 8)}...
                  </span>
                )}
                <svg className="w-4 h-4 text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* Links */}
      {(meta.links.website || meta.links.explorer || meta.links.github) && (
        <section>
          <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3 uppercase tracking-wider">
            Links
          </h3>
          <div className="flex flex-wrap gap-2">
            {meta.links.website && (
              <LinkPill href={meta.links.website} label="Website" />
            )}
            {meta.links.explorer && (
              <LinkPill href={meta.links.explorer} label="Explorer" />
            )}
            {meta.links.github && (
              <LinkPill href={meta.links.github} label="GitHub" />
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between px-4 py-3 gap-4">
      <span className="text-xs text-[var(--color-text-muted)] shrink-0">
        {label}
      </span>
      <span
        className={`text-sm text-right text-[var(--color-text-secondary)] ${
          mono ? "font-mono" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function LinkPill({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]/30 hover:text-[var(--color-primary)] transition-colors"
    >
      {label}
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    </a>
  );
}
