# Paso 2 - AppSheet solo como base de datos y API

En este proyecto AppSheet no sera la app visual. La app visual sera `index.html` publicado en Netlify o Vercel.

AppSheet se usara solo para:

- conectar con Google Sheets;
- exponer API para leer y guardar datos;
- proteger el `ApplicationAccessKey` desde backend;
- permitir operaciones `Find`, `Add`, `Edit` y `Delete` sobre las tablas.

No necesitas crear vistas, UX, dashboards, forms ni slices en AppSheet.

## 1. Crear AppSheet desde Google Sheets

1. Entra a AppSheet.
2. Crea una app nueva desde el Google Sheets `Control Horometros STB`.
3. Agrega todas las hojas como tablas.
4. No importa el diseño visual de AppSheet porque no se usara como app.

Tablas esperadas:

1. `Usuarios`
2. `Equipos`
3. `HitosEquipo`
4. `LecturasHorometro`
5. `CompensacionesHorometro`
6. `ServiciosMantenimiento`
7. `ContactosWhatsApp`
8. `NotificacionesWhatsApp`
9. `Configuracion`

## 2. Revisar keys de tablas

En AppSheet entra a `Data > Columns` y confirma la key de cada tabla.

| Tabla | Key |
|---|---|
| `Usuarios` | `Codigo` |
| `Equipos` | `EquipoID` |
| `HitosEquipo` | `HitoEquipoID` |
| `LecturasHorometro` | `LecturaID` |
| `CompensacionesHorometro` | `CompensacionID` |
| `ServiciosMantenimiento` | `ServicioID` |
| `ContactosWhatsApp` | `ContactoID` |
| `NotificacionesWhatsApp` | `NotificacionID` |
| `Configuracion` | `Clave` |

## 3. Revisar columnas de Usuarios

Tabla: `Usuarios`

Columnas exactas:

```text
Codigo
Nombre
Rol
Contrasena
Numero
Activo
```

Roles permitidos:

```text
TECNICO
ADMIN
SUPERVISOR
```

Regla del login web:

- El usuario escribe `Codigo`.
- La contrasena inicial puede ser igual al `Codigo`.
- La web valida contra tabla `Usuarios`.
- `Activo` debe estar en `TRUE`.

## 4. Habilitar API de AppSheet

En AppSheet:

1. Ve a `Manage > Integrations`.
2. Activa `Enable API access`.
3. Copia:
   - `App ID`
   - `Application Access Key`

Esos valores no van en el navegador. Se guardan como variables de entorno en Netlify o Vercel.

## 5. Variables de entorno

En Netlify o Vercel configura:

```text
APPSHEET_APP_ID=tu_app_id
APPSHEET_ACCESS_KEY=tu_access_key
APPSHEET_REGION=www.appsheet.com
```

`APPSHEET_REGION` es opcional. Si tu AppSheet usa otro dominio regional, colocalo ahi.

## 6. Endpoint backend incluido

El proyecto ya incluye:

```text
api/appsheet.js
netlify/functions/appsheet.js
```

Este backend recibe llamadas de la web y llama a AppSheet sin exponer la clave en el navegador.

Endpoint Netlify:

```text
/.netlify/functions/appsheet
```

Endpoint Vercel:

```text
/api/appsheet
```

La web detecta automaticamente cual usar.

## 7. Acciones API soportadas

El backend acepta estas acciones:

### Login

Valida `Codigo`, `Contrasena` y `Activo`.

Request:

```json
{
  "action": "login",
  "payload": {
    "user": "12345678",
    "password": "12345678"
  }
}
```

Response esperado:

```json
{
  "Codigo": "12345678",
  "Nombre": "Administrador STB",
  "Rol": "ADMIN",
  "Numero": "+51999999999",
  "Activo": true
}
```

### Buscar filas

```json
{
  "action": "find",
  "table": "Equipos"
}
```

### Agregar filas

