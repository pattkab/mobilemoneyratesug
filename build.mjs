import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const rates = JSON.parse(readFileSync(join(root, "data/rates.json"), "utf8"));
const site = "https://mobilemoneyratesug.cc";
const checked = new Date(rates.fetchedAt).toLocaleDateString("en-UG", {
  day: "numeric",
  month: "long",
  year: "numeric"
});

const nav = [
  ["index.html", "Calculator"],
  ["mtn-mobile-money-charges.html", "MTN charges"],
  ["airtel-money-charges.html", "Airtel charges"],
  ["mtn-vs-airtel.html", "Compare"],
  ["withdrawal-tax.html", "0.5% tax"],
  ["bill-payments.html", "Bill payments"],
  ["faq.html", "FAQ"]
];

function esc(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[ch]));
}

function ugx(value) {
  if (value === null || value === undefined) return "—";
  return Number(value).toLocaleString("en-US");
}

function bandLabel(row) {
  return `${ugx(row.min)} – ${ugx(row.max)}`;
}

function feeAt(schedule, amount) {
  const row = schedule.find((band) => amount >= band.min && amount <= band.max);
  if (!row) return null;
  return row.fee;
}

function taxAt(amount) {
  return Math.round(amount * rates.taxRate);
}

function ad(slot) {
  return `<aside class="ad-slot ad-${slot}" hidden data-ad-position="${slot}" aria-label="Advertisement"><span class="ad-label">Advertisement</span></aside>`;
}

function placeInContent(html) {
  const slot = ad("in-content");
  const formAt = html.indexOf("</form>");
  if (formAt >= 0) return html.slice(0, formAt + 7) + slot + html.slice(formAt + 7);
  const marker = "</table></div>";
  const tableAt = html.indexOf(marker);
  if (tableAt >= 0) {
    const end = tableAt + marker.length;
    return html.slice(0, end) + slot + html.slice(end);
  }
  return html + slot;
}

function crumbs(items) {
  const html = [`<a href="index.html">Home</a>`, ...items.map(([href, label]) => href ? `<a href="${href}">${esc(label)}</a>` : esc(label))].join(" / ");
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: `${site}/` }].concat(
      items.filter(([href]) => href !== null).map(([href, label], index) => ({
        "@type": "ListItem",
        position: index + 2,
        name: label,
        item: href.startsWith("http") ? href : `${site}/${href}`
      }))
    )
  };
  const last = items.at(-1);
  if (last && !last[0]) {
    schema.itemListElement.push({
      "@type": "ListItem",
      position: schema.itemListElement.length + 1,
      name: last[1]
    });
  }
  return { html: `<p class="crumbs">${html}</p>`, schema };
}

function layout({ file, title, description, heading, body, crumbItems = [], faq = [] }) {
  const path = file === "index.html" ? "/" : `/${file}`;
  const canonical = `${site}${path}`;
  const crumb = crumbs(crumbItems);
  const faqSchema = faq.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faq.map(([q, a]) => ({
          "@type": "Question",
          name: q,
          acceptedAnswer: { "@type": "Answer", text: a }
        }))
      }
    : null;
  const webPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    description,
    url: canonical,
    dateModified: rates.fetchedAt,
    isPartOf: { "@type": "WebSite", name: "Mobile Money Rates Uganda", url: site },
    about: ["MTN Mobile Money Uganda", "Airtel Money Uganda", "mobile money charges"]
  };
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
  <link rel="canonical" href="${canonical}">
  <link rel="sitemap" type="application/xml" href="${site}/sitemap.xml">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Mobile Money Rates Uganda">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:locale" content="en_UG">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(description)}">
  <meta name="theme-color" content="#1c1612">
  <link rel="icon" href="favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,560;9..144,680&family=Source+Sans+3:wght@400;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/site.css">
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9402272089735179" crossorigin="anonymous"></script>
  <script type="application/ld+json">${JSON.stringify(webPage)}</script>
  <script type="application/ld+json">${JSON.stringify(crumb.schema)}</script>
  ${faqSchema ? `<script type="application/ld+json">${JSON.stringify(faqSchema)}</script>` : ""}
  ${file === "index.html" ? `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Uganda mobile money fee calculator",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    url: site + "/",
    offers: { "@type": "Offer", price: "0", priceCurrency: "UGX" },
    description: "MTN MoMo and Airtel Money charges in Uganda."
  })}</script>` : ""}
