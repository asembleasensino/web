interface Env {
  XESTION_PASSWORD?: string;
}

function unauthorized() {
  return new Response("É necesario iniciar sesión para ver esta páxina.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Xestion AAEP", charset="UTF-8"',
      "content-type": "text/plain; charset=utf-8",
    },
  });
}

function hasValidPassword(request: Request, env: Env) {
  if (!env.XESTION_PASSWORD) return false;
  const header = request.headers.get("Authorization");
  if (!header || !header.startsWith("Basic ")) return false;
  let decoded: string;
  try {
    decoded = atob(header.slice(6));
  } catch {
    return false;
  }
  // Admítese "usuario:contrasinal" ou só "contrasinal": só o contrasinal importa.
  const password = decoded.includes(":") ? decoded.slice(decoded.indexOf(":") + 1) : decoded;
  return password === env.XESTION_PASSWORD;
}

// Protexe todo o que vive baixo /xestion/ (as páxinas estáticas de administración)
// cun contrasinal compartido gardado en Cloudflare, sen depender de Cloudflare Access.
export const onRequest: PagesFunction<Env> = async ({ request, env, next }) => {
  if (!hasValidPassword(request, env)) return unauthorized();
  return next();
};
