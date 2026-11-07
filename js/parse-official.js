(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.OfficialRates = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function stripTags(value) {
    return String(value)
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim();
  }

  function parseMoney(value) {
    var text = String(value || "").trim();
    if (!text || /^n\/?a$/i.test(text) || text === "-" || text === "—") return null;
    if (/^\d+\.\d{3}$/.test(text)) return Number(text.replace(".", ""));
    var digits = text.replace(/,/g, "");
    if (!/^\d+(\.\d+)?$/.test(digits)) return null;
    return Math.round(Number(digits));
  }

  function parseRange(value) {
    var match = String(value).replace(/,/g, "").match(/(\d+)\s*[-–]\s*(\d+)/);
    if (!match) return null;
    return { min: Number(match[1]), max: Number(match[2]) };
  }

  function rowsFromHtml(html) {
    var tableMatch = String(html).match(/<table[^>]*for-desktop[^>]*>([\s\S]*?)<\/table>/i);
    var chunk = tableMatch ? tableMatch[1] : String(html);
    var rows = [];
    var rowRe = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
    var rowMatch;
    while ((rowMatch = rowRe.exec(chunk))) {
      var cells = [];
      var cellRe = /class\s*=\s*"table-(?:head-item|entry)"\s*>([\s\S]*?)<\//gi;
      var cellMatch;
      while ((cellMatch = cellRe.exec(rowMatch[1]))) cells.push(stripTags(cellMatch[1]));
      if (cells.length < 4) {
        cells = [];
        var loose = /<(?:td|th)\b[^>]*>([\s\S]*?)<\/(?:td|th)>/gi;
        var looseMatch;
        while ((looseMatch = loose.exec(rowMatch[1]))) cells.push(stripTags(looseMatch[1]));
      }
      if (cells.length) rows.push(cells);
    }
    return rows;
  }

  function headerIndex(headers, pattern) {
    for (var i = 0; i < headers.length; i += 1) {
      if (pattern.test(headers[i])) return i;
    }
    return -1;
  }

  function parseMtn(html) {
    var rows = rowsFromHtml(html);
    if (!rows.length) throw new Error("MTN page has no tariff table.");
    var headers = rows[0].map(function (cell) { return cell.toLowerCase(); });
    var amountCol = headerIndex(headers, /amount/);
    var sendCol = headerIndex(headers, /sending to mtn|other networks/);
    var bankCol = headerIndex(headers, /bank/);
    var agentCol = headerIndex(headers, /agent withdraw/);
    var atmCol = headerIndex(headers, /atm/);
    var pointsCol = headerIndex(headers, /senkyu/);
    var taxMinCol = headerIndex(headers, /tax \(min\)/);
    var taxMaxCol = headerIndex(headers, /tax \(max\)/);
    var schoolCol = headerIndex(headers, /azam|school fees|solar/);
    var utilityCol = headerIndex(headers, /umeme|nwsc|dstv/);
    if (amountCol < 0 || sendCol < 0 || agentCol < 0) {
      throw new Error("MTN table headings did not match the published tariff.");
    }

    var send = [];
    var bank = [];
    var agent = [];
    var atm = [];
    var school = [];
    var utilities = [];
    var points = [];
    var taxMin = [];
    var taxMax = [];

    rows.slice(1).forEach(function (cells) {
      var range = parseRange(cells[amountCol] || "");
      if (!range) return;
      function take(index) {
        if (index < 0) return null;
        return parseMoney(cells[index]);
      }
      send.push({ min: range.min, max: range.max, fee: take(sendCol) });
      bank.push({ min: range.min, max: range.max, fee: take(bankCol) });
      agent.push({ min: range.min, max: range.max, fee: take(agentCol) });
      atm.push({ min: range.min, max: range.max, fee: take(atmCol) });
      school.push({ min: range.min, max: range.max, fee: take(schoolCol) });
      utilities.push({ min: range.min, max: range.max, fee: take(utilityCol) });
      points.push(take(pointsCol));
      taxMin.push(take(taxMinCol));
      taxMax.push(take(taxMaxCol));
    });

    if (send.length < 8) throw new Error("MTN table parsed too few bands.");
    return {
      send: send,
      bank: bank,
      agent: agent,
      atm: atm,
      school: school,
      utilities: utilities,
      points: points,
      taxMin: taxMin,
      taxMax: taxMax
    };
  }

  function parseAirtelHeadline(html) {
    var text = stripTags(html);
    var send = text.match(/highest applicable sending fee is Shs?\s*([\d,]+)/i);
    var withdraw = text.match(/highest applicable withdraw(?:al)? fee is Shs?\s*([\d,]+)/i);
    var ceiling = text.match(/as much as Shs?\s*([\d,]+)\s*million/i);
    return {
      maxSendFee: send ? parseMoney(send[1]) : null,
      maxWithdrawFee: withdraw ? parseMoney(withdraw[1]) : null,
      mentionsMillion: Boolean(ceiling),
      hasTable: /<table\b/i.test(html) && /withdraw/i.test(text)
    };
  }

  return {
    parseMtn: parseMtn,
    parseAirtelHeadline: parseAirtelHeadline,
    parseMoney: parseMoney
  };
});
