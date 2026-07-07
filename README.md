# Control de Horometros AppSheet v2

Carpeta independiente para el control de horometros solicitado. No modifica la app existente del monitor predictivo.

## Archivos

- `index.html`: prototipo web listo para Netlify o Vercel.
- `api/appsheet.js`: proxy para Vercel y tambien reutilizable por Netlify.
- `netlify/functions/appsheet.js`: funcion Netlify que llama al proxy.
- `netlify.toml`: configuracion Netlify.
- `vercel.json`: configuracion Vercel.
- `google-sheets/*.csv`: tablas base para importar a Google Sheets y conectar con AppSheet.
- `PASO_1_GOOGLE_SHEETS.md`: guia para estructurar el Google Sheets desde cero.
- `PASO_2_APPSHEET.md`: guia para usar AppSheet solo como base de datos/API sobre Google Sheets.

## Login inicial

- Usuario: `12345678`
- Contrasena: `12345678`

Los datos del prototipo se guardan en `localStorage`. Para limpiar la demo, borra el almacenamiento del navegador o ejecuta en consola:

```js
localStorage.removeItem("horometrosV2")
```

## Variables de entorno

Configura estas variables en Netlify o Vercel:

- `APPSHEET_APP_ID`
- `APPSHEET_ACCESS_KEY`
- `APPSHEET_REGION`: opcional. Por defecto usa `www.appsheet.com`.

## Estructura Google Sheets / AppSheet

Importa cada CSV de `google-sheets` como hoja con el mismo nombre. En AppSheet, usa esos nombres de tabla.

### Usuarios

Key: `Codigo`

| Columna | Tipo AppSheet | Nota |
|---|---|---|
| `Codigo` | Text | Key. Codigo de 8 digitos |
| `Nombre` | Name | Nombre mostrado en registros |
| `Rol` | Enum | `ADMIN`, `TECNICO`, `SUPERVISOR` |
| `Contrasena` | Text | Inicialmente igual que `Codigo` |
| `Numero` | Phone | Contacto del usuario |
| `Activo` | Yes/No | Control de acceso |

### Equipos

Key: `EquipoID`

| Columna | Tipo AppSheet | Nota |
|---|---|---|
| `EquipoID` | Text | Codigo, ejemplo `CO01` |
| `DescripcionEquipo` | Text | Ejemplo `Compresor IR1` |
| `Area` | Text | Area o familia |
| `Marca` | Text | Opcional |
| `Modelo` | Text | Opcional |
| `Serie` | Text | Opcional |
| `HorometroBase` | Decimal | Valor inicial |
| `FechaBase` | Date | Fecha inicial |
| `FactorCompensacion` | Decimal | Diferencia por cambio de horometro |
| `CicloBaseHorometro` | Decimal | Punto desde donde reinician los hitos |
| `HitosHoras` | Text | Ejemplo `2000,4000,8000,16000,32000` |
| `PromedioDiarioManual` | Decimal | Opcional |
| `UsarPromedioManual` | Yes/No | Si usa promedio manual |
| `Activo` | Yes/No | Ocultar equipos retirados |
| `Notas` | LongText | Comentarios |

Columnas virtuales recomendadas:

```appsheet
UltimaLectura
=MAXROW("LecturasHorometro", "FechaHora", [EquipoID] = [_THISROW].[EquipoID])
```

```appsheet
HorometroActual
=IF(ISBLANK([UltimaLectura]), [HorometroBase], [UltimaLectura].[HorometroAjustado])
```

```appsheet
FechaUltimaLectura
=IF(ISBLANK([UltimaLectura]), [FechaBase], [UltimaLectura].[Fecha])
```

```appsheet
PromedioDiario
=IF(
  [UsarPromedioManual],
  [PromedioDiarioManual],
  IF(
    COUNT(SELECT(LecturasHorometro[LecturaID], [EquipoID] = [_THISROW].[EquipoID])) < 2,
    0,
    (
      MAX(SELECT(LecturasHorometro[HorometroAjustado], [EquipoID] = [_THISROW].[EquipoID]))
      - MIN(SELECT(LecturasHorometro[HorometroAjustado], [EquipoID] = [_THISROW].[EquipoID]))
    )
    /
    MAX(
      LIST(1)
      + LIST(
        TOTALHOURS(
          MAX(SELECT(LecturasHorometro[FechaHora], [EquipoID] = [_THISROW].[EquipoID]))
          - MIN(SELECT(LecturasHorometro[FechaHora], [EquipoID] = [_THISROW].[EquipoID]))
        ) / 24
      )
    )
  )
)
```

