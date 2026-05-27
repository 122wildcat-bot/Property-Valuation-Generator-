import { NextRequest, NextResponse } from "next/server";
import { ValuationInputSchema } from "@/lib/schema";
import { generateReportHtml } from "@/lib/claude";
import { renderHtmlToPdf } from "@/lib/pdf";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = ValuationInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  let html: string;
  try {
    html = await generateReportHtml(parsed.data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Claude generation failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const format = req.nextUrl.searchParams.get("format");
  if (format === "html") {
    return new NextResponse(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  let pdf: Buffer;
  try {
    pdf = await renderHtmlToPdf(html);
  } catch (err) {
    const message = err instanceof Error ? err.message : "PDF rendering failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const slug = slugifyAddress(parsed.data.subject.address.street);
  const filename = `ADG_Valuation_${slug}.pdf`;

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(pdf.length),
    },
  });
}

function slugifyAddress(street: string): string {
  return street
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}