```json
{
  "action": "add",
  "table": "LecturasHorometro",
  "rows": [
    {
      "LecturaID": "L-001",
      "FechaHora": "2026-07-07T08:00:00",
      "Fecha": "2026-07-07",
      "UsuarioID": "12345678",
      "UsuarioNombre": "Administrador STB",
      "EquipoID": "CO01",
      "DescripcionEquipo": "Compresor IR1",
      "HorometroActual": 19000,
      "HorometroAjustado": 19000,
      "Observacion": "Registro normal"
    }
  ]
}
```

### Editar filas

```json
{
  "action": "edit",
  "table": "Equipos",
  "rows": [
    {
      "EquipoID": "CO01",
      "DescripcionEquipo": "Compresor IR1",
      "CicloBaseHorometro": 32000
    }
  ]
}
```

### Eliminar filas

```json
{
  "action": "delete",
  "table": "ContactosWhatsApp",
  "rows": [
    {
      "ContactoID": "W001"
    }
  ]
}
```

## 8. Que logica queda en la web

La web `index.html` calcula:

- horometro actual;
- consumo diario promedio;
- consumo mensual promedio;
- timeline de hitos;
- proximo mantenimiento;
- fecha pronostico;
- dias faltantes;
- estado `NORMAL`, `ALERTA`, `PELIGRO`;
- permisos visuales por rol;
- edicion solo del ultimo registro para tecnico;
- admin/supervisor con permiso para editar historial;
- mensajes pendientes de WhatsApp.

AppSheet solo guarda y devuelve datos.

## 9. Sincronizacion esperada por tabla

### Usuarios

La web usa:

- `find` para login.
- `add/edit` para administrar usuarios.

### Equipos

La web usa:

- `find` para cargar equipos.
- `add/edit` desde Administrador.
- `edit` para cambiar `FactorCompensacion` o `CicloBaseHorometro`.

### HitosEquipo

La web usa:

- `find` para leer hitos por equipo.
- `add/edit/delete` si luego quieres administrar hitos en pantalla.

### LecturasHorometro

La web usa:

- `find` para historial y dashboard.
- `add` para registros nuevos.
- `edit` para editar ultimo registro o cambios admin/supervisor.

### CompensacionesHorometro

La web usa:

- `add` cuando se cambia horometro fisico.

### ServiciosMantenimiento

La web usa:

- `add` cuando se registra servicio.
- `edit` si se corrige servicio.

### ContactosWhatsApp

La web usa:

- `find`, `add`, `edit`, `delete`.

### NotificacionesWhatsApp

La web usa:

- `add` para registrar aviso.
- `edit` para marcar enviado.

### Configuracion

La web usa:

- `find` para parametros generales como dias 30, 10 y 7.

## 10. Prueba rapida de API

Cuando publiques en Netlify, prueba login con:

```bash
curl -X POST https://TU-SITIO.netlify.app/.netlify/functions/appsheet \
  -H "Content-Type: application/json" \
  -d "{\"action\":\"login\",\"payload\":{\"user\":\"12345678\",\"password\":\"12345678\"}}"
```

Cuando publiques en Vercel:

```bash
curl -X POST https://TU-SITIO.vercel.app/api/appsheet \
  -H "Content-Type: application/json" \
  -d "{\"action\":\"login\",\"payload\":{\"user\":\"12345678\",\"password\":\"12345678\"}}"
```

## 11. Checklist final del Paso 2

- AppSheet esta conectado al Google Sheets.
- Todas las tablas existen en AppSheet.
- Cada tabla tiene su key correcta.
- API access esta habilitado.
- Tienes `App ID`.
- Tienes `Application Access Key`.
- Variables de entorno estan configuradas en Netlify o Vercel.
- La API responde a `login`.
- La API responde a `find` sobre `Equipos`.

## 12. Paso 3

El Paso 3 sera ajustar la web para consumir AppSheet API en vivo:

- cargar datos reales al iniciar sesion;
- guardar registros con `add`;
- editar historial con `edit`;
- administrar equipos, usuarios y contactos;
- registrar notificaciones WhatsApp.
