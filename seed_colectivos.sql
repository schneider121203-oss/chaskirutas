-- =====================================================================
-- ChaskiRutas — Seed de COLECTIVOS PROVINCIALES (fuera de Lima/Callao)
-- El schema base solo siembra taxis de Lima; esto agrega las rutas de
-- colectivo interprovincial que exige el módulo de colectivos.
-- Ejecutar: docker exec -i chaskirutas-db-local psql -U chaski_dba -d chaskirutas < seed_colectivos.sql
-- =====================================================================
SET search_path TO chaski;

-- Provincias (departamentos ya sembrados: Arequipa=3, Cusco=4, La Libertad=5)
INSERT INTO provinces (id, department_id, code, name) VALUES
  (2, 3, 'PRV-ARE', 'Arequipa'),
  (3, 4, 'PRV-CUS', 'Cusco'),
  (4, 5, 'PRV-TRU', 'Trujillo')
ON CONFLICT (id) DO NOTHING;

-- Distritos provinciales
INSERT INTO districts (id, province_id, code, name) VALUES
  (21, 2, 'ARE-CER', 'Arequipa Cercado'),
  (22, 2, 'ARE-CAY', 'Cayma'),
  (23, 2, 'ARE-MOL', 'Mollendo'),
  (24, 3, 'CUS-CUS', 'Cusco'),
  (25, 3, 'CUS-WAN', 'Wanchaq'),
  (26, 3, 'CUS-URU', 'Urubamba'),
  (27, 4, 'TRU-TRU', 'Trujillo'),
  (28, 4, 'TRU-VLH', 'Víctor Larco'),
  (29, 4, 'TRU-HUA', 'Huanchaco')
ON CONFLICT (id) DO NOTHING;

-- Rutas de COLECTIVO (jurisdicciones DRTC/Municipalidad — NUNCA ATU Lima/Callao).
-- El trigger enforce_collective_ban_lima permite estas por no ser ATU.
INSERT INTO routes (id, code, name, modality, company_id, jurisdiction_id, origin_district_id, destination_district_id, distance_km, estimated_minutes, base_fare_pen, seats_per_unit, is_active) VALUES
  (8,  'COL-01', 'Arequipa → Mollendo',   'COLECTIVO_M1', 1, 3, 21, 23, 120.0, 120, 25.00, 11, TRUE),
  (9,  'COL-02', 'Arequipa → Cayma',      'COLECTIVO_M2', 1, 3, 21, 22,   8.0,  20,  5.00,  6, TRUE),
  (10, 'COL-03', 'Cusco → Urubamba',      'COLECTIVO_M1', 1, 6, 24, 26,  60.0,  90, 15.00, 11, TRUE),
  (11, 'COL-04', 'Cusco → Wanchaq',       'COLECTIVO_M2', 1, 6, 24, 25,   5.0,  15,  4.00,  6, TRUE),
  (12, 'COL-05', 'Trujillo → Huanchaco',  'COLECTIVO_M1', 1, 4, 27, 29,  14.0,  30,  8.00, 11, TRUE)
ON CONFLICT (id) DO NOTHING;

-- Reajustar la secuencia de routes para no chocar con futuros inserts
SELECT setval(pg_get_serial_sequence('routes','id'), (SELECT MAX(id) FROM routes));
