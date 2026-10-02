(function () {
  var joinedKey = "clipmx-joined";
  var statusKey = "clipmx-nova-estado";
  var clipsKey = "clipmx-clips";
  var accountKey = "clipmx-cuenta";
  var retirosKey = "clipmx-retiros";
  var createdKey = "clipmx-campana-demo";
  var DEADLINE = 24 * 60 * 60 * 1000;
  var HOUR = 60 * 60 * 1000;
  var MIN_RETIRO = 10;
  var catalog = {
    nova: { name: "NOVA PLAY", title: "Clips de gaming para TikTok", href: "campana-nova.html", budget: 48000, rate: 25 },
    vertice: { name: "VÉRTICE", title: "Momentos que merecen un clip", href: "campana-vertice.html", budget: 25000, rate: 18 },
    norte: { name: "NORTE 7", title: "Historias cortas para Reels", href: "campana-norte.html", budget: 31500, rate: 22 }
  };
  var clipStatus = { revision: "En revisión", aprobado: "Aprobado", rechazado: "Rechazado" };

  function readJoined() {
    try {
      var list = JSON.parse(localStorage.getItem(joinedKey) || "[]");
      return Array.isArray(list) ? list : [];
    } catch (e) {
      return [];
    }
  }

  function readAccount() {
    try {
      var data = JSON.parse(localStorage.getItem(accountKey) || "null");
      if (!data || (data.rol !== "creador" && data.rol !== "marca")) return null;
      var nombre = String(data.nombre || "").trim();
      if (!nombre) return null;
      return { rol: data.rol, nombre: nombre };
    } catch (e) {
      return null;
    }
  }

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
  function readRetiros() {
    try {
      var list = JSON.parse(localStorage.getItem(retirosKey) || "[]");
      return Array.isArray(list) ? list : [];
    } catch (e) {
      return [];
    }
  }
  function saveRetiros(list) {
    localStorage.setItem(retirosKey, JSON.stringify(list));
  }
  function clipViews(clip) {
    var n = Number(clip && clip.views);
    return isFinite(n) && n > 0 ? n : 0;
  }
  function approvedClips(list) {
    return (list || readClips()).filter(function (clip) { return clip.status === "aprobado"; });
  }
  function approvedViews(list) {
    return approvedClips(list).reduce(function (sum, clip) { return sum + clipViews(clip); }, 0);
  }
  function earningsMxn(views) {
    return (Number(views) || 0) * 25 / 1000;
  }
  function moneyNumber(n) {
    var v = Math.round(Number(n) * 100) / 100;
    return isFinite(v) ? v : 0;
  }
  function reservedMxn(list) {
    return (list || readRetiros()).reduce(function (sum, item) {
      if (item.status === "solicitado" || item.status === "procesado") return sum + (Number(item.amount) || 0);
      return sum;
    }, 0);
  }
  function saldoDisponible() {
    var left = moneyNumber(earningsMxn(approvedViews()) - reservedMxn());
    return left > 0 ? left : 0;
  }
  function formatInt(n) {
    return String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  function formatMxn(amount) {
    var cents = Math.round(Number(amount) * 100);
    if (!isFinite(cents)) cents = 0;
    var neg = cents < 0;
    cents = Math.abs(cents);
    var whole = Math.floor(cents / 100);
    var frac = cents % 100;
    var body = "$" + formatInt(whole);
    if (frac) body += "." + String(frac).padStart(2, "0");
    return (neg ? "-" : "") + body + " MXN";
  }
  function formatPct(value) {
    var n = Math.round(Number(value) * 10) / 10;
    if (!isFinite(n) || n < 0) n = 0;
    if (n > 100) n = 100;
    if (Math.abs(n - Math.round(n)) < 0.05) return String(Math.round(n)) + "%";
    return n.toFixed(1) + "%";
  }
  function campaignSpend(id) {
    var item = catalog[id];
    if (!item || !item.rate) return 0;
    return approvedClips().reduce(function (sum, clip) {
      if (clip.campaign !== id) return sum;
      return sum + clipViews(clip) * item.rate / 1000;
    }, 0);
  }
  function budgetFigures(id) {
    var item = catalog[id];
    if (!item || !item.budget) return null;
    var spent = campaignSpend(id);
    if (!isFinite(spent) || spent < 0) spent = 0;
    var total = item.budget;
    if (spent > total) spent = total;
    var used = total > 0 ? (spent / total) * 100 : 0;
    return { spent: spent, total: total, used: used, left: 100 - used, remaining: total - spent };
  }
  function paintBudgetBars() {
    document.querySelectorAll("[data-budget]").forEach(function (node) {
      var figs = budgetFigures(node.getAttribute("data-budget"));
      if (!figs) return;
      var kind = node.getAttribute("data-kind") === "usado" ? "usado" : "queda";
      var primary = kind === "usado" ? figs.used : figs.left;
      var alt = kind === "usado" ? figs.left : figs.used;
      var primaryText = formatPct(primary);
      var altText = formatPct(alt);
      var pctEl = node.querySelector("[data-pct]");
      var altEl = node.querySelector("[data-pct-alt]");
      if (pctEl) pctEl.textContent = primaryText;
      if (altEl) altEl.textContent = altText;
      var meter = node.querySelector("[data-meter]");
      var fill = meter && meter.querySelector("span");
      var width = primary > 0 && primary < 2 ? 2 : primary;
      if (fill) fill.style.width = width + "%";
      if (meter) {
        meter.setAttribute("aria-valuenow", String(Math.round(primary)));
        meter.setAttribute("aria-label", kind === "usado"
          ? "Presupuesto usado al " + primaryText
          : "Queda " + primaryText + " del presupuesto");
      }
      var money = node.querySelector("[data-budget-money]");
      if (money && figs.spent > 0) money.textContent = formatMxn(figs.spent) + " de " + formatMxn(figs.total);
    });
    document.querySelectorAll("[data-remain]").forEach(function (el) {
      var figs = budgetFigures(el.getAttribute("data-remain"));
      if (!figs || figs.spent <= 0) return;
      el.textContent = formatMxn(figs.remaining);
    });
  }
  function campaignState(id) {
    if (id !== "nova") return "";
    return localStorage.getItem(statusKey) || "activa";
  }
  function isFinalizada(id) {
    return campaignState(id) === "finalizada";
  }
  function stateLabel(id) {
    if (id !== "nova") return "Sin estado guardado";
    var state = campaignState(id);
    if (state === "pausada") return "Pausada";
    if (state === "finalizada") return "Finalizada";
    return "Activa";
  }
  function deadlinePassed(clip) {
    if (!clip || !clip.at || clip.status !== "revision") return false;
    return Date.now() - Number(clip.at) >= DEADLINE;
  }
  function deadlineText(clip) {
    if (!clip || clip.status !== "revision") return "";
    if (!clip.at) return "Sin hora de envío guardada.";
    var left = DEADLINE - (Date.now() - Number(clip.at));
    if (left <= 0) return "Plazo de 24 h vencido";
    var hours = Math.ceil(left / HOUR);
    return "La marca tiene " + hours + " h para decidir";
  }

  function paintRoleBanner() {
    var banner = document.getElementById("rol-aviso");
    if (!banner) return;
    var need = banner.getAttribute("data-rol");
    var account = readAccount();
    if (account && account.rol === need) {
      banner.hidden = true;
      banner.textContent = "";
      return;
    }
    banner.hidden = false;
    banner.textContent = "";
    var lead = document.createElement("span");
    if (!account) {
      lead.textContent = need === "marca"
        ? "Nadie está registrado como marca en este navegador. "
        : "Nadie está registrado como creador en este navegador. ";
    } else {
      lead.textContent = "En este navegador la cuenta es de " + (account.rol === "marca" ? "marca" : "creador") + " (" + account.nombre + "). Cambiar de rol la reemplaza. ";
    }
    var link = document.createElement("a");
    link.href = "registro.html?rol=" + (need === "marca" ? "marca" : "creador");
    link.textContent = need === "marca" ? "Regístrate como marca" : "Regístrate como creador";
    var tail = document.createElement("span");
    tail.textContent = ". Puedes seguir viendo la demo.";
    banner.appendChild(lead);
    banner.appendChild(link);
    banner.appendChild(tail);
  }

  function paintRegistered() {
    var mine = readJoined().filter(function (id) { return catalog[id]; });
    var line = document.getElementById("registro");
    var account = readAccount();
    if (line) {
      var bits = [];
      if (account && account.rol === "creador") bits.push("Estás registrado como " + account.nombre + ".");
      if (mine.length) bits.push("Estás registrado en " + mine.map(function (id) { return catalog[id].name; }).join(", ") + ".");
      line.textContent = bits.join(" ");
    }
    document.querySelectorAll("a[href*='unirse=']").forEach(function (link) {
      var id = (link.getAttribute("href").split("unirse=")[1] || "").split("&")[0];
      if (mine.indexOf(id) < 0) return;
      link.textContent = "Ya estás registrado";
      link.setAttribute("href", "creador.html#campanas");
    });
    paintRoleBanner();
  }

  function paintClipForm() {
    var select = document.getElementById("clip-campana");
    if (!select) return;
    var mine = readJoined().filter(function (id) { return catalog[id]; });
    var blocked = mine.filter(isFinalizada);
    var open = mine.filter(function (id) { return !isFinalizada(id); });
    var note = document.getElementById("clip-final");
    if (note) {
      note.textContent = blocked.map(function (id) {
        return catalog[id].name + " está finalizada.";
      }).join(" ");
      if (blocked.length) note.textContent += " No puedes subir un clip a una campaña finalizada.";
    }
    select.textContent = "";
    if (!open.length) {
      var empty = document.createElement("option");
      empty.value = "";
      empty.textContent = blocked.length ? "Campaña finalizada" : "Primero selecciona una campaña";
      select.appendChild(empty);
      select.disabled = true;
      return;
    }
    select.disabled = false;
    open.forEach(function (id) {
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
  function appendClipMeta(row, clip) {
    var state = document.createElement("p");
    state.className = "panel-note";
    state.textContent = clipStatus[clip.status] || "En revisión";
    row.appendChild(state);
    if (clip.status === "revision") {
      var dead = document.createElement("p");
      dead.className = "panel-note";
      dead.textContent = deadlineText(clip);
      row.appendChild(dead);
    }
    if (clip.status === "aprobado") {
      var money = document.createElement("p");
      money.className = "panel-note";
      money.textContent = formatInt(clipViews(clip)) + " vistas · " + formatMxn(earningsMxn(clipViews(clip)));
      row.appendChild(money);
    }
  }
  function paintMoney() {
    var views = approvedViews();
    var gross = earningsMxn(views);
    var saldo = saldoDisponible();
    var approved = approvedClips().length;
    var pending = readClips().filter(function (clip) { return clip.status === "revision"; }).length;
    var total = document.getElementById("total-ganado");
    var payout = document.getElementById("payout-total");
    var vistas = document.getElementById("vistas-total");
    var saldoEl = document.getElementById("saldo-disponible");
    var ganadoNota = document.getElementById("ganado-nota");
    var vistasNota = document.getElementById("vistas-nota");
    var clipsNota = document.getElementById("clips-nota");
    if (total) total.textContent = formatMxn(gross);
    if (payout) payout.textContent = formatMxn(gross);
    if (vistas) vistas.textContent = formatInt(views);
    if (saldoEl) saldoEl.textContent = formatMxn(saldo);
    if (ganadoNota) ganadoNota.textContent = approved + " clips aprobados";
    if (vistasNota) vistasNota.textContent = approved + " clips aprobados";
    if (clipsNota) clipsNota.textContent = pending + " pendientes de revisión";
    var retirar = document.getElementById("pedir-retiro");
    if (retirar) retirar.disabled = saldo < MIN_RETIRO;
    var sumar = document.getElementById("sumar-vistas");
    if (sumar) sumar.disabled = approved === 0;
    var vistaMsg = document.getElementById("vistas-msg");
    if (vistaMsg && approved === 0) vistaMsg.textContent = "Aprueba un clip para sumar vistas de demo.";
    paintBudgetBars();
    var box = document.getElementById("mis-retiros");
    if (!box) return;
    box.textContent = "";
    readRetiros().forEach(function (item) {
      var line = document.createElement("p");
      line.className = "panel-note";
      var label = item.status === "procesado" ? "Procesado (demo)" : "Solicitado";
      line.textContent = "Retiro de " + formatMxn(item.amount) + " · " + label;
      box.appendChild(line);
    });
  }
  function paintMyClips() {
    var box = document.getElementById("mis-clips");
    var rejectedBox = document.getElementById("clips-rechazados");
    var clips = readClips();
    var visible = clips.filter(function (clip) { return clip.status !== "rechazado"; });
    var rejected = clips.filter(function (clip) { return clip.status === "rechazado"; });
    var count = document.getElementById("clips-enviados");
    if (count) count.textContent = String(visible.length);
    var toggle = document.getElementById("toggle-rechazados");
    if (toggle) {
      var open = rejectedBox && !rejectedBox.hidden;
      toggle.textContent = (open ? "Ocultar rechazados" : "Rechazados") + " (" + rejected.length + ")";
    }
    function fill(target, list, emptyText) {
      if (!target) return;
      target.textContent = "";
      if (!list.length) {
        var note = document.createElement("p");
        note.className = "panel-note";
        note.textContent = emptyText;
        target.appendChild(note);
        return;
      }
      list.forEach(function (clip) {
        var row = document.createElement("article");
        row.className = "offer";
        var title = document.createElement("h3");
        title.textContent = catalog[clip.campaign] ? catalog[clip.campaign].name : "Campaña";
        row.appendChild(title);
        addPlayer(row, clip);
        appendClipMeta(row, clip);
        target.appendChild(row);
      });
    }
    if (box) fill(box, visible, clips.length ? "No hay clips en revisión ni aprobados." : "Aún no hay clips enviados.");
    if (rejectedBox) fill(rejectedBox, rejected, "No hay clips rechazados.");
    paintMoney();
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
      row.appendChild(title);
      addPlayer(row, clip);
      appendClipMeta(row, clip);
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
    paintControl();
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
      if (campaign && isFinalizada(campaign)) {
        if (msg) msg.textContent = catalog[campaign].name + " está finalizada. No puedes subir un clip.";
        return;
      }
      if (!catalog[campaign]) {
        var blocked = readJoined().filter(isFinalizada);
        if (msg) {
          msg.textContent = blocked.length
            ? catalog[blocked[0]].name + " está finalizada. No puedes subir un clip."
            : "Selecciona una campaña y elige un video.";
        }
        return;
      }
      if (!file) {
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
        clips.unshift({ id: id, campaign: campaign, name: file.name, file: true, status: "revision", at: Date.now(), views: 0 });
        saveClips(clips);
        form.reset();
        paintClipForm();
        paintMyClips();
        if (msg) msg.textContent = "Video enviado a revisión. La marca tiene 24 h para decidir, en este mismo navegador.";
      }).catch(function () {
        if (msg) msg.textContent = "No se pudo guardar el video en este navegador.";
      }).then(function () {
        if (button) button.disabled = false;
      });
    });
  }
  function bindRejectedToggle() {
    var toggle = document.getElementById("toggle-rechazados");
    var box = document.getElementById("clips-rechazados");
    if (!toggle || !box) return;
    toggle.addEventListener("click", function () {
      box.hidden = !box.hidden;
      paintMyClips();
    });
  }
  function bindMoney() {
    var sumar = document.getElementById("sumar-vistas");
    var retirar = document.getElementById("pedir-retiro");
    if (sumar) {
      sumar.addEventListener("click", function () {
        var msg = document.getElementById("vistas-msg");
        var clips = readClips();
        var target = null;
        for (var i = 0; i < clips.length; i++) {
          if (clips[i].status === "aprobado") { target = clips[i]; break; }
        }
        if (!target) {
          if (msg) msg.textContent = "Hace falta un clip aprobado en este navegador para sumar vistas.";
          return;
        }
        target.views = clipViews(target) + 10000;
        saveClips(clips);
        if (msg) msg.textContent = "Se sumaron 10,000 vistas: " + formatMxn(250) + ".";
        paintMyClips();
        paintBrandClips();
        paintControl();
      });
    }
    if (retirar) {
      retirar.addEventListener("click", function () {
        var msg = document.getElementById("retiro-msg");
        var saldo = saldoDisponible();
        if (saldo < MIN_RETIRO) {
          if (msg) msg.textContent = "El mínimo para solicitar retiro es $10 MXN.";
          paintMoney();
          return;
        }
        var account = readAccount();
        var list = readRetiros();
        list.unshift({
          id: String(Date.now()),
          amount: saldo,
          status: "solicitado",
          at: Date.now(),
          nombre: account ? account.nombre : ""
        });
        saveRetiros(list);
        if (msg) msg.textContent = "Retiro solicitado en este navegador. No hay pago real.";
        paintMoney();
        paintControl();
      });
    }
    paintMoney();
  }
  function bindRegistro() {
    var form = document.getElementById("cuenta-form");
    if (!form) return;
    var nombre = document.getElementById("cuenta-nombre");
    var heading = document.getElementById("cuenta-heading");
    var actual = document.getElementById("cuenta-actual");
    var rol = "";
    function paintActual() {
      var account = readAccount();
      if (!actual) return;
      actual.textContent = account
        ? "Ahora estás como " + account.nombre + " (" + account.rol + "). Si eliges el otro rol, reemplaza esta cuenta."
        : "Nadie registrado en este navegador.";
    }
    function selectRol(next) {
      if (next !== "creador" && next !== "marca") return;
      rol = next;
      form.hidden = false;
      if (heading) heading.textContent = next === "marca" ? "Registro de marca" : "Registro de creador";
      document.querySelectorAll("[data-rol-pick]").forEach(function (button) {
        button.classList.toggle("active", button.getAttribute("data-rol-pick") === next);
      });
      if (history.replaceState) history.replaceState(null, "", "registro.html?rol=" + next);
    }
    document.querySelectorAll("[data-rol-pick]").forEach(function (button) {
      button.addEventListener("click", function () {
        selectRol(button.getAttribute("data-rol-pick"));
      });
    });
    var params = new URLSearchParams(location.search);
    var initial = params.get("rol");
    if (initial === "creador" || initial === "marca") selectRol(initial);
    paintActual();
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var value = nombre ? nombre.value.trim() : "";
      if (rol !== "creador" && rol !== "marca") return;
      if (!value) return;
      localStorage.setItem(accountKey, JSON.stringify({ rol: rol, nombre: value }));
      location.href = rol === "marca" ? "marca.html" : "creador.html#campanas";
    });
  }
  function emptyNote(text) {
    var p = document.createElement("p");
    p.className = "panel-note";
    p.textContent = text;
    return p;
  }
  function paintControl() {
    var cuenta = document.getElementById("control-cuenta");
    if (!cuenta) return;
    var account = readAccount();
    cuenta.textContent = "";
    cuenta.appendChild(emptyNote(account ? account.nombre + " · " + account.rol : "Nadie registrado"));

    var campaigns = document.getElementById("control-campanas");
    if (campaigns) {
      campaigns.textContent = "";
      ["nova", "vertice", "norte"].forEach(function (id) {
        var row = document.createElement("p");
        row.className = "panel-note";
        row.textContent = catalog[id].name + " · " + stateLabel(id);
        campaigns.appendChild(row);
      });
    }

    var created = document.getElementById("control-creadas");
    if (created) {
      created.textContent = "";
      var data = null;
      try { data = JSON.parse(localStorage.getItem(createdKey) || "null"); } catch (e) { data = null; }
      if (!data || !data.nombre) {
        created.appendChild(emptyNote("Ninguna campaña creada en este navegador."));
      } else {
        created.appendChild(emptyNote(data.nombre));
        if (data.descripcion) created.appendChild(emptyNote(data.descripcion));
        if (data.tarifa) created.appendChild(emptyNote("Tarifa: " + data.tarifa));
        if (data.presupuesto) {
          created.appendChild(emptyNote("Presupuesto: " + data.presupuesto));
          var bar = document.createElement("div");
          bar.className = "pct-bar";
          var top = document.createElement("div");
          top.className = "pct-bar-top";
          var usedLabel = document.createElement("span");
          usedLabel.textContent = "Presupuesto usado";
          var usedNum = document.createElement("b");
          usedNum.textContent = "0%";
          top.appendChild(usedLabel);
          top.appendChild(usedNum);
          var meter = document.createElement("div");
          meter.className = "meter";
          meter.setAttribute("role", "meter");
          meter.setAttribute("aria-valuemin", "0");
          meter.setAttribute("aria-valuemax", "100");
          meter.setAttribute("aria-valuenow", "0");
          meter.setAttribute("aria-label", "Presupuesto usado al 0%");
          var fill = document.createElement("span");
          fill.style.width = "0%";
          meter.appendChild(fill);
          var sub = document.createElement("div");
          sub.className = "pct-bar-top pct-bar-sub";
          var leftLabel = document.createElement("span");
          leftLabel.textContent = "Queda";
          var leftNum = document.createElement("b");
          leftNum.textContent = "100%";
          sub.appendChild(leftLabel);
          sub.appendChild(leftNum);
          bar.appendChild(top);
          bar.appendChild(meter);
          bar.appendChild(sub);
          created.appendChild(bar);
        }
      }
    }

    var joined = document.getElementById("control-unidas");
    if (joined) {
      joined.textContent = "";
      var mine = readJoined().filter(function (id) { return catalog[id]; });
      if (!mine.length) joined.appendChild(emptyNote("Ninguna campaña seleccionada."));
      else joined.appendChild(emptyNote(mine.map(function (id) { return catalog[id].name; }).join(", ")));
    }

    function clipCard(clip, backup) {
      var row = document.createElement("article");
      row.className = "form-card";
      var title = document.createElement("h3");
      title.textContent = catalog[clip.campaign] ? catalog[clip.campaign].name : "Campaña";
      row.appendChild(title);
      addPlayer(row, clip);
      appendClipMeta(row, clip);
      if (backup) {
        if (deadlinePassed(clip)) {
          var actions = document.createElement("div");
          actions.className = "clip-row";
          var yes = document.createElement("button");
          yes.className = "btn btn-primary btn-small";
          yes.type = "button";
          yes.textContent = "Aprobar como respaldo";
          yes.addEventListener("click", function () {
            if (!deadlinePassed(clip)) return;
            setClipStatus(clip.id, "aprobado");
          });
          var no = document.createElement("button");
          no.className = "btn btn-danger btn-small";
          no.type = "button";
          no.textContent = "Rechazar como respaldo";
          no.addEventListener("click", function () {
            if (!deadlinePassed(clip)) return;
            setClipStatus(clip.id, "rechazado");
          });
          actions.appendChild(yes);
          actions.appendChild(no);
          row.appendChild(actions);
        }
      }
      return row;
    }

    var vencidos = document.getElementById("control-vencidos");
    if (vencidos) {
      vencidos.textContent = "";
      var late = readClips().filter(deadlinePassed);
      if (!late.length) vencidos.appendChild(emptyNote("Ningún clip lleva más de 24 h en revisión."));
      late.forEach(function (clip) { vencidos.appendChild(clipCard(clip, true)); });
    }

    var all = document.getElementById("control-clips");
    if (all) {
      all.textContent = "";
      var clips = readClips();
      if (!clips.length) all.appendChild(emptyNote("Ningún clip en este navegador."));
      clips.forEach(function (clip) { all.appendChild(clipCard(clip, false)); });
    }

    var retiros = document.getElementById("control-retiros");
    if (retiros) {
      retiros.textContent = "";
      var list = readRetiros();
      if (!list.length) retiros.appendChild(emptyNote("Ningún retiro solicitado."));
      list.forEach(function (item) {
        var row = document.createElement("article");
        row.className = "form-card";
        var title = document.createElement("h3");
        title.textContent = formatMxn(item.amount);
        row.appendChild(title);
        var who = document.createElement("p");
        who.className = "panel-note";
        who.textContent = (item.nombre || "Sin nombre") + " · " + (item.status === "procesado" ? "Procesado (demo)" : "Solicitado");
        row.appendChild(who);
        if (item.status === "solicitado") {
          var button = document.createElement("button");
          button.className = "btn btn-primary btn-small";
          button.type = "button";
          button.textContent = "Marcar procesado (demo)";
          button.addEventListener("click", function () {
            var next = readRetiros();
            next.forEach(function (rowItem) {
              if (rowItem.id === item.id) rowItem.status = "procesado";
            });
            saveRetiros(next);
            paintMoney();
            paintControl();
          });
          row.appendChild(button);
        }
        retiros.appendChild(row);
      });
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
  bindRejectedToggle();
  bindMoney();
  paintBrandClips();
  bindRegistro();
  paintControl();
  if (document.getElementById("inbox") || document.getElementById("mis-clips") || document.getElementById("control-cuenta")) {
    setInterval(function () {
      paintMyClips();
      paintBrandClips();
      paintControl();
    }, 60000);
  }
  function syncHeaderOffset() {
    var header = document.querySelector(".site-header");
    if (!header) return;
    document.documentElement.style.setProperty("--header-h", header.offsetHeight + "px");
  }
  syncHeaderOffset();
  window.addEventListener("resize", syncHeaderOffset);
})();
