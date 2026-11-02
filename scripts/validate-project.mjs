import { readFile, readdir } from "node:fs/promises";
import { parse } from "yaml";

const errors = [];
const fail = (message) => errors.push(message);
const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));

const [site, home, rede, centrosData, asembleasData, aliases, territoriosData, contentTypes, decap] = await Promise.all([
  readJson("src/data/site.json"),
  readJson("src/data/home.json"),
  readJson("src/data/rede.json"),
  readJson("src/data/centros.json"),
  readJson("src/data/asembleas.json"),
  readJson("src/data/comarcas-aliases.json"),
  readJson("src/data/territorios.json"),
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

// territorios.json agrupa os concellos nos territorios (intercentros) reais
// polos que se organizan as asembleas, para o mapa. Un erro de escrita aquí
// deixaría un concello sen agrupar en silencio, así que comprobamos que
// cada concello mencionado existe de verdade no catálogo e que ningún
// concello está asignado a dous territorios á vez (sería ambiguo).
const concellosDoCatalogo = new Set(centrosData.centros.map((centro) => centro.concello));
const territorioNomeados = new Set();
const concelloAsignadoA = new Map();
for (const territorio of territoriosData.territorios || []) {
  if (!territorio.nome?.trim()) fail("src/data/territorios.json: territorio sen nome");
  if (territorioNomeados.has(territorio.nome)) fail(`src/data/territorios.json: territorio duplicado "${territorio.nome}"`);
  territorioNomeados.add(territorio.nome);
  if (!Array.isArray(territorio.concellos) || territorio.concellos.length === 0) {
    fail(`src/data/territorios.json: "${territorio.nome}" non ten concellos`);
    continue;
  }
  for (const concello of territorio.concellos) {
    if (!concellosDoCatalogo.has(concello)) {
      fail(`src/data/territorios.json: "${territorio.nome}" menciona un concello que non existe no catálogo: "${concello}"`);
    }
    if (concelloAsignadoA.has(concello)) {
      fail(`src/data/territorios.json: o concello "${concello}" está asignado a dous territorios ("${concelloAsignadoA.get(concello)}" e "${territorio.nome}")`);
    }
    concelloAsignadoA.set(concello, territorio.nome);
  }
}

// O select "territorio" de Convocatorias (public/admin/config.yml) duplica
// á man os nomes de territorios.json (Decap non pode ler un JSON do
// repositorio para construír as opcións dun select). Se alguén renomea,
// funde ou crea un territorio sen actualizar as dúas listas, o filtro de
// /axenda deixaría de recoñecer eses nomes en silencio -- por iso
// comprobamos que coincidan exactamente.
const actualidadeCollectionParaTerritorio = (decap.collections || []).find((item) => item.name === "actualidade");
const territorioField = actualidadeCollectionParaTerritorio?.fields?.find((field) => field.name === "territorio");
if (territorioField?.widget !== "select") {
  fail("public/admin/config.yml: actualidade.territorio debe ser un select (para non admitir erros de escritura)");
} else {
  const opcionsDoSelect = new Set(
    (territorioField.options || []).map((option) => (typeof option === "string" ? option : option.value)),
  );
  for (const nome of territorioNomeados) {
    if (!opcionsDoSelect.has(nome)) {
      fail(`public/admin/config.yml: actualidade.territorio non inclúe o territorio "${nome}" (existe en territorios.json)`);
    }
  }
  for (const opcion of opcionsDoSelect) {
    if (!territorioNomeados.has(opcion)) {
      fail(`public/admin/config.yml: actualidade.territorio inclúe "${opcion}", que xa non existe en territorios.json`);
    }
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
  if (!Array.isArray(expectedOptions) || expectedOptions.some((item) => typeof item !== "string" || !item.trim())) {
    fail(`src/data/content-types.json: ${collectionName} debe ser unha lista de textos non baleiros`);
  }
  // Non todas as claves de content-types.json son coleccións de Decap: algunhas
  // (p.ex. "gruposDeTraballo") son só listas de referencia cos valores
  // suxeridos dun campo doutra colección (como `materiais.grupo`), sen
  // colección propia que comprobar aquí.
  if (!collectionNames.has(collectionName)) continue;
  const collection = (decap.collections || []).find((item) => item.name === collectionName);
  const typeField = collection?.fields?.find((field) => field.name === "type");
  if (typeField?.widget !== "string") {
    fail(`public/admin/config.yml: ${collectionName}.type debe ser texto libre para non bloquear categorías novas`);
  }
}

const configCollection = (decap.collections || []).find((item) => item.name === "configuracion");
const editableConfigFiles = new Set((configCollection?.files || []).map((file) => file.file));
for (const requiredFile of [
  "src/data/site.json",
  "src/data/home.json",
  "src/data/rede.json",
  "src/data/asembleas.json",
  "src/data/territorios.json",
  "src/data/content-types.json",
]) {
  if (!editableConfigFiles.has(requiredFile)) {
    fail(`public/admin/config.yml: ${requiredFile} debe estar exposto no CMS`);
  }
}

for (const directory of ["content/actualidade", "content/materiais", "content/paxinas"]) {
  const files = await readdir(directory);
  for (const file of files.filter((name) => !name.startsWith("."))) {
    if (/\s/.test(file)) fail(`${directory}/${file}: o nome non debe conter espazos`);
    if (!/\.(md|mdx)$/i.test(file)) fail(`${directory}/${file}: extensión de contido non admitida`);
  }
}

// O territorio dunha Convocatoria ten que coincidir exactamente cun nome
// real de territorios.json -- un erro aquí deixaría esa convocatoria sen
// aparecer en /axenda ao filtrar por zona, en silencio.
for (const file of (await readdir("content/actualidade")).filter((name) => name.endsWith(".md") || name.endsWith(".mdx"))) {
  const raw = await readFile(`content/actualidade/${file}`, "utf8");
  const frontmatterMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatterMatch) continue;
  const frontmatter = parse(frontmatterMatch[1]) || {};
  if (isType(frontmatter.type, "Convocatoria") && frontmatter.territorio && !territorioNomeados.has(frontmatter.territorio)) {
    fail(`content/actualidade/${file}: territorio "${frontmatter.territorio}" non existe en territorios.json`);
  }
}

function isType(value, expected) {
  return String(value ?? "").trim().toLocaleLowerCase("gl") === expected.trim().toLocaleLowerCase("gl");
}

if (errors.length) {
  console.error("Validación do proxecto fallida:\n");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Configuración válida: ${centres.size} centros, ${assemblyCodes.size} asembleas.`);
