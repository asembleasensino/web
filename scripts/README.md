# Scripts

## Operativos

### `validate-project.mjs`

Comproba coherencia entre configuración, Decap, navegación, catálogo de centros e asembleas. Execútase desde `npm run validate` e no CI.

### `import-centros.mjs`

Substitúe `src/data/centros.json` desde un CSV oficial:

```sh
npm run import:centros -- /ruta/centros.csv
```

Despois da importación:

1. revisa o resumo da consola;
2. executa `npm run validate`;
3. comproba no mapa centros de varias provincias;
4. revisa códigos das asembleas existentes;
5. non inclúas no commit o CSV fonte se contén datos non publicados.

## Arquivo histórico

`archive/initial-activate-centros.mjs` documenta a activación inicial de centros. Non debe utilizarse para o mantemento ordinario porque contén unha fotografía histórica e sobrescribe `asembleas.json`.
