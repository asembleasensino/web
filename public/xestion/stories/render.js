// Xerador de stories "Martes en loita" (estilo editorial, con data).
//
// É unha tradución ao navegador de create_editorial_story() do script
// local _interno/webapp.py (carpeta de Drive accions/martes_loita/imaxes).
// Mantén as mesmas medidas, cores e tratamento da foto. O titular
// "MARTES EN LOITA" vai como PNG (titular-*.png) xerado coa fonte Druk do
// ordenador orixinal, para non ter que publicar a fonte.

(function () {
  const W = 1080;
  const H = 1920;
  const MARGIN = 64;
  const HEADLINE_PAD = 40; // marxe superior con que se debuxou o PNG do titular
  const COLORS = {
    black: [37, 35, 33],
    offWhite: [242, 240, 236],
    red: [201, 74, 66],
    green: [53, 90, 44],
  };
  const SANS = '"Helvetica Neue", Helvetica, Arimo, Arial, sans-serif';

  const rgb = (c) => `rgb(${c[0]}, ${c[1]}, ${c[2]})`;

  const headlineCache = {};
  function loadHeadline(kind, baseUrl) {
    if (!headlineCache[kind]) {
      headlineCache[kind] = new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Non se puido cargar o titular"));
        img.src = `${baseUrl}titular-${kind}.png`;
      });
    }
    return headlineCache[kind];
  }

  async function ensureFonts() {
    if (!document.fonts || !document.fonts.load) return;
    try {
      await Promise.all([
        document.fonts.load(`34px ${SANS}`),
        document.fonts.load(`30px ${SANS}`),
      ]);
    } catch {
      /* úsase a fonte de reserva */
    }
  }

  // "Centro - Concello.jpg" -> "Centro - Concello"
  function naturalName(filename) {
    const dot = filename.lastIndexOf(".");
    const stem = dot > 0 ? filename.slice(0, dot) : filename;
    return stem.replace(/_/g, " ").trim().normalize("NFC");
  }

  // "2026-10-13" -> "13/10/26"
  function formatDateShort(day) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day || "");
    return m ? `${m[3]}/${m[2]}/${m[1].slice(2)}` : day;
  }

  function makeCanvas(w, h) {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    return canvas;
  }

  // Equivale a thumbnail(): reduce mantendo proporción, nunca amplía.
  function containSize(w, h, maxW, maxH) {
    const scale = Math.min(maxW / w, maxH / h, 1);
    return [Math.max(1, Math.round(w * scale)), Math.max(1, Math.round(h * scale))];
  }

  // Reducción de calidade: primeiro intenta o redimensionado nativo e,
  // se non existe, baixa á metade en pasos sucesivos.
  async function resizeBitmap(bitmap, w, h) {
    if (bitmap.width === w && bitmap.height === h) return bitmap;
    try {
      return await createImageBitmap(bitmap, { resizeWidth: w, resizeHeight: h, resizeQuality: "high" });
    } catch {
      let source = bitmap;
      let sw = bitmap.width;
      let sh = bitmap.height;
      while (sw / 2 >= w && sh / 2 >= h) {
        const step = makeCanvas(Math.round(sw / 2), Math.round(sh / 2));
        const ctx = step.getContext("2d");
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(source, 0, 0, step.width, step.height);
        source = step;
        sw = step.width;
        sh = step.height;
      }
      const out = makeCanvas(w, h);
      const ctx = out.getContext("2d");
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(source, 0, 0, w, h);
      return out;
    }
  }

  // documentary_image(): Color 0.78 + Contraste 1.12 (mesmas fórmulas que Pillow).
  function documentary(ctx, w, h) {
    const imageData = ctx.getImageData(0, 0, w, h);
    const p = imageData.data;
    let sum = 0;
    for (let i = 0; i < p.length; i += 4) {
      const r = p[i];
      const g = p[i + 1];
      const b = p[i + 2];
      const l = Math.round((r * 299 + g * 587 + b * 114) / 1000);
      p[i] = l + 0.78 * (r - l);
      p[i + 1] = l + 0.78 * (g - l);
      p[i + 2] = l + 0.78 * (b - l);
      sum += Math.round((p[i] * 299 + p[i + 1] * 587 + p[i + 2] * 114) / 1000);
    }
    const mean = Math.floor(sum / (p.length / 4) + 0.5);
    for (let i = 0; i < p.length; i += 4) {
      p[i] = mean + 1.12 * (p[i] - mean);
      p[i + 1] = mean + 1.12 * (p[i + 1] - mean);
      p[i + 2] = mean + 1.12 * (p[i + 2] - mean);
    }
    ctx.putImageData(imageData, 0, 0);
  }

  // add_paper_texture(): ruído gaussiano (σ 22) como máscara moi tenue de papel.
  function paperTexture(ctx) {
    const imageData = ctx.getImageData(0, 0, W, H);
    const p = imageData.data;
    const [or, og, ob] = COLORS.offWhite;
    let spare = null;
    for (let i = 0; i < p.length; i += 4) {
      let z;
      if (spare !== null) {
        z = spare;
        spare = null;
      } else {
        const u = Math.random() || 1e-9;
        const v = Math.random();
        const mag = Math.sqrt(-2 * Math.log(u));
        z = mag * Math.cos(2 * Math.PI * v);
        spare = mag * Math.sin(2 * Math.PI * v);
      }
      const noise = Math.min(255, Math.max(0, Math.round(128 + 22 * z)));
      const a = Math.floor(noise * 0.025);
      if (a === 0) continue;
      p[i] = (or * a + p[i] * (255 - a)) / 255;
      p[i + 1] = (og * a + p[i + 1] * (255 - a)) / 255;
      p[i + 2] = (ob * a + p[i + 2] * (255 - a)) / 255;
    }
    ctx.putImageData(imageData, 0, 0);
  }

  function setFont(ctx, size) {
    ctx.font = `${size}px ${SANS}`;
    ctx.textBaseline = "alphabetic";
    const metrics = ctx.measureText("Hg");
    // Pillow sitúa o texto pola liña do ascendente; en canvas debúxase pola liña base.
    return metrics.fontBoundingBoxAscent || size * 0.95;
  }

  function drawTracking(ctx, x, y, text, ascent, tracking) {
    for (const ch of text) {
      ctx.fillText(ch, x, y + ascent);
      x += ctx.measureText(ch).width + tracking;
    }
  }

  function wrapLabel(ctx, text, maxWidth, tracking) {
    const words = text.split(/\s+/).filter(Boolean);
    const lines = [];
    let current = "";
    for (const word of words) {
      const candidate = `${current} ${word}`.trim();
      const width = ctx.measureText(candidate).width + Math.max(0, [...candidate].length - 1) * tracking;
      if (current && width > maxWidth) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) lines.push(current);
    return lines.slice(0, 2);
  }

  async function drawIdentity(ctx, label, photoBottom, compact, baseUrl) {
    const ascent = setFont(ctx, compact ? 32 : 34);
    ctx.fillStyle = rgb(COLORS.offWhite);
    const lines = wrapLabel(ctx, label.toLocaleUpperCase("gl"), W - MARGIN * 2, 1);
    const labelY = photoBottom + 22;
    lines.forEach((line, index) => drawTracking(ctx, MARGIN, labelY + index * 40, line, ascent, 1));

    const ruleY = labelY + lines.length * 40 + 4;
    ctx.fillStyle = rgb(COLORS.red);
    ctx.fillRect(MARGIN, ruleY, W - MARGIN * 2 + 1, 4);
    ctx.fillStyle = rgb(COLORS.green);
    ctx.fillRect(W - MARGIN - 32, ruleY, 33, 4);

    const headlineY = Math.max(ruleY + 28, compact ? 1530 : 1480);
    const headline = await loadHeadline(compact ? "compact" : "normal", baseUrl);
    ctx.drawImage(headline, 0, headlineY - HEADLINE_PAD);
  }

  function drawDate(ctx, day) {
    const ascent = setFont(ctx, 30);
    ctx.fillStyle = rgb(COLORS.offWhite);
    drawTracking(ctx, MARGIN, 64, formatDateShort(day).toUpperCase(), ascent, 2);
    ctx.fillStyle = rgb(COLORS.red);
    ctx.fillRect(MARGIN, 64 + 30 + 14, 61, 4);
  }

  /**
   * Xera unha story.
   * @param {Blob} photoBlob  foto orixinal
   * @param {object} options  { day: "AAAA-MM-DD", filename: "Centro - Concello.jpg",
   *                            includeDate?: true, baseUrl?: "/xestion/stories/" }
   * @returns {Promise<HTMLCanvasElement>}
   */
  async function renderStory(photoBlob, options) {
    const baseUrl = options.baseUrl || "/xestion/stories/";
    const includeDate = options.includeDate !== false;
    await ensureFonts();

    const bitmap = await createImageBitmap(photoBlob, { imageOrientation: "from-image" });
    const ratio = bitmap.width / bitmap.height;
    const horizontal = ratio >= 1.05;

    const canvas = makeCanvas(W, H);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.fillStyle = rgb(COLORS.black);
    ctx.fillRect(0, 0, W, H);

    const [pw, ph] = horizontal
      ? containSize(bitmap.width, bitmap.height, W, 1120)
      : containSize(bitmap.width, bitmap.height, W - 128, 1320);
    const resized = await resizeBitmap(bitmap, pw, ph);
    const photoCanvas = makeCanvas(pw, ph);
    const photoCtx = photoCanvas.getContext("2d", { willReadFrequently: true });
    photoCtx.drawImage(resized, 0, 0);
    documentary(photoCtx, pw, ph);

    const x = Math.floor((W - pw) / 2);
    const y = horizontal ? 250 + Math.floor((1120 - ph) / 2) : 170 + Math.floor((1320 - ph) / 2);
    ctx.drawImage(photoCanvas, x, y);

    await drawIdentity(ctx, naturalName(options.filename), y + ph, !horizontal, baseUrl);
    if (includeDate) drawDate(ctx, options.day);
    paperTexture(ctx);

    if (bitmap.close) bitmap.close();
    return canvas;
  }

  function canvasToJpeg(canvas, quality = 0.95) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Non se puido exportar a imaxe"))), "image/jpeg", quality);
    });
  }

  function storyFilename(photoFilename) {
    return `story - ${naturalName(photoFilename)}.jpg`;
  }

  window.MartesStory = { renderStory, canvasToJpeg, storyFilename, naturalName, formatDateShort };
})();
