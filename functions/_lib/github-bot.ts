// Axuda compartida para que o panel de coordinación garde cambios
// "públicos" (centros.json, asembleas.json, territorios.json) facendo un
// commit real en GitHub -- SEN que ninguén da Coordinadora precise conta
// de GitHub propia. En vez do fluxo de OAuth persoal que usa
// "dar de alta no mapa" (solicitudes.html), aquí o propio servidor ten un
// token de só este repositorio (GITHUB_BOT_TOKEN, configurado coma
// segredo en Cloudflare) e fai el o commit en nome de "Coordinación".
//
// Os datos privados (contacto, responsable, representantes, notas) NON
// pasan por aquí: eses van sempre a Cloudflare KV, nunca ao repositorio.

const GITHUB_REPO = "asembleasensino/web";
const GITHUB_BRANCH = "main";

export class GithubBotError extends Error {}

function base64ToUtf8(base64: string): string {
  const binary = atob(base64.replace(/\n/g, ""));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder("utf-8").decode(bytes);
}

function utf8ToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

async function githubRequest(path: string, token: string, options: RequestInit = {}) {
  return fetch(`https://api.github.com/repos/${GITHUB_REPO}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "asembleasensino-coordinacion-bot",
      ...(options.headers || {}),
    },
  });
}

// Le un ficheiro JSON do repositorio, aplícalle `mutate` e garda o
// resultado nun commit novo. Se GitHub devolve 409 (outra persoa editou
// o ficheiro á vez) vólvese ler e tentar unha segunda vez cos datos máis
// recentes antes de desistir.
export async function updateJsonFile<T>(
  token: string,
  path: string,
  message: string,
  mutate: (current: T) => T
): Promise<void> {
  async function tentar(retried: boolean): Promise<void> {
    const getResponse = await githubRequest(`/contents/${path}`, token);
    if (!getResponse.ok) {
      throw new GithubBotError(`GitHub respondeu ${getResponse.status} ao ler ${path}`);
    }
    const fileData = await getResponse.json<{ content: string; sha: string }>();
    const current = JSON.parse(base64ToUtf8(fileData.content)) as T;
    const next = mutate(current);

    const putResponse = await githubRequest(`/contents/${path}`, token, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        message,
        content: utf8ToBase64(JSON.stringify(next, null, 2) + "\n"),
        sha: fileData.sha,
        branch: GITHUB_BRANCH,
      }),
    });
    if (putResponse.status === 409 && !retried) {
      return tentar(true);
    }
    if (!putResponse.ok) {
      const body = await putResponse.json<{ message?: string }>().catch(() => ({} as { message?: string }));
      throw new GithubBotError(body.message || `GitHub respondeu ${putResponse.status} ao gardar ${path}`);
    }
  }
  await tentar(false);
}
