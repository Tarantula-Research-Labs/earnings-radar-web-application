import { zipSync, strToU8 } from "fflate";
import { getRadar } from "@/lib/radar";
import { listSeasons, validSeason } from "@/lib/s3";
import { TABLES, STOCK_SETS, buildCsv } from "@/lib/export";

export const dynamic = "force-dynamic";

// GET /api/export?tables=reasons,fundamentals&stocks=all|active|past&seasons=all|Q2FY27
// One table -> CSV file. Several -> ZIP of CSVs. Every row carries its season and stock.
export async function GET(req) {
  const p = new URL(req.url).searchParams;
  const tables = (p.get("tables") || "").split(",").filter((t) => t in TABLES);
  const stocks = p.get("stocks") in STOCK_SETS ? p.get("stocks") : "all";
  const want = p.get("seasons") || "";
  if (!tables.length) return new Response("Pick at least one table.", { status: 400 });

  try {
    const all = await listSeasons();
    const seasons = want === "all" ? all : validSeason(want) ? [want] : all.slice(-1);
    if (!seasons.length) return new Response("No data yet.", { status: 404 });
    const data = await Promise.all(seasons.map((s) => getRadar(s)));

    const stamp = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    const scope = `${want === "all" ? "all-seasons" : seasons[0]}_${stocks === "past" ? "past-results" : stocks}`;
    const headers = { "Cache-Control": "no-store" };

    if (tables.length === 1) {
      return new Response(buildCsv(tables[0], data, stocks), {
        headers: { ...headers, "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="tremor_${tables[0]}_${scope}_${stamp}.csv"` },
      });
    }
    const files = Object.fromEntries(tables.map((t) => [`${t}.csv`, strToU8(buildCsv(t, data, stocks))]));
    return new Response(zipSync(files, { level: 6 }), {
      headers: { ...headers, "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="tremor_${scope}_${stamp}.zip"` },
    });
  } catch (e) {
    console.error("export:", e);
    return new Response("Could not build the download.", { status: 502 });
  }
}
