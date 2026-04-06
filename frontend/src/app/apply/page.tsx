"use client";

import { useState } from "react";

const ASSET_TYPES = ["Treasury", "Corporate Bond", "Money Market", "Commodity", "Other"];
const AUM_RANGES = ["<$10M", "$10M – $100M", "$100M – $1B", ">$1B"];
const STEPS = ["Institution", "Product", "Review"] as const;

const STACK_POINTS = [
  {
    step: "01",
    title: "Register your Token-2022 mint",
    body: "Deploy a mint with InterestBearingMint + TransferHook + ConfidentialTransfer extensions active. ProofLayer assigns your attestor and wires the hook.",
  },
  {
    step: "02",
    title: "Publish your first attestation",
    body: "Your attestor signs NAV, yield rate, and a custody proof hash every 24h. The ProofLayer registry makes it machine-readable to any Solana program.",
  },
  {
    step: "03",
    title: "Go live with DeFi integrations",
    body: "Your token is immediately composable with Kamino (collateral), Meteora (liquidity pools), and Jupiter (single-tx minting from any SPL token).",
  },
];

export default function ApplyPage() {
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    institution: "",
    contact: "",
    email: "",
    jurisdiction: "",
    assetType: "Treasury",
    aum: "$10M – $100M",
    description: "",
    heardFrom: "",
  });

  function update(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function nextStep() {
    setStep((s) => Math.min(s + 1, 2));
  }
  function prevStep() {
    setStep((s) => Math.max(s - 1, 0));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[var(--color-text-muted)] mb-4">
            Application Received
          </p>
          <h1 className="text-6xl font-extrabold uppercase tracking-tight text-black leading-none mb-6">
            We&apos;ll be in touch.
          </h1>
          <p className="text-base text-[var(--color-text-secondary)] leading-relaxed mb-8">
            Your application for <span className="font-bold text-black">{form.institution}</span> has been submitted. Our team reviews every application within 48 hours and will reach out to <span className="font-bold text-black">{form.email}</span> with next steps.
          </p>
          <div className="border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-5 space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-3">What happens next</p>
            {[
              "Technical review of your asset structure and jurisdiction",
              "Intro call with the ProofLayer integration team",
              "Deploy Token-2022 mint with extensions configured",
              "Attestor setup and first on-chain attestation",
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-xs font-extrabold font-mono text-[var(--color-text-muted)] shrink-0 mt-0.5">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-sm text-[var(--color-text-secondary)]">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_480px] gap-16 items-start">

        {/* Left — pitch */}
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-[var(--color-text-muted)] mb-4">
            Institutional Onboarding
          </p>
          <h1 className="text-6xl xl:text-7xl font-extrabold uppercase tracking-tight text-black leading-none mb-6">
            Launch on<br />ProofLayer
          </h1>
          <p className="text-base text-[var(--color-text-secondary)] max-w-lg leading-relaxed mb-10">
            From Token-2022 mint to live yield-bearing RWA product with native compliance enforcement and DeFi composability — in three steps.
          </p>

          <div className="space-y-0">
            {STACK_POINTS.map((pt, i) => (
              <div key={pt.step} className={`flex gap-5 py-6 ${i < STACK_POINTS.length - 1 ? "border-b border-[var(--color-border)]" : ""}`}>
                <span className="text-sm font-extrabold font-mono text-[var(--color-text-muted)] shrink-0 mt-0.5 w-6">
                  {pt.step}
                </span>
                <div>
                  <p className="text-base font-extrabold uppercase tracking-wide text-black mb-1">
                    {pt.title}
                  </p>
                  <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                    {pt.body}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Token-2022 stack badges */}
          <div className="mt-10 pt-8 border-t border-[var(--color-border)]">
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-4">
              Token-2022 Extensions
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                "InterestBearingMint",
                "TransferHook",
                "ConfidentialTransfer",
              ].map((ext) => (
                <span key={ext} className="text-xs font-bold uppercase tracking-widest border border-black text-black px-3 py-1.5">
                  {ext}
                </span>
              ))}
            </div>
          </div>

          {/* Fee structure */}
          <div className="mt-8 grid grid-cols-2 gap-3">
            <div className="border border-[var(--color-border)] px-4 py-4">
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-1">Issuance Fee</p>
              <p className="text-2xl font-extrabold text-black">0.1<span className="text-base">% TVL</span></p>
            </div>
            <div className="border border-[var(--color-border)] px-4 py-4">
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-1">Protocol Fee</p>
              <p className="text-2xl font-extrabold text-black">5<span className="text-base">bps DeFi</span></p>
            </div>
          </div>
        </div>

        {/* Right — form */}
        <div className="border border-[var(--color-border)] bg-white">

          {/* Step indicator */}
          <div className="flex border-b border-[var(--color-border)]">
            {STEPS.map((label, i) => (
              <div
                key={label}
                className={`flex-1 px-4 py-3 text-center text-xs font-bold uppercase tracking-widest transition-colors ${
                  i === step
                    ? "bg-black text-white"
                    : i < step
                      ? "bg-[var(--color-surface)] text-[var(--color-text-muted)]"
                      : "bg-white text-[var(--color-text-muted)]"
                } ${i < 2 ? "border-r border-[var(--color-border)]" : ""}`}
              >
                {String(i + 1).padStart(2, "0")} {label}
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="px-6 py-6 space-y-5">

              {/* Step 0 — Institution */}
              {step === 0 && (
                <>
                  <Field label="Institution Name" required>
                    <input
                      type="text"
                      value={form.institution}
                      onChange={(e) => update("institution", e.target.value)}
                      placeholder="Acme Capital Management"
                      required
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Contact Name" required>
                    <input
                      type="text"
                      value={form.contact}
                      onChange={(e) => update("contact", e.target.value)}
                      placeholder="Jane Smith"
                      required
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Email Address" required>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => update("email", e.target.value)}
                      placeholder="jane@acmecapital.com"
                      required
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Jurisdiction">
                    <input
                      type="text"
                      value={form.jurisdiction}
                      onChange={(e) => update("jurisdiction", e.target.value)}
                      placeholder="United States, Cayman Islands…"
                      className={inputCls}
                    />
                  </Field>
                </>
              )}

              {/* Step 1 — Product */}
              {step === 1 && (
                <>
                  <Field label="Asset Type" required>
                    <div className="grid grid-cols-2 gap-2">
                      {ASSET_TYPES.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => update("assetType", t)}
                          className={`px-3 py-2.5 text-xs font-bold uppercase tracking-wide border text-left transition-colors ${
                            form.assetType === t
                              ? "bg-black border-black text-white"
                              : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-black hover:text-black"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </Field>
                  <Field label="AUM Estimate" required>
                    <div className="grid grid-cols-2 gap-2">
                      {AUM_RANGES.map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => update("aum", r)}
                          className={`px-3 py-2.5 text-xs font-bold uppercase tracking-wide border text-left transition-colors ${
                            form.aum === r
                              ? "bg-black border-black text-white"
                              : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-black hover:text-black"
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </Field>
                  <Field label="Product Description">
                    <textarea
                      value={form.description}
                      onChange={(e) => update("description", e.target.value)}
                      placeholder="Brief description of the product you want to launch on ProofLayer…"
                      rows={4}
                      className={`${inputCls} resize-none`}
                    />
                  </Field>
                  <Field label="How did you hear about us?">
                    <input
                      type="text"
                      value={form.heardFrom}
                      onChange={(e) => update("heardFrom", e.target.value)}
                      placeholder="Twitter, Colosseum, referral…"
                      className={inputCls}
                    />
                  </Field>
                </>
              )}

              {/* Step 2 — Review */}
              {step === 2 && (
                <div className="space-y-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-4">
                    Review your application
                  </p>
                  {[
                    { label: "Institution", value: form.institution },
                    { label: "Contact", value: `${form.contact} · ${form.email}` },
                    { label: "Jurisdiction", value: form.jurisdiction || "—" },
                    { label: "Asset Type", value: form.assetType },
                    { label: "AUM", value: form.aum },
                    { label: "Description", value: form.description || "—" },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex gap-4 py-3 border-b border-[var(--color-border-subtle)] last:border-b-0">
                      <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)] w-28 shrink-0 pt-0.5">
                        {label}
                      </span>
                      <span className="text-sm font-medium text-black break-all">{value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer nav */}
            <div className={`px-6 pb-6 flex gap-3 ${step > 0 ? "justify-between" : "justify-end"}`}>
              {step > 0 && (
                <button
                  type="button"
                  onClick={prevStep}
                  className="px-5 py-3 text-xs font-extrabold uppercase tracking-widest border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-black hover:text-black transition-colors"
                >
                  Back
                </button>
              )}
              {step < 2 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  disabled={step === 0 && (!form.institution || !form.contact || !form.email)}
                  className="flex-1 py-3 text-sm font-extrabold uppercase tracking-widest bg-black text-white hover:bg-[var(--color-text-secondary)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              ) : (
                <button
                  type="submit"
                  className="flex-1 py-3 text-sm font-extrabold uppercase tracking-widest bg-black text-white hover:bg-[var(--color-text-secondary)] transition-colors"
                >
                  Submit Application
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full px-4 py-3 border border-[var(--color-border)] bg-white text-sm font-mono text-black placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-black transition-colors";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-widest text-black mb-2">
        {label}
        {required && <span className="text-[var(--color-danger)] ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}
