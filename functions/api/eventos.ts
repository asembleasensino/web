interface Env {
  EVENTOS?: KVNamespace;
  XESTION_PASSWORD?: string;
}

type Evento = {
  id: string;
  tipo: "reunion" | "prazo" | "tarefa";
  grupo: string;
  titulo: string;
  data: string;
  dataFin?: string;
  lugar?: string;
  zona?: string;
  responsable?: string;
  contacto?: string;
  descricion?: string;
  actaUrl?: string;
  estado: "pendente" | "feita";
  createdAt: string;
  updatedAt?: string;
};

const TIPOS_VALIDOS = ["reunion", "prazo", "tarefa"];
// Grupos coñecidos hoxe. Engadir un GdT novo é só engadir o seu slug
// aquí (e na sidebar, public/xestion/sidebar-nav do HTML correspondente)
// -- non fai falla cambiar máis nada do backend.
const GRUPOS_VALIDOS = ["coordinacion", "comunicacion"];
const ESTADOS_VALIDOS = ["pendente", "feita"];

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

function limpar(valor: unknown, max: number): string {
  return typeof valor === "string" ? valor.trim().slice(0, max) : "";
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!canAdminister(request, env)) {
    return Response.json({ ok: false, error: "Non autorizado" }, { status: 401 });
  }
  if (!env.EVENTOS) {
    return Response.json({ ok: false, error: "Almacenamento non configurado" }, { status: 503 });
  }

  const allKeys: { name: string }[] = [];
  let cursor: string | undefined;
  do {
    const page = await env.EVENTOS.list({ prefix: "evento:", cursor });
    allKeys.push(...page.keys);
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);

  const eventos = (
    await Promise.all(allKeys.map((key) => env.EVENTOS?.get<Evento>(key.name, "json")))
  )
    .filter((item): item is Evento => Boolean(item))
    .sort((a, b) => a.data.localeCompare(b.data));

  return Response.json({ ok: true, eventos });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!canAdminister(request, env)) {
    return Response.json({ ok: false, error: "Non autorizado" }, { status: 401 });
  }
  if (!env.EVENTOS) {
    return Response.json({ ok: false, error: "Almacenamento non configurado" }, { status: 503 });
  }

  const body = await request.json<Record<string, unknown>>().catch(() => ({} as Record<string, unknown>));
  const tipo = limpar(body.tipo, 20);
  const grupo = limpar(body.grupo, 40);
  const titulo = limpar(body.titulo, 200);
  const data = limpar(body.data, 40);
  const dataFin = limpar(body.dataFin, 40);
  const estado = limpar(body.estado, 20) || "pendente";

  if (
    !TIPOS_VALIDOS.includes(tipo)
    || !GRUPOS_VALIDOS.includes(grupo)
    || !titulo
    || !data || Number.isNaN(Date.parse(data))
    || (dataFin && (Number.isNaN(Date.parse(dataFin)) || Date.parse(dataFin) < Date.parse(data)))
    || !ESTADOS_VALIDOS.includes(estado)
  ) {
    return Response.json({ ok: false, error: "Datos incompletos ou incorrectos" }, { status: 400 });
  }

  const evento: Evento = {
    id: crypto.randomUUID(),
    tipo: tipo as Evento["tipo"],
    grupo,
    titulo,
    data,
    ...(dataFin ? { dataFin } : {}),
    lugar: limpar(body.lugar, 200),
    zona: limpar(body.zona, 100),
    responsable: limpar(body.responsable, 150),
    contacto: limpar(body.contacto, 200),
    descricion: limpar(body.descricion, 2000),
    actaUrl: limpar(body.actaUrl, 500),
    estado: estado as Evento["estado"],
    createdAt: new Date().toISOString(),
  };

  await env.EVENTOS.put(`evento:${evento.id}`, JSON.stringify(evento));
  return Response.json({ ok: true, evento }, { status: 201 });
};

