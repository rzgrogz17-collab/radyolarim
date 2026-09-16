#!/usr/bin/env node
// Dependency-free validator for stations.json.
// Verifies the file is parseable JSON, is an array, and that every station
// carries the fields the radio app relies on. Reports duplicates as warnings.

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const REQUIRED_STRING_FIELDS = ["stationuuid", "name", "url"];

function parseArgs(argv) {
  const args = { strict: false, file: null };
  for (const arg of argv) {
    if (arg === "--strict") args.strict = true;
    else if (!args.file) args.file = arg;
  }
  return args;
}

async function main() {
  const { strict, file } = parseArgs(process.argv.slice(2));
  const here = dirname(fileURLToPath(import.meta.url));
  const target = resolve(file ?? join(here, "..", "stations.json"));

  let raw;
  try {
    raw = await readFile(target, "utf8");
  } catch (err) {
    console.error(`Cannot read ${target}: ${err.message}`);
    process.exit(2);
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    console.error(`Invalid JSON in ${target}`);
    console.error(`  ${err.message}`);
    process.exit(1);
  }

  const errors = [];
  const warnings = [];

  if (!Array.isArray(data)) {
    console.error(`Expected top-level JSON array, got ${typeof data}.`);
    process.exit(1);
  }

  if (raw.includes("\r\n")) {
    warnings.push("File uses CRLF line endings; consider normalizing to LF.");
  }

  const seenUuids = new Map();
  data.forEach((station, index) => {
    if (typeof station !== "object" || station === null || Array.isArray(station)) {
      errors.push(`Entry #${index} is not an object.`);
      return;
    }
    for (const field of REQUIRED_STRING_FIELDS) {
      const value = station[field];
      if (typeof value !== "string" || value.trim() === "") {
        errors.push(`Entry #${index} (name: ${JSON.stringify(station.name)}) is missing required field "${field}".`);
      }
    }
    const uuid = station.stationuuid;
    if (typeof uuid === "string" && uuid.trim() !== "") {
      if (seenUuids.has(uuid)) {
        warnings.push(`Duplicate stationuuid "${uuid}" at entries #${seenUuids.get(uuid)} and #${index}.`);
      } else {
        seenUuids.set(uuid, index);
      }
    }
  });

  console.log(`Parsed ${data.length} stations from ${target}`);
  const countries = new Set(data.map((s) => s && s.country).filter(Boolean));
  console.log(`Distinct countries: ${countries.size}`);

  if (warnings.length) {
    console.log(`\nWarnings (${warnings.length}):`);
    for (const w of warnings) console.log(`  - ${w}`);
  }

  if (errors.length) {
    console.error(`\nErrors (${errors.length}):`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }

  if (strict && warnings.length) {
    console.error(`\nStrict mode: treating ${warnings.length} warning(s) as failure.`);
    process.exit(1);
  }

  console.log("\nstations.json is valid.");
}

main();
