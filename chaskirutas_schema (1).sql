-- =====================================================================
-- ChaskiRutas — Diseño de Base de Datos (Primera Etapa)
-- Motor objetivo: PostgreSQL 15+
-- Versión: 1.0  ·  Fecha: 2026-05-10
-- Autor: Grupo 1 — Innovación y Emprendimiento (FISI)
--
-- NOTA LEGAL EMBEBIDA:
--   El servicio de auto colectivo está prohibido en Lima Metropolitana
--   y Callao. La tabla `routes` incorpora un CHECK que impide registrar
--   modalidades 'COLECTIVO_M1' o 'COLECTIVO_M2' en jurisdicciones de
--   Lima/Callao. En esas jurisdicciones solo se admite TAXI_EJECUTIVO
--   o TAXI_REMISSE bajo regulación de la ATU.
-- =====================================================================

-- Limpieza para entornos de desarrollo
DROP SCHEMA IF EXISTS chaski CASCADE;
CREATE SCHEMA chaski;
SET search_path TO chaski;

-- Extensiones útiles
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- CREATE EXTENSION IF NOT EXISTS postgis;  -- (recomendado para etapa 2)


-- =====================================================================
-- 1. CATÁLOGOS Y TIPOS ENUMERADOS
-- =====================================================================

CREATE TYPE user_status      AS ENUM ('PENDIENTE','ACTIVO','SUSPENDIDO','BLOQUEADO');
CREATE TYPE driver_status    AS ENUM ('EN_REGISTRO','EN_FORMALIZACION','ACTIVO','SUSPENDIDO','BAJA');
CREATE TYPE vehicle_status   AS ENUM ('EN_REGISTRO','ACTIVO','MANTENIMIENTO','SUSPENDIDO','BAJA');
CREATE TYPE trip_status      AS ENUM ('RESERVADO','EN_CAMINO','EN_CURSO','COMPLETADO','CANCELADO_PASAJERO','CANCELADO_CONDUCTOR','NO_SHOW');
CREATE TYPE booking_status   AS ENUM ('PENDIENTE','CONFIRMADO','ABORDADO','COMPLETADO','CANCELADO','NO_SHOW');
CREATE TYPE payment_method   AS ENUM ('TARJETA','YAPE','PLIN','EFECTIVO','BILLETERA_INTERNA');
CREATE TYPE payment_status   AS ENUM ('PENDIENTE','AUTORIZADO','PAGADO','REEMBOLSADO','FALLIDO');
CREATE TYPE invoice_type     AS ENUM ('BOLETA','FACTURA','NOTA_CREDITO');
CREATE TYPE route_modality   AS ENUM ('TAXI_EJECUTIVO','TAXI_REMISSE','COLECTIVO_M1','COLECTIVO_M2');
CREATE TYPE jurisdiction_type AS ENUM ('ATU_LIMA_CALLAO','DRTC','MUNICIPALIDAD_PROVINCIAL','MTC');
CREATE TYPE document_kind    AS ENUM ('DNI','LICENCIA','SOAT','REVISION_TECNICA','TARJETA_PROPIEDAD','TUC','ANTECEDENTES','SEGURO_COMPLEMENTARIO','OTRO');
CREATE TYPE incident_type    AS ENUM ('SOS','RECLAMO_TARIFA','OBJETO_PERDIDO','CHOQUE','CANCELACION_ABUSIVA','CONDUCTA','OTRO');
CREATE TYPE incident_status  AS ENUM ('ABIERTO','EN_REVISION','CERRADO_RESUELTO','CERRADO_DESESTIMADO');
CREATE TYPE expense_category AS ENUM ('COMBUSTIBLE','MANTENIMIENTO','REPUESTOS','SEGURO','PEAJE','MULTA','OTRO');
CREATE TYPE settlement_status AS ENUM ('PENDIENTE','PROCESADA','PAGADA','RECHAZADA');


-- =====================================================================
-- 2. UBICACIONES Y JURISDICCIONES
-- =====================================================================

CREATE TABLE departments (
    id              SMALLSERIAL PRIMARY KEY,
    code            VARCHAR(4)  NOT NULL UNIQUE,   -- ej. 'LIM','ARE','CUS'
    name            VARCHAR(60) NOT NULL UNIQUE
);

CREATE TABLE provinces (
    id              SERIAL PRIMARY KEY,
    department_id   SMALLINT NOT NULL REFERENCES departments(id),
    code            VARCHAR(8) NOT NULL UNIQUE,
    name            VARCHAR(80) NOT NULL,
    UNIQUE (department_id, name)
);

