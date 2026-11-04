interface Env {
  SOLICITUDES?: KVNamespace;
  COORDINACION?: KVNamespace;
  EVENTOS?: KVNamespace;
  XESTION_PASSWORD?: string;
}

function canAdminister(request: Request, env: Env) {
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

async function listAll(namespace: KVNamespace | undefined, prefix: string) {
  if (!namespace) return [];
  const keys: { name: string }[] = [];
  let cursor: string | undefined;
  do {
    const page = await namespace.list({ prefix, cursor });
    keys.push(...page.keys);
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return (await Promise.all(keys.map((key) => namespace.get(key.name, "json")))).filter(Boolean);
}

// Volcado completo de TODOS os datos operativos que viven en Cloudflare
// KV (non en GitHub, polo tanto sen historial de versións nin backup
// automático): solicitudes, datos privados de coordinación (centros e
// territorios) e eventos/tarefas dos GdT. Pensado para premer de vez en
// cando e gardar o JSON resultante nalgún sitio seguro (Drive, etc.).
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!canAdminister(request, env)) {
    return Response.json({ ok: false, error: "Non autorizado" }, { status: 401 });
  }

  const [solicitudes, coordinacionCentros, coordinacionTerritorios, eventos] = await Promise.all([
    listAll(env.SOLICITUDES, "solicitude:"),
    listAll(env.COORDINACION, "centro:"),
    listAll(env.COORDINACION, "territorio:"),
    listAll(env.EVENTOS, "evento:"),
  ]);

  return Response.json({
    ok: true,
    xeradoEn: new Date().toISOString(),
    solicitudes,
    coordinacion: { centros: coordinacionCentros, territorios: coordinacionTerritorios },
    eventos,
  });
};
