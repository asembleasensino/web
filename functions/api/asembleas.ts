import asembleasData from "../../src/data/asembleas.json";

interface Env {
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

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!canAdminister(request, env)) {
    return Response.json({ ok: false, error: "Non autorizado" }, { status: 401 });
  }
  // Datos estáticos (editados a través do CMS en src/data/asembleas.json,
  // non un almacenamento dinámico), ordenados por concello e nome para que
  // a táboa saia lexible por defecto.
  const asembleas = [...(asembleasData.asembleas || [])].sort((a, b) =>
    a.concello.localeCompare(b.concello, "gl") || a.nome.localeCompare(b.nome, "gl")
  );
  return Response.json({ ok: true, asembleas });
};
