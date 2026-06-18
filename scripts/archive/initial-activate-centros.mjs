import { readFile, writeFile } from "node:fs/promises";

// Script histórico empregado para crear a primeira listaxe de asembleas.
// Non forma parte do mantemento ordinario. Conservámolo para trazabilidade da
// importación inicial; as actualizacións futuras fanse desde Decap ou mediante
// un proceso de datos revisado explicitamente.

const source = `
CEIP Bragade|Oza-Cesuras
CEIP Concepción Arenal|A Coruña
CEIP Ramón de la Sagra|A Coruña
CEIP Ría do Burgo|Culleredo
CIFP Universidade Laboral|Culleredo
IES Afonso X O Sabio|Cambre
IES Agra do Orzán|A Coruña
IES Nº 1|Ribeira
IES Porto do Son|Porto do Son
CEP de Ventín|Ames
CPI de Bembibre|Val do Dubra
IES Antonio Fraguas|Santiago de Compostela
IES Brión|Brión
IES de Cacheiras|Teo
IES de Sar|Santiago de Compostela
IES Manuel García Barros|A Estrada
IES Maruxa Mallo|Ordes
IES O Carril|Vilagarcía de Arousa
IES Xulián Magariños|Negreira
CEIP Plurilingüe A Cristina|Carballo
CEIP Bergantiños|Carballo
CEIP de Bormoio-Agualada|Coristanco
CEIP de Caión|A Laracha
CEIP Plurilingüe de Nétoma-Razo|Carballo
CEIP Ramón de Artaza|Muros
CPI Alcalde Xosé Pichel|Coristanco
CPI As Revoltas|Cabana de Bergantiños
CRA Ponte da Pedra|Carballo
IES As Insuas|Muros
IES Agra de Leborís|A Laracha
IES Alfredo Brañas|Carballo
IES Eduardo Pondal|Ponteceso
IES Fernando Blanco|Cee
IES Fontexería|Muros
IES Lamas de Castelo|Carnota
IES Monte Neme|Carballo
IES Isidro Parga Pondal|Carballo
CEIP Maciñeira|Neda
CEIP Ponzos|Ferrol
CEIP San Xoán de Filgueira|Ferrol
IES Chamoso Lamas|O Carballiño
IES García-Barbón|Verín
IES Gonzalo Torrente Ballester|Pontevedra
IES Luis Seoane|Pontevedra
CEIP A Paz Tintureira|Vigo
CEIP Canicouva|Vigo
CEIP Carballal-Cabral|Vigo
CEIP Castelao|Vigo
CEIP Castrillón-Coiro|Cangas
CEIP Celso Emilio Ferreiro|Vigo
CEIP de Chans-Bembrive|Vigo
CEIP Eduardo Pondal|Vigo
CEIP Javier Sensat|Vigo
CEIP O Sello|Vigo
CEIP Reibón|Moaña
CEIP Ría de Vigo|Vigo
CEIP San Roque|Cangas
CEP Fleming|Vigo
CIFP Manuel Antonio|Vigo
CIFP Valentín Paz Andrade|Vigo
CPI do Toural|Vilaboa
CPI Manuel Suárez Marquier|O Rosal
EEI Cristo da Vitoria|Vigo
EOI Vigo|Vigo
EOI Vilagarcía|Vilagarcía de Arousa
IES A Guía|Vigo
IES A Paralaia|Moaña
IES Alexandre Bóveda|Vigo
IES Álvaro Cunqueiro|Vigo
IES As Neves|As Neves
IES Auga da Laxe|Gondomar
IES Carlos Casares|Vigo
IES Castelao|Vigo
IES de Beade|Vigo
IES de Chapela|Redondela
IES de Coruxo|Vigo
IES de Mos|Mos
IES de Rodeira|Cangas
IES de Soutomaior|Soutomaior
IES de Teis|Vigo
IES do Barral|Ponteareas
IES do Castro|Vigo
IES Escolas Proval|Nigrán
IES Johan Carballeira|Bueu
IES Monte Carrasco|Cangas
IES Pazo da Mercé|As Neves
IES Pedra da Auga|Ponteareas
IES Pedras Rubias|Salceda de Caselas
IES Pedro Floriani|Redondela
IES Pino Manso|O Porriño
IES Politécnico|Vigo
IES Primeiro de Marzo|Baiona
IES Ribeira do Louro|O Porriño
IES Ricardo Mella|Vigo
IES Rosais 2|Vigo
IES República Oriental do Uruguai|Vigo
IES Salvaterra de Miño|Salvaterra de Miño
IES San Paio|Tui
IES San Tomé de Freixeiro|Vigo
IES Santa Irene|Vigo
IES Val do Tea|Ponteareas
IES Val Miñor|Nigrán
IES Valadares|Vigo
`;

