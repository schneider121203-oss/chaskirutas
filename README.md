# ChaskiRutas — Prototipo Funcional Completo
**Formalización digital del taxi y colectivo en el Perú**
Grupo 1 · Innovación y Emprendimiento · FISI-UNMSM · 2026

## Cómo abrir para la exposición

### ✅ Opción recomendada: Archivo HTML standalone
1. Descarga `chaskirutas_standalone.html`
2. **Doble click** en el archivo → se abre en Chrome/Edge/Firefox
3. Requiere internet (carga React y Babel desde CDN la primera vez)
4. NO necesita servidor, NO necesita instalar nada, NO necesita Claude
5. Funciona en cualquier laptop con navegador moderno

## Cuentas de prueba

| Teléfono | Nombre | Rol | Formalización | Para demostrar |
|---|---|---|---|---|
| 987654321 | Carlos Mendoza | Conductor | 6/6 ✅ | Conductor activo, puede ir online |
| 976543210 | María Quispe | Conductor | 6/6 ✅ | Conductor formalizado |
| 965432109 | Pedro Huamán | Conductor | 3/6 ⚠️ | Proceso de formalización en curso |
| 912345678 | Jorge Del Solar | Pasajero | — | Pedir taxi / colectivo |
| 923456789 | Ana García | Pasajero | — | Pasajero secundario |
| 900000000 | Admin | Admin | — | Panel admin + revisión docs |

**OTP de prueba: 1234** (para todas las cuentas)

## Flujos para demostrar en la exposición

### 1. Login + Registro (2 min)
- Mostrar splash → Login con teléfono → OTP → Ingreso
- Mostrar registro de cuenta nueva (pasajero vs conductor)

### 2. Pedir taxi — Flujo InDrive (5 min) ⭐
- Entrar como Jorge Del Solar (pasajero)
- Buscar destino por nombre O tocar en el mapa
- Ver estimación con desglose de tarifa (base + km + min + surge)
- Proponer precio con botones +/- (InDrive "viaja a tu precio")
- Seleccionar método de pago (Efectivo/Yape/Tarjeta)
- Aplicar código PRIMERA (50% off) o AMIGO10 (S/10 off)
- Tocar "Encontrar ofertas" → Conductores responden con ofertas/contraofertas
- Aceptar una oferta → Conductor asignado → Compartir viaje → Viaje en curso con mapa → SOS → Completar → Boleta SUNAT → Rating

### 3. Formalización ATU — Punto estrella (3 min) ⭐⭐
- Entrar como Pedro Huamán (conductor, paso 3/6)
- Ir a Formalización ATU
- Mostrar los 6 pasos con requisitos detallados:
  - Paso 1: DNI frontal/reverso + selfie biométrico
  - Paso 2: Licencia + antecedentes
  - Paso 3: SOAT + CITV + tarjeta propiedad
  - Paso 4: Contrato con cláusulas + firma digital
  - Paso 5: Pago ATU S/41.20 + declaración jurada
  - Paso 6: TUC emitida con datos completos
- Mostrar que sin completar los 6 pasos, no puede ir online

### 4. Colectivo a provincia con sistema antifraude (3 min) ⭐
- Ir a "Ciudad a Ciudad" desde el menú
- Mostrar el flujo dual: conductor ofrece / pasajero propone
- Unirse a un colectivo existente:
  1. Verificación DNI (8 dígitos, validación RENIEC simulada)
  2. Depósito 30% del pasaje (Yape/Tarjeta)
  3. Política de cancelación (5+ días = reembolso, menos = Atención al Cliente)
  4. Confirmación final con resumen
- Mostrar bloqueo automático si se intenta crear colectivo en Lima/Callao

### 5. Modo conductor (2 min)
- Entrar como Carlos Mendoza (conductor formalizado)
- Toggle online → Solicitudes aparecen con origen/destino/km/tarifa
- Aceptar al precio del pasajero O hacer contraoferta (+10%/+20%/+35%)
- Flujo: pickup → iniciar → completar → calificar pasajero (rating cruzado)

### 6. Admin — Revisión de documentos (2 min)
- Entrar como Admin
- Ver KPIs: viajes, ingresos, comisiones
- Revisar documentación de conductores pendientes
- Aprobar o rechazar documentación
- Ver cumplimiento legal (trigger, colectivos bloqueados, API B2G)

### 7. Features de retención (1 min)
- Menú lateral tipo InDrive (filtrado por rol)
- Programa de lealtad (puntos por viaje, niveles)
- Sistema de referidos con código compartible
- Alertas de vencimiento de documentos
- Liquidación semanal
- Boletas/recibos SUNAT

## Motor de tarifas (Lima 2026)

| Variable | Valor | Referencia |
|---|---|---|
| Tarifa base | S/ 1.50 | InDrive Lima |
| Por kilómetro | S/ 1.20 | Haversine × 1.4 factor vial |
| Por minuto | S/ 0.12 | Velocidad promedio 18 km/h |
| Servicio plataforma | S/ 0.80 | |
| Tarifa mínima | S/ 5.00 | |
| Multiplicador nocturno | ×1.30 | 22:00 — 06:00 |
| Multiplicador hora punta | ×1.20 | 07:00-09:00 y 17:00-20:00 |
| Comisión plataforma | 15% | Del total al conductor |

## Archivos del paquete

| Archivo | Descripción |
|---|---|
| `chaskirutas_standalone.html` | **⭐ ABRIR ESTE** — App completa, doble click en navegador |
| `chaskirutas.jsx` | Código fuente React (para Claude.ai) |
| `usuarios.csv` | 7 cuentas de usuario |
| `conductores.csv` | 5 conductores con datos |
| `vehiculos.csv` | 5 vehículos con TUC |
| `distritos_lima.csv` | 18 distritos con GPS real |
| `rutas_colectivo_provincia.csv` | 6 rutas interprovinciales |
| `pasos_formalizacion.csv` | 6 pasos ATU |
| `tarifas_config.csv` | Variables del motor de precios |
| `programa_lealtad.csv` | Niveles y beneficios |
| `promociones.csv` | Códigos promocionales |
| `README.md` | Este archivo |

## Equipo — Grupo 1
- Martín Quiñones
- Jorge Del Solar  
- Richard Pillaca
- Manuel Vizcardo
- Álvaro Poma

## Regla de negocio clave
**Lima/Callao** → Solo taxi con TUC de la ATU (colectivo PROHIBIDO)
**Provincias** → Colectivo con concesión DRTC/Municipalidad Provincial
