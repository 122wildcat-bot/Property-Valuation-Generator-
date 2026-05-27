"use client";

import { useEffect, useRef, useState } from "react";

const NAVY = "#0a2540";
const GOLD = "#c9a961";
const CREAM = "#faf8f4";
const INK = "#1a1a1a";
const MUTED = "#6b6356";
const RULE = "#e3ddd0";
const ERROR = "#a02020";
const SUCCESS = "#1a6b3a";

const SAMPLE_JSON = `{
  "subject": {
    "address": { "street": "1508 Stanton Street", "city": "York", "state": "PA", "zip": "17404" },
    "municipality": "West York Boro",
    "school_district": "West York Area",
    "structure_type": "Twin / Semi-Detached",
    "beds": 3,
    "baths_full": 1,
    "baths_half": 0,
    "living_area_sqft": 1216,
    "parking": "Off-Street (no garage)",
    "last_sale": { "price": 110375, "date": "2022-03-01" },
    "current_tax_annual": 3815,
    "current_rent_monthly": 1295
  },
  "neighborhood_context": "West York Boro is a stable, walkable residential pocket on the west side of York City — rows of older brick twins, Cape Cods, and Colonials built primarily between 1920 and 1950, served by the West York Area School District. The Stanton Street corridor sits a few blocks from West York Area High School and the York Expo Center, which hosts the annual York Fair and 160+ events a year.",
  "scenarios": [
    { "tier": "as_is", "label": "Current Condition", "range_low": 145000, "range_high": 165000, "point_estimate": 155000, "price_per_sqft": 127 },
    { "tier": "recommended", "label": "Recommended Listing Strategy", "range_low": 165000, "range_high": 185000, "point_estimate": 175000, "price_per_sqft": 144 },
    { "tier": "top_of_market", "label": "Top of Market", "range_low": 180000, "range_high": 200000, "point_estimate": 190000, "price_per_sqft": 156 }
  ],
  "comps": [
    { "address": "44 N Clinton St", "status": "ACTIVE", "dom": 37, "price": 185000, "price_history": [200000, 195000, 185000], "price_per_sqft": 137.65, "beds": 3, "baths_full": 1, "baths_half": 1, "sqft": 1344, "parking": "No garage", "condition_notes": "Updated kitchen & bath, LVP, partially finished basement. C/A not operational.", "anchor_role": "anchor_no_garage" },
    { "address": "1656 Monroe St", "status": "PENDING", "dom": 5, "price": 169900, "price_per_sqft": 147.48, "beds": 3, "baths_full": 1, "baths_half": 0, "sqft": 1152, "parking": "1-car garage", "condition_notes": "New gas heat, central A/C, water heater, replacement windows. Carpet/paint needed." },
    { "address": "1628 W Philadelphia St", "status": "CLOSED", "dom": 4, "close_date": "2026-05-13", "price": 187000, "price_per_sqft": 159.01, "beds": 3, "baths_full": 1, "baths_half": 1, "sqft": 1176, "parking": "2-car garage", "condition_notes": "Estate sale, sold as-is. Dated interior, brick gas fireplace. No central A/C. Sold $7K over list." },
    { "address": "1626 W Philadelphia St", "status": "CLOSED", "dom": 7, "close_date": "2025-07-18", "price": 195000, "price_per_sqft": 154.76, "beds": 3, "baths_full": 2, "baths_half": 0, "sqft": 1260, "parking": "Oversized 2-car garage", "condition_notes": "Fully renovated 3 years ago. Quartz, SS, subway tile, LVP, both baths redone, new windows.", "anchor_role": "top_of_market" },
    { "address": "46 N Clinton St", "status": "CLOSED", "dom": 14, "close_date": "2025-12-01", "price": 179900, "price_per_sqft": 114.15, "beds": 3, "baths_full": 1, "baths_half": 0, "sqft": 1576, "parking": "1-car garage", "condition_notes": "\\"Very Good\\" condition, hardwoods throughout, new mini-split (2024). FHA buyer." },
    { "address": "1622 W Philadelphia St", "status": "CLOSED", "dom": 33, "close_date": "2025-12-17", "price": 175000, "price_per_sqft": 138.89, "beds": 3, "baths_full": 2, "baths_half": 0, "sqft": 1260, "parking": "1-car garage", "condition_notes": "Hardwoods, finished basement (low ceiling), window units. $6K seller concessions. Sold $9.9K under list." }
  ],
  "constraints": ["no_garage", "one_bath"],
  "important_market_context": "March 2022 sale at $110,375 well below market for that period — similar twins on Stanton and surrounding blocks were trading $140–$170K then. Consistent with a foreclosure, sheriff sale, or off-market estate transaction. Current owner likely acquired as a rental, did minimal cosmetic work to make it rent-ready, and has been collecting $1,295/mo since."
}`;

type Status =
  | { kind: "idle" }
  | { kind: "loading"; startedAt: number }
  | { kind: "error"; message: string }
  | { kind: "success"; filename: string };

