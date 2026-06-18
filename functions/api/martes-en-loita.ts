interface Env {
  MARTES_MEDIA?: R2Bucket;
  GOOGLE_APPS_SCRIPT_URL?: string;
  GOOGLE_APPS_SCRIPT_SECRET?: string;
}

function isTuesday(date: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date)
    && new Date(`${date}T12:00:00Z`).getUTCDay() === 2;
}

function toBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.GOOGLE_APPS_SCRIPT_URL || !env.GOOGLE_APPS_SCRIPT_SECRET) {
    return Response.json({ ok: false, error: "Arquivo de Google Drive non configurado" }, { status: 503 });
  }
  const form = await request.formData();
  const fotoEntry = form.get("foto");
  const centro = String(form.get("centro") ?? "").trim();
  const centroCodigo = String(form.get("centroCodigo") ?? "").trim();
  const concello = String(form.get("concello") ?? "").trim();
  const comarca = String(form.get("comarca") ?? "").trim();
  const data = String(form.get("data") ?? "").trim();
  const autorizacion = String(form.get("autorizacion") ?? "");

  if (!fotoEntry || typeof fotoEntry === "string" || !centro || !centroCodigo || !concello || !comarca || !isTuesday(data) || autorizacion !== "confirmed") {
    return Response.json({ ok: false, error: "Datos incompletos" }, { status: 400 });
  }
  const foto = fotoEntry as File;
  if (!["image/jpeg", "image/png", "image/webp"].includes(foto.type) || foto.size > 15 * 1024 * 1024) {
    return Response.json({ ok: false, error: "Formato ou tamaño non admitido" }, { status: 400 });
  }

  const safe = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-");
  const extension = foto.type === "image/png" ? "png" : foto.type === "image/webp" ? "webp" : "jpg";
  const filename = `${safe(centro)}-${safe(concello)}.${extension}`;
  const key = `${data}/${filename}`;
  const bytes = await foto.arrayBuffer();

  const storedIn: string[] = [];
  const errors: string[] = [];

  if (env.MARTES_MEDIA) {
    try {
      await env.MARTES_MEDIA.put(key, bytes, {
        httpMetadata: { contentType: foto.type },
        customMetadata: { centro, centroCodigo, concello, comarca, data, autorizacion: "confirmed" },
      });
      storedIn.push("r2");
    } catch (error) {
      console.error("Fallou a copia en R2", error);
      errors.push("r2");
    }
  }

  if (env.GOOGLE_APPS_SCRIPT_URL) {
    try {
      const response = await fetch(env.GOOGLE_APPS_SCRIPT_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          secret: env.GOOGLE_APPS_SCRIPT_SECRET || "",
          filename,
          mimeType: foto.type,
          base64: toBase64(bytes),
          centro,
          centroCodigo,
          concello,
          comarca,
          data,
          autorizacion: true,
        }),
      });
      const driveResult: { ok?: boolean; error?: string } = await response
        .json<{ ok?: boolean; error?: string }>()
        .catch(() => ({ ok: false }));
      if (!response.ok || !driveResult.ok) throw new Error(driveResult.error || `HTTP ${response.status}`);
      storedIn.push("drive");
    } catch (error) {
      console.error("Fallou o gardado en Drive", error);
      errors.push("drive");
    }
  }

  if (storedIn.length === 0) {
    return Response.json({ ok: false, error: "Non foi posible gardar a imaxe" }, { status: 502 });
  }
  const driveStored = storedIn.includes("drive");
  return Response.json({
    ok: true,
    key,
    storedIn,
    warning: errors.length ? `Fallou: ${errors.join(", ")}` : undefined,
  }, { status: driveStored ? 201 : 202 });
};
