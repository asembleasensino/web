import { centros } from "../../src/data/centros";
import { territorios } from "../../src/data/territorios";

interface DatosPrivadosTerritorio {
  contacto?: string;
  notas?: string;
  actualizadoEn?: string;
}

interface Env {
  COORDINACION?: KVNamespace;
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

// Listaxe de territorios oficiais (os de src/data/territorios.json) coas
// notas/contacto privados gardados en KV, máis a lista de concellos que
// xa teñen algún centro pero aínda non están en ningún territorio --
// útil para o selector de "mover este concello a...".
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!canAdminister(request, env)) {
    return Response.json({ ok: false, error: "Non autorizado" }, { status: 401 });
  }
  if (!env.COORDINACION) {
    return Response.json({ ok: false, error: "Almacenamento non configurado" }, { status: 503 });
  }

  const lista = await Promise.all(
    territorios.map(async (territorio) => {
      const privado = await env.COORDINACION!.get<DatosPrivadosTerritorio>(`territorio:${territorio.nome}`, "json");
      return {
        nome: territorio.nome,
        concellos: territorio.concellos,
        contacto: privado?.contacto ?? "",
        notas: privado?.notas ?? "",
      };
    })
  );

  const concellosAgrupados = new Set(territorios.flatMap((territorio) => territorio.concellos));
  const concellosSoltos = [...new Set(
    centros
      .filter((centro) => centro.estado === "activa" && !concellosAgrupados.has(centro.concello))
      .map((centro) => centro.concello)
  )].sort((a, b) => a.localeCompare(b, "gl"));

  return Response.json({ ok: true, territorios: lista, concellosSoltos });
};
