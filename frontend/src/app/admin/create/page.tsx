"use client";
export const dynamic = "force-dynamic";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSelectedWalletAccount } from "@solana/react";
import { useWallets, useConnect } from "@wallet-standard/react";
import { StandardConnect } from "@wallet-standard/features";
import { useCreateAsset } from "@/lib/solana/hooks";
import { registerAsset, uploadDocument } from "@/lib/api/client";
import { toast } from "sonner";

const JURISDICTIONS = [
  "United States", "United Kingdom", "Cayman Islands", "British Virgin Islands",
  "Luxembourg", "Ireland", "Singapore", "Switzerland", "Liechtenstein",
  "Malta", "Gibraltar", "Bermuda", "Bahamas", "Jersey", "Guernsey",
  "Netherlands", "Germany", "France", "UAE", "Hong Kong", "Japan",
  "Australia", "Canada", "South Korea", "Brazil", "Panama", "Seychelles",
];

const ASSET_TYPES = [
  { value: "Treasury", label: "Treasury", desc: "US Treasury bills, notes, bonds" },
  { value: "CorporateBond", label: "Corporate Bond", desc: "Investment-grade corporate debt" },
  { value: "MoneyMarket", label: "Money Market", desc: "Short-term lending and yield" },
  { value: "Commodity", label: "Commodity", desc: "Tokenized physical commodities" },
];

const AUM_RANGES = ["<$10M", "$10M-$100M", "$100M-$1B", ">$1B"];
const STEPS = ["Institution", "Product", "Deploy"] as const;

const STACK_POINTS = [
  { step: "01", title: "Fill in your details", body: "Institution info and product parameters. This metadata is stored with your on-chain asset." },
  { step: "02", title: "Deploy on-chain", body: "Connect wallet, sign one transaction. We create Token-2022 mint with TransferHook + InterestBearingMint and register it in ProofLayer." },
  { step: "03", title: "Configure & go live", body: "Set up attestors, whitelist investors, publish first NAV. Your token is immediately composable with Solana DeFi." },
];

