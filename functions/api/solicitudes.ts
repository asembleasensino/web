interface Env {
  SOLICITUDES?: KVNamespace;
  XESTION_PASSWORD?: string;
  RESEND_API_KEY?: string;
  SOLICITUDES_FROM_EMAIL?: string;
  SOLICITUDES_TO_EMAIL?: string;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character] || character);
}

type SolicitudeActivacion = {
  id: string;
  tipo: "activacion";
  centro: string;
  centroCodigo: string;
  nome: string;
  email: string;
  telefono: string;
  mensaxe: string;
};

type SolicitudeConvocatoria = {
  id: string;
  tipo: "convocatoria";
  territorio: string;
  nome: string;
  email: string;
  telefono: string;
  titulo: string;
  data: string;
  lugar: string;
  descricion: string;
};

async function notifyByEmail(env: Env, payload: SolicitudeActivacion | SolicitudeConvocatoria) {
  if (!env.RESEND_API_KEY) return;
  const to = env.SOLICITUDES_TO_EMAIL || "info@asembleasensino.gal";
  const from = env.SOLICITUDES_FROM_EMAIL || "Web AAEP <web@asembleasensino.gal>";
  const { subject, html } = payload.tipo === "convocatoria"
    ? {
      subject: `Nova proposta de convocatoria · ${payload.territorio}`,
      html: `
        <h1>Nova proposta de convocatoria para a axenda</h1>
        <p><strong>Territorio:</strong> ${escapeHtml(payload.territorio)}</p>
        <p><strong>Título:</strong> ${escapeHtml(payload.titulo)}</p>
        <p><strong>Data:</strong> ${escapeHtml(payload.data)}</p>
        ${payload.lugar ? `<p><strong>Lugar:</strong> ${escapeHtml(payload.lugar)}</p>` : ""}
        <p><strong>Persoa:</strong> ${escapeHtml(payload.nome)}</p>
        <p><strong>Correo:</strong> ${escapeHtml(payload.email)}</p>
        ${payload.telefono ? `<p><strong>Teléfono:</strong> ${escapeHtml(payload.telefono)}</p>` : ""}
        ${payload.descricion ? `<p><strong>Descrición:</strong><br>${escapeHtml(payload.descricion)}</p>` : ""}
        <p>Non se publica soa: revisa a proposta no panel privado e, se a aprobas, crea a entrada en Decap CMS.</p>
      `,
    }
    : {
      subject: `Nova solicitude de asemblea · ${payload.centro}`,
      html: `
        <h1>Nova solicitude de asemblea</h1>
        <p><strong>Centro:</strong> ${escapeHtml(payload.centro)} (${escapeHtml(payload.centroCodigo)})</p>
        <p><strong>Persoa:</strong> ${escapeHtml(payload.nome)}</p>
        <p><strong>Correo:</strong> ${escapeHtml(payload.email)}</p>
        ${payload.telefono ? `<p><strong>Teléfono:</strong> ${escapeHtml(payload.telefono)}</p>` : ""}
        ${payload.mensaxe ? `<p><strong>Mensaxe:</strong><br>${escapeHtml(payload.mensaxe)}</p>` : ""}
        <p>A solicitude tamén quedou gardada no panel privado.</p>
      `,
    };
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      "content-type": "application/json",
      "idempotency-key": `solicitude-${payload.id}`,
    },
    body: JSON.stringify({ from, to: [to], reply_to: payload.email, subject, html }),
  });
  if (!response.ok) throw new Error(`Resend respondeu ${response.status}`);
}

