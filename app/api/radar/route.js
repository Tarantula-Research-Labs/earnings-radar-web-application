import { getRadar } from "@/lib/radar";

export const dynamic = "force-dynamic";

// GET /api/radar?season=Q2FY27  ->  { season, seasons, events, runs, updatedAt }
// Cached at Vercel's edge for a minute so public traffic does not hit S3 on every request.
export async function GET(req) {
  try {
    const data = await getRadar(new URL(req.url).searchParams.get("season"));
    return Response.json(data, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (e) {
    console.error("radar api:", e);
    return Response.json({ error: "Could not read the radar data from S3." }, { status: 502 });
  }
}
