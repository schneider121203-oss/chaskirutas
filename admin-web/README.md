# ChaskiRutas — Panel Administrativo Web

Backoffice para los roles **ADMIN / OPERADOR / SUPERVISOR**. Construido con **Vite + React + TailwindCSS + React Router**. Consume los endpoints `/admin/*` del backend NestJS.

## Funcionalidades
- **Login por OTP** con validación de rol (solo backoffice puede entrar).
- **Dashboard**: KPIs operativos (viajes, conductores activos, rutas, SOS) y finanzas (bruto, comisión 15%, pagos netos).
- **Conductores**: listado + detalle con revisión de documentos (DNI, Licencia, SOAT, CITV, Tarjeta de Propiedad), aprobación/revocación individual y botón **"Aprobar todo y activar"**.
- **Auditoría B2G**: vistas de cumplimiento vehicular y demanda por ruta para ATU/MTC.

## Requisitos previos
1. Backend NestJS corriendo (por defecto en `http://localhost:3000`).
2. Base de datos con el schema aplicado **y las cuentas de backoffice sembradas**:
   ```bash
   psql "<CONNECTION_STRING>" -f ../seed_admin.sql
   ```
   Esto crea:
   - ADMIN → teléfono `+51900000000`
   - OPERADOR → teléfono `+51900000001`
   - SUPERVISOR → teléfono `+51900000002`

   El código OTP en desarrollo es **siempre `1234`**.

## Ejecutar
```bash
cd admin-web
npm install
npm run dev
```
Abre http://localhost:5173 e ingresa con el teléfono `+51900000000` y OTP `1234`.

Si tu backend no está en `localhost:3000`, copia `.env.example` a `.env` y ajusta `VITE_API_URL`.

## Build de producción
```bash
npm run build      # genera /dist
npm run preview    # sirve el build localmente
```
El `/dist` es estático: puede hospedarse en S3 + CloudFront (o cualquier hosting estático).