</head>
<body>
  <div class="rule"></div>
  <div class="page-shell">
  ${ad("side-left")}
  <div class="page-core">
  <header class="mast wrap">
    <a class="brand" href="index.html">Mobile Money Rates</a>
    <p class="dateline">Checked <time id="checked-at" datetime="${esc(rates.fetchedAt)}">${esc(checked)}</time> · <span id="visitor-count">—</span> visitors</p>
    <nav class="nav" aria-label="Primary">
      ${nav.map(([href, label]) => `<a href="${href}"${href === file ? ' aria-current="page"' : ""}>${label}</a>`).join("")}
    </nav>
    <div class="mast-actions">
      <button id="fetch-rates" type="button">Update rates</button>
      <p id="fetch-status" role="status"></p>
    </div>
  </header>
  ${ad("top")}
  <main class="wrap" id="content">
    ${crumb.html}
    <h1>${heading}</h1>
    ${placeInContent(body)}
  </main>
  ${ad("bottom")}
  <footer class="site-footer">
    <div class="wrap foot-grid">
      <div>
        <strong>Mobile Money Rates Uganda</strong>
        <p>MTN and Airtel fee tables. Not a wallet. Confirm the fee on your phone before you enter your PIN.</p>
      </div>
      <div>
        <strong>Charges</strong>
        <ul>
          <li><a href="mtn-mobile-money-charges.html">MTN Mobile Money charges</a></li>
          <li><a href="airtel-money-charges.html">Airtel Money charges</a></li>
          <li><a href="mtn-vs-airtel.html">MTN vs Airtel</a></li>
          <li><a href="withdrawal-tax.html">Withdrawal tax</a></li>
          <li><a href="send-to-bank.html">Wallet to bank</a></li>
          <li><a href="atm-withdrawal.html">MTN ATM withdrawal</a></li>
          <li><a href="bill-payments.html">UMEME, NWSC, school fees</a></li>
        </ul>
      </div>
      <div>
        <strong>Guides</strong>
        <ul>
          <li><a href="how-to-send-mtn.html">How to send with MTN *165#</a></li>
          <li><a href="how-to-send-airtel.html">How to send with Airtel *185#</a></li>
          <li><a href="limits.html">Limits and free services</a></li>
          <li><a href="faq.html">FAQ</a></li>
          <li><a href="about.html">About</a></li>
          <li><a href="privacy.html">Privacy</a></li>
          <li><a href="contact.html">Contact</a></li>
          <li><a href="${esc(rates.sources.mtn)}">Official MTN tariff</a></li>
          <li><a href="${esc(rates.sources.airtel)}">Official Airtel Money page</a></li>
        </ul>
      </div>
    </div>
  </footer>
  </div>
  ${ad("side-right")}
  </div>
  <script src="js/parse-official.js"></script>
  <script src="js/app.js"></script>
  <script src="js/ads.js"></script>
  <script src="js/counter.js"></script>
</body>
</html>
`;
  writeFileSync(join(root, file), html);
}

function table(headers, rows) {
  const head = headers.map((cell) => `<th>${esc(cell)}</th>`).join("");
  const body = rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("");
  return `<div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

function moneyCell(value) {
  return value === null || value === undefined ? "—" : esc(ugx(value));
}

function mtnTable() {
  const { mtn } = rates;
  const rows = mtn.send.map((band, index) => [
    esc(bandLabel(band)),
    moneyCell(band.fee),
    moneyCell(mtn.bank[index].fee),
    moneyCell(mtn.agent[index].fee),
    moneyCell(mtn.atm[index].fee),
    moneyCell(mtn.points[index]),
    moneyCell(mtn.taxMin[index]),
    moneyCell(mtn.taxMax[index]),
    moneyCell(mtn.school[index].fee),
    moneyCell(mtn.utilities[index].fee)
  ]);
  return table(
    ["Amount (UGX)", "Send to MTN or other networks", "Send to bank", "Agent withdraw", "ATM withdraw", "Senkyu points", "Tax min", "Tax max", "Azam, school fees, ReadyPay, Solar Now", "UMEME, NWSC, DStv, StarTimes, NSSF, Multiplex"],
    rows
  );
}

function airtelTable() {
  const { airtel } = rates;
  const rows = airtel.send.map((band, index) => [
    esc(bandLabel(band)),
    moneyCell(band.fee),
    moneyCell(airtel.agent[index].fee),
    moneyCell(airtel.utilities[index].fee),
    moneyCell(airtel.other[index].fee)
  ]);
  return table(
    ["Amount (UGX)", "Send to Airtel Money", "Agent withdraw", "UMEME, NWSC, Pay TV, URA", "Other payments and school fees"],
    rows
  );
}

function scheduleTable(schedule, headers = ["Amount (UGX)", "Fee (UGX)"]) {
  return table(headers, schedule.map((row) => [esc(bandLabel(row)), moneyCell(row.fee)]));
}

function calculator(intro) {
  return `
  <p class="lede">${intro}</p>
  <form class="panel" id="calculator">
    <div class="calc-grid">
      <div>
        <label for="amount">Amount (UGX)</label>
        <input id="amount" name="amount" inputmode="numeric" value="50000" min="500" required>
      </div>
      <div>
        <label for="action">Transaction</label>
        <select id="action" name="action"></select>
      </div>
      <button type="submit">Check charge</button>
    </div>
    <p id="calc-summary" class="dateline"></p>
    <div id="results" class="results" aria-live="polite"></div>
    <p class="fine">The receiver gets the full amount. Cash-out adds the fee plus 0.5% tax.</p>
  </form>`;
}

const examples = [10000, 20000, 50000, 100000, 200000, 500000, 1000000, 2000000];

function exampleAnswer(amount, kind) {
  const mtnFee = feeAt(rates.mtn[kind === "send" ? "send" : "agent"], amount);
  const airtelFee = feeAt(rates.airtel[kind === "send" ? "send" : "agent"], amount);
  const tax = kind === "withdraw" ? taxAt(amount) : 0;
  const verb = kind === "send" ? "send" : "withdraw";
  return `To ${verb} UGX ${ugx(amount)}: MTN charges ${ugx(mtnFee)} and Airtel charges ${ugx(airtelFee)}${tax ? `, plus UGX ${ugx(tax)} withdrawal tax on either network` : ""}.`;
}