CREATE TABLE districts (
    id              SERIAL PRIMARY KEY,
    province_id     INT NOT NULL REFERENCES provinces(id),
    code            VARCHAR(10) NOT NULL UNIQUE,
    name            VARCHAR(80) NOT NULL,
    UNIQUE (province_id, name)
);

-- Entidades regulatorias con las que tenemos convenio (B2G)
CREATE TABLE jurisdictions (
    id              SERIAL PRIMARY KEY,
    type            jurisdiction_type NOT NULL,
    name            VARCHAR(120) NOT NULL,         -- 'ATU', 'DRTC Arequipa', 'Munic. Prov. Cusco'
    department_id   SMALLINT REFERENCES departments(id),
    province_id     INT REFERENCES provinces(id),
    contact_email   VARCHAR(120),
    has_data_sharing_agreement BOOLEAN NOT NULL DEFAULT FALSE,
    agreement_signed_at TIMESTAMP,
    notes           TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);


-- =====================================================================
-- 3. EMPRESAS DE TRANSPORTE (la propia ChaskiRutas y futuras filiales)
-- =====================================================================

CREATE TABLE companies (
    id              SERIAL PRIMARY KEY,
    legal_name      VARCHAR(180) NOT NULL,
    trade_name      VARCHAR(120),
    ruc             CHAR(11) NOT NULL UNIQUE,
    legal_form      VARCHAR(20),                   -- 'SAC','EIRL','SRL'
    fiscal_address  VARCHAR(200),
    province_id     INT REFERENCES provinces(id),
    legal_rep_name  VARCHAR(120),
    legal_rep_dni   VARCHAR(12),
    contact_phone   VARCHAR(20),
    contact_email   VARCHAR(120),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE companies IS 'Empresas formalizadoras. ChaskiRutas opera como persona jurídica que afilia conductores y vehículos.';


-- =====================================================================
-- 4. USUARIOS, PASAJEROS Y CONDUCTORES
-- =====================================================================

-- Usuarios base — un correo/celular único compartido por todos los roles
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(120) UNIQUE,
    phone_e164      VARCHAR(20)  UNIQUE NOT NULL,   -- formato +51XXXXXXXXX
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(160) NOT NULL,
    dni             VARCHAR(12)  UNIQUE NOT NULL,
    birth_date      DATE,
    photo_url       VARCHAR(255),
    status          user_status  NOT NULL DEFAULT 'PENDIENTE',
    email_verified_at TIMESTAMP,
    phone_verified_at TIMESTAMP,
    last_login_at   TIMESTAMP,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMP
);
CREATE INDEX idx_users_dni    ON users(dni);
CREATE INDEX idx_users_phone  ON users(phone_e164);

-- Códigos OTP para verificación (SMS/email)
CREATE TABLE auth_otp_codes (
    id              BIGSERIAL PRIMARY KEY,
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    channel         VARCHAR(10) NOT NULL CHECK (channel IN ('SMS','EMAIL')),
    code_hash       VARCHAR(255) NOT NULL,
    sent_to         VARCHAR(120) NOT NULL,
    expires_at      TIMESTAMP NOT NULL,
    consumed_at     TIMESTAMP,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Roles del sistema (un usuario puede ser pasajero y conductor)
CREATE TABLE user_roles (
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role            VARCHAR(20) NOT NULL CHECK (role IN ('PASAJERO','CONDUCTOR','ADMIN','OPERADOR','SUPERVISOR')),
    granted_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, role)
);

