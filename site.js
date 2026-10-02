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


  function paintRegistered() {
    var mine = readJoined().filter(function (id) { return catalog[id]; });
    var line = document.getElementById("registro");
    if (line) {
      line.textContent = mine.length
        ? "Estás registrado en " + mine.map(function (id) { return catalog[id].name; }).join(", ") + "."
        : "";
    }
    document.querySelectorAll("a[href*='unirse=']").forEach(function (link) {
      var id = (link.getAttribute("href").split("unirse=")[1] || "").split("&")[0];
      if (mine.indexOf(id) < 0) return;
      link.textContent = "Ya estás registrado";
      link.setAttribute("href", "creador.html#campanas");
    });
  }


  var clipsKey = "clipmx-clips";
  var clipStatus = { revision: "En revisión", aprobado: "Aprobado", rechazado: "Rechazado" };

  function readClips() {
    try {
      var list = JSON.parse(localStorage.getItem(clipsKey) || "[]");
      return Array.isArray(list) ? list : [];
    } catch (e) {
      return [];
    }
  }
  function saveClips(list) {
    localStorage.setItem(clipsKey, JSON.stringify(list));
  }
  function paintClipForm() {
    var select = document.getElementById("clip-campana");
    if (!select) return;
    var mine = readJoined().filter(function (id) { return catalog[id]; });
    select.textContent = "";
    if (!mine.length) {
      var empty = document.createElement("option");
      empty.value = "";
      empty.textContent = "Primero selecciona una campaña";
      select.appendChild(empty);
      select.disabled = true;
      return;
    }
    select.disabled = false;
    mine.forEach(function (id) {
      var opt = document.createElement("option");
      opt.value = id;
      opt.textContent = catalog[id].name;
      select.appendChild(opt);
    });
  }
  function openClipDb() {
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open("clipmx", 1);
      req.onupgradeneeded = function () {
        if (!req.result.objectStoreNames.contains("videos")) req.result.createObjectStore("videos");
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }
  function saveVideo(id, file) {
    return openClipDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction("videos", "readwrite");
        tx.objectStore("videos").put(file, id);
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }
  function loadVideo(id) {
    return openClipDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var req = db.transaction("videos", "readonly").objectStore("videos").get(id);
        req.onsuccess = function () { resolve(req.result || null); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }
  function addPlayer(row, clip) {
    if (clip.name) {
      var name = document.createElement("p");
      name.className = "panel-note";
      name.textContent = clip.name;
      row.appendChild(name);
    }
    if (!clip.file) {
      if (clip.url) {
        var link = document.createElement("a");
        link.href = clip.url;
        link.target = "_blank";
        link.rel = "noreferrer";
        link.textContent = clip.url;
        row.appendChild(link);
      }
      return;
    }
    var video = document.createElement("video");
    video.className = "clip-player";
    video.controls = true;
    video.playsInline = true;
    row.appendChild(video);
    loadVideo(clip.id).then(function (blob) {
      if (blob) video.src = URL.createObjectURL(blob);
    }).catch(function () {
      video.remove();
    });
  }
  function paintMyClips() {
    var box = document.getElementById("mis-clips");
    var count = document.getElementById("clips-enviados");
    if (count) count.textContent = String(readClips().length);
    if (!box) return;
    box.textContent = "";
    readClips().forEach(function (clip) {
      var row = document.createElement("article");
      row.className = "offer";
      var title = document.createElement("h3");
      title.textContent = catalog[clip.campaign] ? catalog[clip.campaign].name : "Campaña";
      var state = document.createElement("p");
      state.className = "panel-note";
      state.textContent = clipStatus[clip.status] || "En revisión";
      row.appendChild(title);
      addPlayer(row, clip);
      row.appendChild(state);
      box.appendChild(row);
    });
  }
  function paintBrandClips() {
    var box = document.getElementById("inbox");
    if (!box) return;
    var clips = readClips();
    var pending = clips.filter(function (clip) { return clip.status === "revision"; }).length;
    var approved = clips.filter(function (clip) { return clip.status === "aprobado"; }).length;
    var received = document.getElementById("clips-recibidos");
    var waiting = document.getElementById("clips-pendientes");
    var approvedEl = document.getElementById("clips-aprobados");
    if (received) received.textContent = String(clips.length);
    if (waiting) waiting.textContent = pending + " pendientes de revisión";
    if (approvedEl) approvedEl.textContent = String(approved);
    var empty = document.getElementById("inbox-empty");
    var ok = document.getElementById("inbox-ok");
    if (empty) empty.hidden = clips.length > 0;
    if (ok) ok.hidden = pending === 0 ? clips.length === 0 : true;
    box.textContent = "";
    clips.forEach(function (clip) {
      var row = document.createElement("article");
      row.className = "offer";
      var title = document.createElement("h3");
      title.textContent = catalog[clip.campaign] ? catalog[clip.campaign].name : "Campaña";
      var state = document.createElement("p");
      state.className = "panel-note";
      state.textContent = clipStatus[clip.status] || "En revisión";
      row.appendChild(title);
      addPlayer(row, clip);
      row.appendChild(state);
      if (clip.status === "revision") {
        var actions = document.createElement("div");
        actions.className = "clip-row";
        var yes = document.createElement("button");
        yes.className = "btn btn-primary btn-small";
        yes.type = "button";
        yes.textContent = "Aprobar";
        yes.addEventListener("click", function () { setClipStatus(clip.id, "aprobado"); });
        var no = document.createElement("button");
        no.className = "btn btn-danger btn-small";
        no.type = "button";
        no.textContent = "Rechazar";
        no.addEventListener("click", function () { setClipStatus(clip.id, "rechazado"); });
        actions.appendChild(yes);
        actions.appendChild(no);
        row.appendChild(actions);
      }
      box.appendChild(row);
    });
  }
  function setClipStatus(id, status) {
    var clips = readClips();
    clips.forEach(function (clip) {
      if (clip.id === id) clip.status = status;
    });
    saveClips(clips);
    paintBrandClips();
    paintMyClips();
  }
  function bindClipForm() {
    var form = document.getElementById("clip-form");
    if (!form) return;
    paintClipForm();
    paintMyClips();
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var campaign = document.getElementById("clip-campana").value;
      var input = document.getElementById("clip-file");
      var file = input && input.files && input.files[0];
      var msg = document.getElementById("clip-msg");
      if (!catalog[campaign] || !file) {
        if (msg) msg.textContent = "Selecciona una campaña y elige un video.";
        return;
      }
      if (file.type && file.type.indexOf("video/") !== 0) {
        if (msg) msg.textContent = "Ese archivo no es un video.";
        return;
      }
      var id = String(Date.now());
      var button = form.querySelector("button[type=submit]");
      if (button) button.disabled = true;
      saveVideo(id, file).then(function () {
        var clips = readClips();
        clips.unshift({ id: id, campaign: campaign, name: file.name, file: true, status: "revision" });
        saveClips(clips);
        form.reset();
        paintClipForm();
        paintMyClips();
        if (msg) msg.textContent = "Video enviado a revisión. La marca lo ve en este mismo navegador.";
      }).catch(function () {
        if (msg) msg.textContent = "No se pudo guardar el video en este navegador.";
      }).then(function () {
        if (button) button.disabled = false;
      });
    });
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
      paintRegistered();
      paintClipForm();
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
    paintRegistered();
    show((join && catalog[join]) || readJoined().length ? "mias" : "disponibles");
  }

  var badge = document.querySelector("[data-estado]");
  var pause = document.querySelector("[data-action='pausar']");
  var endBtn = document.querySelector("[data-action='finalizar']");
  if (badge && pause && endBtn) {
    function paintStatus(state) {
      if (state === "pausada") {
        badge.textContent = "● Pausada";
        pause.textContent = "Reanudar";
        pause.hidden = false;
        endBtn.hidden = false;
      } else if (state === "finalizada") {
        badge.textContent = "● Finalizada";
        pause.hidden = true;
        endBtn.hidden = true;
      } else {
        badge.textContent = "● Activa";
        pause.textContent = "Pausar";
        pause.hidden = false;
        endBtn.hidden = false;
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
  paintRegistered();
  bindClipForm();
  paintBrandClips();
})();
