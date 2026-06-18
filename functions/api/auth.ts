interface Env {
  GITHUB_CLIENT_ID?: string;
}

function randomState() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.GITHUB_CLIENT_ID) {
    return new Response("OAuth de GitHub non configurado", { status: 503 });
  }

  const requestUrl = new URL(request.url);
  const state = randomState();
  const redirectUrl = new URL("https://github.com/login/oauth/authorize");
  redirectUrl.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
  redirectUrl.searchParams.set("redirect_uri", `${requestUrl.origin}/api/callback`);
  redirectUrl.searchParams.set("scope", "repo");
  redirectUrl.searchParams.set("state", state);

  return new Response(null, {
    status: 302,
    headers: {
      location: redirectUrl.toString(),
      "cache-control": "no-store",
      "set-cookie": `decap_oauth_state=${state}; Path=/api/callback; Max-Age=600; HttpOnly; Secure; SameSite=Lax`,
    },
  });
};