const SERIF: React.CSSProperties = {
  fontFamily: "var(--font-serif), Georgia, serif",
  fontStyle: "italic",
  fontWeight: 500,
};

export default function Home() {
  const [json, setJson] = useState(SAMPLE_JSON);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (status.kind === "loading") {
      setElapsed(0);
      const started = status.startedAt;
      intervalRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - started) / 1000));
      }, 250);
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }
    return undefined;
  }, [status]);

  async function submit(format: "pdf" | "html") {
    let body: unknown;
    try {
      body = JSON.parse(json);
    } catch (e) {
      setStatus({ kind: "error", message: "Input JSON is not valid: " + (e as Error).message });
      return;
    }

    setStatus({ kind: "loading", startedAt: Date.now() });

    try {
      const url = format === "html" ? "/api/generate?format=html" : "/api/generate";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text();
        let message = `${res.status} ${res.statusText}`;
        try {
          const j = JSON.parse(text);
          if (j.error) message = `${res.status}: ${j.error}`;
          if (j.issues) message += ` — ${j.issues.length} validation issue(s)`;
        } catch {
          message = text.slice(0, 300);
        }
        setStatus({ kind: "error", message });
        return;
      }

      if (format === "html") {
        const html = await res.text();
        const blob = new Blob([html], { type: "text/html" });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, "_blank");
        setStatus({ kind: "success", filename: "preview.html" });
      } else {
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        const filename =
          res.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1] ||
          "valuation.pdf";
        a.download = filename;
        a.click();
        URL.revokeObjectURL(blobUrl);
        setStatus({ kind: "success", filename });
      }
    } catch (e) {
      setStatus({ kind: "error", message: (e as Error).message });
    }
  }

  const loading = status.kind === "loading";
  const stage =
    elapsed < 2
      ? "Validating input…"
      : elapsed < 50
        ? "Generating report with Claude…"
        : "Rendering PDF…";

  return (
    <main style={{ minHeight: "100vh", background: CREAM }}>
      {/* Brand strip */}
      <div
        style={{
          background: NAVY,
          color: CREAM,
          padding: "10px 24px",
          letterSpacing: "0.22em",
          fontSize: 11,
          fontWeight: 600,
          textAlign: "center",
        }}
      >
        COLDWELL BANKER REALTY · THE ADAM DRUCK GROUP
      </div>

      <div style={{ maxWidth: 980, margin: "0 auto", padding: "48px 24px 96px" }}>
        {/* Header */}
        <header style={{ marginBottom: 40 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              color: GOLD,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.22em",
              marginBottom: 12,
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: 32,
                height: 1,
                background: GOLD,
              }}
            />
            PVRG · INTERNAL TEST HARNESS
          </div>
          <h1
            style={{
              ...SERIF,
              fontSize: 56,
              color: NAVY,
              margin: 0,
              lineHeight: 1.05,
              letterSpacing: "-0.01em",
            }}
          >
            Property Valuation Report Generator.
          </h1>
          <p
            style={{
              color: MUTED,
              fontSize: 16,
              lineHeight: 1.5,
              maxWidth: 680,
              marginTop: 16,
            }}
          >
            The production pipeline runs <strong style={{ color: INK }}>MVE → POST /api/generate →
            branded PDF</strong>. This page tests that pipeline end-to-end against the 1508 Stanton
            St sample. The form below is prefilled — just click <strong style={{ color: INK }}>Generate
            sample PDF</strong>.
          </p>
        </header>

        {/* Primary action card */}
        <section
          style={{
            background: "#fff",
            border: `1px solid ${RULE}`,
            borderTop: `3px solid ${GOLD}`,
            padding: "28px 32px",
            marginBottom: 32,
            boxShadow: "0 1px 0 rgba(10, 37, 64, 0.04)",
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 24,
              alignItems: "flex-start",
              justifyContent: "space-between",
            }}
          >
            <div style={{ flex: "1 1 280px" }}>
              <div
                style={{
                  ...SERIF,
                  fontSize: 26,
                  color: NAVY,
                  marginBottom: 6,
                }}
              >
                Run the pipeline.
              </div>
              <div style={{ color: MUTED, fontSize: 14, lineHeight: 1.5 }}>
                Sends the input JSON to <code style={codeInlineStyle}>/api/generate</code>. Takes
                30–60 seconds. The PDF downloads automatically when it's ready.
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
              <button
                onClick={() => submit("pdf")}
                disabled={loading}
                style={primaryButtonStyle(loading)}
              >
                {loading ? "Generating…" : "Generate sample PDF"}
              </button>
              <button
                onClick={() => submit("html")}
                disabled={loading}
                style={secondaryButtonStyle(loading)}
              >
                Preview HTML
              </button>
            </div>
          </div>

          {/* Status row */}
          {loading && (
            <div
              style={{
                marginTop: 20,
                padding: "14px 16px",
                background: CREAM,
                border: `1px solid ${RULE}`,
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              <Spinner />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: NAVY }}>{stage}</div>
                <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
                  {elapsed}s elapsed · this typically takes 30–60s
                </div>
              </div>
            </div>
          )}
          {status.kind === "success" && (
            <div
              style={{
                marginTop: 20,
                padding: "12px 16px",
                background: "#eef7f1",
                border: `1px solid #bcdcc7`,
                color: SUCCESS,
                fontSize: 14,
              }}
            >
              ✓ Done. <code style={codeInlineStyle}>{status.filename}</code> downloaded.
            </div>
          )}
          {status.kind === "error" && (
            <div
              style={{
                marginTop: 20,
                padding: "12px 16px",
                background: "#fbecec",
                border: `1px solid #e5b8b8`,
                color: ERROR,
                fontSize: 14,
                lineHeight: 1.5,
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Request failed.</div>
              <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12 }}>
                {status.message}
              </div>
              {status.message.includes("ANTHROPIC_API_KEY") && (
                <div style={{ marginTop: 8, color: INK }}>
                  Set <code style={codeInlineStyle}>ANTHROPIC_API_KEY</code> in your Railway service
                  variables, then redeploy.
                </div>
              )}
            </div>
          )}
        </section>

        {/* Input JSON */}
        <section>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              marginBottom: 10,
            }}
          >
            <h2
              style={{
                ...SERIF,
                fontSize: 22,
                color: NAVY,
                margin: 0,
              }}
            >
              Input JSON.
            </h2>
            <button
              onClick={() => setJson(SAMPLE_JSON)}
              style={{
                background: "transparent",
                color: MUTED,
                border: "none",
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                cursor: "pointer",
                padding: 0,
              }}
            >
              Reset to sample ↻
            </button>
          </div>
          <div style={{ fontSize: 13, color: MUTED, marginBottom: 12, lineHeight: 1.5 }}>
            This is the MVE → PVRG data contract. In production, MVE produces this object and POSTs
            it directly. Edit here to test other inputs.
          </div>
          <textarea
            value={json}
            onChange={(e) => setJson(e.target.value)}
            spellCheck={false}
            style={{
              width: "100%",
              minHeight: 420,
              padding: 16,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: 12,
              lineHeight: 1.55,
              background: "#fff",
              border: `1px solid ${RULE}`,
              borderRadius: 0,
              resize: "vertical",
              color: INK,
              boxSizing: "border-box",
            }}
          />
        </section>

        {/* API quick-ref */}
        <section style={{ marginTop: 48 }}>
          <h2
            style={{
              ...SERIF,
              fontSize: 22,
              color: NAVY,
              margin: "0 0 12px",
            }}
          >
            For MVE integration.
          </h2>
          <pre
            style={{
              background: NAVY,
              color: CREAM,
              padding: "18px 20px",
              fontSize: 12,
              lineHeight: 1.6,
              overflowX: "auto",
              margin: 0,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            }}
          >
            {`POST /api/generate
Content-Type: application/json

{ ...valuation input JSON... }

→ 200 application/pdf   (download)
→ 200 text/html         (when ?format=html)
→ 400 { error, issues } (validation failed)
→ 502 { error }         (Claude API failed)`}
          </pre>
        </section>

        <footer
          style={{
            marginTop: 64,
            paddingTop: 24,
            borderTop: `1px solid ${RULE}`,
            color: MUTED,
            fontSize: 11,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            textAlign: "center",
          }}
        >
          ADAM DRUCK · REALTOR® · (717) 487-2579 · YourRealtorAdamD@gmail.com · adamdruckgroup.com
        </footer>
      </div>
    </main>
  );
}