-- Perfil pasajero
CREATE TABLE passengers (
    user_id         UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    rating_avg      NUMERIC(3,2) NOT NULL DEFAULT 5.00 CHECK (rating_avg BETWEEN 0 AND 5),
    total_trips     INT NOT NULL DEFAULT 0,
    preferred_payment_method_id BIGINT,            -- FK definida luego
    home_address    VARCHAR(200),
    work_address    VARCHAR(200),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Contactos de confianza para SOS
CREATE TABLE trusted_contacts (
    id              BIGSERIAL PRIMARY KEY,
    passenger_id    UUID NOT NULL REFERENCES passengers(user_id) ON DELETE CASCADE,
    full_name       VARCHAR(120) NOT NULL,
    relationship    VARCHAR(40),
    phone_e164      VARCHAR(20) NOT NULL,
    is_primary      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Perfil conductor
CREATE TABLE drivers (
    user_id             UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    license_number      VARCHAR(20) UNIQUE NOT NULL,
    license_class       VARCHAR(10) NOT NULL,        -- 'A-IIa','A-IIIa', etc.
    license_expires_at  DATE NOT NULL,
    ruc_personal        CHAR(11),                    -- RUC del conductor (para boletas)
    record_status       VARCHAR(40) DEFAULT 'OK',    -- récord MTC/SUTRAN
    formalization_step  SMALLINT NOT NULL DEFAULT 1 CHECK (formalization_step BETWEEN 1 AND 6),
    formalization_pct   SMALLINT NOT NULL DEFAULT 0 CHECK (formalization_pct BETWEEN 0 AND 100),
    rating_avg          NUMERIC(3,2) NOT NULL DEFAULT 5.00 CHECK (rating_avg BETWEEN 0 AND 5),
    total_trips         INT NOT NULL DEFAULT 0,
    status              driver_status NOT NULL DEFAULT 'EN_REGISTRO',
    bank_name           VARCHAR(40),
    bank_account_masked VARCHAR(30),
    bank_account_cci    VARCHAR(30),
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_drivers_status ON drivers(status);

-- Afiliación conductor ↔ empresa (1:1 vigente, histórico permitido)
CREATE TABLE driver_affiliations (
    id              BIGSERIAL PRIMARY KEY,
    driver_id       UUID NOT NULL REFERENCES drivers(user_id),
    company_id      INT  NOT NULL REFERENCES companies(id),
    contract_url    VARCHAR(255),
    monthly_fee_pen NUMERIC(8,2) NOT NULL DEFAULT 0,
    started_at      DATE NOT NULL,
    ended_at        DATE,
    is_current      BOOLEAN GENERATED ALWAYS AS (ended_at IS NULL) STORED,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX uq_driver_current_affiliation
    ON driver_affiliations(driver_id) WHERE ended_at IS NULL;


-- =====================================================================
-- 5. VEHÍCULOS Y DOCUMENTACIÓN
-- =====================================================================

CREATE TABLE vehicles (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plate           VARCHAR(10) NOT NULL UNIQUE,
    owner_user_id   UUID REFERENCES users(id),       -- dueño puede ser persona natural
    owner_company_id INT  REFERENCES companies(id),  -- o empresa
    brand           VARCHAR(40) NOT NULL,
    model           VARCHAR(60) NOT NULL,
    year            SMALLINT NOT NULL CHECK (year BETWEEN 2000 AND 2100),
    color           VARCHAR(30),
    seats_total     SMALLINT NOT NULL CHECK (seats_total BETWEEN 2 AND 9),
    seats_for_passengers SMALLINT NOT NULL,          -- excluye al conductor
    fuel_type       VARCHAR(20) DEFAULT 'GASOLINA',
    odometer_km     INT,
    status          vehicle_status NOT NULL DEFAULT 'EN_REGISTRO',
    affiliated_company_id INT NOT NULL REFERENCES companies(id),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    CHECK ( (owner_user_id IS NOT NULL) <> (owner_company_id IS NOT NULL) ),
    CHECK ( seats_for_passengers = seats_total - 1 )
);
CREATE INDEX idx_vehicles_company ON vehicles(affiliated_company_id);

-- Documentos digitalizados (DNI, SOAT, RT, TUC, etc.)
CREATE TABLE documents (
    id              BIGSERIAL PRIMARY KEY,
    kind            document_kind NOT NULL,
    -- exactamente una de estas tres FK debe estar presente
    user_id         UUID REFERENCES users(id),
    vehicle_id      UUID REFERENCES vehicles(id),
    company_id      INT  REFERENCES companies(id),
    document_number VARCHAR(40),
    file_url        VARCHAR(255),
    issued_at       DATE,
    expires_at      DATE,
    issuing_entity  VARCHAR(80),                     -- 'SBS','MTC','SUTRAN'...
    is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
    verified_by     UUID REFERENCES users(id),
    verified_at     TIMESTAMP,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    CHECK (
        (CASE WHEN user_id    IS NOT NULL THEN 1 ELSE 0 END)
      + (CASE WHEN vehicle_id IS NOT NULL THEN 1 ELSE 0 END)
      + (CASE WHEN company_id IS NOT NULL THEN 1 ELSE 0 END) = 1
    )
);
CREATE INDEX idx_documents_vehicle  ON documents(vehicle_id);
CREATE INDEX idx_documents_user     ON documents(user_id);
CREATE INDEX idx_documents_expires  ON documents(expires_at);


-- =====================================================================
-- 6. RUTAS, PARADEROS Y CONCESIONES
-- =====================================================================

CREATE TABLE routes (
    id              SERIAL PRIMARY KEY,
    code            VARCHAR(10) NOT NULL UNIQUE,     -- 'R-014'
    name            VARCHAR(120) NOT NULL,
    modality        route_modality NOT NULL,
    company_id      INT NOT NULL REFERENCES companies(id),
    jurisdiction_id INT NOT NULL REFERENCES jurisdictions(id),
    origin_district_id      INT NOT NULL REFERENCES districts(id),
    destination_district_id INT NOT NULL REFERENCES districts(id),
    distance_km     NUMERIC(6,2),
    estimated_minutes SMALLINT,
    base_fare_pen   NUMERIC(6,2) NOT NULL CHECK (base_fare_pen >= 0),
    seats_per_unit  SMALLINT NOT NULL DEFAULT 4,
    is_active       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- BLINDAJE LEGAL: prohíbe registrar colectivos en jurisdicción ATU (Lima/Callao)
CREATE OR REPLACE FUNCTION enforce_collective_ban_lima()
RETURNS TRIGGER AS $$
DECLARE
    j_type jurisdiction_type;
BEGIN
    SELECT type INTO j_type FROM jurisdictions WHERE id = NEW.jurisdiction_id;
    IF j_type = 'ATU_LIMA_CALLAO' AND NEW.modality IN ('COLECTIVO_M1','COLECTIVO_M2') THEN
        RAISE EXCEPTION 'No se puede registrar una ruta colectiva en Lima/Callao. El colectivo está prohibido por la ATU; usa modalidad TAXI_EJECUTIVO o TAXI_REMISSE.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_routes_ban_lima_collectivo
BEFORE INSERT OR UPDATE ON routes
FOR EACH ROW EXECUTE FUNCTION enforce_collective_ban_lima();

-- Concesiones / autorizaciones que el Estado otorga a una ruta
CREATE TABLE route_concessions (
    id              SERIAL PRIMARY KEY,
    route_id        INT NOT NULL REFERENCES routes(id),
    issued_by_jurisdiction_id INT NOT NULL REFERENCES jurisdictions(id),
    resolution_number VARCHAR(60),
    issued_at       DATE,
    valid_until     DATE,
    document_url    VARCHAR(255),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE
);

-- Paraderos (orden secuencial dentro de la ruta)
CREATE TABLE stops (
    id              SERIAL PRIMARY KEY,
    route_id        INT NOT NULL REFERENCES routes(id),
    sequence        SMALLINT NOT NULL,
    name            VARCHAR(120) NOT NULL,
    latitude        NUMERIC(9,6) NOT NULL,
    longitude       NUMERIC(9,6) NOT NULL,
    is_terminal     BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE (route_id, sequence)
);

-- Geocercas: polígonos almacenados como GeoJSON (etapa 2 → PostGIS)
CREATE TABLE route_geofences (
    id              SERIAL PRIMARY KEY,
    route_id        INT NOT NULL REFERENCES routes(id),
    polygon_geojson JSONB NOT NULL,
    tolerance_m     SMALLINT NOT NULL DEFAULT 200,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Asignación de un vehículo + conductor a una ruta (puede haber rotación)
CREATE TABLE route_assignments (
    id              BIGSERIAL PRIMARY KEY,
    route_id        INT NOT NULL REFERENCES routes(id),
    vehicle_id      UUID NOT NULL REFERENCES vehicles(id),
    driver_id       UUID NOT NULL REFERENCES drivers(user_id),
    started_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    ended_at        TIMESTAMP,
    is_current      BOOLEAN GENERATED ALWAYS AS (ended_at IS NULL) STORED
);


-- =====================================================================
-- 7. VIAJES, RESERVAS Y POSICIONES
-- =====================================================================

CREATE TABLE trips (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    route_id            INT  NOT NULL REFERENCES routes(id),
    vehicle_id          UUID NOT NULL REFERENCES vehicles(id),
    driver_id           UUID NOT NULL REFERENCES drivers(user_id),
    scheduled_departure TIMESTAMP NOT NULL,
    actual_departure    TIMESTAMP,
    actual_arrival      TIMESTAMP,
    seats_total         SMALLINT NOT NULL,
    seats_available     SMALLINT NOT NULL,
    base_fare_pen       NUMERIC(6,2) NOT NULL,
    status              trip_status NOT NULL DEFAULT 'RESERVADO',
    started_lat         NUMERIC(9,6),
    started_lng         NUMERIC(9,6),
    ended_lat           NUMERIC(9,6),
    ended_lng           NUMERIC(9,6),
    distance_km_real    NUMERIC(6,2),
    duration_minutes_real SMALLINT,
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    CHECK (seats_available BETWEEN 0 AND seats_total)
);
CREATE INDEX idx_trips_status      ON trips(status);
CREATE INDEX idx_trips_driver_date ON trips(driver_id, scheduled_departure);
CREATE INDEX idx_trips_route_date  ON trips(route_id, scheduled_departure);

-- Una reserva = un asiento de un pasajero en un viaje
CREATE TABLE bookings (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id         UUID NOT NULL REFERENCES trips(id),
    passenger_id    UUID NOT NULL REFERENCES passengers(user_id),
    seat_number     SMALLINT NOT NULL CHECK (seat_number BETWEEN 1 AND 8),
    pickup_stop_id  INT REFERENCES stops(id),
    dropoff_stop_id INT REFERENCES stops(id),
    fare_pen        NUMERIC(6,2) NOT NULL,
    insurance_pen   NUMERIC(6,2) NOT NULL DEFAULT 0,
    platform_fee_pen NUMERIC(6,2) NOT NULL DEFAULT 0,
    total_pen       NUMERIC(6,2) NOT NULL,
    status          booking_status NOT NULL DEFAULT 'PENDIENTE',
    booked_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    boarded_at      TIMESTAMP,
    dropped_off_at  TIMESTAMP,
    cancellation_reason VARCHAR(120),
    UNIQUE (trip_id, seat_number)
);
CREATE INDEX idx_bookings_passenger ON bookings(passenger_id);
CREATE INDEX idx_bookings_trip      ON bookings(trip_id);

-- Trazabilidad GPS del viaje (sample cada N segundos)
CREATE TABLE trip_locations (
    id              BIGSERIAL PRIMARY KEY,
    trip_id         UUID NOT NULL REFERENCES trips(id),
    captured_at     TIMESTAMP NOT NULL,
    latitude        NUMERIC(9,6) NOT NULL,
    longitude       NUMERIC(9,6) NOT NULL,
    speed_kmh       NUMERIC(5,2),
    heading_deg     SMALLINT,
    is_inside_geofence BOOLEAN
);
CREATE INDEX idx_trip_locations_trip_time ON trip_locations(trip_id, captured_at);

-- Calificaciones (cruzadas: pasajero ↔ conductor)
CREATE TABLE ratings (
    id              BIGSERIAL PRIMARY KEY,
    booking_id      UUID NOT NULL REFERENCES bookings(id),
    rater_user_id   UUID NOT NULL REFERENCES users(id),
    rated_user_id   UUID NOT NULL REFERENCES users(id),
    role_of_rater   VARCHAR(10) NOT NULL CHECK (role_of_rater IN ('PASAJERO','CONDUCTOR')),
    score           SMALLINT NOT NULL CHECK (score BETWEEN 1 AND 5),
    tags            TEXT[],                          -- ej. ['Puntual','Limpio']
    comment         TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (booking_id, rater_user_id)
);


-- =====================================================================
-- 8. PAGOS Y FACTURACIÓN ELECTRÓNICA
-- =====================================================================

-- Métodos de pago guardados por el usuario (tokenizados)
CREATE TABLE payment_methods (
    id              BIGSERIAL PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    method          payment_method NOT NULL,
    provider        VARCHAR(40),                     -- 'Niubiz','Izipay','Yape','Plin'
    masked_label    VARCHAR(40),                     -- 'Visa •••• 4421'
    token           VARCHAR(255),                    -- token del PSP
    expires_at      DATE,
    is_default      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- FK diferida ahora que payment_methods existe
ALTER TABLE passengers
    ADD CONSTRAINT fk_pass_pref_payment
    FOREIGN KEY (preferred_payment_method_id) REFERENCES payment_methods(id);

CREATE TABLE payments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id      UUID NOT NULL REFERENCES bookings(id),
    payment_method_id BIGINT REFERENCES payment_methods(id),
    method          payment_method NOT NULL,
    amount_pen      NUMERIC(8,2) NOT NULL,
    status          payment_status NOT NULL DEFAULT 'PENDIENTE',
    psp_provider    VARCHAR(40),
    psp_transaction_id VARCHAR(80),
    psp_response    JSONB,
    paid_at         TIMESTAMP,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_payments_booking ON payments(booking_id);

-- Facturación electrónica (SUNAT)
CREATE TABLE invoices (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id      UUID NOT NULL REFERENCES bookings(id),
    company_id      INT  NOT NULL REFERENCES companies(id),
    type            invoice_type NOT NULL DEFAULT 'BOLETA',
    series          VARCHAR(8) NOT NULL,             -- 'B001'
    number          INT NOT NULL,
    issued_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    customer_doc_type VARCHAR(8) NOT NULL,           -- 'DNI','RUC'
    customer_doc    VARCHAR(15) NOT NULL,
    customer_name   VARCHAR(180) NOT NULL,
    subtotal_pen    NUMERIC(8,2) NOT NULL,
    igv_pen         NUMERIC(8,2) NOT NULL,
    total_pen       NUMERIC(8,2) NOT NULL,
    sunat_status    VARCHAR(20) DEFAULT 'PENDIENTE', -- 'PENDIENTE','ACEPTADO','RECHAZADO'
    sunat_response  JSONB,
    pdf_url         VARCHAR(255),
    xml_url         VARCHAR(255),
    UNIQUE (company_id, series, number)
);


-- =====================================================================
-- 9. INGRESOS Y GASTOS DEL CONDUCTOR · LIQUIDACIONES
-- =====================================================================

-- Cada viaje completado genera una línea contable para el conductor
CREATE TABLE driver_earnings (
    id              BIGSERIAL PRIMARY KEY,
    driver_id       UUID NOT NULL REFERENCES drivers(user_id),
    trip_id         UUID NOT NULL REFERENCES trips(id),
    gross_pen       NUMERIC(8,2) NOT NULL,
    platform_fee_pen NUMERIC(8,2) NOT NULL,         -- comisión Chaski
    affiliation_fee_pen NUMERIC(8,2) NOT NULL,      -- aporte a la empresa
    net_pen         NUMERIC(8,2) NOT NULL,
    earned_at       TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_earnings_driver_date ON driver_earnings(driver_id, earned_at);

-- Gastos auto-registrados por el conductor (combustible, peajes, etc.)
CREATE TABLE driver_expenses (
    id              BIGSERIAL PRIMARY KEY,
    driver_id       UUID NOT NULL REFERENCES drivers(user_id),
    vehicle_id      UUID REFERENCES vehicles(id),
    category        expense_category NOT NULL,
    amount_pen      NUMERIC(8,2) NOT NULL,
    receipt_url     VARCHAR(255),
    occurred_at     DATE NOT NULL,
    notes           VARCHAR(200),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_expenses_driver ON driver_expenses(driver_id, occurred_at);

-- Liquidaciones semanales: agrupa earnings y los paga al banco del conductor
CREATE TABLE settlements (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id       UUID NOT NULL REFERENCES drivers(user_id),
    period_start    DATE NOT NULL,
    period_end      DATE NOT NULL,
    trips_count     INT  NOT NULL,
    gross_pen       NUMERIC(10,2) NOT NULL,
    platform_fee_pen NUMERIC(10,2) NOT NULL,
    affiliation_fee_pen NUMERIC(10,2) NOT NULL,
    net_pen         NUMERIC(10,2) NOT NULL,
    bank_name       VARCHAR(40),
    bank_account_masked VARCHAR(30),
    status          settlement_status NOT NULL DEFAULT 'PENDIENTE',
    paid_at         TIMESTAMP,
    bank_reference  VARCHAR(80),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);


-- =====================================================================
-- 10. INCIDENTES, SOS Y TALLERES
-- =====================================================================

CREATE TABLE incidents (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type            incident_type NOT NULL,
    trip_id         UUID REFERENCES trips(id),
    booking_id      UUID REFERENCES bookings(id),
    reporter_user_id UUID NOT NULL REFERENCES users(id),
    target_user_id  UUID REFERENCES users(id),
    occurred_at     TIMESTAMP NOT NULL DEFAULT NOW(),
    latitude        NUMERIC(9,6),
    longitude       NUMERIC(9,6),
    description     TEXT,
    severity        SMALLINT CHECK (severity BETWEEN 1 AND 5),
    status          incident_status NOT NULL DEFAULT 'ABIERTO',
    assigned_to     UUID REFERENCES users(id),
    pnp_notified    BOOLEAN NOT NULL DEFAULT FALSE,
    pnp_case_number VARCHAR(40),
    resolution      TEXT,
    closed_at       TIMESTAMP
);
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_type   ON incidents(type);

-- Adjuntos del incidente (audio, video, fotos)
CREATE TABLE incident_attachments (
    id              BIGSERIAL PRIMARY KEY,
    incident_id     UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    file_url        VARCHAR(255) NOT NULL,
    mime_type       VARCHAR(60),
    uploaded_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Red de talleres afiliados
CREATE TABLE workshops (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(120) NOT NULL,
    address         VARCHAR(200),
    province_id     INT REFERENCES provinces(id),
    latitude        NUMERIC(9,6),
    longitude       NUMERIC(9,6),
    phone           VARCHAR(20),
    discount_pct    SMALLINT NOT NULL DEFAULT 0 CHECK (discount_pct BETWEEN 0 AND 50),
    rating_avg      NUMERIC(3,2) DEFAULT 5.00,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE
);

-- Citas / servicios realizados a un vehículo en un taller
CREATE TABLE workshop_services (
    id              BIGSERIAL PRIMARY KEY,
    workshop_id     INT NOT NULL REFERENCES workshops(id),
    vehicle_id      UUID NOT NULL REFERENCES vehicles(id),
    driver_id       UUID REFERENCES drivers(user_id),
    scheduled_at    TIMESTAMP,
    completed_at    TIMESTAMP,
    description     VARCHAR(200),
    cost_pen        NUMERIC(8,2),
    discount_pen    NUMERIC(8,2),
    odometer_km     INT,
    notes           TEXT
);


-- =====================================================================
-- 11. INTERFACES B2G (Reportes a ATU/MTC/DRTC)
-- =====================================================================

CREATE TABLE b2g_reports (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    jurisdiction_id INT NOT NULL REFERENCES jurisdictions(id),
    report_type     VARCHAR(40) NOT NULL,            -- 'TRIPS_MENSUAL','FLOTA','INCIDENTES_SOS','BOLETAS_SUNAT'
    period_start    DATE,
    period_end      DATE,
    generated_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    sent_at         TIMESTAMP,
    status          VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
    file_url        VARCHAR(255),
    summary         JSONB
);

-- Auditoría de uso de la API B2G por entidades externas
CREATE TABLE b2g_api_access_log (
    id              BIGSERIAL PRIMARY KEY,
    jurisdiction_id INT REFERENCES jurisdictions(id),
    api_key_hash    VARCHAR(255),
    endpoint        VARCHAR(120) NOT NULL,
    method          VARCHAR(10),
    status_code     SMALLINT,
    request_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    response_ms     INT,
    ip_address      VARCHAR(45)
);


-- =====================================================================
-- 12. NOTIFICACIONES Y AUDITORÍA
-- =====================================================================

CREATE TABLE notifications (
    id              BIGSERIAL PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    channel         VARCHAR(10) NOT NULL CHECK (channel IN ('PUSH','SMS','EMAIL','IN_APP')),
    title           VARCHAR(120) NOT NULL,
    body            TEXT,
    data            JSONB,
    read_at         TIMESTAMP,
    sent_at         TIMESTAMP,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_log (
    id              BIGSERIAL PRIMARY KEY,
    actor_user_id   UUID REFERENCES users(id),
    action          VARCHAR(60) NOT NULL,
    entity          VARCHAR(40) NOT NULL,
    entity_id       VARCHAR(60),
    before_state    JSONB,
    after_state     JSONB,
    ip_address      VARCHAR(45),
    occurred_at     TIMESTAMP NOT NULL DEFAULT NOW()
);


-- =====================================================================
-- 13. VISTAS DE NEGOCIO ÚTILES
-- =====================================================================

-- Resumen diario de ingresos por conductor
CREATE OR REPLACE VIEW v_driver_daily_earnings AS
SELECT
    e.driver_id,
    DATE(e.earned_at)            AS day,
    COUNT(*)                     AS trips_count,
    SUM(e.gross_pen)             AS gross_pen,
    SUM(e.platform_fee_pen)      AS platform_fee_pen,
    SUM(e.affiliation_fee_pen)   AS affiliation_fee_pen,
    SUM(e.net_pen)               AS net_pen
FROM driver_earnings e
GROUP BY e.driver_id, DATE(e.earned_at);

-- Cumplimiento documental por vehículo
CREATE OR REPLACE VIEW v_vehicle_compliance AS
SELECT
    v.id,
    v.plate,
    v.affiliated_company_id,
    BOOL_OR(d.kind='SOAT'             AND d.is_verified AND d.expires_at >= CURRENT_DATE) AS soat_ok,
    BOOL_OR(d.kind='REVISION_TECNICA' AND d.is_verified AND d.expires_at >= CURRENT_DATE) AS revtec_ok,
    BOOL_OR(d.kind='TUC'              AND d.is_verified AND d.expires_at >= CURRENT_DATE) AS tuc_ok
FROM vehicles v
LEFT JOIN documents d ON d.vehicle_id = v.id
GROUP BY v.id, v.plate, v.affiliated_company_id;

-- Demanda por ruta (últimos 30 días)
CREATE OR REPLACE VIEW v_route_demand_30d AS
SELECT
    r.id, r.code, r.name,
    COUNT(t.id)                                         AS trips,
    COALESCE(SUM(b.total_pen),0)                        AS gross_pen,
    COALESCE(AVG(rt.score),0)::NUMERIC(3,2)             AS avg_rating
FROM routes r
LEFT JOIN trips    t  ON t.route_id = r.id AND t.scheduled_departure >= NOW() - INTERVAL '30 days'
LEFT JOIN bookings b  ON b.trip_id  = t.id AND b.status = 'COMPLETADO'
LEFT JOIN ratings  rt ON rt.booking_id = b.id AND rt.role_of_rater = 'PASAJERO'
GROUP BY r.id, r.code, r.name;


-- =====================================================================
-- 14. SEEDS MÍNIMOS PARA DESARROLLO
-- =====================================================================

INSERT INTO departments (code, name) VALUES
    ('LIM','Lima'),('CAL','Callao'),('ARE','Arequipa'),
    ('CUS','Cusco'),('LAL','La Libertad'),('LAM','Lambayeque');

INSERT INTO jurisdictions (type, name, has_data_sharing_agreement) VALUES
    ('ATU_LIMA_CALLAO','Autoridad de Transporte Urbano (ATU)', TRUE),
    ('MTC','Ministerio de Transportes y Comunicaciones', TRUE),
    ('DRTC','DRTC Arequipa', TRUE),
    ('DRTC','DRTC La Libertad', FALSE),
    ('DRTC','DRTC Lambayeque', TRUE),
    ('MUNICIPALIDAD_PROVINCIAL','Municipalidad Provincial del Cusco', TRUE);

INSERT INTO companies (legal_name, trade_name, ruc, legal_form, fiscal_address) VALUES
    ('CHASKIRUTAS PROVINCIAS S.A.C.','ChaskiRutas','20512345678','SAC','Av. La Marina 234, Lima');

-- =====================================================================
-- 15. SEED PROVINCES, DISTRICTS AND ROUTES
-- =====================================================================

INSERT INTO provinces (id, department_id, code, name) VALUES 
    (1, 1, 'PRV-LIM', 'Lima');

INSERT INTO districts (id, province_id, code, name) VALUES
    (1, 1, 'DST-01', 'San Isidro'),
    (2, 1, 'DST-02', 'Miraflores'),
    (3, 1, 'DST-03', 'Surco'),
    (4, 1, 'DST-04', 'San Borja'),
    (5, 1, 'DST-05', 'La Molina'),
    (6, 1, 'DST-06', 'Callao'),
    (7, 1, 'DST-07', 'Los Olivos'),
    (8, 1, 'DST-08', 'SMP'),
    (9, 1, 'DST-09', 'Ate'),
    (10, 1, 'DST-10', 'SJL'),
    (11, 1, 'DST-11', 'Cercado de Lima'),
    (12, 1, 'DST-12', 'Barranco'),
    (13, 1, 'DST-13', 'Jesús María'),
    (14, 1, 'DST-14', 'Lince'),
    (15, 1, 'DST-15', 'Pueblo Libre'),
    (16, 1, 'DST-16', 'Rímac'),
    (17, 1, 'DST-17', 'Villa El Salvador'),
    (18, 1, 'DST-18', 'Chorrillos'),
    (19, 1, 'DST-19', 'Breña'),
    (20, 1, 'DST-20', 'Independencia');

INSERT INTO routes (id, code, name, modality, company_id, jurisdiction_id, origin_district_id, destination_district_id, distance_km, estimated_minutes, base_fare_pen, seats_per_unit, is_active) VALUES
    (1, 'TX-01', 'San Isidro -> Miraflores', 'TAXI_EJECUTIVO', 1, 1, 1, 2, 5.2, 15, 8.50, 4, true),
    (2, 'TX-02', 'Surco -> San Borja', 'TAXI_EJECUTIVO', 1, 1, 3, 4, 4.1, 12, 7.00, 4, true),
    (3, 'TX-03', 'Callao -> Centro de Lima', 'TAXI_EJECUTIVO', 1, 1, 6, 11, 11.8, 25, 12.00, 4, true),
    (4, 'TX-04', 'Los Olivos -> SMP', 'TAXI_EJECUTIVO', 1, 1, 7, 8, 3.5, 10, 6.00, 4, true),
    (5, 'TX-05', 'Ate -> La Molina', 'TAXI_EJECUTIVO', 1, 1, 9, 5, 7.3, 18, 9.00, 4, true),
    (6, 'TX-06', 'SJL -> Rímac', 'TAXI_EJECUTIVO', 1, 1, 10, 16, 9.1, 22, 8.00, 4, true),
    (7, 'TX-07', 'Villa El Salvador -> Barranco', 'TAXI_EJECUTIVO', 1, 1, 17, 12, 14.2, 30, 11.00, 4, true);

-- Ajustar secuencias
SELECT setval('provinces_id_seq', 2);
SELECT setval('districts_id_seq', 21);
SELECT setval('routes_id_seq', 8);

-- =====================================================================
-- FIN DEL SCRIPT
-- =====================================================================
