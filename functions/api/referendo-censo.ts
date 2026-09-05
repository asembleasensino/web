interface Env {
  CENSO_REFERENDO?: KVNamespace;
  XESTION_PASSWORD?: string;
}

function normalizeEmail(value: string) {
  return value.trim().toLocaleLowerCase();
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
  if (!env.CENSO_REFERENDO) {
    return Response.json({ ok: false, error: "Almacenamento non configurado" }, { status: 503 });
  }
  const allKeys: { name: string }[] = [];
  let cursor: string | undefined;
  do {
    const page = await env.CENSO_REFERENDO.list({ prefix: "censo:", cursor });
    allKeys.push(...page.keys);
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  const inscricions = (await Promise.all(
    allKeys.map((key) => env.CENSO_REFERENDO?.get(key.name, "json"))
  )).filter(Boolean).sort((a: any, b: any) => String(a.createdAt).localeCompare(String(b.createdAt)));
  return Response.json({ ok: true, inscricions });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.CENSO_REFERENDO) {
    return Response.json({ ok: false, error: "Servizo temporalmente non dispoñible" }, { status: 503 });
  }
  const form = await request.formData();
  const email = normalizeEmail(String(form.get("email") ?? ""));
  const consent = String(form.get("consent") ?? "");

  if (
    !email || email.length > 254
    || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    || consent !== "accepted"
  ) {
    return Response.json({ ok: false, error: "Datos incompletos" }, { status: 400 });
  }

  // A chave é o propio correo normalizado: unha nova inscrición co mesmo
  // correo simplemente actualiza a data, sen crear entradas duplicadas.
  const key = `censo:${email}`;
  const existing = await env.CENSO_REFERENDO.get<{ createdAt?: string }>(key, "json");
  const payload = {
    email,
    consent: "accepted",
    privacyVersion: "2026-09-01",
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    await env.CENSO_REFERENDO.put(key, JSON.stringify(payload));
  } catch (error) {
    console.error("Non foi posible gardar a inscrición no censo", error);
    return Response.json({ ok: false, error: "Non foi posible gardar a inscrición" }, { status: 503 });
  }

  return Response.json({ ok: true }, { status: 201 });
};