Para el plan fijo 2000, 4000, 8000, 16000 y 32000 horas:

```appsheet
PosicionCiclo
=MOD([HorometroActual], 32000)
```

```appsheet
SiguienteHitoHoras
=IFS(
  [PosicionCiclo] < 2000, 2000,
  [PosicionCiclo] < 4000, 4000,
  [PosicionCiclo] < 8000, 8000,
  [PosicionCiclo] < 16000, 16000,
  TRUE, 32000
)
```

```appsheet
ProximoMantenimientoHorometro
=[HorometroActual] + ([SiguienteHitoHoras] - [PosicionCiclo])
```

```appsheet
HorasFaltantes
=[ProximoMantenimientoHorometro] - [HorometroActual]
```

```appsheet
DiasFaltantes
=IF([PromedioDiario] <= 0, "", CEILING([HorasFaltantes] / [PromedioDiario]))
```

```appsheet
FechaPronosticoMantenimiento
=IF(ISBLANK([DiasFaltantes]), "", TODAY() + [DiasFaltantes])
```

```appsheet
EstadoMantenimiento
=IFS(
  ISBLANK([DiasFaltantes]), "SIN DATOS",
  [DiasFaltantes] <= 10, "PELIGRO",
  [DiasFaltantes] <= 30, "ALERTA",
  TRUE, "NORMAL"
)
```

### HitosEquipo

Recomendado como tabla formal para editar hitos por maquina y manejar hitos repetitivos.

| Columna | Tipo AppSheet | Nota |
|---|---|---|
| `HitoEquipoID` | Text | Key |
| `EquipoID` | Ref | Ref a `Equipos` |
| `Horas` | Number | 2000, 4000, etc. |
| `Nombre` | Text | Servicio 2000 h |
| `Orden` | Number | Orden visual |
| `Activo` | Yes/No | Control |

Regla de operacion:

- `2000` se activa en 2000, 4000, 6000, 8000...
- `4000` se activa en 4000, 8000, 12000...
- En 4000 se atienden ambos: `2000` y `4000`.
El campo `Equipos[CicloBaseHorometro]` permite reiniciar el conteo cuando se completa el mantenimiento mayor.

### LecturasHorometro

Key: `LecturaID`

| Columna | Tipo AppSheet | Nota |
|---|---|---|
| `LecturaID` | Text | Initial value: `UNIQUEID()` |
| `FechaHora` | DateTime | Initial value: `NOW()` |
| `Fecha` | Date | Initial value: `TODAY()` |
| `UsuarioID` | Ref | Initial value: usuario login |
| `UsuarioNombre` | Text | Nombre del login |
| `EquipoID` | Ref | Ref a `Equipos` |
| `DescripcionEquipo` | Text | App formula: `[EquipoID].[DescripcionEquipo]` |
| `HorometroActual` | Decimal | Lectura fisica ingresada |
| `HorometroAjustado` | Decimal | App formula: `[HorometroActual] + [EquipoID].[FactorCompensacion]` |
| `Observacion` | LongText | Campo libre |
| `EsUltimo` | Yes/No virtual | Si es ultimo por maquina |
| `EditadoPor` | Text | Para auditoria |
| `EditadoEn` | DateTime | Para auditoria |
| `EditNote` | LongText | Motivo de edicion |

Virtual `EsUltimo`:

```appsheet
[_THISROW].[LecturaID]
=
MAXROW(
  "LecturasHorometro",
  "FechaHora",
  [EquipoID] = [_THISROW].[EquipoID]
)
```

Editable solo ultimo registro, excepto administrador:

```appsheet
OR(
  USERROLE() = "Admin",
  [LecturaID] = MAXROW("LecturasHorometro", "FechaHora", [EquipoID] = [_THISROW].[EquipoID])
)
```

Validacion para evitar que el horometro baje:

```appsheet
OR(
  USERROLE() = "Admin",
  [HorometroAjustado]
  >=
  MAX(
    SELECT(
      LecturasHorometro[HorometroAjustado],
      AND(
        [EquipoID] = [_THISROW].[EquipoID],
        [LecturaID] <> [_THISROW].[LecturaID]
      )
    )
  )
)
```

### CompensacionesHorometro

Key: `CompensacionID`

