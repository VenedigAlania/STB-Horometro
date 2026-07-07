const APP_ID = process.env.APPSHEET_APP_ID;
const APP_KEY = process.env.APPSHEET_ACCESS_KEY;
const APPSHEET_REGION = process.env.APPSHEET_REGION || "www.appsheet.com";
const BASE = APP_ID ? `https://${APPSHEET_REGION}/api/v2/apps/${APP_ID}/tables` : "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function response(statusCode, data) {
  return {
    statusCode,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    body: JSON.stringify(data)
  };
}

function value(row, names, fallback = "") {
  for (const name of names) {
    if (row && row[name] !== undefined && row[name] !== null) return row[name];
  }
  return fallback;
}

function isTrue(raw) {
  return ["true", "t", "yes", "y", "si", "s", "1", "activo", "active"].includes(String(raw).trim().toLowerCase());
}

async function callAppSheet(table, action, rows = []) {
  if (!APP_ID || !APP_KEY) throw new Error("Configura APPSHEET_APP_ID y APPSHEET_ACCESS_KEY.");

  const res = await fetch(`${BASE}/${encodeURIComponent(table)}/Action`, {
    method: "POST",
    headers: {
      ApplicationAccessKey: APP_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      Action: action,
      Properties: { Locale: "es-PE" },
      Rows: rows
    })
  });

  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!res.ok || data?.Error || data?.Errors) {
    const detail = data?.Message || data?.message || data?.Error || data?.Errors || data?.raw || text || `HTTP ${res.status}`;
    throw new Error(`AppSheet ${table}/${action}: ${detail}`);
  }
  return data;
}

function rowsFrom(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.Rows)) return data.Rows;
  return [];
}

const keyColumns = {
  Usuarios: "Codigo",
  Equipos: "EquipoID",
  HitosEquipo: "HitoEquipoID",
  LecturasHorometro: "LecturaID",
  CompensacionesHorometro: "CompensacionID",
  ServiciosMantenimiento: "ServicioID",
  ContactosWhatsApp: "ContactoID",
  NotificacionesWhatsApp: "NotificacionID",
  Configuracion: "Clave"
};

function normalizeUser(row) {
  if (!row) return null;
  const codigo = String(value(row, ["Codigo", "Código", "codigo", "UsuarioID", "usuarioID"], ""));
  return {
    Codigo: codigo,
    Nombre: String(value(row, ["Nombre", "nombre"], "")),
    Rol: String(value(row, ["Rol", "rol"], "TECNICO")).toUpperCase(),
    Numero: String(value(row, ["Numero", "Número", "numero", "Telefono", "Teléfono", "telefono"], "")),
    Activo: isTrue(value(row, ["Activo", "activo"], true))
  };
}

async function login(payload) {
  const usuarios = rowsFrom(await callAppSheet("Usuarios", "Find"));
  const user = String(payload.user || payload.codigo || "").trim();
  const pass = String(payload.password || payload.pw || "");
  const row = usuarios.find((item) => {
    const codigo = String(value(item, ["Codigo", "Código", "codigo", "UsuarioID"], "")).trim();
    const password = String(value(item, ["Contrasena", "Contraseña", "contrasena"], codigo));
    return user === codigo && pass === password && isTrue(value(item, ["Activo"], true));
  });
  return normalizeUser(row);
}

async function upsertRows(table, rows = []) {
  const key = keyColumns[table];
  if (!key) throw new Error(`No hay key configurada para ${table}.`);
  const cleanRows = rows.filter((row) => row && value(row, [key], "") !== "");
  if (!cleanRows.length) return { added: 0, updated: 0 };

  const existing = rowsFrom(await callAppSheet(table, "Find"));
  const existingKeys = new Set(existing.map((row) => String(value(row, [key], ""))).filter(Boolean));
  const toEdit = cleanRows.filter((row) => existingKeys.has(String(value(row, [key], ""))));
  const toAdd = cleanRows.filter((row) => !existingKeys.has(String(value(row, [key], ""))));

  if (toEdit.length) await callAppSheet(table, "Edit", toEdit);
  if (toAdd.length) await callAppSheet(table, "Add", toAdd);
  return { added: toAdd.length, updated: toEdit.length };
}

async function netlifyHandler(event) {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: corsHeaders, body: "" };
  if (event.httpMethod !== "POST") return response(405, { error: "Metodo no permitido." });

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return response(400, { error: "JSON invalido." }); }

  const { action, table, payload = {}, rows = [] } = body;
  try {
    if (action === "health") {
      return response(200, {
        ok: Boolean(APP_ID && APP_KEY),
        hasAppId: Boolean(APP_ID),
        hasAccessKey: Boolean(APP_KEY),
        region: APPSHEET_REGION,
        baseConfigured: Boolean(BASE)
      });
    }
    if (action === "testUsuarios") {
      const data = await callAppSheet("Usuarios", "Find");
      return response(200, {
        ok: true,
        rows: rowsFrom(data).length,
        sampleColumns: Object.keys(rowsFrom(data)[0] || {})
      });
    }
    if (action === "login") return response(200, await login(payload));
    if (action === "find") return response(200, await callAppSheet(table, "Find"));
    if (action === "add") return response(200, await callAppSheet(table, "Add", rows));
    if (action === "edit") return response(200, await callAppSheet(table, "Edit", rows));
    if (action === "upsert") return response(200, await upsertRows(table, rows));
    if (action === "delete") return response(200, await callAppSheet(table, "Delete", rows));
    return response(400, { error: "Accion desconocida." });
  } catch (err) {
    return response(500, { error: err.message || "Error interno." });
  }
}

async function vercelHandler(req, res) {
  if (req.method === "OPTIONS") {
    Object.entries(corsHeaders).forEach(([key, val]) => res.setHeader(key, val));
    res.status(204).end();
    return;
  }

  const event = {
    httpMethod: req.method,
    body: typeof req.body === "string" ? req.body : JSON.stringify(req.body || {})
  };
  const result = await netlifyHandler(event);
  Object.entries(result.headers || {}).forEach(([key, val]) => res.setHeader(key, val));
  res.status(result.statusCode).send(result.body);
}

module.exports = function handler(reqOrEvent, res) {
  if (res) return vercelHandler(reqOrEvent, res);
  return netlifyHandler(reqOrEvent);
};
