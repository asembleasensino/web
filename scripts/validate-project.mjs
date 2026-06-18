import { readFile, readdir } from "node:fs/promises";
import { parse } from "yaml";

const errors = [];
const fail = (message) => errors.push(message);
const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));

const [site, home, rede, centrosData, asembleasData, aliases, contentTypes, decap] = await Promise.all([
  readJson("src/data/site.json"),
  readJson("src/data/home.json"),
  readJson("src/data/rede.json"),
  readJson("src/data/centros.json"),
  readJson("src/data/asembleas.json"),
  readJson("src/data/comarcas-aliases.json"),
  readJson("src/data/content-types.json"),
  readFile("public/admin/config.yml", "utf8").then(parse),
]);

if (!URL.canParse(site.siteUrl)) fail("src/data/site.json: siteUrl non é unha URL válida");
if (!String(site.email).includes("@")) fail("src/data/site.json: email non válido");
if (!Array.isArray(site.brandLines) || site.brandLines.length === 0) {
  fail("src/data/site.json: brandLines está baleiro");
}

for (const [group, items] of [
  ["headerNavigation", site.headerNavigation],
  ["footerNavigation", site.footerNavigation],
]) {
  if (!Array.isArray(items) || items.length === 0) fail(`src/data/site.json: ${group} está baleiro`);
  for (const item of items || []) {
    if (!item.label || !item.href) fail(`src/data/site.json: elemento incompleto en ${group}`);
    if (!/^(\/|https?:\/\/|mailto:)/.test(item.href || "")) {
      fail(`src/data/site.json: ligazón non recoñecida "${item.href}"`);
    }
  }
}

if (!Array.isArray(home.levels) || home.levels.length === 0) fail("src/data/home.json: levels está baleiro");
if (!Array.isArray(home.participationSteps) || home.participationSteps.length === 0) {
  fail("src/data/home.json: participationSteps está baleiro");
}
if (!Array.isArray(rede.grupos) || !Array.isArray(rede.normas)) fail("src/data/rede.json: estrutura incorrecta");

const centres = new Map();
for (const centre of centrosData.centros || []) {
  if (centres.has(centre.codigo)) fail(`Código de centro duplicado: ${centre.codigo}`);
  centres.set(centre.codigo, centre);
}

const assemblyCodes = new Set();
for (const assembly of asembleasData.asembleas || []) {
  if (assemblyCodes.has(assembly.codigo)) fail(`Código de asemblea duplicado: ${assembly.codigo}`);
  assemblyCodes.add(assembly.codigo);
  if (!centres.has(assembly.codigo)) fail(`Asemblea con código inexistente no catálogo: ${assembly.codigo}`);
  if (!["activa", "creacion"].includes(assembly.estado)) fail(`Estado de asemblea non válido: ${assembly.estado}`);
}

for (const [source, target] of Object.entries(aliases)) {
  if (!source.trim() || typeof target !== "string" || !target.trim()) {
    fail(`src/data/comarcas-aliases.json: alias incorrecto para "${source}"`);
  }
}

for (const field of ["site_domain", "base_url"]) {
  if (decap.backend?.[field] !== site.siteUrl) {
    fail(`public/admin/config.yml: backend.${field} non coincide con siteUrl`);
  }
}
for (const field of ["site_url", "display_url"]) {
  if (decap[field] !== site.siteUrl) fail(`public/admin/config.yml: ${field} non coincide con siteUrl`);
}

const requiredCollections = ["actualidade", "materiais", "paxinas", "configuracion"];
const collectionNames = new Set((decap.collections || []).map((collection) => collection.name));
for (const name of requiredCollections) {
  if (!collectionNames.has(name)) fail(`public/admin/config.yml: falta a colección ${name}`);
}

for (const [collectionName, expectedOptions] of Object.entries(contentTypes)) {
  const collection = (decap.collections || []).find((item) => item.name === collectionName);
  const typeField = collection?.fields?.find((field) => field.name === "type");
  if (JSON.stringify(typeField?.options || []) !== JSON.stringify(expectedOptions)) {
    fail(`public/admin/config.yml: as opcións de ${collectionName}.type non coinciden con content-types.json`);
  }
}

for (const directory of ["content/actualidade", "content/materiais", "content/paxinas"]) {
  const files = await readdir(directory);
  for (const file of files.filter((name) => !name.startsWith("."))) {
    if (/\s/.test(file)) fail(`${directory}/${file}: o nome non debe conter espazos`);
    if (!/\.(md|mdx)$/i.test(file)) fail(`${directory}/${file}: extensión de contido non admitida`);
  }
}

if (errors.length) {
  console.error("Validación do proxecto fallida:\n");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Configuración válida: ${centres.size} centros, ${assemblyCodes.size} asembleas.`);
