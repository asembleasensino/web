import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import Papa from "papaparse";

const input = process.argv[2];
if (!input) {
  console.error("Uso: npm run import:centros -- ruta/centros.csv");
  process.exit(1);
}

const source = await readFile(resolve(input), "utf8");
const { data, errors } = Papa.parse(source, {
  header: true,
  skipEmptyLines: true,
  transformHeader: (header) => header.trim().toLocaleLowerCase("gl"),
});

if (errors.length) {
  console.error(errors.slice(0, 5));
  process.exit(1);
}

const aliases = {
  codigo: ["codigo", "código", "cod", "codcentro"],
  nome: ["nome", "nombre", "centro", "denominacion", "denominación"],
  concello: ["concello", "municipio"],
  comarca: ["comarca"],
  provincia: ["provincia"],
  latitude: ["latitude", "latitud", "lat", "coordenada_x"],
  longitude: ["longitude", "longitud", "lon", "lng", "coordenada_y"],
  tipo: ["tipo", "tipo de centro", "tipocentro", "tipo_centro"],
};

function value(row, keys) {
  const key = keys.find((candidate) => row[candidate] != null && row[candidate] !== "");
  return key ? String(row[key]).trim() : "";
}

function normalizeCoordinates(rawX, rawY) {
  const x = Number(rawX.replace(",", "."));
  const y = Number(rawY.replace(",", "."));
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  if (x >= 41 && x <= 44 && y >= -10 && y <= -6) return { latitude: x, longitude: y };
  if (y >= 41 && y <= 44 && x >= -10 && x <= -6) return { latitude: y, longitude: x };
  return null;
}

function pointInRing([x, y], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersects = yi > y !== yj > y
      && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function pointInPolygon(point, polygon) {
  if (!pointInRing(point, polygon[0])) return false;
  return !polygon.slice(1).some((hole) => pointInRing(point, hole));
}

function featureContains(feature, point) {
  const { geometry } = feature;
  if (geometry.type === "Polygon") return pointInPolygon(point, geometry.coordinates);
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.some((polygon) => pointInPolygon(point, polygon));
  }
  return false;
}

function geometryPoints(geometry) {
  if (geometry.type === "Polygon") return geometry.coordinates.flat();
  if (geometry.type === "MultiPolygon") return geometry.coordinates.flat(2);
  return [];
}

function nearestFeature(features, point) {
  let nearest = null;
  let nearestDistance = Infinity;
  for (const feature of features) {
    if (!feature.properties?.COMARCA) continue;
    for (const [x, y] of geometryPoints(feature.geometry)) {
      const distance = (x - point[0]) ** 2 + (y - point[1]) ** 2;
      if (distance < nearestDistance) {
        nearest = feature;
        nearestDistance = distance;
      }
    }
  }
  return nearest;
}

const coordinateOverrides = {
  // O CSV de orixe contén 0,0 para este centro. Coordenadas contrastadas co edificio en OpenStreetMap.
  "15005397": { latitude: 43.355647, longitude: -8.4058034 },
};

const comarcaOverrides = {
  // Cerdedo-Cotobade naceu da fusión de dous concellos situados en comarcas diferentes.
  // O GeoJSON histórico deixa un pequeno oco nestes centros.
  "36001343": "Tabeirós-Terra De Montes",
  "36001550": "Pontevedra",
  "36001665": "Pontevedra",
  "36024197": "Pontevedra",
};

const comarcasPath = resolve("public/data/comarcas.geojson");
const comarcas = JSON.parse(await readFile(comarcasPath, "utf8"));
let invertedCoordinates = 0;
let invalidCoordinates = 0;
let missingComarca = 0;

const centros = data.map((row) => {
  const rawX = value(row, aliases.latitude);
  const rawY = value(row, aliases.longitude);
  const codigo = value(row, aliases.codigo);
  const coordinates = normalizeCoordinates(rawX, rawY) || coordinateOverrides[codigo];
  if (!coordinates) {
    invalidCoordinates += 1;
    return null;
  }
  if (Number(rawX.replace(",", ".")) < 0) invertedCoordinates += 1;

  const nome = value(row, aliases.nome);
  const sourceComarca = value(row, aliases.comarca);
  let comarcaFeature = sourceComarca
    ? null
    : comarcas.features.find((feature) =>
        featureContains(feature, [coordinates.longitude, coordinates.latitude])
      );
  if (!sourceComarca && !comarcaFeature) {
    comarcaFeature = nearestFeature(
      comarcas.features,
      [coordinates.longitude, coordinates.latitude]
    );
  }
  const comarca = comarcaOverrides[codigo]
    || sourceComarca
    || comarcaFeature?.properties?.COMARCA
    || "";
  if (!comarca) missingComarca += 1;
  return {
    codigo,
    nome,
    concello: value(row, aliases.concello),
    comarca,
    provincia: value(row, aliases.provincia),
    ...coordinates,
    tipo: value(row, aliases.tipo),
  };
}).filter((centro) => centro?.codigo && centro.nome);

const output = resolve("src/data/centros.json");
await writeFile(output, `${JSON.stringify({ centros }, null, 2)}\n`);
console.log(`Importados ${centros.length} centros en ${output}`);
console.log(`Coordenadas invertidas corrixidas: ${invertedCoordinates}`);
console.log(`Filas descartadas por coordenadas inválidas: ${invalidCoordinates}`);
console.log(`Centros sen comarca asignada: ${missingComarca}`);
