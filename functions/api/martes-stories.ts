// Ponte entre /xestion/stories e o Apps Script de Martes en loita.
//
// As fotos viven en Google Drive (accions/martes_loita/imaxes/imaxes/AAAA-MM-DD).
// Esta función só comproba o contrasinal de xestión, engade o segredo do
// Apps Script e reenvía a petición. As stories xéranse no navegador
// (public/xestion/stories/render.js) e gárdanse de volta en Drive.
//
//   GET  /api/martes-stories?accion=dias
//   GET  /api/martes-stories?accion=dia&data=AAAA-MM-DD
//   GET  /api/martes-stories?accion=ficheiro&id=<id de Drive>
//   POST /api/martes-stories  { data, orixe, nome, base64 }

interface Env {
  XESTION_PASSWORD?: string;
  GOOGLE_APPS_SCRIPT_URL?: string;
  GOOGLE_APPS_SCRIPT_SECRET?: string;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DRIVE_ID_PATTERN = /^[A-Za-z0-9_-]{10,200}$/;
const MAX_STORY_BASE64 = 12 * 1024 * 1024;

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

function error(status: number, message: string) {
  return Response.json({ ok: false, error: message }, { status });
}

// Reenvía ao Apps Script e devolve a súa resposta tal cal (sen parsear o
// JSON, para non gastar CPU con fotos grandes en base64).
async function callAppsScript(env: Env, body: Record<string, unknown>, cacheSeconds = 0) {
  const upstream = await fetch(env.GOOGLE_APPS_SCRIPT_URL as string, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ secret: env.GOOGLE_APPS_SCRIPT_SECRET, ...body }),
  });
  if (!upstream.ok) return error(502, `Drive respondeu ${upstream.status}`);
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": cacheSeconds ? `private, max-age=${cacheSeconds}` : "no-store",
    },
  });
}

function checkSetup(request: Request, env: Env) {
  if (!canAdminister(request, env)) return error(401, "Non autorizado");
  if (!env.GOOGLE_APPS_SCRIPT_URL || !env.GOOGLE_APPS_SCRIPT_SECRET) {
    return error(503, "Arquivo de Google Drive non configurado");
  }
  return null;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const problem = checkSetup(request, env);
  if (problem) return problem;

  const url = new URL(request.url);
  const accion = url.searchParams.get("accion");

  if (accion === "dias") return callAppsScript(env, { action: "listDays" });

  if (accion === "dia") {
    const data = url.searchParams.get("data") ?? "";
    if (!DATE_PATTERN.test(data)) return error(400, "Data non válida");
    return callAppsScript(env, { action: "listDay", data });
  }

  if (accion === "ficheiro") {
    const id = url.searchParams.get("id") ?? "";
    if (!DRIVE_ID_PATTERN.test(id)) return error(400, "Identificador non válido");
    // Unha foto non cambia: o navegador pode reutilizala durante unha hora.
    return callAppsScript(env, { action: "getFile", fileId: id }, 3600);
  }

  return error(400, "Acción descoñecida");
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const problem = checkSetup(request, env);
  if (problem) return problem;

  let payload: { data?: unknown; orixe?: unknown; nome?: unknown; base64?: unknown };
  try {
    payload = await request.json();
  } catch {
    return error(400, "Petición non válida");
  }
  const data = String(payload.data ?? "");
  const orixe = String(payload.orixe ?? "");
  const nome = String(payload.nome ?? "").trim();
  const base64 = String(payload.base64 ?? "");

  if (!DATE_PATTERN.test(data)) return error(400, "Data non válida");
  if (!DRIVE_ID_PATTERN.test(orixe)) return error(400, "Foto de orixe non válida");
  if (!nome.toLowerCase().endsWith(".jpg") || nome.length > 200) return error(400, "Nome non válido");
  if (!base64 || base64.length > MAX_STORY_BASE64 || !/^[A-Za-z0-9+/=]+$/.test(base64)) {
    return error(400, "Imaxe non válida");
  }

  return callAppsScript(env, { action: "saveStory", data, orixe, nome, base64 });
};
