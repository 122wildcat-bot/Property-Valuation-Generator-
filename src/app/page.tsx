"use client";

import { useState } from "react";

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
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "success" };

export default function Home() {
  const [json, setJson] = useState(SAMPLE_JSON);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function submit(format: "pdf" | "html") {
    setStatus({ kind: "loading" });
    let body: unknown;
    try {
      body = JSON.parse(json);
    } catch (e) {
      setStatus({ kind: "error", message: "JSON is not valid: " + (e as Error).message });
      return;
    }

    try {
      const url = format === "html" ? "/api/generate?format=html" : "/api/generate";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text();
        setStatus({ kind: "error", message: `${res.status}: ${text}` });
        return;
      }

      if (format === "html") {
        const html = await res.text();
        const blob = new Blob([html], { type: "text/html" });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, "_blank");
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
      }
      setStatus({ kind: "success" });
    } catch (e) {
      setStatus({ kind: "error", message: (e as Error).message });
    }
  }

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "48px 24px" }}>
      <header style={{ marginBottom: 24 }}>
        <div
          style={{
            letterSpacing: "0.18em",
            fontSize: 12,
            color: "#0a2540",
            fontWeight: 600,
          }}
        >
          ADAM DRUCK GROUP · INTERNAL
        </div>
        <h1
          style={{
            fontFamily: "Georgia, 'Cormorant Garamond', serif",
            fontStyle: "italic",
            fontWeight: 500,
            fontSize: 40,
            color: "#0a2540",
            margin: "8px 0 0",
          }}
        >
          Property Valuation Report Generator.
        </h1>
        <p style={{ color: "#555", marginTop: 8 }}>
          Paste MVE JSON output below. Download a branded PDF or preview the HTML.
        </p>
      </header>

      <textarea
        value={json}
        onChange={(e) => setJson(e.target.value)}
        spellCheck={false}
        style={{
          width: "100%",
          minHeight: 480,
          padding: 16,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: 12,
          lineHeight: 1.5,
          background: "#fff",
          border: "1px solid #d8d2c4",
          borderRadius: 4,
          resize: "vertical",
          color: "#1a1a1a",
        }}
      />

      <div style={{ display: "flex", gap: 12, marginTop: 16, alignItems: "center" }}>
        <button
          onClick={() => submit("pdf")}
          disabled={status.kind === "loading"}
          style={{
            background: "#0a2540",
            color: "#faf8f4",
            border: "none",
            padding: "12px 24px",
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            cursor: status.kind === "loading" ? "wait" : "pointer",
            borderRadius: 2,
          }}
        >
          {status.kind === "loading" ? "Generating…" : "Download PDF"}
        </button>
        <button
          onClick={() => submit("html")}
          disabled={status.kind === "loading"}
          style={{
            background: "transparent",
            color: "#0a2540",
            border: "1px solid #0a2540",
            padding: "12px 24px",
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            cursor: status.kind === "loading" ? "wait" : "pointer",
            borderRadius: 2,
          }}
        >
          Preview HTML
        </button>
        {status.kind === "success" && (
          <span style={{ color: "#1a6b3a", fontSize: 14 }}>Done.</span>
        )}
        {status.kind === "error" && (
          <span style={{ color: "#a02020", fontSize: 14 }}>{status.message}</span>
        )}
      </div>
    </main>
  );
}
