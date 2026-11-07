(function () {
  var STORAGE_KEY = "mmrates-ug-v1";
  var state = null;

  var actions = [
    { id: "send", label: "Send to a mobile money number", taxable: false, mtn: "send", airtel: "send" },
    { id: "agent", label: "Withdraw cash at an agent", taxable: true, mtn: "agent", airtel: "agent" },
    { id: "atm", label: "Withdraw at an ATM", taxable: true, mtn: "atm", airtel: null },
    { id: "bank", label: "Send from wallet to a bank", taxable: false, mtn: "bank", airtel: "bank" },
    { id: "school", label: "Pay school fees, Azam, ReadyPay, or Solar Now", taxable: false, mtn: "school", airtel: "other" },
    { id: "utilities", label: "Pay UMEME, NWSC, DStv, StarTimes, NSSF, or URA", taxable: false, mtn: "utilities", airtel: "utilities" },
    { id: "international", label: "Send outside Uganda (Airtel international)", taxable: false, mtn: null, airtel: "international" }
  ];

  function ugx(value) {
    if (value === null || value === undefined || Number.isNaN(value)) return "Not available";
    return "UGX " + Math.round(value).toLocaleString("en-US");
  }

  function feeFor(schedule, amount) {
    if (!schedule) return undefined;
    var row = schedule.find(function (band) { return amount >= band.min && amount <= band.max; });
    if (!row) return undefined;
    return row.fee;
  }

  function taxFor(amount, taxable) {
    if (!taxable) return 0;
    return Math.round(amount * (state.taxRate || 0.005));
  }

  function quote(network, scheduleName, amount, taxable) {
    if (!scheduleName) {
      return { available: false, reason: "This network does not publish this service on the same tariff." };
    }
    var fee = feeFor(state[network][scheduleName], amount);
    if (fee === undefined) {
      var max = state[network].maxTransaction;
      return { available: false, reason: "Outside the published range (up to " + ugx(max) + ")." };
    }
    if (fee === null) {
      return { available: false, reason: "The published sheet marks this amount as not available." };
    }
    var tax = taxFor(amount, taxable);
    return { available: true, fee: fee, tax: tax, total: fee + tax, wallet: amount + fee + tax };
  }

  function renderResults() {
    var box = document.getElementById("results");
    if (!box || !state) return;
    var amount = Number(String(document.getElementById("amount").value).replace(/,/g, ""));
    var action = actions.find(function (item) { return item.id === document.getElementById("action").value; }) || actions[0];
    if (!amount || amount < 500) {
      box.innerHTML = "<p class='note'>Enter at least UGX 500. That is the minimum transaction on both networks.</p>";
      return;
    }
    var mtn = quote("mtn", action.mtn, amount, action.taxable);
    var airtel = quote("airtel", action.airtel, amount, action.taxable);
    var cheaper = "";
    if (mtn.available && airtel.available) {
      if (mtn.total < airtel.total) cheaper = "mtn";
      else if (airtel.total < mtn.total) cheaper = "airtel";
      else cheaper = "tie";
    }
    box.innerHTML = card("mtn", "MTN MoMo", mtn, cheaper === "mtn") + card("airtel", "Airtel Money", airtel, cheaper === "airtel");
    if (cheaper === "tie") {
      box.insertAdjacentHTML("beforeend", "<p class='note'>Both networks deduct the same extra cost for this amount and service.</p>");
    }
    var summary = document.getElementById("calc-summary");
    if (summary) {
      summary.textContent = "For UGX " + amount.toLocaleString("en-US") + ", " + action.label.toLowerCase() + ".";
    }
  }

  function card(kind, name, result, isCheaper) {
    var badge = isCheaper ? "<span class='badge'>Lower charge</span>" : "";
    if (!result.available) {
      return "<article class='quote " + kind + "'><header><h3>" + name + "</h3></header><p>" + result.reason + "</p></article>";
    }
    return (
      "<article class='quote " + kind + "'><header><h3>" + name + "</h3>" + badge + "</header>" +
      "<p class='big'>" + ugx(result.total) + "</p><p>Extra deducted from the wallet</p>" +
      "<dl class='breakdown'>" +
      row("Network fee", ugx(result.fee)) +
      row("Withdrawal tax (0.5%)", result.tax ? ugx(result.tax) : "UGX 0") +
      row("Amount moved", ugx(result.wallet - result.total)) +
      row("Wallet balance needed", ugx(result.wallet)) +
      "</dl></article>"
    );
  }

  function row(label, value) {
    return "<div><dt>" + label + "</dt><dd>" + value + "</dd></div>";
  }

  function fillActions() {
    var select = document.getElementById("action");
    if (!select || select.options.length) return;
    actions.forEach(function (action) {
      var option = document.createElement("option");
      option.value = action.id;
      option.textContent = action.label;
      select.appendChild(option);
    });
  }

  function setStatus(message, kind) {
    var node = document.getElementById("fetch-status");
    if (!node) return;
    node.textContent = message;
    node.className = kind || "";
  }

  function stamp() {
    var time = document.getElementById("checked-at");
    if (!time || !state) return;
    var date = new Date(state.fetchedAt);
    if (Number.isNaN(date.getTime())) return;
    time.dateTime = date.toISOString();
    time.textContent = date.toLocaleString("en-UG", { dateStyle: "long", timeStyle: "short" });
  }

  async function loadRates() {
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); } catch (error) { saved = null; }
    var response = await fetch("data/rates.json", { cache: "no-cache" });
    var bundled = await response.json();
    if (saved && saved.fetchedAt && bundled.fetchedAt && saved.fetchedAt > bundled.fetchedAt) {
      state = saved;
    } else {
      state = bundled;
    }
    stamp();
    renderResults();
  }

  async function fetchText(url) {
    var proxies = [
      function (target) { return "https://api.allorigins.win/raw?url=" + encodeURIComponent(target); },
      function (target) { return "https://corsproxy.io/?" + encodeURIComponent(target); }
    ];
    var lastError = null;
    for (var i = 0; i < proxies.length; i += 1) {
      try {
        var response = await fetch(proxies[i](url));
        if (!response.ok) throw new Error("HTTP " + response.status);
        var text = await response.text();
        if (text.length < 400) throw new Error("Empty response");
        return text;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error("Could not reach the site");
  }

  async function refreshFromOfficialSites() {
    var button = document.getElementById("fetch-rates");
    if (button) button.disabled = true;
    setStatus("Reading MTN…");
    var notes = [];
    try {
      var mtnHtml = await fetchText(state.sources.mtn);
      var parsed = window.OfficialRates.parseMtn(mtnHtml);
      Object.keys(parsed).forEach(function (key) { state.mtn[key] = parsed[key]; });
      notes.push("MTN updated.");
    } catch (error) {
      notes.push("MTN could not be read. Saved sheet shown.");
    }
    setStatus("Reading Airtel…");
    try {
      var airtelHtml = await fetchText(state.sources.airtel);
      var headline = window.OfficialRates.parseAirtelHeadline(airtelHtml);
      if (headline.maxSendFee) state.airtel.maxSendFee = headline.maxSendFee;
      if (headline.maxWithdrawFee) state.airtel.maxWithdrawFee = headline.maxWithdrawFee;
      var sendCap = state.airtel.send[state.airtel.send.length - 1].fee;
      var withdrawCap = state.airtel.agent[state.airtel.agent.length - 1].fee;
      if (headline.maxSendFee && headline.maxSendFee !== sendCap) {
        notes.push("Airtel send cap is now " + ugx(headline.maxSendFee) + ". Table still tops out at " + ugx(sendCap) + ".");
      } else if (headline.maxWithdrawFee && headline.maxWithdrawFee !== withdrawCap) {
        notes.push("Airtel withdrawal cap is now " + ugx(headline.maxWithdrawFee) + ". Table still tops out at " + ugx(withdrawCap) + ".");
      } else if (headline.maxSendFee) {
        notes.push("Airtel caps unchanged. No new table.");
      } else {
        notes.push("Airtel table not found. Saved bands kept.");
      }
    } catch (error) {
      notes.push("Airtel could not be read.");
    }
    state.fetchedAt = new Date().toISOString();
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (error) { /* private mode */ }
    stamp();
    renderResults();
    var failed = notes.every(function (note) { return /could not/i.test(note); });
    setStatus(notes.join(" "), failed ? "bad" : "ok");
    if (button) button.disabled = false;
  }

  document.addEventListener("DOMContentLoaded", function () {
    fillActions();
    var form = document.getElementById("calculator");
    if (form) {
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        renderResults();
      });
      ["amount", "action"].forEach(function (id) {
        var field = document.getElementById(id);
        if (field) field.addEventListener("input", renderResults);
        if (field) field.addEventListener("change", renderResults);
      });
    }
    var button = document.getElementById("fetch-rates");
    if (button) button.addEventListener("click", refreshFromOfficialSites);
    loadRates().catch(function () {
      setStatus("The saved rate file could not be loaded.", "bad");
    });
  });
})();
