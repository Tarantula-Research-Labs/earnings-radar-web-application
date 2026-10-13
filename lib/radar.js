// Shared, server-only loader for one season of radar data.
import { listSeasons, readText, validSeason } from "@/lib/s3";

export async function getRadar(askedSeason) {
  const seasons = await listSeasons();
  const season = validSeason(askedSeason) ? askedSeason : seasons[seasons.length - 1];
  // Sector hypotheses live outside the season folders: <prefix>/hypotheses/hypotheses.json
  const hy = await readText("hypotheses", "hypotheses.json").catch(() => null);
  const hypotheses = hy ? JSON.parse(hy.text).windows || {} : {};
  if (!season) return { season: null, seasons, events: {}, runs: {}, hypotheses, updatedAt: null };
  const [ev, runs] = await Promise.all([readText(season, "events.json"), readText(season, "runs.json")]);
  return {
    season,
    seasons,
    events: ev ? JSON.parse(ev.text) : {},
    runs: runs ? JSON.parse(runs.text) : {},
    hypotheses,
    updatedAt: ev?.lastModified ?? null,
  };
}

// "Q2FY27" -> "Q2 FY27"
export const seasonLabel = (s) => (s ? s.replace(/^(Q\d)(FY\d+)$/, "$1 $2") : "—");