const aliases = {
  "ceip bragade": "CEIP Plurilingüe de Bragade",
  "cep de ventin": "CEP de Ventín",
  "ceip canicouva": "CEIP Plurilingüe da Canicouva",
  "ceip carballal cabral": "CEIP Plurilingüe Carballal-Cabral",
  "ceip castelao": "CEIP Alfonso D. Rodríguez Castelao",
  "ceip celso emilio ferreiro": "CEP Celso Emilio Ferreiro",
  "ceip eduardo pondal": "CEIP Eduardo Pondal",
  "ceip javier sensat": "CEIP Plurilingüe Javier Sensat",
  "ceip canicouva": "CEIP A Canicouva",
  "cep fleming": "CEP Dr. Fleming",
  "eei cristo da vitoria": "EEI Cristo da Victoria",
  "ies porto do son": "IES de Porto do Son",
  "eoi vigo": "EOI de Vigo",
  "eoi vilagarcia": "EOI de Vilagarcía",
  "ies politécnico": "IES Politécnico de Vigo",
  "ies primeiro de marzo": "IES Primeiro de Marzo",
  "ies ribeira do louro": "IES Ribeira do Louro",
};

const normalize = (value) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase("gl")
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

const entries = source.trim().split("\n").map((line) => {
  const [nome, concello] = line.split("|");
  return { nome, concello };
});

const path = "src/data/centros.json";
const data = JSON.parse(await readFile(path, "utf8"));
let existingAsembleas = new Map();
try {
  const existing = JSON.parse(await readFile("src/data/asembleas.json", "utf8"));
  existingAsembleas = new Map(existing.asembleas.map((asemblea) => [asemblea.codigo, asemblea]));
} catch {
  // A primeira activación non ten rexistros anteriores.
}
const unmatched = [];
const ambiguous = [];
const activated = [];

for (const entry of entries) {
  const requestedName = aliases[normalize(entry.nome)] || entry.nome;
  const normalizedRequested = normalize(requestedName);
  const normalizedTown = normalize(entry.concello);
  let candidates = data.centros.filter((centro) =>
    normalize(centro.concello) === normalizedTown
    && (
      normalize(centro.nome) === normalizedRequested
      || normalize(centro.nome).includes(normalizedRequested)
      || normalizedRequested.includes(normalize(centro.nome))
    )
  );

  if (candidates.length === 0) {
    const significant = normalizedRequested.split(" ").filter((word) => word.length > 3);
    candidates = data.centros.filter((centro) => {
      const name = normalize(centro.nome);
      return normalize(centro.concello) === normalizedTown
        && significant.every((word) => name.includes(word));
    });
  }

  if (candidates.length === 1) {
    activated.push(candidates[0]);
  } else if (candidates.length === 0) {
    unmatched.push(entry);
  } else {
    ambiguous.push({ entry, candidates: candidates.map(({ codigo, nome, concello }) => ({ codigo, nome, concello })) });
  }
}

const asembleas = activated
  .filter((centro, index, array) => array.findIndex((item) => item.codigo === centro.codigo) === index)
  .map(({ codigo, nome, concello }) => {
    const previous = existingAsembleas.get(codigo);
    return {
    codigo,
    nome,
    concello,
    estado: previous?.estado || "activa",
    ...(previous?.contacto ? { contacto: previous.contacto } : {}),
  };
  })
  .sort((a, b) => a.nome.localeCompare(b.nome, "gl"));
await writeFile("src/data/asembleas.json", `${JSON.stringify({ asembleas }, null, 2)}\n`);
console.log(`Asembleas activadas: ${activated.length}`);
console.log(`Sen coincidencia: ${unmatched.length}`);
if (unmatched.length) console.log(unmatched);
console.log(`Ambiguas: ${ambiguous.length}`);
if (ambiguous.length) console.log(JSON.stringify(ambiguous, null, 2));
