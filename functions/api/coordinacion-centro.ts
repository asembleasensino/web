import { centros } from "../../src/data/centros";
import { updateJsonFile, GithubBotError } from "../_lib/github-bot";

interface DatosPrivados {
  contacto?: string;
  responsable?: string;
  representantes?: string;
  notas?: string;
  actualizadoEn?: string;
}

interface AsembleasFile {
  asembleas: Array<{
    codigo: string;
    nome: string;
    concello: string;
    estado: "activa" | "creacion";
    contacto?: string;
  }>;
}

interface Env {
  COORDINACION?: KVNamespace;
  XESTION_PASSWORD?: string;
  GITHUB_BOT_TOKEN?: string;
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

function limpar(valor: unknown, max: number): string {
  return typeof valor === "string" ? valor.trim().slice(0, max) : "";
}

// Garda SÓ os datos privados dun centro (contacto, responsable,
// representantes, notas) en Cloudflare KV. Isto NUNCA toca o repositorio
// de código nin o mapa público -- é instantáneo, sen esperar ao
// despregue. Para activar un centro no mapa público, ver onRequestPost.
export const onRequestPatch: PagesFunction<Env> = async ({ request, env }) => {
  if (!canAdminister(request, env)) {
    return Response.json({ ok: false, error: "Non autorizado" }, { status: 401 });
  }
  if (!env.COORDINACION) {
    return Response.json({ ok: false, error: "Almacenamento non configurado" }, { status: 503 });
  }

  const body = await request.json<Record<string, unknown>>().catch(() => ({} as Record<string, unknown>));
  const codigo = limpar(body.codigo, 30);
  if (!codigo || !centros.some((centro) => centro.codigo === codigo)) {
    return Response.json({ ok: false, error: "Centro non atopado" }, { status: 404 });
  }

  const key = `centro:${codigo}`;
  const existente = (await env.COORDINACION.get<DatosPrivados>(key, "json")) || {};
  const seguinte: DatosPrivados = {
    contacto: limpar(body.contacto ?? existente.contacto, 300),
    responsable: limpar(body.responsable ?? existente.responsable, 300),
    representantes: limpar(body.representantes ?? existente.representantes, 1000),
    notas: limpar(body.notas ?? existente.notas, 4000),
    actualizadoEn: new Date().toISOString(),
  };
  await env.COORDINACION.put(key, JSON.stringify(seguinte));
  return Response.json({ ok: true });
};

// Activa (ou pon "en creación") un centro no mapa PÚBLICO, escribindo en
// src/data/asembleas.json cun commit real feito polo "robot" da
// Coordinación (GITHUB_BOT_TOKEN) -- ninguén precisa conta de GitHub
// propia. Nunca escribe datos de contacto aquí: eses quedan só en KV
// (onRequestPatch, enriba).
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!canAdminister(request, env)) {
    return Response.json({ ok: false, error: "Non autorizado" }, { status: 401 });
  }
  if (!env.GITHUB_BOT_TOKEN) {
    return Response.json({ ok: false, error: "Falta configurar o acceso de escritura a GitHub (GITHUB_BOT_TOKEN)" }, { status: 503 });
  }

  const body = await request.json<Record<string, unknown>>().catch(() => ({} as Record<string, unknown>));
  const codigo = limpar(body.codigo, 30);
  const estado = body.estado === "creacion" ? "creacion" : "activa";
  const centro = centros.find((item) => item.codigo === codigo);
  if (!centro) {
    return Response.json({ ok: false, error: "Centro non atopado no catálogo" }, { status: 404 });
  }

  try {
    await updateJsonFile<AsembleasFile>(
      env.GITHUB_BOT_TOKEN,
      "src/data/asembleas.json",
      `Coordinación: ${estado === "activa" ? "activar" : "pór en creación"} ${centro.nome} (${centro.codigo})`,
      (current) => {
        const lista = current.asembleas ?? [];
        const index = lista.findIndex((entry) => entry.codigo === centro.codigo);
        if (index >= 0) {
          lista[index] = { ...lista[index], nome: centro.nome, concello: centro.concello, estado };
        } else {
          lista.push({ codigo: centro.codigo, nome: centro.nome, concello: centro.concello, estado });
        }
        return { ...current, asembleas: lista };
      }
    );
  } catch (error) {
    const message = error instanceof GithubBotError ? error.message : "Erro inesperado ao gardar en GitHub";
    return Response.json({ ok: false, error: message }, { status: 502 });
  }

  return Response.json({ ok: true });
};
