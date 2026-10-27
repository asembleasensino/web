import { centros } from "../../src/data/centros";

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

// Busca puntual dun centro polo seu código, para o panel de xestión de
// solicitudes: antes de dar de alta unha asemblea no mapa precisa saber o
// nome, concello e estado actual dese centro (os únicos datos que leva o
// mapa -- nunca os datos de contacto da solicitude).
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!canAdminister(request, env)) {
    return Response.json({ ok: false, error: "Non autorizado" }, { status: 401 });
  }
  const codigo = new URL(request.url).searchParams.get("codigo") || "";
  const centro = centros.find((item) => item.codigo === codigo);
  if (!centro) {
    return Response.json({ ok: false, error: "Centro non atopado" }, { status: 404 });
  }
  return Response.json({
    ok: true,
    centro: {
      codigo: centro.codigo,
      nome: centro.nome,
      concello: centro.concello,
      estado: centro.estado,
    },
  });
};
