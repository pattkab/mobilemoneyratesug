import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const { parseMtn, parseAirtelHeadline } = require(join(root, "js/parse-official.js"));
const ratesPath = join(root, "data/rates.json");
const rates = JSON.parse(readFileSync(ratesPath, "utf8"));

async function text(url) {
  const response = await fetch(url, {
    headers: { "user-agent": "MobileMoneyRatesUG/1.0 (+https://mobilemoneyratesug.cc)" }
  });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.text();
}

let changed = false;
try {
  const html = await text(rates.sources.mtn);
  const parsed = parseMtn(html);
  rates.mtn = { ...rates.mtn, ...parsed, note: rates.mtn.note };
  changed = true;
  console.log(`MTN bands: ${parsed.send.length}`);
} catch (error) {
  console.error("MTN refresh failed:", error.message);
}

try {
  const html = await text(rates.sources.airtel);
  const headline = parseAirtelHeadline(html);
  if (headline.maxSendFee && headline.maxSendFee !== rates.airtel.maxSendFee) {
    rates.airtel.maxSendFee = headline.maxSendFee;
    changed = true;
  }
  if (headline.maxWithdrawFee && headline.maxWithdrawFee !== rates.airtel.maxWithdrawFee) {
    rates.airtel.maxWithdrawFee = headline.maxWithdrawFee;
    changed = true;
  }
  console.log("Airtel headline", headline);
} catch (error) {
  console.error("Airtel refresh failed:", error.message);
}

if (!changed) {
  console.log("No parsed changes.");
  process.exit(0);
}
rates.fetchedAt = new Date().toISOString();
writeFileSync(ratesPath, JSON.stringify(rates, null, 2) + "\n");
console.log("Updated", ratesPath);
