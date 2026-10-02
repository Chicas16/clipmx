(function () {
  var joinedKey = "clipmx-joined";
  var statusKey = "clipmx-nova-estado";
  var catalog = {
    nova: { name: "NOVA PLAY", title: "Clips de gaming para TikTok", href: "campana-nova.html" },
    vertice: { name: "VÉRTICE", title: "Momentos que merecen un clip", href: "campana-vertice.html" },
    norte: { name: "NORTE 7", title: "Historias cortas para Reels", href: "campana-norte.html" }
  };

  function readJoined() {
    try {
      var list = JSON.parse(localStorage.getItem(joinedKey) || "[]");
      return Array.isArray(list) ? list : [];
    } catch (e) {
      return [];
    }
  }

  var params = new URLSearchParams(location.search);
  var join = params.get("unirse");
  if (join && catalog[join]) {
    var list = readJoined();
    if (list.indexOf(join) < 0) list.push(join);
    localStorage.setItem(joinedKey, JSON.stringify(list));
    history.replaceState(null, "", "creador.html");
  }

  var tabs = document.querySelectorAll("[data-panel]");
  var disponibles = document.getElementById("disponibles");
  var mias = document.getElementById("mias");
  if (tabs.length && disponibles && mias) {
    function show(which) {
      disponibles.hidden = which !== "disponibles";
      mias.hidden = which !== "mias";
      tabs.forEach(function (tab) {
        var on = tab.getAttribute("data-panel") === which;
        tab.classList.toggle("active", on);
        tab.setAttribute("aria-selected", on ? "true" : "false");
      });
    }
    function paintMine() {
      var mine = readJoined().filter(function (id) { return catalog[id]; });
      mias.textContent = "";
      if (!mine.length) {
        var note = document.createElement("p");
        note.className = "panel-note";
        note.textContent = "Todavía no te unes a ninguna. Elige una en Disponibles.";
        mias.appendChild(note);
        return;
      }
      var grid = document.createElement("div");
      grid.className = "cards-3";
      mine.forEach(function (id) {
        var item = catalog[id];
        var card = document.createElement("article");
        card.className = "offer";
        var top = document.createElement("div");
        top.className = "offer-top";
        var name = document.createElement("span");
        name.textContent = item.name;
        top.appendChild(name);
        var title = document.createElement("h3");
        title.textContent = item.title;
        var bottom = document.createElement("div");
        bottom.className = "offer-bottom";
        var link = document.createElement("a");
        link.href = item.href;
        link.textContent = "Ver campaña ↗";
        bottom.appendChild(link);
        card.appendChild(top);
        card.appendChild(title);
        card.appendChild(bottom);
        grid.appendChild(card);
      });
      mias.appendChild(grid);
    }
    function markButtons() {
      var mine = readJoined();
      document.querySelectorAll("[data-join]").forEach(function (button) {
        var on = mine.indexOf(button.getAttribute("data-join")) >= 0;
        button.textContent = on ? "Seleccionada" : "Seleccionar";
        button.disabled = on;
      });
    }
    function choose(id) {
      if (!catalog[id]) return;
      var list = readJoined();
      if (list.indexOf(id) < 0) list.push(id);
      localStorage.setItem(joinedKey, JSON.stringify(list));
      paintMine();
      markButtons();
      show("mias");
    }
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        show(tab.getAttribute("data-panel"));
      });
    });
    document.querySelectorAll("[data-join]").forEach(function (button) {
      button.addEventListener("click", function () {
        choose(button.getAttribute("data-join"));
      });
    });
    paintMine();
    markButtons();
    show(join && catalog[join] ? "mias" : "disponibles");
  }

  var badge = document.querySelector("[data-estado]");
  var pause = document.querySelector("[data-action='pausar']");
  var endBtn = document.querySelector("[data-action='finalizar']");
  if (badge && pause && endBtn) {
    function paintStatus(state) {
      if (state === "pausada") {
        badge.textContent = "● Pausada";
        pause.textContent = "Reanudar";
        pause.disabled = false;
        endBtn.disabled = false;
      } else if (state === "finalizada") {
        badge.textContent = "● Finalizada";
        pause.disabled = true;
        endBtn.disabled = true;
      } else {
        badge.textContent = "● Activa";
        pause.textContent = "Pausar";
        pause.disabled = false;
        endBtn.disabled = false;
      }
    }
    var state = localStorage.getItem(statusKey) || "activa";
    paintStatus(state);
    pause.addEventListener("click", function () {
      state = state === "pausada" ? "activa" : "pausada";
      localStorage.setItem(statusKey, state);
      paintStatus(state);
    });
    endBtn.addEventListener("click", function () {
      state = "finalizada";
      localStorage.setItem(statusKey, state);
      paintStatus(state);
    });
  }

  document.querySelectorAll("[data-play]").forEach(function (button) {
    button.addEventListener("click", function () {
      var card = button.closest(".ref-card");
      var label = card && card.querySelector("em");
      var line = card && card.querySelector("p");
      if (label) label.textContent = "SIN VIDEO";
      if (line) line.textContent = "Aún no hay un archivo de video.";
      button.textContent = "—";
    });
  });
})();
