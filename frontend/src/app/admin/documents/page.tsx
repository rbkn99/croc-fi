"use client";

import { useState, useRef, useCallback } from "react";
import { useAssetMeta, useAddDocument, useRemoveDocument, useUploadDocument } from "@/lib/api/hooks";
import type { AssetDocument } from "@/lib/api/types";

const PRODUCT_IDS = [
  { id: "mtbill-sol", label: "mTBILL" },
  { id: "myield-sol", label: "mYIELD" },
  { id: "mcorp-sol", label: "mCORP" },
];

const DOC_TYPES: { value: AssetDocument["type"]; label: string }[] = [
  { value: "prospectus", label: "Prospectus / PPM" },
  { value: "fact_sheet", label: "Fact Sheet" },
  { value: "audit_report", label: "Audit Report" },
  { value: "legal_opinion", label: "Legal Opinion" },
  { value: "subscription_agreement", label: "Subscription Agreement" },
  { value: "tax_memo", label: "Tax Memo" },
  { value: "other", label: "Other" },
];

const TYPE_LABELS: Record<string, string> = Object.fromEntries(
  DOC_TYPES.map((t) => [t.value, t.label])
);

const inputCls =
  "w-full px-4 py-3 border border-[var(--color-border)] bg-white text-sm font-mono text-black placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-black transition-colors";