const homeFaq = [
  ["How much does MTN charge to send mobile money in Uganda?", "MTN’s published send fee is UGX 100 up to UGX 5,000, UGX 500 from UGX 5,001 to 60,000, UGX 1,000 from UGX 60,001 to 500,000, UGX 1,500 up to UGX 1,000,000, and UGX 2,000 up to the UGX 5,000,000 transaction limit. The same fee covers MTN and other networks."],
  ["How much does Airtel Money charge to send money in Uganda?", "Airtel’s published send fee to another Airtel Money user is UGX 100 up to UGX 5,000, UGX 500 from UGX 5,001 to 60,000, and UGX 1,000 from UGX 60,001 up to UGX 7,000,000. Airtel’s own page says UGX 1,000 is the highest sending fee in that range."],
  ["How much is the MTN withdrawal charge?", "MTN agent withdrawal starts at UGX 330 for UGX 500–2,500 and rises by band to UGX 20,000 for UGX 4,000,001–5,000,000. Add the 0.5% government withdrawal tax on the amount you cash out."],
  ["How much is the Airtel Money withdrawal charge?", "Airtel agent withdrawal follows the same lower bands as MTN, then stays at UGX 12,500 from UGX 500,001 through UGX 7,000,000. The 0.5% withdrawal tax is added on top."],
  ["Is there a tax on sending mobile money in Uganda?", "The 0.5% tax applies to cash withdrawals, not to sending money, receiving money, bill payments, or wallet-to-bank transfers."],
  ["What is free on MTN MoMo?", "Deposits, receiving money, airtime, bundles, balance checks, mini statements, PIN changes, registration, and roaming access are free on MTN’s tariff page."]
];

layout({
  file: "index.html",
  title: "MTN and Airtel Mobile Money Charges in Uganda (2026) — Fee Calculator",
  description: "Check MTN MoMo and Airtel Money charges in Uganda. Send fees, agent withdrawal, ATM, bank transfer, UMEME, school fees, and the 0.5% withdrawal tax.",
  heading: "MTN and Airtel mobile money charges in Uganda",
  crumbItems: [],
  faq: homeFaq,
  body: `
  ${calculator("MTN and Airtel fees. Checked " + esc(checked) + ".")}
  <div class="cards">
    <article class="card">
      <h3>MTN MoMo</h3>
      <p>Dial ${esc(rates.mtn.ussd)}. Send fee from UGX 100 to UGX 2,000. Agent withdrawal from UGX 330 to UGX 20,000. Maximum transaction UGX ${ugx(rates.mtn.maxTransaction)}.</p>
      <p><a href="mtn-mobile-money-charges.html">Full MTN tariff table</a></p>
    </article>
    <article class="card">
      <h3>Airtel Money</h3>
      <p>Dial ${esc(rates.airtel.ussd)}. Send fee from UGX 100 to UGX ${ugx(rates.airtel.maxSendFee)}. Agent withdrawal capped at UGX ${ugx(rates.airtel.maxWithdrawFee)} up to UGX ${ugx(rates.airtel.maxTransaction)}.</p>
      <p><a href="airtel-money-charges.html">Full Airtel tariff table</a></p>
    </article>
  </div>
  <h2>Common amounts</h2>
  ${table(
    ["Amount", "MTN send", "Airtel send", "MTN agent fee", "Airtel agent fee", "Withdrawal tax"],
    examples.map((amount) => [
      `<a href="charge-${amount}.html">UGX ${ugx(amount)}</a>`,
      esc(ugx(feeAt(rates.mtn.send, amount))),
      esc(ugx(feeAt(rates.airtel.send, amount))),
      esc(ugx(feeAt(rates.mtn.agent, amount))),
      esc(ugx(feeAt(rates.airtel.agent, amount))),
      esc(ugx(taxAt(amount)))
    ])
  )}
  <h2>Look up</h2>
  <ul class="clean searches">
    <li><a href="mtn-mobile-money-charges.html">MTN mobile money charges</a></li>
    <li><a href="airtel-money-charges.html">Airtel Money charges</a></li>
    <li><a href="mtn-vs-airtel.html">MTN vs Airtel charges</a></li>
    <li><a href="withdrawal-tax.html">mobile money withdrawal tax</a></li>
    <li><a href="send-to-bank.html">mobile money to bank charges</a></li>
    <li><a href="atm-withdrawal.html">MTN ATM withdrawal charges</a></li>
    <li><a href="bill-payments.html">UMEME, NWSC and school fees charges</a></li>
    <li><a href="how-to-send-mtn.html">send MTN money *165#</a></li>
    <li><a href="how-to-send-airtel.html">send Airtel money *185#</a></li>
    <li><a href="limits.html">MTN and Airtel money limits</a></li>
  </ul>
  <p class="fine">Source: <a href="${esc(rates.sources.mtn)}">MTN tariffs</a> and <a href="${esc(rates.sources.airtel)}">Airtel Money</a>.</p>
  <div class="faq">
    <h2>FAQ</h2>
    ${homeFaq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("")}
  </div>`
});

