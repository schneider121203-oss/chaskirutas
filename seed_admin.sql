-- =====================================================================
-- ChaskiRutas — Seed de cuentas de BACKOFFICE (ADMIN / OPERADOR / SUPERVISOR)
-- El schema base no siembra usuarios; estos son necesarios para el panel web.
-- Login: por OTP. El código en desarrollo es SIEMPRE 1234.
--   ADMIN      → teléfono +51900000000
--   OPERADOR   → teléfono +51900000001
--   SUPERVISOR → teléfono +51900000002
-- Ejecutar:  psql "<CONNECTION_STRING>" -f seed_admin.sql
-- =====================================================================
SET search_path TO chaski;

-- password_hash es NOT NULL pero el login es por OTP (nunca se valida la clave).
-- Este hash corresponde a un valor cualquiera ('changeme').
INSERT INTO users (id, phone_e164, password_hash, full_name, dni, status, phone_verified_at)
VALUES
  ('00000000-0000-0000-0000-0000000000a1', '+51900000000',
   '$2b$10$abcdefghijklmnopqrstuv0123456789ABCDEFGHIJKLMNOPQRSTU', 'Admin ChaskiRutas', 'ADM00000', 'ACTIVO', NOW()),
  ('00000000-0000-0000-0000-0000000000a2', '+51900000001',
   '$2b$10$abcdefghijklmnopqrstuv0123456789ABCDEFGHIJKLMNOPQRSTU', 'Operador ChaskiRutas', 'OPE00000', 'ACTIVO', NOW()),
  ('00000000-0000-0000-0000-0000000000a3', '+51900000002',
   '$2b$10$abcdefghijklmnopqrstuv0123456789ABCDEFGHIJKLMNOPQRSTU', 'Supervisor ChaskiRutas', 'SUP00000', 'ACTIVO', NOW())
ON CONFLICT (phone_e164) DO NOTHING;

INSERT INTO user_roles (user_id, role)
VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'ADMIN'),
  ('00000000-0000-0000-0000-0000000000a2', 'OPERADOR'),
  ('00000000-0000-0000-0000-0000000000a3', 'SUPERVISOR')
ON CONFLICT (user_id, role) DO NOTHING;
