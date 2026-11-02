import { centros } from "../../src/data/centros";

interface DatosPrivados {
  contacto?: string;
  responsable?: string;
  representantes?: string;
  notas?: string;
  actualizadoEn?: string;
}

interface Env {
  COORDINACION?: KVNamespace;
  XESTION_PASSWORD?: string;
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

// Listaxe completa para o panel de coordinación: TODO o catálogo oficial
// de centros (non só os que xa teñen asemblea), cos datos públicos que xa
// ten o mapa (estado, territorio) E os datos privados gardados en KV
// (contacto, responsable, representantes, notas) -- nunca os datos
// privados saen de aquí cara ao mapa público.
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!canAdminister(request, env)) {
    return Response.json({ ok: false, error: "Non autorizado" }, { status: 401 });
  }
  if (!env.COORDINACION) {
    return Response.json({ ok: false, error: "Almacenamento non configurado" }, { status: 503 });
  }

  const privados = new Map<string, DatosPrivados>();
  let cursor: string | undefined;
  do {
    const page = await env.COORDINACION.list({ prefix: "centro:", cursor });
    for (const key of page.keys) {
      const codigo = key.name.slice("centro:".length);
      const valor = await env.COORDINACION.get<DatosPrivados>(key.name, "json");
      if (valor) privados.set(codigo, valor);
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);

  const lista = centros.map((centro) => {
    const privado = privados.get(centro.codigo);
    return {
      codigo: centro.codigo,
      nome: centro.nome,
      concello: centro.concello,
      tipo: centro.tipo,
      estado: centro.estado,
      territorio: centro.territorio ?? null,
      nucleo: "nucleo" in centro ? centro.nucleo : false,
      contacto: privado?.contacto ?? "",
      responsable: privado?.responsable ?? "",
      representantes: privado?.representantes ?? "",
      notas: privado?.notas ?? "",
    };
  });

  return Response.json({ ok: true, centros: lista });
};