function canAdminister(request: Request, env: Env) {
  // Xestión de acceso propia (sen Cloudflare Access): un contrasinal
  // compartido, enviado como autenticación HTTP básica.
  if (!env.XESTION_PASSWORD) return false;
  const header = request.headers.get("Authorization");
  if (!header || !header.startsWith("Basic ")) return false;
  let decoded: string;
  try {
    decoded = atob(header.slice(6));
  } catch {
    return false;
  }
  const password = decoded.includes(":") ? decoded.slice(decoded.indexOf(":") + 1) : decoded;
  return password === env.XESTION_PASSWORD;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!canAdminister(request, env)) {
    return Response.json({ ok: false, error: "Non autorizado" }, { status: 401 });
  }
  if (!env.SOLICITUDES) {
    return Response.json({ ok: false, error: "Almacenamento non configurado" }, { status: 503 });
  }
  const allKeys: { name: string }[] = [];
  let cursor: string | undefined;
  do {
    const page = await env.SOLICITUDES.list({ prefix: "solicitude:", cursor });
    allKeys.push(...page.keys);
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  const solicitudes = (await Promise.all(
    allKeys.map((key) => env.SOLICITUDES?.get(key.name, "json"))
  )).filter(Boolean).sort((a: any, b: any) => String(b.createdAt).localeCompare(String(a.createdAt)));
  return Response.json({ ok: true, solicitudes });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.SOLICITUDES) {
    return Response.json({ ok: false, error: "Servizo temporalmente non dispoñible" }, { status: 503 });
  }
  const form = await request.formData();
  const tipo = String(form.get("tipo") ?? "activacion").trim();
  const nome = String(form.get("nome") ?? "").trim();
  const email = String(form.get("email") ?? "").trim();
  const telefono = String(form.get("telefono") ?? "").trim();
  const consent = String(form.get("consent") ?? "");

  const emailValido = email.length > 0 && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const telefonoValido = telefono.length <= 30 && (!telefono || /^[\d\s+().-]+$/.test(telefono));
  const consentValido = consent === "accepted";

  const id = crypto.randomUUID();
  let payload: Record<string, unknown>;

  if (tipo === "convocatoria") {
    const territorio = String(form.get("territorio") ?? "").trim();
    const titulo = String(form.get("titulo") ?? "").trim();
    const data = String(form.get("data") ?? "").trim();
    const lugar = String(form.get("lugar") ?? "").trim();
    const descricion = String(form.get("descricion") ?? "").trim();

    if (
      !territorio || territorio.length > 100
      || !titulo || titulo.length > 200
      || !data || Number.isNaN(Date.parse(data))
      || lugar.length > 200
      || descricion.length > 2000
      || !nome || nome.length > 150
      || !emailValido || !telefonoValido || !consentValido
    ) {
      return Response.json({ ok: false, error: "Datos incompletos" }, { status: 400 });
    }

    payload = {
      id,
      tipo: "convocatoria",
      territorio,
      titulo,
      data,
      lugar,
      descricion,
      nome,
      email,
      telefono,
      estado: "pendente_validacion",
      privacyVersion: "2026-09-01",
      createdAt: new Date().toISOString(),
    };
  } else {
    const centro = String(form.get("centro") ?? "").trim();
    const centroCodigo = String(form.get("centroCodigo") ?? "").trim();
    const mensaxe = String(form.get("mensaxe") ?? "").trim();

    if (
      !centro || centro.length > 200
      || !centroCodigo || centroCodigo.length > 30
      || !nome || nome.length > 150
      || !emailValido || !telefonoValido
      || mensaxe.length > 5000
      || !consentValido
    ) {
      return Response.json({ ok: false, error: "Datos incompletos" }, { status: 400 });
    }

    payload = {
      id,
      tipo: "activacion",
      centro,
      centroCodigo,
      nome,
      email,
      telefono,
      mensaxe,
      estado: "pendente_validacion",
      privacyVersion: "2026-09-01",
      createdAt: new Date().toISOString(),
    };
  }

  try {
    await env.SOLICITUDES.put(`solicitude:${id}`, JSON.stringify(payload));
  } catch (error) {
    console.error("Non foi posible gardar a solicitude", error);
    return Response.json({ ok: false, error: "Non foi posible gardar a solicitude" }, { status: 503 });
  }
  try {
    await notifyByEmail(env, payload as SolicitudeActivacion | SolicitudeConvocatoria);
  } catch (error) {
    console.error("A solicitude gardouse, pero fallou a notificación por correo", error);
  }

  return Response.json({ ok: true, id }, { status: 201 });
};

export const onRequestPatch: PagesFunction<Env> = async ({ request, env }) => {
  if (!canAdminister(request, env)) {
    return Response.json({ ok: false, error: "Non autorizado" }, { status: 401 });
  }
  if (!env.SOLICITUDES) {
    return Response.json({ ok: false, error: "Almacenamento non configurado" }, { status: 503 });
  }

  const body: { id?: string; estado?: string; noMapa?: boolean } = await request
    .json<{ id?: string; estado?: string; noMapa?: boolean }>()
    .catch(() => ({}));
  const allowedStates = ["pendente_validacion", "en_contacto", "resolta", "arquivada"];
  if (!body.id || !body.estado || !allowedStates.includes(body.estado)) {
    return Response.json({ ok: false, error: "Datos incorrectos" }, { status: 400 });
  }

  const key = `solicitude:${body.id}`;
  const existing = await env.SOLICITUDES.get<Record<string, unknown>>(key, "json");
  if (!existing) {
    return Response.json({ ok: false, error: "Solicitude non atopada" }, { status: 404 });
  }

  await env.SOLICITUDES.put(key, JSON.stringify({
    ...existing,
    estado: body.estado,
    // noMapa só se marca, nunca se desmarca por aquí: unha vez dada de
    // alta a asemblea no mapa, esa marca queda coma rexistro histórico
    // aínda que a solicitude se reabra ou arquive de novo máis adiante.
    ...(body.noMapa ? { noMapa: true, noMapaEn: new Date().toISOString() } : {}),
    updatedAt: new Date().toISOString(),
  }));
  return Response.json({ ok: true });
};
