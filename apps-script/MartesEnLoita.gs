/**
 * Webhook de Google Apps Script para Martes en loita.
 *
 * 1. Crea un proxecto en script.google.com.
 * 2. Copia este ficheiro.
 * 3. Executa setupMartesEnLoita() unha vez e introduce o ID da carpeta
 *    Google Drive: accions/martes_loita/imaxes/imaxes.
 * 4. Desprega como aplicación web: executar como ti e permitir acceso a calquera.
 * 5. Configura en Cloudflare GOOGLE_APPS_SCRIPT_URL e GOOGLE_APPS_SCRIPT_SECRET.
 */

function setupMartesEnLoita() {
  var folderId = Browser.inputBox("ID da carpeta imaxes/imaxes");
  var secret = Browser.inputBox("Segredo compartido co webhook");
  PropertiesService.getScriptProperties().setProperties({
    MARTES_ROOT_FOLDER_ID: folderId,
    MARTES_WEBHOOK_SECRET: secret
  });
}

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var properties = PropertiesService.getScriptProperties();
    var expectedSecret = properties.getProperty("MARTES_WEBHOOK_SECRET");
    if (!expectedSecret || payload.secret !== expectedSecret) {
      return jsonResponse({ ok: false, error: "Non autorizado" });
    }
    if (!isTuesday(payload.data)) {
      return jsonResponse({ ok: false, error: "A data non é martes" });
    }

    var rootId = properties.getProperty("MARTES_ROOT_FOLDER_ID");
    var root = DriveApp.getFolderById(rootId);
    var dateFolders = root.getFoldersByName(payload.data);
    var dateFolder = dateFolders.hasNext() ? dateFolders.next() : root.createFolder(payload.data);
    var filename = uniqueFilename(dateFolder, payload.filename);
    var bytes = Utilities.base64Decode(payload.base64);
    var blob = Utilities.newBlob(bytes, payload.mimeType, filename);
    var file = dateFolder.createFile(blob);
    file.setDescription(JSON.stringify({
      centro: payload.centro,
      codigo: payload.centroCodigo,
      concello: payload.concello,
      comarca: payload.comarca,
      data: payload.data,
      autorizacion: payload.autorizacion === true
    }));

    return jsonResponse({ ok: true, fileId: file.getId(), folderId: dateFolder.getId() });
  } catch (error) {
    return jsonResponse({ ok: false, error: String(error.message || error) });
  }
}

function isTuesday(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) return false;
  var parts = date.split("-").map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2]).getDay() === 2;
}

function uniqueFilename(folder, filename) {
  if (!folder.getFilesByName(filename).hasNext()) return filename;
  var dot = filename.lastIndexOf(".");
  var base = dot === -1 ? filename : filename.slice(0, dot);
  var extension = dot === -1 ? "" : filename.slice(dot);
  var index = 2;
  while (folder.getFilesByName(base + " (" + index + ")" + extension).hasNext()) index++;
  return base + " (" + index + ")" + extension;
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
