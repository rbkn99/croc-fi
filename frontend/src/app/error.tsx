"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      className="relative overflow-hidden min-h-[calc(100vh-112px)] flex items-center justify-center px-4"
      style={{ background: "var(--color-dark)" }}
    >
      {/* Radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 50% 40% at 50% 50%, rgba(23,124,65,0.12) 0%, transparent 70%)",
        }}
      />

      {/* Decorative diamonds */}
      <div className="absolute pointer-events-none" style={{ left: "5%", top: "20%", opacity: 0.3 }}>
        <svg width="80" height="80" viewBox="0 0 100 100" fill="none">
          <path d="M50 5L95 50L50 95L5 50L50 5Z" fill="#177C41" fillOpacity="0.2" />
          <path d="M50 5L95 50L50 95L5 50L50 5Z" stroke="#2ECC71" strokeWidth="1.5" strokeOpacity="0.35" />
          <path d="M50 20L80 50L50 80L20 50L50 20Z" fill="none" stroke="#2ECC71" strokeWidth="1" strokeOpacity="0.2" />
        </svg>
      </div>
      <div className="absolute pointer-events-none" style={{ right: "6%", bottom: "25%", opacity: 0.25 }}>
        <svg width="110" height="110" viewBox="0 0 100 100" fill="none">
          <path d="M50 5L95 50L50 95L5 50L50 5Z" fill="#177C41" fillOpacity="0.15" />
          <path d="M50 5L95 50L50 95L5 50L50 5Z" stroke="#2ECC71" strokeWidth="1.5" strokeOpacity="0.3" />
        </svg>
      </div>

      <div className="relative z-10 text-center max-w-lg">
        <p
          className="text-[8rem] sm:text-[10rem] font-extrabold leading-none tracking-tighter mb-2 select-none"
          style={{
            color: "transparent",
            WebkitTextStroke: "1px rgba(220,38,38,0.35)",
          }}
        >
          500
        </p>

        <p className="text-xs font-bold uppercase tracking-[0.35em] text-red-400/70 mb-5">
          Something went wrong
        </p>

        <h1
          className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4"
          style={{ fontFamily: "var(--font-playfair, Georgia, serif)" }}
        >
          An unexpected error occurred
        </h1>

        <p className="text-sm text-white/50 mb-10 leading-relaxed">
          We couldn&apos;t complete this request.<br />
          Try again or return to the homepage.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="px-7 py-3 text-xs font-extrabold uppercase tracking-widest text-white transition-colors"
            style={{ background: "var(--color-accent)" }}
          >
            Try Again
          </button>
          <Link
            href="/"
            className="px-7 py-3 text-xs font-extrabold uppercase tracking-widest border text-white/70 hover:text-white transition-colors"
            style={{ borderColor: "var(--color-dark-border)" }}
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