layout({
  file: "mtn-mobile-money-charges.html",
  title: "MTN Mobile Money Charges Uganda 2026 — Send, Withdraw, Bank, ATM",
  description: "Official MTN MoMo charges in Uganda: send to MTN or other networks, agent withdrawal, ATM, bank, Senkyu points, and withdrawal tax bands.",
  heading: "MTN Mobile Money charges in Uganda",
  crumbItems: [[null, "MTN charges"]],
  faq: [
    ["What is the MTN MoMo USSD code?", "Dial *165# for MTN Mobile Money in Uganda. A mini statement is on *165*8#."],
    ["Does MTN charge more to send to Airtel?", "On the current MTN tariff table, sending to MTN and sending to other networks is one column with the same fee."]
  ],
  body: `
  <p class="lede">This is the MTN Uganda Mobile Money tariff: send, bank, agent withdrawal, ATM withdrawal, Senkyu points, the published tax range, and bill-payment fees.</p>
  <p class="note">${esc(rates.mtn.note)}</p>
  ${mtnTable()}
  <h2>How to read the tax columns</h2>
  <p>Tax min and tax max are the 0.5% withdrawal tax at the bottom and top of that band. If you withdraw UGX 100,000, you are in the UGX 60,001–125,000 band. The MTN fee is UGX 1,925. The tax is 0.5% of 100,000, which is UGX 500, inside the published UGX 300–625 range for that band. Use the <a href="index.html">calculator</a> for the exact shilling.</p>
  <h2>Send money on MTN</h2>
  <p>The send column is the fee to an MTN number or another network. Receiving into a MoMo wallet is free. Depositing cash is free. See <a href="how-to-send-mtn.html">how to send with *165#</a> and the <a href="send-to-bank.html">wallet-to-bank fees</a>.</p>
  <h2>Account limits on the MTN page</h2>
  <ul class="clean">
    <li>Minimum transaction: UGX ${ugx(rates.mtn.minTransaction)}</li>
    <li>Maximum transaction: UGX ${ugx(rates.mtn.maxTransaction)}</li>
    <li>Minimum balance: UGX ${ugx(rates.mtn.minBalance)}</li>
    <li>Maximum balance: UGX ${ugx(rates.mtn.maxBalance)}</li>
  </ul>
  <p><a href="${esc(rates.sources.mtn)}">Open the MTN tariff page</a></p>`
});

layout({
  file: "airtel-money-charges.html",
  title: "Airtel Money Charges Uganda 2026 — Send, Withdraw, Bills, Bank",
  description: "Airtel Money Uganda charges: send from UGX 100, agent withdrawal up to UGX 12,500, bill payments, bank transfer, and international transfer fees.",
  heading: "Airtel Money charges in Uganda",
  crumbItems: [[null, "Airtel charges"]],
  faq: [
    ["What is the Airtel Money code in Uganda?", "Dial *185# . Sending to a registered customer is under the send-money menu."],
    ["What is the highest Airtel Money sending fee?", `Airtel’s website says the highest sending fee to another Airtel Money user is UGX ${ugx(rates.airtel.maxSendFee)} for as much as UGX ${ugx(rates.airtel.maxTransaction)}.`],
    ["What is the highest Airtel withdrawal fee?", `Airtel’s website says the highest agent withdrawal fee is UGX ${ugx(rates.airtel.maxWithdrawFee)}.`]
  ],
  body: `
  <p class="lede">Airtel Money send and withdrawal bands for Uganda, plus utility payments, other payments, bank transfer, and international transfer.</p>
  <p class="note airtel">${esc(rates.airtel.note)}</p>
  ${airtelTable()}
  <h2>Airtel Money to bank</h2>
  ${scheduleTable(rates.airtel.bank)}
  <p>Amounts under UGX 5,001 are not listed on the published wallet-to-bank sheet.</p>
  <h2>International transfer on Airtel</h2>
  <p>Airtel’s own notice puts cross-border send charges between UGX 900 and UGX 58,000. Receiving into Airtel Money from abroad is free. Withdrawal charges still apply when the receiver cashes out in Uganda.</p>
  ${scheduleTable(rates.airtel.international)}
  <p><a href="how-to-send-airtel.html">How to send with *185#</a> · <a href="${esc(rates.sources.airtel)}">Airtel’s page</a></p>`
});

function compareRows() {
  return examples.map((amount) => {
    const mtnSend = feeAt(rates.mtn.send, amount);
    const airSend = feeAt(rates.airtel.send, amount);
    const mtnAgent = feeAt(rates.mtn.agent, amount);
    const airAgent = feeAt(rates.airtel.agent, amount);
    const tax = taxAt(amount);
    const sendCheaper = mtnSend === airSend ? "Same" : mtnSend < airSend ? "MTN" : "Airtel";
    const withdrawCheaper = (mtnAgent + tax) === (airAgent + tax) ? "Same" : mtnAgent < airAgent ? "MTN" : "Airtel";
    return [
      `<a href="charge-${amount}.html">${ugx(amount)}</a>`,
      esc(ugx(mtnSend)),
      esc(ugx(airSend)),
      esc(sendCheaper),
      esc(ugx(mtnAgent + tax)),
      esc(ugx(airAgent + tax)),
      esc(withdrawCheaper)
    ];
  });
}

layout({
  file: "mtn-vs-airtel.html",
  title: "MTN vs Airtel Mobile Money Charges Uganda — Which Is Cheaper?",
  description: "Compare MTN MoMo and Airtel Money fees in Uganda for sending and agent withdrawal, including the 0.5% tax, at the amounts people transfer most.",
  heading: "MTN vs Airtel: which mobile money charge is lower?",
  crumbItems: [[null, "Compare"]],
  faq: [
    ["Is Airtel cheaper than MTN for sending money?", "On the published sheets, send fees match from UGX 500 to UGX 500,000. Above UGX 500,000 Airtel stays at UGX 1,000 while MTN rises to UGX 1,500 and then UGX 2,000."],
    ["Is Airtel cheaper to withdraw?", "The agent fee matches MTN up to UGX 500,000. From UGX 500,001 Airtel stays at UGX 12,500 while MTN continues up to UGX 20,000. The 0.5% tax is the same on both."]
  ],
  body: `
  <p class="lede">Side-by-side MTN MoMo and Airtel Money charges for the amounts Ugandans actually send and withdraw. Withdrawal totals include the 0.5% tax at that exact amount.</p>
  ${table(["Amount (UGX)", "MTN send", "Airtel send", "Cheaper to send", "MTN withdraw all-in", "Airtel withdraw all-in", "Cheaper to withdraw"], compareRows())}
  <p>Below UGX 500,000 the published send and agent fees are the same shilling. The gap opens on larger cash-outs and on sends above UGX 500,000, where Airtel’s published cap is lower. Bill-payment menus are named differently, so compare those on the <a href="bill-payments.html">bill payment charges</a> page rather than assuming the send fee applies.</p>
  <p><a href="index.html">Open the calculator</a> for an amount that is not in this list.</p>`
});

