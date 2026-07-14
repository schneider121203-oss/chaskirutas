# 🚀 Cómo levantar ChaskiRutas (guía completa)

Guía paso a paso para correr **todo el ecosistema** en local: base de datos, backend, panel admin web y app móvil.

- **Backend (API):** NestJS + PostgreSQL → `http://localhost:3000/api`
- **Panel Admin Web:** React + Vite → `http://localhost:5173`
- **App móvil:** Flutter (Android)
- **Docs API (Swagger):** `http://localhost:3000/api/docs`

---

## 0. Requisitos previos

| Herramienta | Para qué | Verificar |
|---|---|---|
| **Docker Desktop** | Base de datos PostgreSQL | `docker --version` |
| **Node.js 20+** | Backend y panel admin | `node --version` |
| **Flutter 3.4+** | App móvil | `flutter --version` |
| **Android Studio + emulador** | Correr la app | `flutter devices` |

> ⚠️ **Windows – ruta con acento:** el proyecto está en `...\Innovación\...` (tiene `ó`). Gradle/Android **fallan con rutas no-ASCII**. La solución está en el paso 4.

---

## 1. Base de datos (PostgreSQL vía Docker)

Desde la raíz del proyecto:

```bash
# 1. Arrancar Docker Desktop (si no está corriendo)

# 2. Levantar Postgres (auto-carga el schema con las 36 tablas, trigger y catálogos)
docker compose up -d postgres

# 3. Esperar unos segundos y verificar
docker exec chaskirutas-db-local psql -U chaski_dba -d chaskirutas -c "SELECT COUNT(*) FROM chaski.routes;"
# Debe devolver 7 (rutas de taxi sembradas)
```

### Sembrar datos adicionales (cuentas y colectivos)

```bash
# Cuentas de backoffice (ADMIN / OPERADOR / SUPERVISOR)
docker exec -i chaskirutas-db-local psql -U chaski_dba -d chaskirutas < seed_admin.sql

# Rutas de colectivo provinciales (Arequipa, Cusco, Trujillo)
docker exec -i chaskirutas-db-local psql -U chaski_dba -d chaskirutas < seed_colectivos.sql
```

> La base queda persistida en un volumen Docker. Para **reiniciar desde cero**:
> `docker compose down -v && docker compose up -d postgres` (y volver a sembrar).

---

## 2. Backend (NestJS)

```bash
cd backend
npm install
```

### Crear el archivo `.env`

El backend necesita `backend/.env` (está en `.gitignore`, no viene en el repo). Créalo con:

```env
NODE_ENV=development
DATABASE_URL=postgresql://chaski_dba:Ch4sk1Rut4s_2026!@localhost:5432/chaskirutas
JWT_SECRET=chaski-dev-secret-2026

# RENIEC (verificación de DNI). Sin token válido → usa mock de desarrollo.
RENIEC_API_URL=https://miapi.cloud/v1/dni
RENIEC_API_TOKEN=TU_TOKEN_AQUI

# Culqi y SUNAT/Nubefact (sin credenciales → mock)
CULQI_SECRET_KEY=sk_test_XXXXX
NUBEFACT_TOKEN=TU_TOKEN_AQUI
```

### Arrancar el backend

```bash
# Producción local (usa el build)
npm run build
npm run start:prod

# — o — modo desarrollo con recarga automática
npm run start:dev
```

Verás:
```
🚀 ChaskiRutas API running on: http://localhost:3000/api
```

Prueba rápida:
```bash
curl -X POST http://localhost:3000/api/auth/otp/send -H "Content-Type: application/json" -d "{\"phone\":\"+51900000000\"}"
# → {"message":"OTP enviado","devCode":"1234",...}
```

---

## 3. Panel Admin Web (React)

```bash
cd admin-web
npm install
npm run dev
```

Abre **http://localhost:5173** e ingresa con:

| Rol | Teléfono | OTP |
|---|---|---|
| ADMIN | `+51900000000` | `1234` |
| OPERADOR | `+51900000001` | `1234` |
| SUPERVISOR | `+51900000002` | `1234` |

> Si el backend no está en `localhost:3000`, copia `admin-web/.env.example` a `admin-web/.env` y ajusta `VITE_API_URL`.

El panel tiene: **Dashboard** (KPIs), **Conductores** (aprobar documentos + "Aprobar todo") y **Auditoría B2G**.

---

## 4. App móvil (Flutter en Android)

### 4.1 Preparación (una sola vez)

