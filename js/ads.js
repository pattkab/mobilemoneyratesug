(function () {
  var client = "ca-pub-9402272089735179";
  document.querySelectorAll(".ad-slot").forEach(function (slot) {
    var ins = document.createElement("ins");
    ins.className = "adsbygoogle";
    ins.style.display = "block";
    ins.setAttribute("data-ad-client", client);
    ins.setAttribute("data-ad-format", "auto");
    ins.setAttribute("data-full-width-responsive", "true");
    slot.appendChild(ins);
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (error) {
      slot.hidden = true;
    }
  });

  window.setTimeout(function () {
    document.querySelectorAll(".ad-slot").forEach(function (slot) {
      var ins = slot.querySelector("ins.adsbygoogle");
      var filled = ins && ins.getAttribute("data-ad-status") === "filled" && ins.offsetHeight >= 24;
      slot.hidden = !filled;
    });
  }, 3500);
})();