const codeInlineStyle: React.CSSProperties = {
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: "0.9em",
  background: "rgba(10, 37, 64, 0.06)",
  padding: "1px 6px",
  borderRadius: 2,
  color: NAVY,
};

function primaryButtonStyle(loading: boolean): React.CSSProperties {
  return {
    background: loading ? "#3a4d62" : NAVY,
    color: CREAM,
    border: "none",
    padding: "14px 24px",
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    cursor: loading ? "wait" : "pointer",
    borderRadius: 2,
    transition: "background 120ms ease",
  };
}

function secondaryButtonStyle(loading: boolean): React.CSSProperties {
  return {
    background: "transparent",
    color: NAVY,
    border: `1px solid ${NAVY}`,
    padding: "14px 22px",
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    cursor: loading ? "wait" : "pointer",
    borderRadius: 2,
    opacity: loading ? 0.5 : 1,
  };
}

function Spinner() {
  return (
    <>
      <style>{`@keyframes pvrg-spin { to { transform: rotate(360deg); } }`}</style>
      <div
        style={{
          width: 18,
          height: 18,
          border: `2px solid ${RULE}`,
          borderTopColor: GOLD,
          borderRadius: "50%",
          animation: "pvrg-spin 700ms linear infinite",
          flexShrink: 0,
        }}
      />
    </>
  );
}
