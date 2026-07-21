(function () {
  var path = location.pathname.replace(/\/$/, "");
  var isEnergy = path === "/demo/os/energy";
  var isPowerQuality = path === "/demo/os/power-quality";
  if (!isEnergy && !isPowerQuality) return;

  function findTab(label) {
    var spans = Array.prototype.slice.call(document.querySelectorAll("button span"));
    for (var i = 0; i < spans.length; i++) {
      if ((spans[i].textContent || "").trim() === label) return spans[i].closest("button");
    }
    return null;
  }

  function install() {
    var tab = findTab("Power Quality Intelligence");
    if (isEnergy) {
      if (tab) tab.style.display = "none";
      return;
    }

    var title = document.querySelector("header h1");
    var subtitle = document.querySelector("header h1 + p");
    if (title) title.textContent = "Power Quality Intelligence™";
    if (subtitle) subtitle.textContent = "Harmonics · THD · disturbance analytics · Powered by SpareX";
    if (tab && !tab.dataset.pqClicked) {
      tab.dataset.pqClicked = "1";
      tab.click();
    }
    var tabbar = tab && tab.closest(".mb-6");
    if (tabbar) tabbar.style.display = "none";
  }

  function start() {
    var tries = 0;
    install();
    var timer = setInterval(function () {
      install();
      if (++tries > 20) clearInterval(timer);
    }, 250);
  }

  if (document.readyState === "complete") setTimeout(start, 500);
  else window.addEventListener("load", function () { setTimeout(start, 500); }, { once: true });
})();