layout({
  file: "withdrawal-tax.html",
  title: "Uganda Mobile Money Withdrawal Tax 2026 — 0.5% Excise Duty",
  description: "Uganda’s 0.5% mobile money withdrawal tax, with MTN’s published tax range for every band and examples for MTN MoMo and Airtel Money.",
  heading: "Uganda’s 0.5% mobile money withdrawal tax",
  crumbItems: [[null, "Withdrawal tax"]],
  faq: [
    ["Does the 0.5% tax apply when I send money?", "No. It applies when cash is withdrawn at an agent, ATM, or bank counter. Sending, receiving, bill payment, and wallet-to-bank are outside this tax."],
    ["Is the tax the same on MTN and Airtel?", "Yes. It is a government tax on the amount withdrawn, so UGX 100,000 withdrawn costs UGX 500 in tax on either network, before the network fee."]
  ],
  body: `
  <p class="lede">The withdrawal tax is 0.5% of the cash you take out. MTN prints the bottom and top of that tax for each band. This page turns those ranges into the exact shilling for a chosen amount.</p>
  <p>Withdraw UGX 50,000 on MTN: network fee UGX ${ugx(feeAt(rates.mtn.agent, 50000))}, tax UGX ${ugx(taxAt(50000))}, total extra UGX ${ugx(feeAt(rates.mtn.agent, 50000) + taxAt(50000))}. The same tax applies on Airtel. The network fee at that amount is also UGX ${ugx(feeAt(rates.airtel.agent, 50000))}.</p>
  ${table(
    ["Amount withdrawn", "Tax at 0.5%", "MTN fee", "MTN total extra", "Airtel fee", "Airtel total extra"],
    examples.map((amount) => [
      esc(ugx(amount)),
      esc(ugx(taxAt(amount))),
      esc(ugx(feeAt(rates.mtn.agent, amount))),
      esc(ugx((feeAt(rates.mtn.agent, amount) || 0) + taxAt(amount))),
      esc(ugx(feeAt(rates.airtel.agent, amount))),
      esc(ugx((feeAt(rates.airtel.agent, amount) || 0) + taxAt(amount)))
    ])
  )}
  <h2>MTN’s published tax range</h2>
  <p>These are the tax min and tax max columns on the MTN tariff, not a second fee schedule. Your tax is 0.5% of the exact amount, which lands inside the range.</p>
  ${table(
    ["Amount band", "Tax at the bottom", "Tax at the top"],
    rates.mtn.send.map((band, index) => [esc(bandLabel(band)), esc(ugx(rates.mtn.taxMin[index])), esc(ugx(rates.mtn.taxMax[index]))])
  )}`
});

layout({
  file: "send-to-bank.html",
  title: "MTN and Airtel Wallet to Bank Charges Uganda",
  description: "MTN MoMo and Airtel Money charges for sending from a mobile money wallet to a bank account in Uganda.",
  heading: "Mobile money to bank charges in Uganda",
  crumbItems: [[null, "Wallet to bank"]],
  faq: [
    ["Is wallet-to-bank taxed at 0.5%?", "No. The 0.5% withdrawal tax is for cash withdrawal. A transfer into a bank account pays the network fee only."],
    ["Can I send UGX 2,000 from MTN to a bank?", "MTN marks UGX 500–2,500 to the bank as not available. The first listed bank fee is UGX 1,500 from UGX 2,501."]
  ],
  body: `
  <p class="lede">Fees for pushing money from MTN MoMo or Airtel Money into a bank account. This is not the same as withdrawing cash.</p>
  <h2>MTN send to bank</h2>
  ${scheduleTable(rates.mtn.bank)}
  <h2>Airtel Money to bank</h2>
  ${scheduleTable(rates.airtel.bank)}
  <p>A dash means the published sheet has no fee for that band. Check the bank name on the *165# or *185# menu, because a bank can add its own charge on top of the mobile-money fee.</p>`
});

layout({
  file: "atm-withdrawal.html",
  title: "MTN MoMo ATM Withdrawal Charges Uganda",
  description: "MTN Mobile Money ATM withdrawal fees in Uganda, from UGX 1,150, plus the 0.5% withdrawal tax. Airtel does not publish a matching ATM column.",
  heading: "MTN ATM withdrawal charges",
  crumbItems: [[null, "ATM withdrawal"]],
  faq: [
    ["Does the ATM fee include the tax?", "No. Add 0.5% of the amount withdrawn. Withdrawing UGX 50,000 at an MTN-enabled ATM costs the UGX 1,400 network fee plus UGX 250 tax."],
    ["What is the highest MTN ATM withdrawal?", "The published ATM column runs up to UGX 1,000,000 at a fee of UGX 11,950. Higher bands are blank on MTN’s table."]
  ],
  body: `
  <p class="lede">MTN lists a separate ATM withdrawal column. It is higher than the agent fee on small amounts and blank above UGX 1,000,000. The 0.5% tax still applies.</p>
  ${scheduleTable(rates.mtn.atm)}
  <p>Airtel’s public tariff material used here does not include an ATM column. If your bank’s ATM offers Airtel cash-out, the handset prompt is the fee that will be deducted.</p>`
});

