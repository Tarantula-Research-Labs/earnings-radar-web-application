import { listSeasons, readText, validSeason } from "@/lib/s3";

export const dynamic = "force-dynamic";

// GET /api/radar?season=Q2FY27  ->  { season, seasons, events, runs, updatedAt }
export async function GET(req) {
  try {
    const seasons = await listSeasons();
    const asked = new URL(req.url).searchParams.get("season");
    const season = validSeason(asked) ? asked : seasons[seasons.length - 1];
    if (!season) return Response.json({ season: null, seasons, events: {}, runs: {}, updatedAt: null });

    const [ev, runs] = await Promise.all([readText(season, "events.json"), readText(season, "runs.json")]);
    return Response.json(
      {
        season,
        seasons,
        events: ev ? JSON.parse(ev.text) : {},
        runs: runs ? JSON.parse(runs.text) : {},
        updatedAt: ev?.lastModified ?? null,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    console.error("radar api:", e);
    return Response.json({ error: "Could not read the radar data from S3." }, { status: 502 });
  }
}
