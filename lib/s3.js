// Server-only S3 access. The read-only key never reaches the browser.
import { S3Client, GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";

const BUCKET = process.env.RADAR_BUCKET || "trl-earnings-radar";
const PREFIX = (process.env.RADAR_PREFIX || "earnings-radar").replace(/\/+$/, "");

let client;
function s3() {
  if (!client) {
    const id = process.env.RADAR_AWS_ACCESS_KEY_ID;
    const secret = process.env.RADAR_AWS_SECRET_ACCESS_KEY;
    if (!id || !secret) throw new Error("RADAR_AWS_ACCESS_KEY_ID / RADAR_AWS_SECRET_ACCESS_KEY are not set");
    client = new S3Client({
      region: process.env.RADAR_AWS_REGION || "ap-south-1",
      credentials: { accessKeyId: id, secretAccessKey: secret },
    });
  }
  return client;
}

// Season folders, newest name last, e.g. ["Q2FY27", "Q3FY27"]
export async function listSeasons() {
  const out = await s3().send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: `${PREFIX}/`, Delimiter: "/" }));
  return (out.CommonPrefixes || [])
    .map((p) => p.Prefix.slice(PREFIX.length + 1).replace(/\/$/, ""))
    .filter((s) => /^Q[1-4]FY\d{2}$/.test(s))
    .sort((a, b) => a.slice(4).localeCompare(b.slice(4)) || a.localeCompare(b));
}

export function validSeason(s) {
  return typeof s === "string" && /^Q[1-4]FY\d{2}$/.test(s);
}

// Returns { text, lastModified } or null if the file does not exist yet.
export async function readText(season, name) {
  try {
    const out = await s3().send(new GetObjectCommand({ Bucket: BUCKET, Key: `${PREFIX}/${season}/${name}` }));
    return { text: await out.Body.transformToString("utf-8"), lastModified: out.LastModified };
  } catch (e) {
    if (e?.name === "NoSuchKey" || e?.$metadata?.httpStatusCode === 404) return null;
    throw e;
  }
}