layout({
  file: "bill-payments.html",
  title: "MTN and Airtel Charges for UMEME, NWSC, School Fees, DStv Uganda",
  description: "Mobile money charges in Uganda for UMEME, NWSC, DStv, StarTimes, NSSF, school fees, Azam TV, ReadyPay, and Solar Now on MTN and Airtel.",
  heading: "Bill payment charges on MTN and Airtel",
  crumbItems: [[null, "Bill payments"]],
  faq: [
    ["Is paying UMEME with mobile money taxed?", "The 0.5% withdrawal tax does not apply to bill payments. You pay the network’s payment fee only."],
    ["Are school fees the same fee as UMEME on MTN?", "No. MTN publishes a lower fee for Azam TV, ReadyPay, school fees, and Solar Now than for UMEME, NWSC, DStv, StarTimes, NSSF, and Multiplex."]
  ],
  body: `
  <p class="lede">Paying a bill from the wallet is cheaper than withdrawing cash and paying at a counter. These are the published payment fees, with no 0.5% withdrawal tax.</p>
  <h2>MTN: Azam TV, ReadyPay, school fees, Solar Now</h2>
  ${scheduleTable(rates.mtn.school)}
  <h2>MTN: UMEME, NWSC, DStv, StarTimes, NSSF, Multiplex</h2>
  ${scheduleTable(rates.mtn.utilities)}
  <h2>Airtel: UMEME, NWSC, Pay TV, UEDCL, KCCA, URA</h2>
  ${scheduleTable(rates.airtel.utilities)}
  <h2>Airtel: other payments, including school fees</h2>
  ${scheduleTable(rates.airtel.other)}
  <p>Menus move. If the biller is missing, the *165# or *185# prompt shows the fee before you confirm.</p>`
});

layout({
  file: "how-to-send-mtn.html",
  title: "How to Send MTN Mobile Money in Uganda with *165#",
  description: "Steps to send MTN MoMo in Uganda using *165#, what the send fee is, and what is free: deposits, airtime, balance, and receiving.",
  heading: "How to send money with MTN MoMo",
  crumbItems: [[null, "Send with MTN"]],
  faq: [
    ["What code do I dial for MTN Mobile Money?", "Dial *165# on the MTN line that holds the wallet."],
    ["Does the receiver pay to receive MTN MoMo?", "No. Receiving into a registered MoMo wallet is free. The sender pays the band fee."]
  ],
  body: `
  <p class="lede">Sending on MTN uses *165#. The fee depends only on the amount, and it is the same for an MTN wallet or another network on the current tariff.</p>
  <ol class="steps">
    <li>Dial *165# and choose Send Money.</li>
    <li>Choose a mobile number, or the option for someone without mobile money if you are creating a voucher.</li>
    <li>Enter the number and the amount.</li>
    <li>Read the fee on the confirmation screen. It should match the <a href="mtn-mobile-money-charges.html">MTN send table</a>.</li>
    <li>Enter your MoMo PIN. The receiver gets the full amount. Your wallet drops by the amount plus the fee.</li>
  </ol>
  <h2>Services MTN lists as free</h2>
  <ul class="clean">${rates.mtn.free.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>
  <p>Do not hand an agent a separate fee. MTN deducts charges from the wallet.</p>`
});

layout({
  file: "how-to-send-airtel.html",
  title: "How to Send Airtel Money in Uganda with *185#",
  description: "Steps to send Airtel Money in Uganda using *185#, the send fee bands, and what Airtel says about receiving money for free.",
  heading: "How to send money with Airtel Money",
  crumbItems: [[null, "Send with Airtel"]],
  faq: [
    ["What code do I dial for Airtel Money?", "Dial *185# on the Airtel line. Send money is in that menu."],
    ["Does someone pay to receive Airtel Money?", "Airtel says money received into an Airtel Money wallet is free, including international receipts."]
  ],
  body: `
  <p class="lede">Airtel Money sending in Uganda starts at UGX 100. The highest published fee to another Airtel Money user is UGX ${ugx(rates.airtel.maxSendFee)}.</p>
  <ol class="steps">
    <li>Dial *185#.</li>
    <li>Choose Send Money and enter the receiver’s number.</li>
    <li>Enter the amount. The menu shows the fee before you confirm.</li>
    <li>Enter your Airtel Money PIN.</li>
    <li>The receiver gets an SMS. They can withdraw at an agent and will pay the <a href="airtel-money-charges.html">withdrawal fee</a> plus 0.5% tax at that point, not when the money arrives.</li>
  </ol>
  <h2>Cross-border</h2>
  <p>Airtel’s international menu is on *185#. Published cross-border fees run from UGX 900 to UGX 58,000. Countries named on Airtel’s pages include Rwanda, Tanzania, Zambia, and Malawi. The handset shows the forex rate and fee before you confirm.</p>
  <ul class="clean">${rates.airtel.free.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>`
});

