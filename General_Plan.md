# 🏃🏽‍♂️ Plan de Pase a Producción — ChaskiRutas

**Misión:** Formalizar digitalmente el transporte colectivo y de taxi en el Perú.  
**Fecha Límite:** LUNES — Todo funcional y desplegado.  
**Equipo:** Grupo 1 · Innovación y Emprendimiento · FISI-UNMSM · 2026

---

## 📌 Principio Clave

> Cada miembro construye su track en paralelo. Las dependencias están señaladas con 🔗.
> **Regla de oro:** Si alguien se traba más de 30 minutos, AVISA al grupo.

---

## 🗄️ Track 1 — MARTÍN: Backend + BD + APIs (El motor legal y lógico)

### Setup (Día 1)
- **NestJS + TypeORM + PostgreSQL 16** (Cloud SQL provisto por Álvaro)
- Ejecutar el script `chaskirutas_schema.sql` → **36 tablas, 15 enums, 3 vistas**
- Desplegar esquema en 3FN garantizando integridad referencial completa
- Convertir los **10 CSVs** de Richard en `INSERT` SQL para data semilla
- Exponer las variables: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`

### Auth + Pricing (Día 1)
- **POST `/auth/register`** → crear usuario + rol (PASAJERO ó CONDUCTOR)
- **POST `/auth/otp/send`** → generar OTP, hash con bcrypt, guardar en `auth_otp_codes`
- **POST `/auth/otp/verify`** → validar OTP → devolver JWT (15 min access + 7d refresh)
- **POST `/auth/refresh`** → rotar refresh token
- Motor de tarifas: `base (S/1.50) + km×S/1.20 + min×S/0.12 + servicio S/0.80`
  - Mínima: S/5.00
  - Multiplicador nocturno ×1.30 (22:00–06:00)
  - Multiplicador hora punta ×1.20 (07:00–09:00 y 17:00–20:00)
  - Comisión plataforma: 15% del total al conductor

### Viajes + WebSocket (Día 2)
- **POST `/trips/estimate`** → Haversine × 1.4 (factor vial Lima) → tarifa estimada
- **POST `/trips/request`** → pasajero publica solicitud con precio propuesto
- **WebSocket `/ws/matching`** → emitir solicitud a conductores online en radio de 3 km
- Conductores responden: aceptar al precio propuesto ó contraoferta (+10%, +20%, +35%)
- **POST `/trips/{id}/accept-offer`** → pasajero acepta oferta → match
- **PATCH `/trips/{id}/status`** → transiciones: `EN_CAMINO → EN_CURSO → COMPLETADO`
- **POST `/trips/{id}/location`** → streaming GPS cada 5s → tabla `trip_locations`

### Colectivo + Integraciones (Día 2)
- CRUD colectivos interprovinciales (dual: conductor ofrece / pasajero propone)
- **Trigger `enforce_collective_ban_lima`**: bloquea `COLECTIVO_M1/M2` en `ATU_LIMA_CALLAO` → catch PostgreSQL exception → HTTP 400 claro
- Depósito 30% del pasaje vía **Culqi** (`POST /payments/deposit`)
- Verificación DNI vía **RENIEC** (API apidni.com) → caché en Redis (TTL 24h)
- Política de cancelación: 5+ días = reembolso automático, menos = atención al cliente

### Admin Endpoints + Swagger (Día 3)
- `GET /admin/dashboard` → KPIs agregados
- `GET /admin/drivers` → lista con estado de formalización
- `PATCH /admin/documents/{id}/verify` → aprobar/rechazar documento
- `GET /admin/trips`, `GET /admin/collectives`, `GET /admin/incidents`
- Endpoints B2G con rol `chaski_b2g` (solo lectura)
- **Swagger/OpenAPI** documentado y publicado

### Cronjobs
- **Diario:** Expirar documentos vencidos → `UPDATE documents SET is_verified = FALSE WHERE expires_at < NOW()`
- **Diario:** Suspender conductores con documentos críticos vencidos
- **Semanal:** Generar liquidaciones (`settlements`) y enviar al banco del conductor

> 🔗 **ENTREGA A JORGE:** URL de la API + Swagger + llave pública Culqi  
> 🔗 **ENTREGA A MANUEL:** Endpoints `/admin/*` funcionando  
> 🔗 **NECESITA DE ÁLVARO:** Connection string Cloud SQL + Redis URL

---

## 📱 Track 2 — JORGE: App Mobile Flutter (La cara del pasajero y conductor)

### Setup (Día 1)
- `flutter create chaskirutas_app` → arquitectura Riverpod + GoRouter
- Paquetes: `google_maps_flutter`, `geolocator`, `dio`, `flutter_secure_storage`, `image_picker`, `web_socket_channel`
- Diseño base: colores de marca, tipografía, componentes reutilizables

### Pantallas — Pasajero (Día 1-2)
- **SplashScreen** → **LoginScreen** → OTP → **HomeScreen**
- **HomeScreen:** Mapa Google Maps centrado en GPS del usuario, barra de búsqueda Places API, accesos rápidos (casa/trabajo)
- **MapPickerScreen:** Seleccionar destino tocando el mapa o buscando por texto, pin draggable, confirmar dirección
- **EstimateScreen:** Desglose de tarifa (base + km + min + surge), slider InDrive "viaja a tu precio" con botones +/-, método de pago (Efectivo/Yape/Tarjeta), input código promocional (PRIMERA = 50% off, AMIGO10 = S/10 off)
- **OffersScreen:** Lista de conductores que responden con su precio, rating, foto, placa → aceptar la mejor oferta
- **ActiveRideScreen:** Mapa con posición GPS real del conductor (streaming cada 5s), info conductor/placa, barra progreso, botón SOS, compartir viaje
- **CompletedScreen:** Boleta SUNAT, calificación estrellas, puntos ganados, método de pago usado

### Pantallas — Conductor (Día 2-3)
- **DriverHomeScreen:** Mapa centrado en su GPS, toggle online/offline (solo si formalizado), requests llegan por WebSocket como cards sobre el mapa
- **RequestCard:** Mapa con ruta pasajero, datos/rating, tarifa propuesta, botón 'Aceptar por S/X' + 3 botones contraoferta (+10%, +20%, +35%)
- **ActiveTripScreen:** Navegar al pasajero → 'Llegué' → 'Iniciar' → 'Completar' → Rating cruzado del pasajero
- **FormalizationScreen:** 6 pasos con upload de fotos (`image_picker`), cada paso con checkboxes:
  1. DNI frontal/reverso + selfie biométrico
  2. Licencia + antecedentes
  3. SOAT + CITV + tarjeta propiedad
  4. Contrato con cláusulas + firma digital
  5. Pago ATU S/41.20 + declaración jurada
  6. TUC emitida con datos completos

### Pantallas — Colectivo (Día 3)
- **ColectivoListScreen:** Viajes abiertos + crear nuevo (dual: conductor ofrece / pasajero propone)
- **JoinFlow:** 3 pasos — DNI (verificación RENIEC) → Depósito 30% (Culqi) → Confirmación
- Bloqueo automático si destino = Lima/Callao

### Pantallas — Extras (Día 3)
- **RewardsScreen:** Puntos, nivel, catálogo de canjes
- **MenuDrawer:** Filtrado por rol (pasajero/conductor/admin)
- **TripsHistoryScreen**, **ReferralScreen**, **ReceiptsScreen**, **DocsAlertScreen**

> 🔗 **NECESITA DE MARTÍN:** URL de la API + Swagger + llave pública Culqi  
> 🔗 **NECESITA DE ÁLVARO:** API key Google Maps  
> 📋 **REFERENCIA VISUAL:** Abrir `chaskirutas_standalone.html` para ver exactamente cómo se ve cada pantalla

---

## 💻 Track 3 — MANUEL: Panel Admin Web + Boletas SUNAT (El centro de control)

### Setup (Día 1)
- `npm create vite@latest chaskirutas-admin -- --template react-ts`
- TailwindCSS + shadcn/ui para componentes
- Recharts para gráficos
- Axios para consumir API de Martín

### Dashboard (Día 1-2)
- **Cards KPI:** viajes totales, ingresos, comisiones 15%, conductores activos, colectivos abiertos, incidentes SOS
- **Gráfico de líneas:** viajes por día (últimos 30 días)
- **Gráfico de barras:** ingresos vs comisiones por semana
- **Gráfico de dona:** distribución por categoría (Viaje/Confort/XL)

### Gestión de Conductores (Día 2) — ⭐ PUNTO ESTRELLA ADMIN
- Tabla con todos los conductores: nombre, DNI, placa, paso formalización, estado
- Click en conductor → Modal detalle con:
  - Foto DNI frontal/reverso (preview de imagen)
  - Licencia escaneada
  - SOAT, CITV, tarjeta propiedad
  - Checkbox para aprobar/rechazar CADA documento
  - Botón 'Aprobar todo' → cuenta se activa → puede ir online
  - Botón 'Rechazar' → notificación al conductor con motivo
- **REGLA:** La cuenta del conductor NO se activa hasta que el admin apruebe todos los documentos

### Gestión de Viajes y Colectivos (Día 2-3)
- Tabla de viajes: fecha, origen→destino, conductor, pasajero, tarifa, rating, estado
- Filtros: por fecha, por conductor, por estado
- Lista de colectivos: ruta, asientos ocupados, depósitos cobrados, estado
- Monitoreo: **0 colectivos en Lima** (mostrar prominente)

### Boletas SUNAT (Día 3)
- Integrar **Nubefact** (https://www.nubefact.com) — emite boletas electrónicas
- Alternativa: generar PDF con formato de boleta (logo, RUC, detalle, QR)
- Cada viaje completado genera boleta automática visible en el panel
- Almacenar XML, PDF y código hash SUNAT en tabla `invoices`

### Portal B2G (Día 3)
- Página para ATU/MTC con: trazabilidad GPS, documentos, cumplimiento legal
- Rol de BD `chaski_b2g` (solo lectura)
- Botón exportar a CSV y PDF

> 🔗 **NECESITA DE MARTÍN:** Endpoints `/admin/*` funcionando  
> 🔗 **ENTREGA A ÁLVARO:** Build de producción para deploy en Firebase Hosting

---

## ☁️ Track 4 — ÁLVARO: DevOps + Infraestructura + QA (El despliegue seguro)

### AWS Setup con Scripts (Día 1 — CRÍTICO)

> 💰 **Presupuesto: $140 USD en créditos AWS** → alcanza para ~6 meses de operación.

Toda la infraestructura se maneja con scripts locales desde la carpeta `infra/`:

```
infra/
├── config.env        ← Variables centrales (editar ANTES de provisionar)
├── 01-provision.sh   ← Crea TODO: EC2 + RDS + S3 + Security Groups
├── 02-deploy.sh      ← Sube .env + schema SQL a EC2
├── start.sh          ← 🟢 Enciende EC2 + RDS
├── stop.sh           ← 🔴 Apaga EC2 + RDS ($0 mientras esté apagado)
├── status.sh         ← 📊 Estado de todo + costo estimado
├── destroy.sh        ← 🗑️ Destruye TODO (irreversible)
└── state.json        ← IDs de recursos (auto-generado)
```

**Flujo de uso:**
```bash
# 1. Primera vez: crear toda la infra
cd infra && ./01-provision.sh

# 2. Cuando RDS esté lista (~8 min): desplegar
./02-deploy.sh

# 3. Al terminar de trabajar: apagar (AHORRA CRÉDITO)
./stop.sh

# 4. Cuando necesites trabajar de nuevo: encender
./start.sh

# 5. Ver estado y costo
./status.sh

# 6. Al final del semestre: destruir todo
./destroy.sh
```

### Arquitectura AWS

| Servicio | Config | Costo/mes (encendido) | Costo apagado |
|---|---|---|---|
| **EC2** t3.micro | API NestJS + Redis (mismo server) | ~$8 | ~$0.80 (solo disco) |
| **RDS** PostgreSQL 16 | db.t3.micro, 20 GB, Single-AZ | ~$15 | $0 |
| **S3** | Documentos DNI, SOAT, etc. | ~$0.03 | ~$0.03 |
| **Total** | | **~$23/mes** | **~$1/mes** |

> 💡 **Truco de ahorro:** Con `./stop.sh` reduces de $23/mes a $1/mes. Si solo enciendes para sesiones de trabajo de ~4 horas, gastas ~$2-3 al mes.  
> ⚠️ **IMPORTANTE:** AWS auto-enciende RDS tras 7 días de inactividad. Ejecutar `./stop.sh` cada semana si no se está usando.

### Deploy del Backend (Día 2)
- El script `02-deploy.sh` genera el `.env` automáticamente con las URLs de RDS y S3
- Sube el schema SQL y lo ejecuta en RDS
- Para desplegar código NestJS:
  ```bash
  ssh -i ~/.ssh/chaskirutas-key.pem ubuntu@<IP-EC2>
  cd /opt/chaskirutas
  git clone <repo> . && npm install && npm run build
  pm2 start dist/main.js --name chaskirutas-api
  ```
- Deploy del admin web de Manuel en **S3 + CloudFront** ó **Vercel** (gratis)
- Configurar CORS para que el frontend pueda llamar a la API

### CI/CD (Día 2-3)
- Repo GitHub: `github.com/grupo1-fisi/chaskirutas`
- GitHub Actions: on push to `main` → SSH a EC2 → `git pull && npm run build && pm2 restart`
- Separar branches: `develop` (testing) / `main` (producción)

### Roles de Base de Datos
| Rol | Permisos | Uso |
|---|---|---|
| `chaski_app` | SELECT, INSERT, UPDATE en tablas operativas | Backend API (app móvil) |
| `chaski_admin` | ALL PRIVILEGES en esquema `chaski` | Panel de administración |
| `chaski_b2g` | SELECT en tablas de auditoría | Portal gobierno (solo lectura) |
| `chaski_dba` | SUPERUSER | Migraciones y mantenimiento |

### QA — Testing E2E (Día 3-4) — OBLIGATORIO
Álvaro prueba TODO el flujo como si fuera el docente:
1. Abrir la app → Registro de usuario nuevo → OTP → Login
2. Pasajero: buscar destino → ver en mapa → proponer precio → ver ofertas → aceptar → viaje en progreso → completar → calificar → ver puntos
3. Conductor: registrarse → formalización (6 pasos) → admin aprueba → online → recibir request → contraoferta → viaje → calificar pasajero
4. Colectivo: crear como conductor → pasajero se une → verificación DNI → depósito 30% → confirmación
5. Admin: dashboard KPIs → revisar documentos → aprobar → ver viajes → B2G
6. **Bloqueo Lima:** intentar crear colectivo a 'Lima' → **DEBE bloquearse**
7. Premios: ver puntos → canjear → verificar descuento

> ⚠️ Si algo falla, reportar INMEDIATAMENTE al responsable del track.

---

## 📅 Cronograma

|  | Jueves (Día 1) | Viernes (Día 2) | Sáb-Dom (Día 3-4) |
|---|---|---|---|
| **Martín** | SQL schema + seed + Auth API + Pricing + Trips | WebSocket matching + Colectivo + RENIEC + Culqi | Admin endpoints + Swagger + fix bugs |
| **Jorge** | Flutter setup + Auth + Home + MapPicker | RideFlow completo (request→offers→active→done) | Conductor + Colectivo + Menú + pulir UI |
| **Manuel** | React setup + Dashboard KPIs + Layout | Gestión conductores + revisión docs | Boletas SUNAT + B2G + Colectivos + deploy |
| **Álvaro** | GCP completo: SQL + Storage + Redis + API keys | Cloud Run deploy + CI/CD + Firebase Hosting | QA E2E de los 7 flujos + fixes finales |

### 🎯 LUNES
- **9 AM:** Ensayo general con todo el equipo
- Cada miembro demuestra su parte
- **11 AM:** Presentación al docente con la app funcionando EN VIVO

---

## 💰 Costos

| Servicio | Costo/mes | Quién | Nota |
|---|---|---|---|
| AWS EC2 t3.micro | ~$8 | Álvaro | API + Redis (mismo server) |
| AWS RDS PostgreSQL | ~$15 | Álvaro | db.t3.micro, 20 GB |
| AWS S3 | ~$0.03 | Álvaro | Documentos |
| API DNI (apidni.com) | S/ 60/mes | Martín | 500 consultas/mes, plan básico |
| Culqi | S/ 0 fijo | Martín | 3.44% + IGV solo por transacción real |
| **Total AWS** | **~$23/mes** | | **$140 crédito ÷ $23 = ~6 meses** |
| **Total real** | **S/ 60/mes** | | Solo la API DNI tiene costo fijo |

> 💡 Con `./infra/stop.sh` el costo AWS baja a **~$1/mes** cuando no estés usando la infra.


---

## 📦 Material Base Entregado por Richard

| Archivo | Para qué sirve |
|---|---|
| `chaskirutas_standalone.html` | Prototipo funcional — ABRIR PARA VER DISEÑO Y FLUJOS |
| `chaskirutas.jsx` | Código fuente — COPIAR lógica de pricing, matching, estados |
| `Diseno_BD_ChaskiRutas.docx` | 36 tablas + enums + trigger — MARTÍN lo convierte a SQL |
| `chaskirutas_schema.sql` | Script DDL listo para ejecutar en PostgreSQL |
| 10 archivos CSV | Data semilla — MARTÍN los convierte a INSERT SQL |
| `README.md` | Guion de demo: 7 flujos en orden con tiempos |