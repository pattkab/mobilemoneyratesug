(function () {
  var el = document.getElementById("visitor-count");
  if (!el) return;
  var day = new Date().toISOString().slice(0, 10);
  var seen = "";
  try { seen = localStorage.getItem("mmrates-visit") || ""; } catch (error) { /* private mode */ }
  fetch("/api/visits", { method: seen === day ? "GET" : "POST" })
    .then(function (response) { return response.json(); })
    .then(function (data) {
      var count = Number(data.visits);
      if (!Number.isFinite(count)) return;
      el.textContent = count.toLocaleString("en-US");
      if (seen !== day) {
        try { localStorage.setItem("mmrates-visit", day); } catch (error) { /* private mode */ }
      }
    })
    .catch(function () {});
})();
