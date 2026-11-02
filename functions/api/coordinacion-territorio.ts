import { updateJsonFile, GithubBotError } from "../_lib/github-bot";

interface TerritorioEntry {
  nome: string;
  aliases?: string[];
  concellos: string[];
}

interface TerritoriosFile {
  territorios: TerritorioEntry[];
}

interface DatosPrivadosTerritorio {
  contacto?: string;
  notas?: string;
  actualizadoEn?: string;
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

// Un único punto de entrada para tódolos cambios relativos a un
// territorio:
//  - moverConcello: saca ese concello de calquera outro territorio e
//    métoo neste (créase o territorio se o nome aínda non existe) --
//    cambio PÚBLICO, commit real en GitHub co "robot" da Coordinación.
//  - renomearA: cambia o nome do territorio -- cambio PÚBLICO, idem.
//  - contacto / notas: só se gardan en KV -- cambio PRIVADO, instantáneo,
//    nunca toca o repositorio nin o mapa público.
export const onRequestPatch: PagesFunction<Env> = async ({ request, env }) => {
  if (!canAdminister(request, env)) {
    return Response.json({ ok: false, error: "Non autorizado" }, { status: 401 });
  }

  const body = await request.json<Record<string, unknown>>().catch(() => ({} as Record<string, unknown>));
  const territorioActual = limpar(body.territorio, 120);
  const moverConcello = limpar(body.moverConcello, 120);
  const renomearA = limpar(body.renomearA, 120);
  if (!territorioActual) {
    return Response.json({ ok: false, error: "Falta o nome do territorio" }, { status: 400 });
  }

  const cambioPublico = Boolean(moverConcello || renomearA);
  if (cambioPublico) {
    if (!env.GITHUB_BOT_TOKEN) {
      return Response.json({ ok: false, error: "Falta configurar o acceso de escritura a GitHub (GITHUB_BOT_TOKEN)" }, { status: 503 });
    }
    try {
      await updateJsonFile<TerritoriosFile>(
        env.GITHUB_BOT_TOKEN,
        "src/data/territorios.json",
        moverConcello
          ? `Coordinación: mover "${moverConcello}" a "${territorioActual}"`
          : `Coordinación: renomear "${territorioActual}" a "${renomearA}"`,
        (current) => {
          const lista = (current.territorios ?? []).map((territorio) => ({
            ...territorio,
            concellos: [...territorio.concellos],
          }));

          if (moverConcello) {
            for (const territorio of lista) {
              territorio.concellos = territorio.concellos.filter((concello) => concello !== moverConcello);
            }
            let destino = lista.find((territorio) => territorio.nome === territorioActual);
            if (!destino) {
              destino = { nome: territorioActual, concellos: [] };
              lista.push(destino);
            }
            destino.concellos.push(moverConcello);
          }

          if (renomearA) {
            const destino = lista.find((territorio) => territorio.nome === territorioActual);
            if (destino) destino.nome = renomearA;
          }

          return { ...current, territorios: lista.filter((territorio) => territorio.concellos.length > 0) };
        }
      );
    } catch (error) {
      const message = error instanceof GithubBotError ? error.message : "Erro inesperado ao gardar en GitHub";
      return Response.json({ ok: false, error: message }, { status: 502 });
    }
  }

  const nomeFinal = renomearA || territorioActual;
  if (body.contacto !== undefined || body.notas !== undefined) {
    if (!env.COORDINACION) {
      return Response.json({ ok: false, error: "Almacenamento non configurado" }, { status: 503 });
    }
    const key = `territorio:${nomeFinal}`;
    const existente = (await env.COORDINACION.get<DatosPrivadosTerritorio>(key, "json")) || {};
    const seguinte: DatosPrivadosTerritorio = {
      contacto: limpar(body.contacto ?? existente.contacto, 300),
      notas: limpar(body.notas ?? existente.notas, 4000),
      actualizadoEn: new Date().toISOString(),
    };
    await env.COORDINACION.put(key, JSON.stringify(seguinte));
    // Se ademais se renomeou, o rexistro privado vello (co nome anterior)
    // queda orfo -- bórrase para non deixar lixo.
    if (renomearA) {
      await env.COORDINACION.delete(`territorio:${territorioActual}`);
    }
  } else if (renomearA) {
    // Renomeouse pero non se tocou contacto/notas nesta chamada: migra o
    // rexistro privado existente (se o hai) ao nome novo.
    if (env.COORDINACION) {
      const vello = await env.COORDINACION.get(`territorio:${territorioActual}`, "json");
      if (vello) {
        await env.COORDINACION.put(`territorio:${nomeFinal}`, JSON.stringify(vello));
        await env.COORDINACION.delete(`territorio:${territorioActual}`);
      }
    }
  }

  return Response.json({ ok: true });
};
