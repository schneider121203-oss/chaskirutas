# 🗄️ Diseño de Base de Datos — ChaskiRutas

**Motor objetivo:** PostgreSQL 15+  
**Esquema:** `chaski`  
**Versión:** 1.0 · Fecha: 2026-05-10  
**Autor:** Grupo 1 — Innovación y Emprendimiento (FISI-UNMSM)  
**Archivo fuente:** [`chaskirutas_schema (1).sql`](file:///home/jorgedsr/Documentos/Chaskirutas/chaskirutas_schema%20(1).sql)

---

## 📌 Nota Legal Embebida

> [!CAUTION]
> El servicio de auto colectivo está **prohibido en Lima Metropolitana y Callao**. La tabla `routes` incorpora un trigger (`enforce_collective_ban_lima`) que lanza una excepción si se intenta registrar modalidades `COLECTIVO_M1` o `COLECTIVO_M2` en jurisdicciones `ATU_LIMA_CALLAO`. Solo se admiten `TAXI_EJECUTIVO` o `TAXI_REMISSE` bajo regulación de la ATU.

---

## 🏗️ Arquitectura del Esquema

### Estadísticas Generales

| Componente | Cantidad |
|---|---|
| Tablas | **36** |
| Tipos ENUM | **15** |
| Vistas de negocio | **3** |
| Triggers | **1** (blindaje legal Lima) |
| Extensiones requeridas | `uuid-ossp`, `pgcrypto` |
| Extensión recomendada (etapa 2) | `postgis` |

### Extensiones PostgreSQL Requeridas
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";   -- UUIDs v4
CREATE EXTENSION IF NOT EXISTS "pgcrypto";    -- Hashing seguro
-- CREATE EXTENSION IF NOT EXISTS postgis;    -- Etapa 2: Geoespacial
```

---

## 📊 Modelo Relacional — Organización por Dominio

### 1. Catálogos y Tipos Enumerados (15 ENUMs)

| Tipo ENUM | Valores | Uso |
|---|---|---|
| `user_status` | PENDIENTE, ACTIVO, SUSPENDIDO, BLOQUEADO | Estado de la cuenta del usuario |
| `driver_status` | EN_REGISTRO, EN_FORMALIZACION, ACTIVO, SUSPENDIDO, BAJA | Ciclo de vida del conductor |
| `vehicle_status` | EN_REGISTRO, ACTIVO, MANTENIMIENTO, SUSPENDIDO, BAJA | Estado del vehículo |
| `trip_status` | RESERVADO, EN_CAMINO, EN_CURSO, COMPLETADO, CANCELADO_PASAJERO, CANCELADO_CONDUCTOR, NO_SHOW | Ciclo de vida del viaje |
| `booking_status` | PENDIENTE, CONFIRMADO, ABORDADO, COMPLETADO, CANCELADO, NO_SHOW | Estado de la reserva/asiento |
| `payment_method` | TARJETA, YAPE, PLIN, EFECTIVO, BILLETERA_INTERNA | Métodos de pago soportados |
| `payment_status` | PENDIENTE, AUTORIZADO, PAGADO, REEMBOLSADO, FALLIDO | Estado de transacción |
| `invoice_type` | BOLETA, FACTURA, NOTA_CREDITO | Tipo de comprobante SUNAT |
| `route_modality` | TAXI_EJECUTIVO, TAXI_REMISSE, COLECTIVO_M1, COLECTIVO_M2 | Modalidad de servicio |
| `jurisdiction_type` | ATU_LIMA_CALLAO, DRTC, MUNICIPALIDAD_PROVINCIAL, MTC | Autoridad reguladora |
| `document_kind` | DNI, LICENCIA, SOAT, REVISION_TECNICA, TARJETA_PROPIEDAD, TUC, ANTECEDENTES, SEGURO_COMPLEMENTARIO, OTRO | Tipos de documento |
| `incident_type` | SOS, RECLAMO_TARIFA, OBJETO_PERDIDO, CHOQUE, CANCELACION_ABUSIVA, CONDUCTA, OTRO | Tipos de incidente |
| `incident_status` | ABIERTO, EN_REVISION, CERRADO_RESUELTO, CERRADO_DESESTIMADO | Estado del incidente |
| `expense_category` | COMBUSTIBLE, MANTENIMIENTO, REPUESTOS, SEGURO, PEAJE, MULTA, OTRO | Categorías de gasto |
| `settlement_status` | PENDIENTE, PROCESADA, PAGADA, RECHAZADA | Estado de liquidación |

### 2. Ubicaciones y Jurisdicciones (4 tablas)

| Tabla | PK | Descripción | Relaciones |
|---|---|---|---|
| `departments` | SMALLSERIAL | Departamentos del Perú (LIM, ARE, CUS...) | — |
| `provinces` | SERIAL | Provincias dentro de departamentos | → departments |
| `districts` | SERIAL | Distritos dentro de provincias | → provinces |
| `jurisdictions` | SERIAL | Entidades regulatorias B2G (ATU, DRTC, MTC) | → departments, provinces |

### 3. Empresas de Transporte (1 tabla)

| Tabla | PK | Descripción | Campos clave |
|---|---|---|---|
| `companies` | SERIAL | Empresas formalizadoras (ChaskiRutas como SAC) | RUC (CHAR 11, UNIQUE), forma legal, dirección fiscal, representante legal |

### 4. Usuarios, Pasajeros y Conductores (7 tablas)

| Tabla | PK | Tipo PK | Descripción |
|---|---|---|---|
| `users` | UUID | `uuid_generate_v4()` | Base compartida de todos los roles. Teléfono E.164, DNI unique, hash bcrypt |
| `auth_otp_codes` | BIGSERIAL | Secuencial | Códigos OTP para SMS/Email con hash y expiración |
| `user_roles` | Compuesta | (user_id, role) | Roles: PASAJERO, CONDUCTOR, ADMIN, OPERADOR, SUPERVISOR |
| `passengers` | UUID | FK a users | Rating (0-5), viajes totales, dirección casa/trabajo |
| `trusted_contacts` | BIGSERIAL | Secuencial | Contactos SOS del pasajero |
| `drivers` | UUID | FK a users | Licencia, paso formalización (1-6), rating, estado, datos bancarios |
| `driver_affiliations` | BIGSERIAL | Secuencial | Afiliación conductor↔empresa (1:1 vigente, histórico permitido) |

> [!IMPORTANT]
> **Gestión de IDs:** Las tablas principales (`users`, `vehicles`, `trips`) usan UUIDs generados por `uuid-ossp`. Los catálogos (`departments`, `jurisdictions`) usan secuencias enteras (SMALLSERIAL/SERIAL). Mapear correctamente en TypeORM.

### 5. Vehículos y Documentación (2 tablas)

| Tabla | PK | Descripción | Constraints especiales |
|---|---|---|---|
| `vehicles` | UUID | Vehículos registrados | CHECK XOR: `owner_user_id` ó `owner_company_id` (exactamente uno). CHECK: `seats_for_passengers = seats_total - 1` |
| `documents` | BIGSERIAL | Documentos digitalizados (DNI, SOAT, TUC...) | **CHECK polimórfico:** exactamente una FK presente (`user_id` + `vehicle_id` + `company_id` = 1) |

> [!WARNING]
> **Polimorfismo Documental:** La tabla `documents` usa un `CHECK constraint` matemático que asegura que la suma de existencias de `user_id`, `vehicle_id` y `company_id` sea exactamente 1. Al generar inserciones desde el backend, **respetar esta regla de exclusividad**.

### 6. Rutas, Paraderos y Concesiones (5 tablas)

| Tabla | PK | Descripción |
|---|---|---|
| `routes` | SERIAL | Rutas con modalidad, jurisdicción, distancia, tarifa base. **Protegida por trigger legal** |
| `route_concessions` | SERIAL | Autorizaciones del Estado (resolución, vigencia) |
| `stops` | SERIAL | Paraderos con orden secuencial, coordenadas GPS, flag terminal |
| `route_geofences` | SERIAL | Polígonos GeoJSON para geocercas (tolerancia configurable) |
| `route_assignments` | BIGSERIAL | Asignación vehículo + conductor a ruta (rotación con histórico) |

#### Trigger de Blindaje Legal
```sql
CREATE OR REPLACE FUNCTION enforce_collective_ban_lima()
RETURNS TRIGGER AS $$
DECLARE
    j_type jurisdiction_type;
BEGIN
    SELECT type INTO j_type FROM jurisdictions WHERE id = NEW.jurisdiction_id;
    IF j_type = 'ATU_LIMA_CALLAO' AND NEW.modality IN ('COLECTIVO_M1','COLECTIVO_M2') THEN
        RAISE EXCEPTION 'No se puede registrar una ruta colectiva en Lima/Callao.
            El colectivo está prohibido por la ATU; usa modalidad TAXI_EJECUTIVO o TAXI_REMISSE.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

> [!NOTE]
> El backend debe atrapar (`catch`) esta excepción de PostgreSQL y devolver un **HTTP 400** claro al panel de administración.

### 7. Viajes, Reservas y Posiciones (4 tablas)

| Tabla | PK | Descripción | Índices |
|---|---|---|---|
| `trips` | UUID | Viajes con coordenadas, distancia real, duración | `idx_trips_status`, `idx_trips_driver_date`, `idx_trips_route_date` |
| `bookings` | UUID | Reserva = un asiento de un pasajero en un viaje | `idx_bookings_passenger`, `idx_bookings_trip` |
| `trip_locations` | BIGSERIAL | Trazabilidad GPS cada N segundos | `idx_trip_locations_trip_time` |
| `ratings` | BIGSERIAL | Calificaciones cruzadas pasajero↔conductor (1-5 estrellas + tags) | UNIQUE(booking_id, rater_user_id) |

### 8. Pagos y Facturación Electrónica (3 tablas)

| Tabla | PK | Descripción |
|---|---|---|
| `payment_methods` | BIGSERIAL | Métodos tokenizados del usuario (Visa, Yape, Plin...) |
| `payments` | UUID | Transacciones con PSP (provider, transaction_id, response JSONB) |
| `invoices` | UUID | Boletas/Facturas SUNAT (series, XML, PDF, hash, estado SUNAT) |

### 9. Ingresos, Gastos y Liquidaciones del Conductor (3 tablas)

| Tabla | PK | Descripción |
|---|---|---|
| `driver_earnings` | BIGSERIAL | Línea contable por viaje: bruto - comisión Chaski - aporte empresa = neto |
| `driver_expenses` | BIGSERIAL | Gastos auto-registrados: combustible, peajes, mantenimiento |
| `settlements` | UUID | Liquidaciones semanales: agrupación de earnings → pago al banco |

### 10. Incidentes, SOS y Talleres (4 tablas)

| Tabla | PK | Descripción |
|---|---|---|
| `incidents` | UUID | Incidentes con tipo, severidad (1-5), ubicación GPS, flag PNP |
| `incident_attachments` | BIGSERIAL | Adjuntos: audio, video, fotos del incidente |
| `workshops` | SERIAL | Red de talleres afiliados con descuento y rating |
| `workshop_services` | BIGSERIAL | Citas/servicios realizados a un vehículo en un taller |

### 11. Interfaces B2G — Reportes a ATU/MTC/DRTC (2 tablas)

| Tabla | PK | Descripción |
|---|---|---|
| `b2g_reports` | UUID | Reportes mensuales generados para jurisdicciones (viajes, flota, incidentes, boletas) |
| `b2g_api_access_log` | BIGSERIAL | Auditoría de uso de la API B2G por entidades externas |

### 12. Notificaciones y Auditoría (2 tablas)

| Tabla | PK | Descripción |
|---|---|---|
| `notifications` | BIGSERIAL | Push, SMS, Email, In-App con data JSONB |
| `audit_log` | BIGSERIAL | Log de acciones: actor, entidad, estado antes/después, IP |

---

## 📈 Vistas de Negocio (3 vistas)

> [!TIP]
> Para los dashboards del panel de administración web, **no hagas queries complejos desde cero**. Consume directamente estas vistas optimizadas.

### `v_driver_daily_earnings`
Resumen diario de ingresos por conductor.
```sql
SELECT driver_id, DATE(earned_at) AS day,
       COUNT(*) AS trips_count,
       SUM(gross_pen), SUM(platform_fee_pen),
       SUM(affiliation_fee_pen), SUM(net_pen)
FROM driver_earnings GROUP BY driver_id, DATE(earned_at);
```

### `v_vehicle_compliance`
Cumplimiento documental por vehículo (SOAT, revisión técnica, TUC vigentes y verificados).
```sql
SELECT v.id, v.plate, v.affiliated_company_id,
       BOOL_OR(d.kind='SOAT' AND d.is_verified AND d.expires_at >= CURRENT_DATE) AS soat_ok,
       BOOL_OR(d.kind='REVISION_TECNICA' ...) AS revtec_ok,
       BOOL_OR(d.kind='TUC' ...) AS tuc_ok
FROM vehicles v LEFT JOIN documents d ON d.vehicle_id = v.id
GROUP BY v.id, v.plate, v.affiliated_company_id;
```

### `v_route_demand_30d`
Demanda por ruta en los últimos 30 días (viajes, ingresos, rating promedio).
```sql
SELECT r.id, r.code, r.name,
       COUNT(t.id) AS trips,
       COALESCE(SUM(b.total_pen),0) AS gross_pen,
       COALESCE(AVG(rt.score),0)::NUMERIC(3,2) AS avg_rating
FROM routes r
LEFT JOIN trips t ON t.route_id = r.id AND t.scheduled_departure >= NOW() - INTERVAL '30 days'
LEFT JOIN bookings b ON b.trip_id = t.id AND b.status = 'COMPLETADO'
LEFT JOIN ratings rt ON rt.booking_id = b.id AND rt.role_of_rater = 'PASAJERO'
GROUP BY r.id, r.code, r.name;
```

---

## 🔒 Roles de Base de Datos (Seguridad por capas)

| Rol | Permisos | Uso |
|---|---|---|
| `chaski_app` | `SELECT`, `INSERT`, `UPDATE` en tablas operativas | API backend (app móvil) |
| `chaski_admin` | `ALL PRIVILEGES` en esquema `chaski` | Panel de administración |
| `chaski_b2g` | `SELECT` en tablas de auditoría y reportes | Portal gobierno (solo lectura) |
| `chaski_dba` | `SUPERUSER` | Migraciones y mantenimiento |

---

## 🎯 Directivas para el Backend (TypeORM/NestJS)

1. **Motor y Entorno:** Todo el código backend debe estar optimizado para PostgreSQL 15+ y apuntar estrictamente al esquema `chaski`
2. **Gestión de IDs:** Mapear correctamente UUIDs (`uuid-ossp`) para tablas principales (`users`, `vehicles`, `trips`) y secuencias enteras para catálogos (`departments`, `jurisdictions`)
3. **Restricción Legal:** Atrapar la excepción del trigger `enforce_collective_ban_lima` y devolver HTTP 400
4. **Polimorfismo Documental:** Respetar la regla CHECK de exclusividad en `documents` (exactamente una FK presente)
5. **Vistas optimizadas:** Consumir `v_driver_daily_earnings`, `v_vehicle_compliance` y `v_route_demand_30d` para dashboards
6. **Contraseñas:** Hash bcrypt, nunca almacenar en texto plano
7. **RENIEC:** Cachear respuestas en Redis (TTL 24h) para no saturar la API

---

## 🌱 Data Semilla Incluida

El script incluye seeds mínimos para desarrollo:

```sql
-- Departamentos
INSERT INTO departments (code, name) VALUES
    ('LIM','Lima'),('CAL','Callao'),('ARE','Arequipa'),
    ('CUS','Cusco'),('LAL','La Libertad'),('LAM','Lambayeque');

-- Jurisdicciones
INSERT INTO jurisdictions (type, name, has_data_sharing_agreement) VALUES
    ('ATU_LIMA_CALLAO','Autoridad de Transporte Urbano (ATU)', TRUE),
    ('MTC','Ministerio de Transportes y Comunicaciones', TRUE), ...

-- Empresa principal
INSERT INTO companies (legal_name, trade_name, ruc, legal_form, fiscal_address) VALUES
    ('CHASKIRUTAS PROVINCIAS S.A.C.','ChaskiRutas','20512345678','SAC','Av. La Marina 234, Lima');
```

Adicionalmente, cargar los **10 archivos CSV** provistos como data semilla adicional:
- `usuarios.csv`, `conductores.csv`, `vehiculos.csv`, `distritos_lima.csv`
- `rutas_taxi_lima.csv`, `rutas_colectivo_provincia.csv`, `pasos_formalizacion.csv`
- `tarifas_config.csv`, `programa_lealtad.csv`, `promociones.csv`, `documentos.csv`