interface Env {
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
}

function cookieValue(request: Request, name: string) {
  const cookies = request.headers.get("cookie") || "";
  for (const item of cookies.split(";")) {
    const [key, ...value] = item.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return "";
}

function oauthResponse(status: "success" | "error", content: Record<string, unknown>, origin: string) {
  const message = `authorization:github:${status}:${JSON.stringify(content)}`;
  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Autorización</title></head>
<body><p>Completando a autorización…</p>
<script>
  (() => {
    const targetOrigin = ${JSON.stringify(origin)};
    const message = ${JSON.stringify(message)};
    const receiveMessage = (event) => {
      if (event.origin !== targetOrigin || !window.opener) return;
      window.opener.postMessage(message, targetOrigin);
      window.removeEventListener("message", receiveMessage);
      window.close();
    };
    window.addEventListener("message", receiveMessage);
    if (window.opener) window.opener.postMessage("authorizing:github", targetOrigin);
  })();
</script></body></html>`;

  return new Response(html, {
    status: status === "success" ? 200 : 401,
    headers: {
      "content-type": "text/html; charset=UTF-8",
      "cache-control": "no-store",
      "content-security-policy": `default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'none'; frame-ancestors 'none'`,
      "set-cookie": "decap_oauth_state=; Path=/api/callback; Max-Age=0; HttpOnly; Secure; SameSite=Lax",
    },
  });
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expectedState = cookieValue(request, "decap_oauth_state");

  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    return oauthResponse("error", { message: "OAuth de GitHub non configurado" }, url.origin);
  }
  if (!code || !state || !expectedState || state !== expectedState) {
    return oauthResponse("error", { message: "Estado OAuth inválido ou caducado" }, url.origin);
  }

  try {
    const response = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "user-agent": "asembleasensino-decap-oauth",
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: `${url.origin}/api/callback`,
      }),
    });
    const result = await response.json<{ access_token?: string; error?: string; error_description?: string }>();
    if (!response.ok || !result.access_token) {
      return oauthResponse("error", {
        message: result.error_description || result.error || "GitHub non devolveu un token",
      }, url.origin);
    }
    return oauthResponse("success", { token: result.access_token, provider: "github" }, url.origin);
  } catch {
    return oauthResponse("error", { message: "Non foi posible contactar con GitHub" }, url.origin);
  }
};
