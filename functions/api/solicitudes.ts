interface Env {
  SOLICITUDES?: KVNamespace;
  ADMIN_EMAILS?: string;
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

async function notifyByEmail(env: Env, payload: {
  id: string;
  centro: string;
  centroCodigo: string;
  nome: string;
  email: string;
  mensaxe: string;
}) {
  if (!env.RESEND_API_KEY) return;
  const to = env.SOLICITUDES_TO_EMAIL || "info@asembleasensino.gal";
  const from = env.SOLICITUDES_FROM_EMAIL || "Web AAEP <web@asembleasensino.gal>";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      "content-type": "application/json",
      "idempotency-key": `solicitude-${payload.id}`,
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: payload.email,
      subject: `Nova solicitude de asemblea · ${payload.centro}`,
      html: `
        <h1>Nova solicitude de asemblea</h1>
        <p><strong>Centro:</strong> ${escapeHtml(payload.centro)} (${escapeHtml(payload.centroCodigo)})</p>
        <p><strong>Persoa:</strong> ${escapeHtml(payload.nome)}</p>
        <p><strong>Correo:</strong> ${escapeHtml(payload.email)}</p>
        ${payload.mensaxe ? `<p><strong>Mensaxe:</strong><br>${escapeHtml(payload.mensaxe)}</p>` : ""}
        <p>A solicitude tamén quedou gardada no panel privado.</p>
      `,
    }),
  });
  if (!response.ok) throw new Error(`Resend respondeu ${response.status}`);
}

function canAdminister(request: Request, env: Env) {
  const email = request.headers.get("Cf-Access-Authenticated-User-Email")?.toLocaleLowerCase();
  const allowed = (env.ADMIN_EMAILS || "")
    .split(",")
    .map((item) => item.trim().toLocaleLowerCase())
    .filter(Boolean);
  return Boolean(email && allowed.includes(email));
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!canAdminister(request, env)) {
    return Response.json({ ok: false, error: "Non autorizado" }, { status: 401 });
  }
  if (!env.SOLICITUDES) return Response.json({ ok: true, solicitudes: [] });
  const keys = await env.SOLICITUDES.list({ prefix: "solicitude:" });
  const solicitudes = (await Promise.all(
    keys.keys.map((key) => env.SOLICITUDES?.get(key.name, "json"))
  )).filter(Boolean).sort((a: any, b: any) => String(b.createdAt).localeCompare(String(a.createdAt)));
  return Response.json({ ok: true, solicitudes });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const form = await request.formData();
  const centro = String(form.get("centro") ?? "").trim();
  const centroCodigo = String(form.get("centroCodigo") ?? "").trim();
  const nome = String(form.get("nome") ?? "").trim();
  const email = String(form.get("email") ?? "").trim();
  const mensaxe = String(form.get("mensaxe") ?? "").trim();

  if (!centro || !centroCodigo || !nome || !email || !email.includes("@")) {
    return Response.json({ ok: false, error: "Datos incompletos" }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const payload = {
    id,
    centro,
    centroCodigo,
    nome,
    email,
    mensaxe,
    estado: "pendente_validacion",
    createdAt: new Date().toISOString(),
  };

  if (env.SOLICITUDES) {
    await env.SOLICITUDES.put(`solicitude:${id}`, JSON.stringify(payload));
  } else {
    console.log("Solicitude recibida sen KV configurado", payload);
  }
  try {
    await notifyByEmail(env, payload);
  } catch (error) {
    console.error("A solicitude gardouse, pero fallou a notificación por correo", error);
  }

  return Response.json({ ok: true, id }, { status: 201 });
};