export default function DocumentsPage() {
  const [selectedId, setSelectedId] = useState("mtbill-sol");
  const [showForm, setShowForm] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [form, setForm] = useState({
    title: "",
    type: "prospectus" as AssetDocument["type"],
    url: "",
    publishedAt: "",
    hash: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: meta, isLoading, error } = useAssetMeta(selectedId);
  const uploadDoc = useUploadDocument();
  const addDoc = useAddDocument(selectedId);
  const removeDoc = useRemoveDocument(selectedId);

  const handleFile = useCallback(async (file: File) => {
    try {
      const result = await uploadDoc.mutateAsync(file);
      setForm((f) => ({
        ...f,
        url: result.url,
        hash: result.hash,
        title: f.title || result.originalName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "),
      }));
      setShowForm(true);
    } catch {
      // error shown via uploadDoc.error
    }
  }, [uploadDoc]);

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  function resetForm() {
    setForm({ title: "", type: "prospectus", url: "", publishedAt: "", hash: "" });
    setShowForm(false);
    uploadDoc.reset();
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.url) return;
    try {
      await addDoc.mutateAsync({
        title: form.title,
        type: form.type,
        url: form.url,
        publishedAt: form.publishedAt || undefined,
        hash: form.hash || undefined,
      });
      resetForm();
    } catch {
      // error shown inline
    }
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[var(--color-text-muted)] mb-2">
            Issuer Dashboard
          </p>
          <h1 className="text-5xl font-extrabold uppercase tracking-tight text-black leading-none">
            Documents
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-3">
            Upload documents that appear on the public product page under Legal &amp; Documents.
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2.5 text-xs font-extrabold uppercase tracking-widest bg-black text-white hover:bg-[var(--color-text-secondary)] transition-colors"
          >
            + Upload Document
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
          className="hidden"
          onChange={onFileChange}
        />
      </div>

      {/* Product selector */}
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-3">
          Product Profile
        </p>
        <div className="flex gap-2">
          {PRODUCT_IDS.map((p) => (
            <button
              key={p.id}
              onClick={() => { setSelectedId(p.id); resetForm(); }}
              className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wide border transition-colors ${
                selectedId === p.id
                  ? "bg-black border-black text-white"
                  : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-black hover:text-black"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Drop zone */}
      {!showForm && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`mb-8 border-2 border-dashed cursor-pointer transition-colors flex flex-col items-center justify-center py-12 gap-3 ${
            dragging
              ? "border-black bg-[var(--color-surface)]"
              : "border-[var(--color-border)] hover:border-black hover:bg-[var(--color-surface)]"
          }`}
        >
          {uploadDoc.isPending ? (
            <>
              <div className="w-8 h-8 border-2 border-black border-t-transparent animate-spin" />
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
                Uploading…
              </p>
            </>
          ) : (
            <>
              <svg className="w-8 h-8 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <div className="text-center">
                <p className="text-sm font-bold uppercase tracking-wide text-black">
                  Drop a file here or click to browse
                </p>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  PDF, PNG, JPG, DOC, DOCX — max 20 MB
                </p>
              </div>
            </>
          )}
          {uploadDoc.error && (
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-danger)]">
              {(uploadDoc.error as Error).message}
            </p>
          )}
        </div>
      )}

      {/* Metadata form — shown after upload */}
      {showForm && (
        <div className="border border-[var(--color-border)] bg-white mb-8">
          <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center gap-3">
            <svg className="w-4 h-4 text-[var(--color-success)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-xs font-bold uppercase tracking-widest text-black">
              File uploaded — add details
            </p>
          </div>
          <form onSubmit={handleAdd} className="px-5 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-black mb-2">
                  Title <span className="text-[var(--color-danger)]">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Fund Fact Sheet — Q2 2026"
                  required
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-black mb-2">
                  Document Type <span className="text-[var(--color-danger)]">*</span>
                </label>
                <select
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as AssetDocument["type"] }))}
                  className={inputCls}
                >
                  {DOC_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-black mb-2">
                File URL
              </label>
              <input
                type="text"
                value={form.url}
                readOnly
                className={`${inputCls} bg-[var(--color-surface)] text-[var(--color-text-secondary)]`}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-black mb-2">
                  Published Date
                </label>
                <input
                  type="date"
                  value={form.publishedAt}
                  onChange={(e) => setForm((f) => ({ ...f, publishedAt: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-black mb-2">
                  SHA-256 Hash
                  <span className="text-[var(--color-text-muted)] ml-1 normal-case tracking-normal font-medium">(auto-computed)</span>
                </label>
                <input
                  type="text"
                  value={form.hash}
                  readOnly
                  className={`${inputCls} bg-[var(--color-surface)] text-[var(--color-text-muted)]`}
                />
              </div>
            </div>

            {addDoc.error && (
              <div className="border border-[var(--color-danger)] px-4 py-3 text-xs font-bold uppercase tracking-wide text-[var(--color-danger)]">
                {(addDoc.error as Error).message}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={resetForm}
                className="px-5 py-3 text-xs font-extrabold uppercase tracking-widest border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-black hover:text-black transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={addDoc.isPending || !form.title}
                className="flex-1 py-3 text-xs font-extrabold uppercase tracking-widest bg-black text-white hover:bg-[var(--color-text-secondary)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {addDoc.isPending ? "Saving…" : "Attach to Product"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Documents list */}
      {isLoading && (
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)] py-8">
          Loading…
        </p>
      )}

      {error && (
        <div className="border border-[var(--color-danger)] px-5 py-4 text-sm font-bold uppercase tracking-wide text-[var(--color-danger)]">
          Backend offline — start the API server to manage documents.
        </div>
      )}

      {!isLoading && !error && meta && (
        <div className="border border-[var(--color-border)] bg-white">
          <div className="grid grid-cols-[2fr_1fr_1fr_0.6fr] gap-4 px-5 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
            {["Document", "Type", "Published", ""].map((col, i) => (
              <span key={i} className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
                {col}
              </span>
            ))}
          </div>

          {meta.documents.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
                No documents attached
              </p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                Drop a file above to get started.
              </p>
            </div>
          ) : (
            meta.documents.map((doc, i) => (
              <div
                key={i}
                className="grid grid-cols-[2fr_1fr_1fr_0.6fr] gap-4 px-5 py-4 items-center border-b border-[var(--color-border-subtle)] last:border-b-0"
              >
                <div>
                  <p className="text-sm font-bold text-black">{doc.title}</p>
                  {doc.hash && (
                    <p className="text-[0.65rem] font-mono text-[var(--color-text-muted)] mt-0.5">
                      {doc.hash.slice(0, 20)}…
                    </p>
                  )}
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-secondary)]">
                  {TYPE_LABELS[doc.type] ?? doc.type}
                </span>
                <span className="text-xs font-mono text-[var(--color-text-muted)]">
                  {doc.publishedAt ?? "—"}
                </span>
                <div className="flex items-center gap-3 justify-end">
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-secondary)] hover:text-black transition-colors"
                  >
                    View
                  </a>
                  <button
                    onClick={() => removeDoc.mutate(i)}
                    disabled={removeDoc.isPending}
                    className="text-xs font-bold uppercase tracking-wide text-[var(--color-danger)] hover:opacity-70 transition-opacity disabled:opacity-30"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
