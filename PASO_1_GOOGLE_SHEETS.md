# Paso 1 - Estructurar Google Sheets

Crea un archivo en Google Sheets llamado:

`Control Horometros STB`

Luego crea estas hojas con los nombres exactos. AppSheet usara esos nombres como tablas.

## 1. Usuarios

Hoja: `Usuarios`

| Columna | Tipo esperado | Uso |
|---|---|---|
| `Codigo` | Texto | Key. Codigo de 8 digitos |
| `Nombre` | Texto | Usuario que aparece en registros |
| `Rol` | Texto | `ADMIN`, `TECNICO`, `SUPERVISOR` |
| `Contrasena` | Texto | Inicialmente igual que `Codigo` |
| `Numero` | Telefono | Contacto |
| `Activo` | TRUE/FALSE | Permite o bloquea acceso |

Filas iniciales sugeridas:

```csv
Codigo,Nombre,Rol,Contrasena,Numero,Activo
12345678,Administrador STB,ADMIN,12345678,+51999999999,TRUE
87654321,Tecnico Mantenimiento,TECNICO,87654321,+51988888888,TRUE
11223344,Supervisor Mantenimiento,SUPERVISOR,11223344,+51977777777,TRUE
```

## 2. Equipos

Hoja: `Equipos`

| Columna | Tipo esperado | Uso |
|---|---|---|
| `EquipoID` | Texto | Key. Ejemplo `CO01` |
| `DescripcionEquipo` | Texto | Ejemplo `Compresor IR1` |
| `Area` | Texto | Area o familia |
| `Marca` | Texto | Opcional |
| `Modelo` | Texto | Opcional |
| `Serie` | Texto | Opcional |
| `HorometroBase` | Numero decimal | Horometro inicial |
| `FechaBase` | Fecha | Fecha inicial |
| `FactorCompensacion` | Numero decimal | Ajuste si se cambia el horometro fisico |
| `CicloBaseHorometro` | Numero decimal | Punto desde donde reinician los hitos |
| `HitosHoras` | Texto | Resumen: `2000,4000,8000,16000,32000` |
| `PromedioDiarioManual` | Numero decimal | Opcional |
| `UsarPromedioManual` | TRUE/FALSE | Usa promedio manual |
| `Activo` | TRUE/FALSE | Equipo visible |
| `Notas` | Texto largo | Comentarios |

Importante:

- `FactorCompensacion` normalmente inicia en `0`.
- `CicloBaseHorometro` normalmente inicia en `0`.
- Cuando se complete el mantenimiento mayor de `32000 h`, el administrador puede reiniciar `CicloBaseHorometro` al horometro actual.

## 3. HitosEquipo

Hoja: `HitosEquipo`

Esta hoja permite editar hitos por maquina.

| Columna | Tipo esperado | Uso |
|---|---|---|
| `HitoEquipoID` | Texto | Key. Ejemplo `H-CO01-2000` |
| `EquipoID` | Texto / Ref | Referencia a `Equipos[EquipoID]` |
| `Horas` | Numero | 2000, 4000, 8000, 16000, 32000 |
| `Nombre` | Texto | Nombre del mantenimiento |
| `Orden` | Numero | Orden visual |
| `Activo` | TRUE/FALSE | Hito habilitado |

Regla:

- El hito `2000` se repite en 2000, 4000, 6000, 8000...
- El hito `4000` se repite en 4000, 8000, 12000...
- En 4000 se atienden ambos: `2000` y `4000`.

## 4. LecturasHorometro

Hoja: `LecturasHorometro`

| Columna | Tipo esperado | Uso |
|---|---|---|
| `LecturaID` | Texto | Key. AppSheet: `UNIQUEID()` |
| `FechaHora` | FechaHora | AppSheet: `NOW()` |
| `Fecha` | Fecha | AppSheet: `TODAY()` |
| `UsuarioID` | Texto / Ref | Usuario del login |
| `UsuarioNombre` | Texto | Nombre mostrado |
| `EquipoID` | Texto / Ref | Equipo seleccionado |
| `DescripcionEquipo` | Texto | Copia desde equipo |
| `HorometroActual` | Numero decimal | Lectura fisica |
| `HorometroAjustado` | Numero decimal | `HorometroActual + FactorCompensacion` |
| `Observacion` | Texto largo | Observacion |
| `EsUltimo` | TRUE/FALSE o virtual | Solo ultimo editable por tecnico |
| `EditadoPor` | Texto | Auditoria |
| `EditadoEn` | FechaHora | Auditoria |
| `EditNote` | Texto largo | Motivo de edicion |

