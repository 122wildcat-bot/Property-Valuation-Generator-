# PVRG — Property Valuation Report Generator

Internal tool for the **Adam Druck Group** at Coldwell Banker Realty. Takes structured valuation data from the Market Value Engine (MVE) and produces a branded, client-ready PDF Property Valuation Report.

- Next.js 14 (App Router) · TypeScript
- Anthropic SDK · Claude generates the styled HTML against a locked system prompt
- Puppeteer renders HTML → PDF (US Letter, 0.5in margins)
- Zod validates the MVE → PVRG data contract
- Docker / Railway for deploy (same project as MVE → private networking)

The gold-standard reference deliverable is `1508_Stanton_St_Valuation.pdf` in the repo.

---

## Local dev

```bash
cp .env.local.example .env.local
# fill in ANTHROPIC_API_KEY in .env.local

npm install
npm run dev
```

Open http://localhost:3000, paste the sample JSON (prefilled), click **Download PDF**.

Use **Preview HTML** to inspect the document Claude returned before it hits Puppeteer — useful while iterating on the system prompt.

### Puppeteer locally

`npm install` downloads Chromium automatically. If you'd rather use an existing Chrome/Chromium, set `PUPPETEER_EXECUTABLE_PATH` in `.env.local`.

---

## API

### `POST /api/generate`

Request body: a JSON object matching the data contract below.

Query params:
- `format=html` — return the raw HTML instead of rendering to PDF (debug/preview).

Auth:
- When `PVRG_API_KEY` is set, cross-origin / server-to-server callers must send
  `Authorization: Bearer <PVRG_API_KEY>`. Same-origin requests from the admin
  form at `/` pass through unauthenticated.
- When `PVRG_API_KEY` is unset, the endpoint is open — local dev only.

Responses:
- `200 application/pdf` — the rendered report, with `Content-Disposition: attachment`
- `200 text/html` — when `?format=html`
- `400` — JSON parse error or Zod validation failure (`{ error, issues }`)
- `401` — missing or wrong Bearer token (cross-origin call with `PVRG_API_KEY` set)
- `502` — Claude API call failed
- `500` — Puppeteer rendering failed

Example:

```bash
curl -X POST https://<pvrg>.up.railway.app/api/generate \
  -H 'Authorization: Bearer <PVRG_API_KEY>' \
  -H 'Content-Type: application/json' \
  -d @sample.json \
  -o report.pdf
```

---

## Data contract (MVE → PVRG)

```json
{
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
  "neighborhood_context": "1–2 paragraphs of editorial context...",
  "scenarios": [
    { "tier": "as_is",         "label": "...", "range_low": 145000, "range_high": 165000, "point_estimate": 155000, "price_per_sqft": 127 },
    { "tier": "recommended",   "label": "...", "range_low": 165000, "range_high": 185000, "point_estimate": 175000, "price_per_sqft": 144 },
    { "tier": "top_of_market", "label": "...", "range_low": 180000, "range_high": 200000, "point_estimate": 190000, "price_per_sqft": 156 }
  ],
  "comps": [
    {
      "address": "44 N Clinton St",
      "status": "ACTIVE",
      "dom": 37,
      "price": 185000,
      "price_history": [200000, 195000, 185000],
      "close_date": "2025-12-01",
      "price_per_sqft": 137.65,
      "beds": 3, "baths_full": 1, "baths_half": 1,
      "sqft": 1344,
      "parking": "No garage",
      "condition_notes": "Updated kitchen and bath, LVP. C/A not operational.",
      "anchor_role": "anchor_no_garage"
    }
  ],
  "constraints": ["no_garage", "one_bath"],
  "important_market_context": "..."
}
```

Rules enforced by `src/lib/schema.ts`:

- `scenarios` must contain exactly one of each tier: `as_is`, `recommended`, `top_of_market`.
- `comps` must have 3–8 entries.
- All required strings must be non-empty (no placeholders).

`anchor_role` is a free-form hint to Claude — common values: `anchor_no_garage`, `top_of_market`, `bottom_of_market`. Use it to call out the comp that anchors a scenario.

---

## How it produces the report

1. `POST /api/generate` receives the JSON.
2. `ValuationInputSchema` (Zod) validates structure and the three-tier rule.
3. `generateReportHtml()` calls Claude with:
   - `system`: the locked prompt at `src/lib/system-prompt.ts`
   - `user`: today's date + the JSON, plus "return only HTML"
4. Claude returns a complete `<!DOCTYPE html>` document — styled with Cormorant Garamond + Inter, navy `#0a2540` + gold `#c9a961`, page breaks between sections.
5. Puppeteer loads the HTML (`networkidle0` so Google Fonts arrive), emulates print, prints to US Letter PDF.
6. Endpoint returns `application/pdf` with `Content-Disposition: attachment`.

The system prompt is the single source of truth for layout and voice. Iterate on `src/lib/system-prompt.ts` to refine output — no template engine, Claude writes the HTML each time.

---

## Railway deploy

PVRG runs as its own Railway project so it can be reused by other tools
besides MVE. MVE reaches it over the public HTTPS URL Railway assigns the
service (`https://<service>.up.railway.app`) with a shared-secret API key.

1. Push to the branch Railway watches.
2. Railway picks up `railway.toml` → builds from `Dockerfile`.
3. Set env vars in the Railway service:
   - `ANTHROPIC_API_KEY` (required)
   - `ANTHROPIC_MODEL` (optional — defaults to `claude-opus-4-7`)
   - `PVRG_API_KEY` (required for any service-to-service caller) — generate
     a random secret (`openssl rand -hex 32`) and set the same value on the
     MVE service so the two match.
4. `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium` is set inside the Dockerfile — don't override.
5. In the Railway service settings, enable a **public domain** so MVE (and
   anything else) can reach PVRG over HTTPS.

The Dockerfile installs system Chromium + the fonts/libs Puppeteer needs and runs Next.js in `standalone` output mode under a non-root user with `dumb-init` as PID 1.

---

## File map

```
src/
  lib/
    system-prompt.ts   # locked Claude system prompt (edit to tune voice/layout)
    schema.ts          # Zod schema for the MVE → PVRG contract
    claude.ts          # Anthropic client + report-generation call
    pdf.ts             # Puppeteer browser pool + HTML → PDF
  app/
    layout.tsx
    page.tsx           # admin form (paste JSON → download PDF / preview HTML)
    api/generate/
      route.ts         # POST endpoint
Dockerfile
railway.toml
.env.local.example
```
