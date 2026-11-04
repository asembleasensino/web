(function () {
  const API = "/api/eventos";
  const GRUPOS = { coordinacion: "Coordinación", comunicacion: "Comunicación" };
  const TIPOS = { reunion: "Reunión", prazo: "Prazo", tarefa: "Tarefa" };
  const ZONAS = [
    "A Coruña",
    "A Louriña",
    "Baixo Miño/O Condado/Paradanta",
    "Barbanza",
    "Bergantiños-Costa da Morte",
    "Compostela",
    "Deza/Compostela",
    "Ferrolterra",
    "Morrazo/Pontevedra Sur",
    "Muros/Compostela",
    "Pontevedra/Pontevedra Sur",
    "Redondela/Pontevedra Sur",
    "Val Miñor/Pontevedra Sur",
    "Vigo/Pontevedra Sur",
  ];
  const MESES = ["xaneiro", "febreiro", "marzo", "abril", "maio", "xuño", "xullo", "agosto", "setembro", "outubro", "novembro", "decembro"];
  const MESES_CURTO = ["xan", "feb", "mar", "abr", "mai", "xuñ", "xul", "ago", "set", "out", "nov", "dec"];
  const DIAS_SEMANA = ["Lun", "Mar", "Mér", "Xov", "Ven", "Sáb", "Dom"];

  const $ = (selector) => document.querySelector(selector);
  const escapeHtml = (value = "") =>
    String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[c]);
  const capitalizar = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1);

  function xestionAuthHeader() {
    let password = sessionStorage.getItem("aaep-xestion-password");
    if (password === null) {
      password = window.prompt("Contrasinal de xestión:") || "";
      sessionStorage.setItem("aaep-xestion-password", password);
    }
    return "Basic " + btoa(":" + password);
  }
  $("#forget-password").addEventListener("click", () => {
    sessionStorage.removeItem("aaep-xestion-password");
    location.reload();
  });

  class AuthError extends Error {}

  async function peticion(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      headers: { ...(options.headers || {}), Authorization: xestionAuthHeader() },
    });
    if (response.status === 401) {
      sessionStorage.removeItem("aaep-xestion-password");
      throw new AuthError("Contrasinal incorrecto.");
    }
    const data = await response.json().catch(() => ({ ok: false, error: `Resposta non válida (${response.status})` }));
    if (!response.ok || data.ok === false) throw new Error(data.error || `Erro ${response.status}`);
    return data;
  }

  function mostrarErroAuth() {
    const aviso = `Contrasinal incorrecto.<br /><button type="button" class="btn" onclick="location.reload()">Volver intentalo</button>`;
    $("#cal-grid-wrap").innerHTML = `<p class="status-msg error">${aviso}</p>`;
    $("#aside-content").innerHTML = `<p class="status-msg error">${aviso}</p>`;
  }

  // ---------------------------------------------------------------------
  // Estado
  // ---------------------------------------------------------------------
  let eventos = [];
  let vistaData = new Date();
  vistaData.setDate(1);
  let diaSeleccionado = null; // "AAAA-MM-DD" | null
  let eventoActual = null; // evento amosado/editado no aside, se algún
  let formEditando = null; // evento en edición no formulario, null = creando

  function dataISO(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dia = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dia}`;
  }
  function formatarDataLarga(dayStr) {
    const [y, m, d] = dayStr.split("-").map(Number);
    return `${d} de ${MESES[m - 1]} de ${y}`;
  }
  function formatarDataCurta(dayStr) {
    const [, m, d] = dayStr.split("-").map(Number);
    return `${d} ${MESES_CURTO[m - 1]}`;
  }

  function filtros() {
    return { grupo: $("#filtro-grupo").value, zona: $("#filtro-zona").value, tipo: $("#filtro-tipo").value };
  }
  function eventosFiltrados() {
    const f = filtros();
    return eventos.filter(
      (e) => (!f.grupo || e.grupo === f.grupo) && (!f.zona || e.zona === f.zona) && (!f.tipo || e.tipo === f.tipo)
    );
  }
  function eventosEnDia(dayStr) {
    return eventosFiltrados().filter((e) => dayStr >= e.data.slice(0, 10) && dayStr <= (e.dataFin || e.data).slice(0, 10));
  }

  // ---------------------------------------------------------------------
  // Grella do mes
  // ---------------------------------------------------------------------
  function construirGrella(vista) {
    const ano = vista.getFullYear();
    const mes = vista.getMonth();
    const primeiroDoMes = new Date(ano, mes, 1);
    const offset = (primeiroDoMes.getDay() + 6) % 7; // luns = 0
    const inicio = new Date(ano, mes, 1 - offset);
    const dias = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(inicio);
      d.setDate(inicio.getDate() + i);
      dias.push(d);
    }
    return dias;
  }

  function chipHtml(e) {
    const clases = ["cal-chip", `grupo-${e.grupo}`];
    if (e.tipo === "prazo") clases.push("tipo-prazo");
    if (e.estado === "feita") clases.push("estado-feita");
    return `<span class="${clases.join(" ")}" data-id="${e.id}" title="${escapeHtml(e.titulo)}">${escapeHtml(e.titulo)}</span>`;
  }

  function renderCalendar() {
    $("#mes-actual").textContent = `${capitalizar(MESES[vistaData.getMonth()])} ${vistaData.getFullYear()}`;
    const dias = construirGrella(vistaData);
    const mesActual = vistaData.getMonth();
    const hoxe = dataISO(new Date());
    let html = '<div class="cal-grid">';
    DIAS_SEMANA.forEach((d) => (html += `<div class="cal-dow">${d}</div>`));
    dias.forEach((d) => {
      const dayStr = dataISO(d);
      const clases = ["cal-day"];
      if (d.getMonth() !== mesActual) clases.push("outside");
      if (dayStr === hoxe) clases.push("today");
      if (dayStr === diaSeleccionado) clases.push("selected");
      const eventosDoDia = eventosEnDia(dayStr);
      const visibles = eventosDoDia.slice(0, 3);
      const extra = eventosDoDia.length - visibles.length;
      html += `<div class="${clases.join(" ")}" data-day="${dayStr}">
        <span class="cal-day-num">${d.getDate()}</span>
        <div class="cal-chips">${visibles.map(chipHtml).join("")}${extra > 0 ? `<span class="cal-more">+${extra} máis</span>` : ""}</div>
      </div>`;
    });
    html += "</div>";
    $("#cal-grid-wrap").innerHTML = html;
  }

  $("#cal-grid-wrap").addEventListener("click", (event) => {
    const chip = event.target.closest(".cal-chip");
    if (chip) {
      const ev = eventos.find((e) => e.id === chip.dataset.id);
      if (ev) mostrarDetalle(ev);
      return;
    }
    const diaEl = event.target.closest(".cal-day");
    if (diaEl) {
      diaSeleccionado = diaEl.dataset.day === diaSeleccionado ? null : diaEl.dataset.day;
      renderCalendar();
      diaSeleccionado ? mostrarDia(diaSeleccionado) : mostrarProximos();
    }
  });

  // ---------------------------------------------------------------------
  // Aside: próximos / día / detalle / formulario
  // ---------------------------------------------------------------------
  function upcomingItemHtml(e) {
    const rango =
      e.dataFin && e.dataFin !== e.data ? `${formatarDataCurta(e.data)} – ${formatarDataCurta(e.dataFin)}` : formatarDataCurta(e.data);
    const meta = [e.lugar, e.zona].filter(Boolean).join(" · ");
    return `<button type="button" class="upcoming-item grupo-${e.grupo}" data-id="${e.id}">
      <div class="u-date">${rango}${e.estado === "feita" ? " · Feita" : ""}</div>
      <div class="u-title">${escapeHtml(e.titulo)}</div>
      ${meta ? `<div class="u-meta">${escapeHtml(meta)}</div>` : ""}
    </button>`;
  }

  function mostrarProximos() {
    eventoActual = null;
    formEditando = null;
    const hoxe = dataISO(new Date());
    const lista = eventosFiltrados()
      .filter((e) => (e.dataFin || e.data) >= hoxe)
      .sort((a, b) => a.data.localeCompare(b.data))
      .slice(0, 12);
    let html = '<p class="section-label">Próximos</p>';
    html += lista.length
      ? `<div class="upcoming-list">${lista.map(upcomingItemHtml).join("")}</div>`
      : '<p class="empty-state">Non hai eventos próximos cos filtros actuais.</p>';
    $("#aside-content").innerHTML = html;
  }

  function mostrarDia(dayStr) {
    eventoActual = null;
    formEditando = null;
    const eventosDoDia = eventosEnDia(dayStr).sort((a, b) => a.titulo.localeCompare(b.titulo));
    let html = `<p class="section-label">${escapeHtml(formatarDataLarga(dayStr))}</p>`;
    html += eventosDoDia.length
      ? `<div class="upcoming-list">${eventosDoDia.map(upcomingItemHtml).join("")}</div>`
      : '<p class="empty-state">Sen eventos este día.</p>';
    html += `<button type="button" class="btn block" data-action="volver">← Próximos eventos</button>`;
    $("#aside-content").innerHTML = html;
  }

  function contactoHtml(contacto) {
    const safe = escapeHtml(contacto);
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contacto.trim()) ? `<a href="mailto:${escapeHtml(contacto.trim())}">${safe}</a>` : safe;
  }

  function mostrarDetalle(ev) {
    eventoActual = ev;
    formEditando = null;
    const rango =
      ev.dataFin && ev.dataFin !== ev.data ? `${formatarDataLarga(ev.data)} – ${formatarDataLarga(ev.dataFin)}` : formatarDataLarga(ev.data);
    let html = `<div class="ev-detail">
      <span class="ev-pill grupo-${ev.grupo}">${GRUPOS[ev.grupo] || ev.grupo}</span>
      <h3>${escapeHtml(ev.titulo)}</h3>
      <div class="ev-field"><b>Tipo</b>${TIPOS[ev.tipo] || ev.tipo}${ev.estado === "feita" ? " · Feita" : ""}</div>
      <div class="ev-field"><b>Data</b>${escapeHtml(rango)}</div>`;
    if (ev.lugar) html += `<div class="ev-field"><b>Lugar</b>${escapeHtml(ev.lugar)}</div>`;
    if (ev.zona) html += `<div class="ev-field"><b>Zona</b>${escapeHtml(ev.zona)}</div>`;
    if (ev.responsable) html += `<div class="ev-field"><b>Responsable</b>${escapeHtml(ev.responsable)}</div>`;
    if (ev.contacto) html += `<div class="ev-field"><b>Contacto</b>${contactoHtml(ev.contacto)}</div>`;
    if (ev.descricion) html += `<div class="ev-field"><b>Descrición</b>${escapeHtml(ev.descricion)}</div>`;
    if (ev.actaUrl) html += `<div class="ev-field"><a href="${escapeHtml(ev.actaUrl)}" target="_blank" rel="noopener">Ver acta/documento ↗</a></div>`;
    html += `<div class="ev-actions">
        <button type="button" class="btn" data-action="marcar">${ev.estado === "feita" ? "Marcar pendente" : "Marcar feita"}</button>
        <button type="button" class="btn" data-action="editar">Editar</button>
        <button type="button" class="btn danger" data-action="eliminar">Eliminar</button>
      </div>
      <button type="button" class="btn block" data-action="volver">← Próximos eventos</button>
    </div>`;
    $("#aside-content").innerHTML = html;
  }

  function mostrarFormulario(ev) {
    formEditando = ev || null;
    const v = ev || {
      tipo: "reunion",
      grupo: $("#filtro-grupo").value || "coordinacion",
      titulo: "",
      data: diaSeleccionado || dataISO(new Date()),
      dataFin: "",
      lugar: "",
      zona: $("#filtro-zona").value || "",
      responsable: "",
      contacto: "",
      descricion: "",
      actaUrl: "",
      estado: "pendente",
    };
    const opcionsZona = ['<option value="">Sen zona concreta</option>']
      .concat(ZONAS.map((z) => `<option value="${escapeHtml(z)}" ${v.zona === z ? "selected" : ""}>${escapeHtml(z)}</option>`))
      .join("");
    $("#aside-content").innerHTML = `
      <p class="section-label">${ev ? "Editar evento" : "Novo evento"}</p>
      <form class="form-grid" id="form-evento">
        <div class="form-row-2">
          <label>Tipo
            <select name="tipo" required>${Object.entries(TIPOS)
              .map(([val, label]) => `<option value="${val}" ${v.tipo === val ? "selected" : ""}>${label}</option>`)
              .join("")}</select>
          </label>
          <label>Grupo
            <select name="grupo" required>${Object.entries(GRUPOS)
              .map(([val, label]) => `<option value="${val}" ${v.grupo === val ? "selected" : ""}>${label}</option>`)
              .join("")}</select>
          </label>
        </div>
        <label>Título <input type="text" name="titulo" required maxlength="200" value="${escapeHtml(v.titulo)}" /></label>
        <div class="form-row-2">
          <label>Data <input type="date" name="data" required value="${escapeHtml(v.data)}" /></label>
          <label>Data de fin (opcional) <input type="date" name="dataFin" value="${escapeHtml(v.dataFin || "")}" /></label>
        </div>
        <div class="form-row-2">
          <label>Lugar <input type="text" name="lugar" maxlength="200" value="${escapeHtml(v.lugar || "")}" /></label>
          <label>Zona <select name="zona">${opcionsZona}</select></label>
        </div>
        <div class="form-row-2">
          <label>Responsable <input type="text" name="responsable" maxlength="150" value="${escapeHtml(v.responsable || "")}" /></label>
          <label>Contacto <input type="text" name="contacto" maxlength="200" value="${escapeHtml(v.contacto || "")}" /></label>
        </div>
        <label>Descrición <textarea name="descricion" maxlength="2000">${escapeHtml(v.descricion || "")}</textarea></label>
        <label>URL da acta/documento <input type="text" name="actaUrl" maxlength="500" value="${escapeHtml(v.actaUrl || "")}" /></label>
        <label>Estado
          <select name="estado">
            <option value="pendente" ${v.estado === "pendente" ? "selected" : ""}>Pendente</option>
            <option value="feita" ${v.estado === "feita" ? "selected" : ""}>Feita</option>
          </select>
        </label>
        <p class="form-note" id="form-note"></p>
        <div class="ev-actions">
          <button type="submit" class="btn primary">Gardar</button>
          <button type="button" class="btn" data-action="cancelar-form">Cancelar</button>
        </div>
      </form>`;
  }

  function actualizarEventoLocal(evento) {
    const i = eventos.findIndex((e) => e.id === evento.id);
    if (i >= 0) eventos[i] = evento;
    else eventos.push(evento);
  }

  async function gardarFormulario(form) {
    const nota = $("#form-note");
    const datos = Object.fromEntries(new FormData(form).entries());
    if (!datos.titulo.trim() || !datos.data) {
      nota.textContent = "Falta o título ou a data.";
      nota.className = "form-note error";
      return;
    }
    if (datos.dataFin && datos.dataFin < datos.data) {
      nota.textContent = "A data de fin non pode ser anterior á data de inicio.";
      nota.className = "form-note error";
      return;
    }
    nota.textContent = "Gardando…";
    nota.className = "form-note";
    try {
      if (formEditando) {
        const resultado = await peticion(API, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: formEditando.id, ...datos }),
        });
        actualizarEventoLocal(resultado.evento);
        renderCalendar();
        mostrarDetalle(resultado.evento);
      } else {
        const resultado = await peticion(API, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(datos),
        });
        actualizarEventoLocal(resultado.evento);
        renderCalendar();
        mostrarDetalle(resultado.evento);
      }
    } catch (err) {
      if (err instanceof AuthError) return mostrarErroAuth();
      nota.textContent = err.message || String(err);
      nota.className = "form-note error";
    }
  }

  async function eliminarEvento(ev) {
    if (!window.confirm(`Eliminar "${ev.titulo}"? Esta acción non se pode desfacer.`)) return;
    try {
      await peticion(`${API}?id=${encodeURIComponent(ev.id)}`, { method: "DELETE" });
      eventos = eventos.filter((e) => e.id !== ev.id);
      renderCalendar();
      diaSeleccionado ? mostrarDia(diaSeleccionado) : mostrarProximos();
    } catch (err) {
      if (err instanceof AuthError) return mostrarErroAuth();
      window.alert(err.message || String(err));
    }
  }

  async function alternarEstado(ev) {
    try {
      const resultado = await peticion(API, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: ev.id, estado: ev.estado === "feita" ? "pendente" : "feita" }),
      });
      actualizarEventoLocal(resultado.evento);
      renderCalendar();
      mostrarDetalle(resultado.evento);
    } catch (err) {
      if (err instanceof AuthError) return mostrarErroAuth();
      window.alert(err.message || String(err));
    }
  }

  $("#aside-content").addEventListener("click", (event) => {
    const actionEl = event.target.closest("[data-action]");
    if (actionEl) {
      const action = actionEl.dataset.action;
      if (action === "volver") {
        diaSeleccionado = null;
        renderCalendar();
        mostrarProximos();
      } else if (action === "editar" && eventoActual) {
        mostrarFormulario(eventoActual);
      } else if (action === "eliminar" && eventoActual) {
        eliminarEvento(eventoActual);
      } else if (action === "marcar" && eventoActual) {
        alternarEstado(eventoActual);
      } else if (action === "cancelar-form") {
        formEditando ? mostrarDetalle(formEditando) : diaSeleccionado ? mostrarDia(diaSeleccionado) : mostrarProximos();
      }
      return;
    }
    const item = event.target.closest(".upcoming-item[data-id]");
    if (item) {
      const ev = eventos.find((e) => e.id === item.dataset.id);
      if (ev) mostrarDetalle(ev);
    }
  });

  $("#aside-content").addEventListener("submit", (event) => {
    event.preventDefault();
    gardarFormulario(event.target);
  });

  $("#novo-evento-btn").addEventListener("click", () => mostrarFormulario(null));

  // ---------------------------------------------------------------------
  // Filtros e navegación de mes
  // ---------------------------------------------------------------------
  function popularFiltroZona() {
    const select = $("#filtro-zona");
    ZONAS.forEach((z) => {
      const option = document.createElement("option");
      option.value = z;
      option.textContent = z;
      select.appendChild(option);
    });
  }

  function alCambiarFiltro() {
    renderCalendar();
    diaSeleccionado ? mostrarDia(diaSeleccionado) : mostrarProximos();
  }
  ["#filtro-grupo", "#filtro-zona", "#filtro-tipo"].forEach((sel) => $(sel).addEventListener("change", alCambiarFiltro));

  $("#mes-anterior").addEventListener("click", () => {
    vistaData.setMonth(vistaData.getMonth() - 1);
    diaSeleccionado = null;
    renderCalendar();
    mostrarProximos();
  });
  $("#mes-seguinte").addEventListener("click", () => {
    vistaData.setMonth(vistaData.getMonth() + 1);
    diaSeleccionado = null;
    renderCalendar();
    mostrarProximos();
  });
  $("#ir-a-hoxe").addEventListener("click", () => {
    vistaData = new Date();
    vistaData.setDate(1);
    diaSeleccionado = null;
    renderCalendar();
    mostrarProximos();
  });

  // ---------------------------------------------------------------------
  // Arranque
  // ---------------------------------------------------------------------
  async function iniciar() {
    popularFiltroZona();
    try {
      const resultado = await peticion(API);
      eventos = resultado.eventos || [];
    } catch (err) {
      if (err instanceof AuthError) return mostrarErroAuth();
      $("#cal-grid-wrap").innerHTML = `<p class="status-msg error">${escapeHtml(err.message || String(err))}</p>`;
      $("#aside-content").innerHTML = `<p class="status-msg error">Non se puideron cargar os eventos.</p>`;
      return;
    }
    renderCalendar();
    mostrarProximos();
  }

  iniciar();
})();