## 5. CompensacionesHorometro

Hoja: `CompensacionesHorometro`

| Columna | Tipo esperado | Uso |
|---|---|---|
| `CompensacionID` | Texto | Key |
| `Fecha` | Fecha | Fecha de ajuste |
| `EquipoID` | Texto / Ref | Equipo afectado |
| `HorometroAnterior` | Numero | Lectura acumulada real |
| `HorometroNuevo` | Numero | Nuevo horometro fisico |
| `FactorCompensacion` | Numero | `HorometroAnterior - HorometroNuevo` |
| `Motivo` | Texto largo | Motivo |
| `UsuarioID` | Texto / Ref | Admin que aplica |

## 6. ServiciosMantenimiento

Hoja: `ServiciosMantenimiento`

Registra cuando se atendio un mantenimiento.

| Columna | Tipo esperado | Uso |
|---|---|---|
| `ServicioID` | Texto | Key |
| `Fecha` | Fecha | Fecha del servicio |
| `EquipoID` | Texto / Ref | Equipo |
| `HorometroServicio` | Numero | Horometro al atender |
| `HitosAtendidos` | Texto | Ejemplo `2000,4000` |
| `Responsable` | Texto / Ref | Usuario responsable |
| `Observacion` | Texto largo | Detalle |
| `ReiniciaCiclo` | TRUE/FALSE | TRUE al cerrar 32000 h |
| `CicloBaseAnterior` | Numero | Base anterior |
| `CicloBaseNuevo` | Numero | Nueva base |

## 7. ContactosWhatsApp

Hoja: `ContactosWhatsApp`

| Columna | Tipo esperado | Uso |
|---|---|---|
| `ContactoID` | Texto | Key |
| `Nombre` | Texto | Persona o grupo |
| `NumeroWhatsApp` | Telefono | Formato `+51...` |
| `RecibeAlerta30` | TRUE/FALSE | Aviso 30 dias |
| `RecibePeligro10` | TRUE/FALSE | Aviso 10 dias |
| `RecibePeligro7` | TRUE/FALSE | Aviso 7 dias |
| `Activo` | TRUE/FALSE | Contacto habilitado |

## 8. NotificacionesWhatsApp

Hoja: `NotificacionesWhatsApp`

| Columna | Tipo esperado | Uso |
|---|---|---|
| `NotificacionID` | Texto | Key |
| `FechaHora` | FechaHora | Momento de generacion |
| `EquipoID` | Texto / Ref | Equipo |
| `HitoHoras` | Numero | Hito avisado |
| `DiasAntes` | Numero | 30, 10 o 7 |
| `Estado` | Texto | `ALERTA`, `PELIGRO` |
| `Mensaje` | Texto largo | Mensaje |
| `Contactos` | Texto largo | Numeros destino |
| `Enviado` | TRUE/FALSE | Estado de envio |
| `RespuestaProveedor` | Texto largo | Respuesta de Twilio/Meta/Make |

## 9. Configuracion

Hoja: `Configuracion`

| Columna | Tipo esperado | Uso |
|---|---|---|
| `Clave` | Texto | Key |
| `Valor` | Texto | Valor |
| `Descripcion` | Texto | Explicacion |

Valores iniciales:

```csv
Clave,Valor,Descripcion
DiasAlerta,30,Dias para alerta preventiva
DiasPeligro1,10,Dias para peligro
DiasPeligro2,7,Dias para peligro final
ProveedorWhatsApp,TWILIO,Opciones sugeridas: TWILIO, META_CLOUD_API, MAKE
```

## Orden recomendado

1. Crea las hojas vacias con estos nombres exactos.
2. Copia la fila de encabezados en cada hoja.
3. Importa o pega los CSV desde la carpeta `google-sheets`.
4. Congela la primera fila.
5. Activa filtro en todas las hojas.
6. No cambies los nombres de columnas despues de conectar AppSheet.

## Archivos CSV listos

Estan en:

`D:\Documentos\STB Mantto\control-horometros-appsheet-v2\google-sheets`

Puedes importarlos uno por uno en Google Sheets.