layout({
  file: "limits.html",
  title: "MTN and Airtel Mobile Money Limits in Uganda",
  description: "MTN MoMo limits in Uganda: minimum UGX 500, maximum transaction UGX 5,000,000, maximum balance UGX 20,000,000. Airtel send and withdraw bands run to UGX 7,000,000.",
  heading: "Mobile money limits and free services",
  crumbItems: [[null, "Limits"]],
  faq: [
    ["What is the maximum MTN MoMo transaction?", "MTN publishes a maximum transaction of UGX 5,000,000 and a maximum balance of UGX 20,000,000."],
    ["What is the maximum Airtel Money send?", "Airtel’s live page describes sending and withdrawing as much as UGX 7,000,000, with the fee caps stated on that page."]
  ],
  body: `
  <p class="lede">Limits published by the networks, and the services they list at no charge.</p>
  ${table(
    ["Limit", "MTN MoMo", "Airtel Money"],
    [
      ["Minimum transaction", `UGX ${ugx(rates.mtn.minTransaction)}`, `UGX ${ugx(rates.airtel.minTransaction)}`],
      ["Maximum transaction on the tariff", `UGX ${ugx(rates.mtn.maxTransaction)}`, `UGX ${ugx(rates.airtel.maxTransaction)}`],
      ["Maximum balance", `UGX ${ugx(rates.mtn.maxBalance)}`, "Confirm in the Airtel Money menu"],
      ["Highest send fee", `UGX ${ugx(rates.mtn.send.at(-1).fee)}`, `UGX ${ugx(rates.airtel.maxSendFee)}`],
      ["Highest agent withdrawal fee", `UGX ${ugx(rates.mtn.agent.at(-1).fee)}`, `UGX ${ugx(rates.airtel.maxWithdrawFee)}`]
    ].map((row) => row.map(esc))
  )}
  <h2>Free on MTN</h2>
  <ul class="clean">${rates.mtn.free.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>
  <h2>Free on Airtel</h2>
  <ul class="clean">${rates.airtel.free.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>`
});

const faqPairs = [
  ...homeFaq,
  ["How do I check MTN MoMo charges before sending?", "Dial *165#, enter the amount, and read the confirmation screen. You can also use the calculator on this site, then press Fetch latest rates to re-read mtn.co.ug."],
  ["How do I check Airtel Money charges?", "Dial *185# and read the fee before you enter your PIN. This site keeps Airtel’s published bands and re-checks airtel.co.ug from the button at the top."],
  ["Can an agent charge me extra?", "No. Both networks say the fee is deducted from the wallet. Refuse any extra cash charge and keep the SMS."],
  ["What does Senkyu points mean on MTN?", "Senkyu points are the loyalty points MTN prints beside each band on the tariff table. They are not a cash fee."],
  ["How much does it cost to withdraw 100,000 on MTN?", exampleAnswer(100000, "withdraw")],
  ["How much does it cost to send 50,000 on Airtel?", exampleAnswer(50000, "send")]
];

layout({
  file: "faq.html",
  title: "Mobile Money Charges Uganda — FAQ for MTN MoMo and Airtel Money",
  description: "Answers on MTN and Airtel mobile money charges in Uganda: send fees, withdrawal fees, the 0.5% tax, USSD codes, and agent charges.",
  heading: "Mobile money charges FAQ",
  crumbItems: [[null, "FAQ"]],
  faq: faqPairs,
  body: `<p class="lede">Short answers to the searches people run before they send or withdraw mobile money in Uganda.</p>
  <div class="faq">${faqPairs.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("")}</div>`
});

layout({
  file: "about.html",
  title: "About Mobile Money Rates Uganda",
  description: "Mobile Money Rates Uganda publishes MTN MoMo and Airtel Money tariffs taken from the operators’ own websites, with a calculator and a live refresh.",
  heading: "About this fee desk",
  crumbItems: [[null, "About"]],
  body: `
  <p class="lede">Mobile Money Rates Uganda is an independent page for published MTN and Airtel charges. It is not a wallet, an agent, or part of MTN or Airtel.</p>
  <p>MTN numbers are parsed from the HTML table at mtn.co.ug. Airtel’s marketing and help pages state the fee caps and do not currently expose the full grid as a table, so the Airtel bands are the sheet Airtel published, kept in line with those caps. The button at the top fetches both websites again in your browser.</p>
  <p>The site is published for the domain mobilemoneyratesug.cc. Nothing here moves money. The PIN prompt on your phone is the charge you will pay.</p>`
});

layout({
  file: "privacy.html",
  title: "Privacy Policy — Mobile Money Rates Uganda",
  description: "Privacy policy for Mobile Money Rates Uganda, including Google AdSense cookies and the rate refresh stored in your browser.",
  heading: "Privacy policy",
  crumbItems: [[null, "Privacy"]],
  body: `
  <p>This policy covers mobilemoneyratesug.cc. The site calculates published mobile-money fees. It does not ask for your phone number, PIN, or wallet balance.</p>
  <h2>What the site stores</h2>
  <p>If you press “Fetch latest rates”, the browser saves the tariff it just read in local storage on your device so the calculator can use it on the next visit. That data stays on your device. You can clear it in your browser settings.</p>
  <h2>Advertising</h2>
  <p>Google AdSense (publisher ca-pub-9402272089735179) may place ads. Google and its partners use cookies to serve and measure ads, including ads based on your visits to this and other sites. You can opt out of personalised advertising in <a href="https://adssettings.google.com/">Google’s ad settings</a>. See also <a href="https://policies.google.com/technologies/ads">how Google uses advertising cookies</a>.</p>
  <h2>Visitors</h2>
  <p>A counter on each page stores one number: how many browsers have opened the site. It does not store your name, phone number, or wallet. Refreshing the same day does not add another visit.</p>
  <h2>Logs</h2>
  <p>Cloudflare, which serves this site, may keep standard request logs such as IP address and browser type for security and diagnostics.</p>
  <h2>Contact</h2>
  <p>Privacy questions: <a href="mailto:hello@mobilemoneyratesug.cc">hello@mobilemoneyratesug.cc</a>.</p>`
});

