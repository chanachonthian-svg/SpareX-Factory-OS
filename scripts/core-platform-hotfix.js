(function () {
  var core = [
    ["/os", "Executive Dashboard", "brain"],
    ["/os/alarms", "Alarm Center", "alarm"],
    ["/os/events", "Event Center", "event"],
    ["/os/workorders", "Work Order Center", "workorder"],
    ["/os/notifications", "Notification Center", "notification"],
    ["/os/reports", "Report Center", "report"],
    ["/os/settings", "Settings", "settings"]
  ];

  var icons = {
    event: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18M8 14h.01M12 14h.01M16 14h.01"/></svg>',
    notification: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 21a2 2 0 0 0 3.4 0"/><path d="M4 17h16c-1.4-1.5-2-3.2-2-7a6 6 0 0 0-12 0c0 3.8-.6 5.5-2 7Z"/></svg>',
    report: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4M8 13h8M8 17h8"/></svg>'
  };

  function routeOf(anchor) {
    try {
      var path = new URL(anchor.href, location.origin).pathname.replace(/^\/demo/, "").replace(/\/$/, "");
      return path || "/os";
    } catch (_) {
      return "";
    }
  }

  function setLabel(anchor, label) {
    var target = anchor.querySelector("span.min-w-0.flex-1.truncate");
    if (target) target.textContent = label;
  }

  function createItem(nav, route, label, icon) {
    var template = nav.querySelector('a[href*="/os/alarms"]') || nav.querySelector("a");
    if (!template) return null;
    var anchor = template.cloneNode(true);
    anchor.href = "/demo" + route;
    anchor.dataset.coreGenerated = route;
    setLabel(anchor, label);
    var subtitle = anchor.querySelector("span.truncate.text-\\[10px\\]");
    if (subtitle) subtitle.remove();
    var iconBox = anchor.firstElementChild;
    if (iconBox && icons[icon]) iconBox.innerHTML = icons[icon];
    return anchor;
  }

  function updateActive(anchor, active) {
    anchor.classList.toggle("bg-white/[0.07]", active);
    anchor.classList.toggle("text-white", active);
    anchor.classList.toggle("text-white/55", !active);
    var iconBox = anchor.firstElementChild;
    if (iconBox && active) {
      iconBox.style.borderColor = "rgba(34,211,238,.33)";
      iconBox.style.backgroundColor = "rgba(34,211,238,.12)";
      iconBox.style.color = "#22d3ee";
    }
  }

  function boot() {
    var nav = document.querySelector("aside nav");
    if (!nav) return;

    var anchors = Array.from(nav.querySelectorAll(":scope > a"));
    var byRoute = {};
    anchors.forEach(function (anchor) { byRoute[routeOf(anchor)] = anchor; });

    core.forEach(function (item) {
      var anchor = byRoute[item[0]] || createItem(nav, item[0], item[1], item[2]);
      if (!anchor) return;
      anchor.href = "/demo" + item[0];
      setLabel(anchor, item[1]);
      if (!anchor.isConnected) nav.appendChild(anchor);
    });

    var current = location.pathname.replace(/^\/demo/, "").replace(/\/$/, "") || "/os";
    Array.from(nav.querySelectorAll(":scope > a")).forEach(function (anchor) {
      updateActive(anchor, routeOf(anchor) === current);
    });

    var titles = {
      "/os/events": ["Event Center", "Unified operational event stream · Bangkok Plant 1"],
      "/os/notifications": ["Notification Center", "Delivery status, channels, and escalation · Bangkok Plant 1"],
      "/os/workorders": ["Work Order Center", "Approved findings to tracked jobs · Powered by SpareX"],
      "/os/reports": ["Report Center", "AI-generated, audit-ready reports · Bangkok Plant 1"]
    };
    if (titles[current]) {
      var title = document.querySelector("header h1");
      var subtitle = document.querySelector("header h1 + p");
      if (title) title.textContent = titles[current][0];
      if (subtitle) subtitle.textContent = titles[current][1];
      document.title = titles[current][0] + " · SpareX Factory OS™";
    }

    if (current === "/os/notifications") {
      Array.from(document.querySelectorAll("button")).some(function (button) {
        if (/Notifications|การแจ้งเตือน/i.test(button.textContent || "")) {
          button.click();
          return true;
        }
        return false;
      });
    }

  }

  function start() { setTimeout(boot, 500); }
  if (document.readyState === "complete") start();
  else window.addEventListener("load", start, { once: true });
})();