export const onRequestPatch: PagesFunction<Env> = async ({ request, env }) => {
  if (!canAdminister(request, env)) {
    return Response.json({ ok: false, error: "Non autorizado" }, { status: 401 });
  }
  if (!env.EVENTOS) {
    return Response.json({ ok: false, error: "Almacenamento non configurado" }, { status: 503 });
  }

  const body = await request.json<Record<string, unknown>>().catch(() => ({} as Record<string, unknown>));
  const id = limpar(body.id, 80);
  if (!id) {
    return Response.json({ ok: false, error: "Falta o id" }, { status: 400 });
  }

  const key = `evento:${id}`;
  const existente = await env.EVENTOS.get<Evento>(key, "json");
  if (!existente) {
    return Response.json({ ok: false, error: "Evento non atopado" }, { status: 404 });
  }

  const seguinte: Evento = { ...existente };
  if (body.tipo !== undefined) {
    const tipo = limpar(body.tipo, 20);
    if (!TIPOS_VALIDOS.includes(tipo)) return Response.json({ ok: false, error: "Tipo incorrecto" }, { status: 400 });
    seguinte.tipo = tipo as Evento["tipo"];
  }
  if (body.grupo !== undefined) {
    const grupo = limpar(body.grupo, 40);
    if (!GRUPOS_VALIDOS.includes(grupo)) return Response.json({ ok: false, error: "Grupo incorrecto" }, { status: 400 });
    seguinte.grupo = grupo;
  }
  if (body.titulo !== undefined) {
    const titulo = limpar(body.titulo, 200);
    if (!titulo) return Response.json({ ok: false, error: "Falta o título" }, { status: 400 });
    seguinte.titulo = titulo;
  }
  if (body.data !== undefined) {
    const data = limpar(body.data, 40);
    if (!data || Number.isNaN(Date.parse(data))) return Response.json({ ok: false, error: "Data incorrecta" }, { status: 400 });
    seguinte.data = data;
  }
  if (body.dataFin !== undefined) {
    const dataFin = limpar(body.dataFin, 40);
    if (dataFin && Number.isNaN(Date.parse(dataFin))) return Response.json({ ok: false, error: "Data de fin incorrecta" }, { status: 400 });
    if (dataFin) seguinte.dataFin = dataFin; else delete seguinte.dataFin;
  }
  if (body.lugar !== undefined) seguinte.lugar = limpar(body.lugar, 200);
  if (body.zona !== undefined) seguinte.zona = limpar(body.zona, 100);
  if (body.responsable !== undefined) seguinte.responsable = limpar(body.responsable, 150);
  if (body.contacto !== undefined) seguinte.contacto = limpar(body.contacto, 200);
  if (body.descricion !== undefined) seguinte.descricion = limpar(body.descricion, 2000);
  if (body.actaUrl !== undefined) seguinte.actaUrl = limpar(body.actaUrl, 500);
  if (body.estado !== undefined) {
    const estado = limpar(body.estado, 20);
    if (!ESTADOS_VALIDOS.includes(estado)) return Response.json({ ok: false, error: "Estado incorrecto" }, { status: 400 });
    seguinte.estado = estado as Evento["estado"];
  }
  seguinte.updatedAt = new Date().toISOString();

  await env.EVENTOS.put(key, JSON.stringify(seguinte));
  return Response.json({ ok: true, evento: seguinte });
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  if (!canAdminister(request, env)) {
    return Response.json({ ok: false, error: "Non autorizado" }, { status: 401 });
  }
  if (!env.EVENTOS) {
    return Response.json({ ok: false, error: "Almacenamento non configurado" }, { status: 503 });
  }

  const url = new URL(request.url);
  const id = limpar(url.searchParams.get("id"), 80);
  if (!id) {
    return Response.json({ ok: false, error: "Falta o id" }, { status: 400 });
  }
  await env.EVENTOS.delete(`evento:${id}`);
  return Response.json({ ok: true });
};