layout({
  file: "contact.html",
  title: "Contact Mobile Money Rates Uganda",
  description: "Contact the publisher of Mobile Money Rates Uganda, and the official MTN and Airtel customer lines for wallet problems.",
  heading: "Contact",
  crumbItems: [[null, "Contact"]],
  body: `
  <p>For a correction to a published fee, email <a href="mailto:hello@mobilemoneyratesug.cc">hello@mobilemoneyratesug.cc</a>. Include the amount, the network, and a photo of the handset prompt if you have one.</p>
  <p>This mailbox cannot reverse a transaction. For a wrong PIN, a missing transfer, or an agent dispute, use the network:</p>
  <ul class="clean">
    <li>MTN customer service: 0771 001 000, or customerservice.ug@mtn.com, as printed on the MTN tariff page. Toll-free 100.</li>
    <li>Airtel Money: dial *185# or use the help options on airtel.co.ug.</li>
  </ul>`
});

layout({
  file: "404.html",
  title: "Page not found — Mobile Money Rates Uganda",
  description: "That page is not on Mobile Money Rates Uganda. Use the calculator for MTN and Airtel charges.",
  heading: "That page is not here",
  crumbItems: [[null, "Not found"]],
  body: `<p>The calculator and the MTN and Airtel tables are on the <a href="index.html">home page</a>.</p>`
});

for (const amount of examples) {
  const mtnSend = feeAt(rates.mtn.send, amount);
  const airSend = feeAt(rates.airtel.send, amount);
  const mtnAgent = feeAt(rates.mtn.agent, amount);
  const airAgent = feeAt(rates.airtel.agent, amount);
  const tax = taxAt(amount);
  const label = `UGX ${ugx(amount)}`;
  layout({
    file: `charge-${amount}.html`,
    title: `MTN and Airtel Charges for ${label} in Uganda`,
    description: `Send or withdraw ${label} on MTN MoMo and Airtel Money in Uganda. Network fees, 0.5% withdrawal tax, and the wallet balance you need.`,
    heading: `Charges for ${label}`,
    crumbItems: [["mtn-vs-airtel.html", "Compare"], [null, label]],
    faq: [
      [`How much does MTN charge to send ${label}?`, `MTN’s send fee is UGX ${ugx(mtnSend)}. The receiver gets the full ${label}. Your wallet needs UGX ${ugx(amount + mtnSend)}.`],
      [`How much does it cost to withdraw ${label} on Airtel Money?`, `Airtel’s agent fee is UGX ${ugx(airAgent)} plus UGX ${ugx(tax)} tax. Total extra is UGX ${ugx(airAgent + tax)}.`]
    ],
    body: `
    <p class="lede">Published network fees for sending or withdrawing ${label}, and the wallet balance each transaction needs.</p>
    ${table(
      ["Transaction", "MTN fee", "MTN tax", "MTN wallet needed", "Airtel fee", "Airtel tax", "Airtel wallet needed"],
      [
        ["Send to a wallet", ugx(mtnSend), "0", ugx(amount + (mtnSend || 0)), ugx(airSend), "0", ugx(amount + (airSend || 0))],
        ["Withdraw at an agent", ugx(mtnAgent), ugx(tax), ugx(amount + (mtnAgent || 0) + tax), ugx(airAgent), ugx(tax), ugx(amount + (airAgent || 0) + tax)],
        ["MTN send to bank", ugx(feeAt(rates.mtn.bank, amount)), "0", ugx(amount + (feeAt(rates.mtn.bank, amount) || 0)), ugx(feeAt(rates.airtel.bank, amount)), "0", feeAt(rates.airtel.bank, amount) == null ? "—" : ugx(amount + feeAt(rates.airtel.bank, amount))]
      ].map((row) => row.map((cell) => esc(String(cell))))
    )}
    <p>${esc(exampleAnswer(amount, "send"))} ${esc(exampleAnswer(amount, "withdraw"))}</p>
    <p><a href="index.html">Check another amount</a> · <a href="charge-${examples[Math.max(0, examples.indexOf(amount) - 1)]}.html">Smaller amount</a> · <a href="charge-${examples[Math.min(examples.length - 1, examples.indexOf(amount) + 1)]}.html">Larger amount</a></p>`
  });
}

const files = [
  "index.html",
  "mtn-mobile-money-charges.html",
  "airtel-money-charges.html",
  "mtn-vs-airtel.html",
  "withdrawal-tax.html",
  "send-to-bank.html",
  "atm-withdrawal.html",
  "bill-payments.html",
  "how-to-send-mtn.html",
  "how-to-send-airtel.html",
  "limits.html",
  "faq.html",
  "about.html",
  "privacy.html",
  "contact.html",
  ...examples.map((amount) => `charge-${amount}.html`)
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${files.map((file) => `  <url><loc>${site}/${file === "index.html" ? "" : file}</loc><lastmod>${rates.fetchedAt.slice(0, 10)}</lastmod></url>`).join("\n")}
</urlset>
`;
writeFileSync(join(root, "sitemap.xml"), sitemap);
console.log(`Built ${files.length} pages`);
