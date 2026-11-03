/**
 * Webhook de Google Apps Script para Martes en loita.
 *
 * 1. Crea un proxecto en script.google.com.
 * 2. Copia este ficheiro.
 * 3. Executa setupMartesEnLoita() unha vez e introduce o ID da carpeta
 *    Google Drive: accions/martes_loita/imaxes/imaxes.
 * 4. Desprega como aplicación web: executar como ti e permitir acceso a calquera.
 * 5. Configura en Cloudflare GOOGLE_APPS_SCRIPT_URL e GOOGLE_APPS_SCRIPT_SECRET.
 *
 * Ademais de gardar as fotos que chegan desde a web, atende as peticións da
 * páxina /xestion/stories (a través de /api/martes-stories), que levan un
 * campo "action": listDays, listDay, getFile e saveStory.
 * Despois de cambiar este ficheiro hai que publicar unha nova versión do
 * despregue existente (Despregar > Xestionar despregues > Editar > Nova
 * versión) para que a URL siga sendo a mesma.
 */

var STORIES_FOLDER = "stories_individuais_editorial";
var DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

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
    if (payload.action) {
      return jsonResponse(handleStoriesAction(payload, properties.getProperty("MARTES_ROOT_FOLDER_ID")));
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

// ---------------------------------------------------------------------------
// Stories (/xestion/stories)
// ---------------------------------------------------------------------------

function handleStoriesAction(payload, rootId) {
  var root = DriveApp.getFolderById(rootId);
  switch (payload.action) {
    case "listDays":
      return { ok: true, days: listDays(root) };
    case "listDay":
      return listDay(root, payload.data);
    case "getFile":
      return getFile(rootId, payload.fileId);
    case "saveStory":
      return saveStory(root, payload);
    default:
      return { ok: false, error: "Acción descoñecida" };
  }
}

function isPhoto(file) {
  return String(file.getMimeType()).indexOf("image/") === 0;
}

function dayFolder(root, date) {
  if (!DATE_PATTERN.test(date || "")) throw new Error("Data non válida");
  var folders = root.getFoldersByName(date);
  if (!folders.hasNext()) throw new Error("Non hai fotos dese día");
  return folders.next();
}

function listDays(root) {
  var days = [];
  var folders = root.getFolders();
  while (folders.hasNext()) {
    var folder = folders.next();
    var name = folder.getName();
    if (!DATE_PATTERN.test(name)) continue;
    var photos = 0;
    var files = folder.getFiles();
    while (files.hasNext()) {
      if (isPhoto(files.next())) photos++;
    }
    var stories = 0;
    var storyFolders = folder.getFoldersByName(STORIES_FOLDER);
    if (storyFolders.hasNext()) {
      var storyFiles = storyFolders.next().getFiles();
      while (storyFiles.hasNext()) {
        storyFiles.next();
        stories++;
      }
    }
    days.push({ data: name, fotos: photos, stories: stories });
  }
  days.sort(function (a, b) { return a.data < b.data ? 1 : -1; });
  return days;
}

function listDay(root, date) {
  var folder = dayFolder(root, date);
  var photos = [];
  var files = folder.getFiles();
  while (files.hasNext()) {
    var file = files.next();
    if (!isPhoto(file)) continue;
    photos.push({
      id: file.getId(),
      nome: file.getName(),
      mimeType: file.getMimeType(),
      tamano: file.getSize(),
      creado: file.getDateCreated().toISOString()
    });
  }
  photos.sort(function (a, b) { return a.nome.localeCompare(b.nome, "gl"); });

  var stories = [];
  var storyFolders = folder.getFoldersByName(STORIES_FOLDER);
  if (storyFolders.hasNext()) {
    var storyFiles = storyFolders.next().getFiles();
    while (storyFiles.hasNext()) {
      var story = storyFiles.next();
      var source = "";
      try {
        source = JSON.parse(story.getDescription() || "{}").orixe || "";
      } catch (error) {
        source = "";
      }
      stories.push({ id: story.getId(), nome: story.getName(), orixe: source, creado: story.getDateCreated().toISOString() });
    }
  }
  return { ok: true, data: date, fotos: photos, stories: stories };
}

// Só se serven ficheiros que estean dentro da carpeta raíz de Martes en loita
// (foto: raíz/data/foto; story: raíz/data/stories_individuais_editorial/story).
function isInsideRoot(file, rootId) {
  var level = [file];
  for (var depth = 0; depth < 3; depth++) {
    var next = [];
    for (var i = 0; i < level.length; i++) {
      var parents = level[i].getParents();
      while (parents.hasNext()) {
        var parent = parents.next();
        if (parent.getId() === rootId) return true;
        next.push(parent);
      }
    }
    level = next;
  }
  return false;
}

function getFile(rootId, fileId) {
  if (!fileId) throw new Error("Falta o ficheiro");
  var file = DriveApp.getFileById(fileId);
  if (!isInsideRoot(file, rootId)) return { ok: false, error: "Ficheiro fóra de Martes en loita" };
  var blob = file.getBlob();
  return {
    ok: true,
    nome: file.getName(),
    mimeType: blob.getContentType(),
    base64: Utilities.base64Encode(blob.getBytes())
  };
}

function saveStory(root, payload) {
  var folder = dayFolder(root, payload.data);
  var source = DriveApp.getFileById(payload.orixe);
  var sourceParents = source.getParents();
  if (!sourceParents.hasNext() || sourceParents.next().getId() !== folder.getId()) {
    return { ok: false, error: "A foto non pertence a ese día" };
  }
  var name = String(payload.nome || "").replace(/[\\/:*?"<>|]+/g, "").trim();
  if (!/\.jpg$/i.test(name)) return { ok: false, error: "Nome de story non válido" };

  var storyFolders = folder.getFoldersByName(STORIES_FOLDER);
  var storyFolder = storyFolders.hasNext() ? storyFolders.next() : folder.createFolder(STORIES_FOLDER);

  // Se xa había unha story desta mesma foto, substitúese (vai ao lixo de Drive).
  var existing = storyFolder.getFiles();
  while (existing.hasNext()) {
    var old = existing.next();
    var oldSource = "";
    try {
      oldSource = JSON.parse(old.getDescription() || "{}").orixe || "";
    } catch (error) {
      oldSource = "";
    }
    if (oldSource === payload.orixe || old.getName() === name) old.setTrashed(true);
  }

  var bytes = Utilities.base64Decode(payload.base64);
  var file = storyFolder.createFile(Utilities.newBlob(bytes, "image/jpeg", name));
  file.setDescription(JSON.stringify({ orixe: payload.orixe, xerada: new Date().toISOString(), por: "web /xestion/stories" }));
  return { ok: true, id: file.getId(), nome: file.getName() };
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