**a) Modo Desarrollador de Windows** (necesario para los plugins de Flutter):
- `Configuración → Privacidad y seguridad → Para desarrolladores → Modo de desarrollador = Activado`

**b) Junction con ruta ASCII** (porque la ruta tiene `ó`). En PowerShell:
```powershell
cmd /c mklink /J C:\chaskidev "C:\Users\Richard\Desktop\Nueva carpeta\Innovación\chaskirutas"
```
Esto crea `C:\chaskidev` apuntando al proyecto (mismos archivos, ruta sin acento). **Siempre corre Flutter desde ahí.**

> Ya está aplicado en el proyecto: `chaskirutas_app/android/gradle.properties` incluye `android.overridePathCheck=true`.

### 4.2 Arrancar un emulador

Desde Android Studio (Device Manager ▶️) o por consola:
```powershell
C:\Users\Richard\AppData\Local\Android\Sdk\emulator\emulator.exe -avd Pixel_9_Pro
```

### 4.3 Correr la app

```bash
cd C:\chaskidev\chaskirutas_app
flutter pub get
flutter run
```

La app se conecta al backend automáticamente:
- **Emulador Android** → `http://10.0.2.2:3000/api` (mapea al `localhost` de tu PC). Ya configurado en `lib/core/api_client.dart`.

**Teclas útiles durante `flutter run`:** `r` = hot reload · `R` = reinicio · `q` = salir.

> Para probar el **tiempo real** (pasajero pide ↔ conductor oferta), necesitas 2 sesiones: corre la app en 2 emuladores/dispositivos, una como pasajero y otra como conductor.

---

## 5. Cuentas y datos de prueba

- **OTP:** en desarrollo es **siempre `1234`**.
- **Backoffice:** ver tabla del paso 3.
- **Pasajeros/Conductores:** regístralos desde la app ("Regístrate gratis"), o usa la API.

### Flujo de conductor (para poder recibir viajes)
1. Registrarse como CONDUCTOR en la app.
2. Subir documentos (DNI, licencia, vehículo + SOAT, CITV, tarjeta de propiedad).
3. Llenar y **firmar la Declaración Jurada TUC** (obligatoria).
4. Activar la cuenta:
   - **En producción:** un ADMIN la aprueba desde el panel web ("Aprobar todo").
   - **En desarrollo:** botón "Aprobar Documentos y Activar Cuenta" (usa `POST /drivers/me/dev-activate`).
5. Ponerse **Online** → ya recibe solicitudes.

---

## 6. Orden de arranque recomendado

```
1. Docker Desktop  →  docker compose up -d postgres
2. Seeds           →  seed_admin.sql + seed_colectivos.sql   (solo la 1ª vez)
3. Backend         →  cd backend && npm run start:prod        (puerto 3000)
4. Panel Admin     →  cd admin-web && npm run dev             (puerto 5173)
5. Emulador        →  arrancar Pixel_9_Pro
6. App Flutter     →  cd C:\chaskidev\chaskirutas_app && flutter run
```

---

## 7. Puertos usados

| Servicio | Puerto |
|---|---|
| Backend API | 3000 |
| Panel Admin | 5173 |
| PostgreSQL | 5432 |

---

## 8. Problemas comunes

| Síntoma | Causa / Solución |
|---|---|
| `Your project path contains non-ASCII characters` | Corre Flutter desde `C:\chaskidev\chaskirutas_app` (junction del paso 4.1). |
| `Building with plugins requires symlink support` | Activa el **Modo Desarrollador** de Windows (paso 4.1a). |
| `aapt ... Illegal byte sequence` al instalar el APK | Misma causa: usar el junction ASCII. |
| Backend: `Cannot connect to database` | Postgres no está arriba o `DATABASE_URL` mal. Revisa `docker ps`. |
| Panel/app: `Unauthorized` (401) | El token expiró (15 min). Vuelve a loguear. |
| RENIEC devuelve "No se pudo verificar" | El token gratuito se agotó → el backend usa mock. Consigue un token pagado y ponlo en `backend/.env`. |
| `flutter` no reconocido | Abre una terminal nueva (para tomar el PATH) o usa la ruta completa a `flutter\bin\flutter.bat`. |

---

## 9. Estado de integraciones externas

| Integración | Estado |
|---|---|
| **RENIEC** (DNI) | Real (miapi.cloud) — actualmente en **mock** por cuota agotada |
| **Culqi** (pagos) | **Mock** — falta credencial `sk_test` |
| **SUNAT/Nubefact** (boletas) | **Mock** — falta cuenta/token |

> Con las credenciales reales, se activan solas (el backend las lee de `backend/.env`).
