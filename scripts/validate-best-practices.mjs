import { readFile } from "node:fs/promises";

const config = JSON.parse(await readFile(".bestpractices.json", "utf8"));
const matrix = JSON.parse(
  await readFile("docs/best-practices/evidence-matrix.json", "utf8"),
);
const inventory = await readFile(
  "docs/best-practices/assessment-inventory.md",
  "utf8",
);

const metFields = Object.entries(config)
  .filter(([key, value]) => key.endsWith("_status") && value === "Met")
  .map(([key]) => key.slice(0, -"_status".length));
const entries = new Map(matrix.entries.map((entry) => [entry.field, entry]));
const evidenceUrls = new Set();
const errors = [];

for (const field of metFields) {
  const justification = config[`${field}_justification`];
  const entry = entries.get(field);

  if (typeof justification !== "string") {
    errors.push(`${field}: Met claim has no justification.`);
    continue;
  }

  const urls = justification.match(/https:\/\/[^\s)>]+/g) ?? [];
  if (urls.length === 0) {
    errors.push(`${field}: justification has no HTTPS evidence URL.`);
  }

  if (!inventory.includes(`| \`${field}\` |`)) {
    errors.push(`${field}: no matching assessment-inventory record.`);
  }

  if (!entry || entry.proposedStatus !== "Met" || !entry.evidenceUrl) {
    errors.push(`${field}: no matching Met evidence-matrix record.`);
    continue;
  }

  if (!justification.includes(entry.evidenceUrl)) {
    errors.push(`${field}: matrix evidence URL is absent from its justification.`);
  }

  evidenceUrls.add(entry.evidenceUrl);
}

async function reachable(url) {
  try {
    let response = await fetch(url, { method: "HEAD", redirect: "follow" });
    if (response.status === 405 || response.status === 501) {
      response = await fetch(url, { method: "GET", redirect: "follow" });
    }
    return response.ok ? null : `HTTP ${response.status}`;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

for (const url of evidenceUrls) {
  const failure = await reachable(url);
  if (failure) errors.push(`${url}: unreachable (${failure}).`);
}

if (errors.length > 0) {
  console.error("Best Practices validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(
    `Validated ${metFields.length} Met claims and ${evidenceUrls.size} reachable evidence URLs.`,
  );
}