export default function CreateAssetPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [account] = useSelectedWalletAccount();
  const connected = !!account;
  const createAsset = useCreateAsset();
  const allWallets = useWallets();
  const connectableWallets = allWallets
    .filter((w) => w.features.includes(StandardConnect))
    .filter((w, i, arr) => arr.findIndex((x) => x.name === w.name) === i);

  const [form, setForm] = useState({
    institution: "",
    contact: "",
    email: "",
    jurisdiction: "",
    assetType: "Treasury",
    aum: "$10M-$100M",
    description: "",
    minMintAmount: "",
    minRedeemAmount: "",
  });

  const [emailError, setEmailError] = useState("");
  const [jurisdictionQuery, setJurisdictionQuery] = useState("");
  const [jurisdictionOpen, setJurisdictionOpen] = useState(false);

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  async function handleLogoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoPreview(URL.createObjectURL(file));
    setLogoUploading(true);
    try {
      const result = await uploadDocument(file);
      setLogoUrl(result.url);
    } catch {
      toast.error("Image upload failed");
      setLogoPreview(null);
    } finally {
      setLogoUploading(false);
    }
  }

  function update(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function nextStep() {
    setStep((s) => Math.min(s + 1, 2));
  }
  function prevStep() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleDeploy() {
    if (!connected || !account) return;
    const toastId = toast.loading("Creating mint & registering asset...");
    try {
      const { signature: sig, mintPubkey } = await createAsset.mutateAsync({
        assetType: form.assetType,
        minMintAmount: form.minMintAmount ? Number(form.minMintAmount) : 0,
        minRedeemAmount: form.minRedeemAmount ? Number(form.minRedeemAmount) : 0,
        dailyMintLimit: 0,
        dailyRedeemLimit: 0,
      });

      // Save institution + product data to DB
      try {
        await registerAsset({
          mintPubkey,
          issuerWallet: String(account.address),
          institutionName: form.institution,
          contactName: form.contact,
          email: form.email,
          jurisdiction: form.jurisdiction || undefined,
          assetType: form.assetType,
          aumEstimate: form.aum || undefined,
          description: form.description || undefined,
          logoUrl: logoUrl || undefined,
          minMintAmount: form.minMintAmount ? Number(form.minMintAmount) : 0,
          minRedeemAmount: form.minRedeemAmount ? Number(form.minRedeemAmount) : 0,
        });
      } catch (regErr) {
        console.error("Failed to save metadata to DB:", regErr);
      }

      toast.success("Asset deployed!", { id: toastId, description: `Tx: ${String(sig).slice(0, 20)}...` });
      router.push("/admin");
    } catch (err) {
      console.error("Deploy failed:", err);
      toast.error("Deploy failed", { id: toastId, description: (err as Error).message });
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_520px] gap-16 items-start">

        {/* Left - pitch */}
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-[var(--color-text-muted)] mb-4">
            Launch your RWA token
          </p>
          <h1 className="text-6xl xl:text-7xl font-extrabold uppercase tracking-tight text-black leading-none mb-6">
            Issue on<br />ProofLayer
          </h1>
          <p className="text-base text-[var(--color-text-secondary)] max-w-lg leading-relaxed mb-10">
            From application to live yield-bearing RWA product with compliance enforcement — in one flow.
          </p>

          <div className="space-y-0">
            {STACK_POINTS.map((pt, i) => (
              <div key={pt.step} className={`flex gap-5 py-6 ${i < STACK_POINTS.length - 1 ? "border-b border-[var(--color-border)]" : ""}`}>
                <span className={`text-sm font-extrabold font-mono shrink-0 mt-0.5 w-6 ${step >= i ? "text-black" : "text-[var(--color-text-muted)]"}`}>
                  {pt.step}
                </span>
                <div>
                  <p className={`text-base font-extrabold uppercase tracking-wide mb-1 ${step >= i ? "text-black" : "text-[var(--color-text-muted)]"}`}>
                    {pt.title}
                  </p>
                  <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                    {pt.body}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 pt-8 border-t border-[var(--color-border)]">
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-4">
              Token-2022 Extensions
            </p>
            <div className="flex flex-wrap gap-2">
              {["InterestBearingMint", "TransferHook"].map((ext) => (
                <span key={ext} className="text-xs font-bold uppercase tracking-widest border border-black text-black px-3 py-1.5">
                  {ext}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right - form */}
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

          <div className="px-6 py-6 space-y-5">

            {/* Step 0 - Institution */}
            {step === 0 && (
              <>
                <Field label="Institution Name" required>
                  <input type="text" value={form.institution} onChange={(e) => update("institution", e.target.value)} placeholder="Acme Capital Management" required className={inputCls} />
                </Field>
                <Field label="Contact Name" required>
                  <input type="text" value={form.contact} onChange={(e) => update("contact", e.target.value)} placeholder="Jane Smith" required className={inputCls} />
                </Field>
                <Field label="Email Address" required>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => {
                      update("email", e.target.value);
                      const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.target.value);
                      setEmailError(e.target.value && !valid ? "Enter a valid email address" : "");
                    }}
                    onBlur={() => {
                      if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
                        setEmailError("Enter a valid email address");
                      }
                    }}
                    placeholder="jane@acmecapital.com"
                    required
                    className={`${inputCls} ${emailError ? "border-red-400 focus:border-red-500" : ""}`}
                  />
                  {emailError && <p className="text-xs text-red-500 font-bold mt-1">{emailError}</p>}
                </Field>
                <Field label="Jurisdiction">
                  <div className="relative">
                    <input
                      type="text"
                      value={jurisdictionQuery || form.jurisdiction}
                      onChange={(e) => {
                        setJurisdictionQuery(e.target.value);
                        update("jurisdiction", e.target.value);
                        setJurisdictionOpen(true);
                      }}
                      onFocus={() => setJurisdictionOpen(true)}
                      onBlur={() => setTimeout(() => setJurisdictionOpen(false), 150)}
                      placeholder="Select or type jurisdiction..."
                      className={inputCls}
                    />
                    {jurisdictionOpen && (
                      <div className="absolute z-20 left-0 right-0 top-full bg-white border border-[var(--color-border)] max-h-48 overflow-y-auto shadow-lg">
                        {JURISDICTIONS
                          .filter((j) => j.toLowerCase().includes((jurisdictionQuery || form.jurisdiction).toLowerCase()))
                          .map((j) => (
                            <button
                              key={j}
                              type="button"
                              onMouseDown={() => {
                                update("jurisdiction", j);
                                setJurisdictionQuery("");
                                setJurisdictionOpen(false);
                              }}
                              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--color-surface)] transition-colors ${form.jurisdiction === j ? "font-bold text-black bg-[var(--color-surface)]" : "text-[var(--color-text-secondary)]"}`}
                            >
                              {j}
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                </Field>
                <Field label="Asset Logo">
                  <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoSelect} />
                  <div className="flex items-center gap-3">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo preview" className="w-12 h-12 rounded-full object-cover border border-[var(--color-border)]" />
                    ) : (
                      <div className="w-12 h-12 rounded-full border border-dashed border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)]">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={logoUploading}
                      className="px-4 py-2 text-xs font-bold uppercase tracking-widest border border-[var(--color-border)] hover:border-black transition-colors disabled:opacity-50"
                    >
                      {logoUploading ? "Uploading…" : logoPreview ? "Change" : "Upload Image"}
                    </button>
                    {logoUrl && <span className="text-xs text-[var(--color-accent)] font-bold">✓ Uploaded</span>}
                  </div>
                </Field>
              </>
            )}

            {/* Step 1 - Product */}
            {step === 1 && (
              <>
                <Field label="Asset Type" required>
                  <div className="grid grid-cols-2 gap-2">
                    {ASSET_TYPES.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => update("assetType", t.value)}
                        className={`px-3 py-2.5 text-left border transition-colors ${
                          form.assetType === t.value
                            ? "bg-black border-black text-white"
                            : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-black hover:text-black"
                        }`}
                      >
                        <p className="text-xs font-bold uppercase tracking-wide">{t.label}</p>
                        <p className="text-[0.65rem] mt-0.5 opacity-70">{t.desc}</p>
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="AUM Estimate">
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
                  <textarea value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="Brief description of the product..." rows={3} className={`${inputCls} resize-none`} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Min Mint (USDC)">
                    <input type="number" value={form.minMintAmount} onChange={(e) => update("minMintAmount", e.target.value)} placeholder="0" className={inputCls} />
                  </Field>
                  <Field label="Min Redeem (RWA)">
                    <input type="number" value={form.minRedeemAmount} onChange={(e) => update("minRedeemAmount", e.target.value)} placeholder="0" className={inputCls} />
                  </Field>
                </div>
              </>
            )}

            {/* Step 2 - Deploy */}
            {step === 2 && (
              <div className="space-y-4">
                <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-2">
                  Review & Deploy
                </p>
                {[
                  { label: "Institution", value: form.institution },
                  { label: "Contact", value: `${form.contact} · ${form.email}` },
                  { label: "Jurisdiction", value: form.jurisdiction || "—" },
                  { label: "Asset Type", value: form.assetType },
                  { label: "AUM", value: form.aum },
                  { label: "Description", value: form.description || "—" },
                  { label: "Min Mint", value: form.minMintAmount || "0" },
                  { label: "Min Redeem", value: form.minRedeemAmount || "0" },
                ].map(({ label, value }) => (
                  <div key={label} className="flex gap-4 py-2 border-b border-[var(--color-border-subtle)] last:border-b-0">
                    <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)] w-24 shrink-0">
                      {label}
                    </span>
                    <span className="text-sm font-medium text-black">{value}</span>
                  </div>
                ))}

                <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-xs text-blue-800 space-y-1">
                  <p className="font-semibold">What happens when you deploy:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-blue-700">
                    <li>Token-2022 mint created (TransferHook + InterestBearingMint)</li>
                    <li>Asset registered in ProofLayer on-chain registry</li>
                    <li>Your wallet set as issuer authority</li>
                    <li>Institution & product data saved to database</li>
                  </ul>
                </div>

                {!connected && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)]">Connect wallet to deploy</p>
                    {connectableWallets.map((wallet) => (
                      <WalletConnectBtn key={wallet.name} wallet={wallet} />
                    ))}
                  </div>
                )}

                {createAsset.error && (
                  <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-800">
                    {(createAsset.error as Error).message}
                  </div>
                )}
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
                disabled={step === 0 && (!form.institution || !form.contact || !form.email || !!emailError)}
                className="flex-1 py-3 text-sm font-extrabold uppercase tracking-widest bg-black text-white hover:bg-[var(--color-text-secondary)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                onClick={handleDeploy}
                disabled={!connected || createAsset.isPending}
                className="flex-1 py-3 text-sm font-extrabold uppercase tracking-widest bg-black text-white hover:bg-[var(--color-text-secondary)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {createAsset.isPending ? "Deploying..." : "Deploy Asset"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
function WalletConnectBtn({ wallet }: { wallet: Parameters<typeof useConnect>[0] }) {
  const [, setAccount] = useSelectedWalletAccount();
  const [isConnecting, connect] = useConnect(wallet);

  async function handleClick() {
    const accounts = await connect();
    if (accounts.length > 0) setAccount(accounts[0]);
  }

  return (
    <button
      onClick={handleClick}
      disabled={isConnecting}
      className="w-full px-4 py-2.5 text-left text-sm font-medium border border-[var(--color-border)] hover:bg-gray-50 transition-colors flex items-center gap-3 disabled:opacity-50"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {wallet.icon && <img src={wallet.icon} alt="" className="w-5 h-5 rounded" />}
      <span className="font-semibold">{isConnecting ? "Connecting..." : wallet.name}</span>
    </button>
  );
}

const inputCls =
  "w-full px-4 py-3 border border-[var(--color-border)] bg-white text-sm font-mono text-black placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-black transition-colors";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
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
