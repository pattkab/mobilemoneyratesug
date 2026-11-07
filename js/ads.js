(function () {
  var client = "ca-pub-9402272089735179";
  var wide = window.matchMedia("(min-width: 1400px)").matches;

  document.querySelectorAll(".ad-slot").forEach(function (slot) {
    if (slot.classList.contains("ad-side-left") || slot.classList.contains("ad-side-right")) {
      if (!wide) {
        slot.remove();
        return;
      }
    }
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
      slot.remove();
    }
  });

  function reveal() {
    var sideFilled = false;
    document.querySelectorAll(".ad-slot").forEach(function (slot) {
      var ins = slot.querySelector("ins.adsbygoogle");
      var filled = ins && ins.getAttribute("data-ad-status") === "filled";
      slot.classList.toggle("is-filled", !!filled);
      if (!filled) return;
      if (slot.classList.contains("ad-side-left") || slot.classList.contains("ad-side-right")) sideFilled = true;
    });
    if (sideFilled) document.querySelector(".page-shell").classList.add("show-sides");
  }

  window.setTimeout(reveal, 2500);
  window.setTimeout(reveal, 6000);
})();