| Columna | Tipo AppSheet | Nota |
|---|---|---|
| `CompensacionID` | Text | `UNIQUEID()` |
| `Fecha` | Date | Fecha del cambio |
| `EquipoID` | Ref | Equipo afectado |
| `HorometroAnterior` | Decimal | Ultima lectura acumulada real |
| `HorometroNuevo` | Decimal | Nuevo horometro fisico |
| `FactorCompensacion` | Decimal | `[HorometroAnterior] - [HorometroNuevo]` |
| `Motivo` | LongText | Motivo del cambio |
| `UsuarioID` | Ref | Admin que realizo ajuste |

Despues de registrar una compensacion, actualiza `Equipos[FactorCompensacion]` con el nuevo factor.

### ContactosWhatsApp

Key: `ContactoID`

| Columna | Tipo AppSheet | Nota |
|---|---|---|
| `ContactoID` | Text | `UNIQUEID()` |
| `Nombre` | Name | Persona o grupo |
| `NumeroWhatsApp` | Phone | Formato internacional, ejemplo `+51999999999` |
| `RecibeAlerta30` | Yes/No | Mensaje 30 dias |
| `RecibePeligro10` | Yes/No | Mensaje 10 dias |
| `RecibePeligro7` | Yes/No | Mensaje 7 dias |
| `Activo` | Yes/No | Si recibe mensajes |

### NotificacionesWhatsApp

Key: `NotificacionID`

| Columna | Tipo AppSheet | Nota |
|---|---|---|
| `NotificacionID` | Text | `UNIQUEID()` |
| `FechaHora` | DateTime | Momento de generacion |
| `EquipoID` | Ref | Equipo |
| `HitoHoras` | Number | Hito objetivo |
| `DiasAntes` | Number | 30, 10 o 7 |
| `Estado` | Enum | `ALERTA`, `PELIGRO` |
| `Mensaje` | LongText | Texto enviado |
| `Contactos` | LongText | Numeros destino |
| `Enviado` | Yes/No | Resultado |
| `RespuestaProveedor` | LongText | Respuesta API |

### Configuracion

Key: `Clave`

| Columna | Tipo AppSheet | Nota |
|---|---|---|
| `Clave` | Text | Ejemplo `DiasAlerta` |
| `Valor` | Text | Valor configurable |
| `Descripcion` | Text | Descripcion |

## Vistas AppSheet sugeridas

- `Registro`: Form o table input sobre `LecturasHorometro`.
- `Dashboard`: Dashboard view con detalle de `Equipos`, chart de lecturas y tabla comparativa.
- `Historial`: Table de `LecturasHorometro`.
- `Alertas`: Slice de `Equipos` donde `IN([EstadoMantenimiento], LIST("ALERTA", "PELIGRO"))`.
- `Administrador`: vistas de `Equipos`, `Usuarios`, `ContactosWhatsApp`, `CompensacionesHorometro`.

## Mensajes WhatsApp

AppSheet no envia WhatsApp directamente sin proveedor externo. Usa Bot + Webhook con Twilio, WhatsApp Business Cloud API, Make o Zapier.

Mensajes solicitados:

```text
Falta 30 dias aproximadamente para el mantenimiento de 2000 de CO01 Compresor IR1
```

```text
Falta 10 dias aproximadamente para el mantenimiento de 2000 de CO01 Compresor IR1
```

```text
Falta 7 dias aproximadamente para el mantenimiento de 2000 de CO01 Compresor IR1
```

Bot recomendado:

1. Evento programado diario sobre tabla `Equipos`.
2. Condicion: `[DiasFaltantes]` esta en `LIST(30, 10, 7)`.
3. Evitar duplicados revisando `NotificacionesWhatsApp` para el mismo `EquipoID`, `HitoHoras` y `DiasAntes`.
4. Crear fila en `NotificacionesWhatsApp`.
5. Ejecutar Webhook al proveedor WhatsApp.

Condicion anti duplicado:

```appsheet
NOT(
  IN(
    CONCATENATE([EquipoID], "-", [SiguienteHitoHoras], "-", [DiasFaltantes]),
    SELECT(
      NotificacionesWhatsApp[NotificacionID],
      AND(
        [EquipoID] = [_THISROW].[EquipoID],
        [HitoHoras] = [_THISROW].[SiguienteHitoHoras],
        [DiasAntes] = [_THISROW].[DiasFaltantes]
      )
    )
  )
)
```

## Publicacion

### Netlify

1. Sube esta carpeta a GitHub.
2. En Netlify selecciona el repositorio.
3. Build command: vacio.
4. Publish directory: `.`
5. Configura variables de entorno.

### Vercel

1. Sube esta carpeta a GitHub.
2. Importa el repo en Vercel.
3. Framework preset: Other.
4. Output directory: deja vacio o `.`
5. Configura variables de entorno.
