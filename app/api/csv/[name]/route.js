import { readText, validSeason, listSeasons } from "@/lib/s3";

export const dynamic = "force-dynamic";

const ALLOWED = new Set(["events", "prices", "reasons", "summaries", "run_log", "fundamentals", "outlook"]);

// GET /api/csv/reasons?season=Q2FY27  ->  reasons_Q2FY27.csv download
export async function GET(req, { params }) {
  const { name } = await params;
  if (name === "hypotheses") {
    const f = await readText("hypotheses", "hypotheses.csv").catch(() => null);
    if (!f) return new Response("No data yet", { status: 404 });
    return new Response(f.text, { headers: { "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="sector_hypotheses.csv"', "Cache-Control": "no-store" } });
  }
  if (!ALLOWED.has(name)) return new Response("Unknown table", { status: 404 });
  try {
    let season = new URL(req.url).searchParams.get("season");
    if (!validSeason(season)) season = (await listSeasons()).at(-1);
    const f = season ? await readText(season, `csv/${name}.csv`) : null;
    if (!f) return new Response("No data yet", { status: 404 });
    return new Response(f.text, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${name}_${season}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("csv api:", e);
    return new Response("Could not read the file from S3.", { status: 502 });
  }
}
