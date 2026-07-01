#!/usr/bin/env bash
set -euo pipefail

# =====================================================================
# ChaskiRutas — 02-deploy.sh
# Despliega (o actualiza) el backend NestJS en la EC2.
# Ejecutar después de 01-provision.sh y cuando RDS esté 'available'.
# =====================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/config.env"

echo "🚀 ChaskiRutas — Desplegando backend en EC2"

# --- Cargar estado ---
if [ ! -f "$STATE_FILE" ]; then
    echo "❌ No se encontró state.json. Ejecuta primero: ./01-provision.sh"
    exit 1
fi

EC2_ID=$(jq -r '.ec2_instance_id' "$STATE_FILE")
RDS_ID=$(jq -r '.rds_identifier' "$STATE_FILE")
S3_BUCKET=$(jq -r '.s3_bucket' "$STATE_FILE")

# --- Obtener IP pública de EC2 ---
EC2_IP=$(aws ec2 describe-instances \
    --region "$AWS_REGION" \
    --instance-ids "$EC2_ID" \
    --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)

if [ "$EC2_IP" = "None" ] || [ -z "$EC2_IP" ]; then
    echo "❌ EC2 no tiene IP pública. ¿Está encendida? Ejecuta: ./start.sh"
    exit 1
fi
echo "   EC2 IP: ${EC2_IP}"

# --- Obtener endpoint de RDS ---
RDS_ENDPOINT=$(aws rds describe-db-instances \
    --region "$AWS_REGION" \
    --db-instance-identifier "$RDS_ID" \
    --query 'DBInstances[0].Endpoint.Address' --output text)

if [ "$RDS_ENDPOINT" = "None" ] || [ -z "$RDS_ENDPOINT" ]; then
    echo "❌ RDS no tiene endpoint. ¿Está disponible? Ejecuta: ./status.sh"
    exit 1
fi
echo "   RDS Endpoint: ${RDS_ENDPOINT}"

# --- Generar .env para la API ---
ENV_CONTENT=$(cat <<EOF
# ChaskiRutas — Variables de entorno (generado por deploy.sh)
NODE_ENV=production
PORT=3000

# Base de datos
DATABASE_URL=postgresql://${RDS_MASTER_USER}:${RDS_MASTER_PASSWORD}@${RDS_ENDPOINT}:5432/${RDS_DB_NAME}
DB_SCHEMA=chaski

# Redis (local en la misma EC2)
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=$(openssl rand -hex 32)
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# AWS S3
AWS_S3_BUCKET=${S3_BUCKET}
AWS_REGION=${AWS_REGION}

# Integraciones externas (llenar manualmente)
RENIEC_API_URL=https://apidni.com/api/v1
RENIEC_API_TOKEN=TU_TOKEN_AQUI
CULQI_PUBLIC_KEY=pk_test_XXXXX
CULQI_SECRET_KEY=sk_test_XXXXX

# SUNAT / Nubefact
NUBEFACT_URL=https://api.nubefact.com/api/v1
NUBEFACT_TOKEN=TU_TOKEN_AQUI
EOF
)

echo "   📄 Generando .env..."

# --- Subir .env y schema SQL a EC2 ---
SSH_OPTS="-i ${EC2_KEY_FILE} -o StrictHostKeyChecking=no -o ConnectTimeout=10"

echo "   📦 Empaquetando código NestJS local..."
tar -czf "${SCRIPT_DIR}/backend.tar.gz" -C "${SCRIPT_DIR}/../backend" --exclude=node_modules --exclude=dist --exclude=.env .

echo "   📤 Subiendo archivos y código a EC2..."
echo "$ENV_CONTENT" | ssh $SSH_OPTS ubuntu@${EC2_IP} "cat > /opt/chaskirutas/.env"

# Subir schema SQL y código empaquetado
scp $SSH_OPTS "${SCRIPT_DIR}/../chaskirutas_schema (1).sql" ubuntu@${EC2_IP}:/opt/chaskirutas/schema.sql
scp $SSH_OPTS "${SCRIPT_DIR}/backend.tar.gz" ubuntu@${EC2_IP}:/opt/chaskirutas/backend.tar.gz

# Limpiar localmente
rm -f "${SCRIPT_DIR}/backend.tar.gz"

# --- Ejecutar setup en EC2 ---
echo "   ⚙️  Desplegando y compilando en servidor remoto..."
ssh $SSH_OPTS ubuntu@${EC2_IP} bash <<'REMOTE_SETUP'
set -e
cd /opt/chaskirutas

# Extraer el código
echo "   📦 Extrayendo código NestJS..."
tar -xzf backend.tar.gz
rm -f backend.tar.gz

# Verificar que Node y Redis están corriendo
echo "   Node.js: $(node --version 2>/dev/null || echo 'NO INSTALADO')"
echo "   Redis:   $(redis-cli ping 2>/dev/null || echo 'NO CORRIENDO')"

# Instalar psql client para ejecutar el schema
sudo apt-get install -y postgresql-client -qq 2>/dev/null

# Cargar variables
source .env

# Ejecutar schema SQL en RDS (solo si no se ha ejecutado)
echo "   🐘 Ejecutando schema SQL en RDS..."
psql "$DATABASE_URL" -f schema.sql 2>&1 || echo "   ⚠️  Schema ya existía o hubo un error parcial"

# Instalar dependencias y compilar
echo "   📦 Instalando dependencias NPM..."
npm install --quiet

echo "   🏗️  Compilando aplicación NestJS..."
npm run build

# Iniciar con PM2
echo "   🚀 Iniciando/Reiniciando API con PM2..."
pm2 describe chaskirutas-api >/dev/null 2>&1 && pm2 restart chaskirutas-api || pm2 start dist/main.js --name chaskirutas-api
pm2 save

echo "   ✅ Despliegue del servidor NestJS completado con éxito"
REMOTE_SETUP

echo ""
echo "═══════════════════════════════════════════════════════"
echo "🎉 ¡Deploy completado!"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "📋 Conexiones:"
echo "   API:      http://${EC2_IP}:3000"
echo "   SSH:      ssh -i ${EC2_KEY_FILE} ubuntu@${EC2_IP}"
echo "   RDS:      psql postgresql://${RDS_MASTER_USER}:****@${RDS_ENDPOINT}:5432/${RDS_DB_NAME}"
echo "   S3:       s3://${S3_BUCKET}"
echo ""
echo "🔑 Para conectarte por SSH y desplegar tu código NestJS:"
echo "   ssh -i ${EC2_KEY_FILE} ubuntu@${EC2_IP}"
echo "   cd /opt/chaskirutas"
echo "   git clone <tu-repo> ."
echo "   npm install && npm run build"
echo "   pm2 start dist/main.js --name chaskirutas-api"
echo ""
