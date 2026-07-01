#!/usr/bin/env bash
set -euo pipefail

# =====================================================================
# ChaskiRutas — 01-provision.sh
# Crea TODA la infraestructura AWS desde cero:
#   VPC + Subnets + Security Groups + EC2 + RDS + S3
# Ejecutar UNA sola vez. Idempotente (no duplica si ya existe).
# =====================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/config.env"

echo "🏗️  ChaskiRutas — Provisionando infraestructura AWS"
echo "   Región: ${AWS_REGION}"
echo "   Proyecto: ${PROJECT_NAME}"
echo ""

# --- Funciones de utilidad ---
save_state() {
    local key="$1" value="$2"
    if [ -f "$STATE_FILE" ]; then
        jq --arg k "$key" --arg v "$value" '.[$k] = $v' "$STATE_FILE" > "${STATE_FILE}.tmp" && mv "${STATE_FILE}.tmp" "$STATE_FILE"
    else
        echo "{}" | jq --arg k "$key" --arg v "$value" '.[$k] = $v' > "$STATE_FILE"
    fi
}

get_state() {
    local key="$1"
    if [ -f "$STATE_FILE" ]; then
        jq -r --arg k "$key" '.[$k] // empty' "$STATE_FILE"
    fi
}

# =====================================================================
# 1. KEY PAIR (para SSH a EC2)
# =====================================================================
echo "🔑 [1/7] Creando key pair..."
if [ -f "$EC2_KEY_FILE" ]; then
    echo "   ✅ Key pair ya existe en ${EC2_KEY_FILE}"
else
    aws ec2 create-key-pair \
        --region "$AWS_REGION" \
        --key-name "$EC2_KEY_NAME" \
        --query 'KeyMaterial' \
        --output text > "$EC2_KEY_FILE"
    chmod 400 "$EC2_KEY_FILE"
    echo "   ✅ Key guardada en ${EC2_KEY_FILE}"
fi

# =====================================================================
# 2. VPC + SUBNETS
# =====================================================================
echo "🌐 [2/7] Configurando VPC..."

# Usar la VPC default para simplicidad
VPC_ID=$(aws ec2 describe-vpcs \
    --region "$AWS_REGION" \
    --filters "Name=isDefault,Values=true" \
    --query 'Vpcs[0].VpcId' --output text)
save_state "vpc_id" "$VPC_ID"
echo "   ✅ VPC default: ${VPC_ID}"

# Obtener subnets (necesitamos al menos 2 AZs para RDS)
SUBNET_IDS=$(aws ec2 describe-subnets \
    --region "$AWS_REGION" \
    --filters "Name=vpc-id,Values=${VPC_ID}" \
    --query 'Subnets[*].SubnetId' --output text)
SUBNET_ARRAY=($SUBNET_IDS)
SUBNET_1="${SUBNET_ARRAY[0]}"
SUBNET_2="${SUBNET_ARRAY[1]}"
save_state "subnet_1" "$SUBNET_1"
save_state "subnet_2" "$SUBNET_2"
echo "   ✅ Subnets: ${SUBNET_1}, ${SUBNET_2}"

# =====================================================================
# 3. SECURITY GROUPS
# =====================================================================
echo "🛡️  [3/7] Creando Security Groups..."

# SG para EC2 (abre 22-SSH, 3000-API, 80-HTTP, 443-HTTPS)
SG_EC2_ID=$(aws ec2 describe-security-groups \
    --region "$AWS_REGION" \
    --filters "Name=group-name,Values=${SG_EC2_NAME}" "Name=vpc-id,Values=${VPC_ID}" \
    --query 'SecurityGroups[0].GroupId' --output text 2>/dev/null || echo "None")

if [ "$SG_EC2_ID" = "None" ] || [ -z "$SG_EC2_ID" ]; then
    SG_EC2_ID=$(aws ec2 create-security-group \
        --region "$AWS_REGION" \
        --group-name "$SG_EC2_NAME" \
        --description "ChaskiRutas - EC2 API Server" \
        --vpc-id "$VPC_ID" \
        --query 'GroupId' --output text)

    # SSH
    aws ec2 authorize-security-group-ingress --region "$AWS_REGION" \
        --group-id "$SG_EC2_ID" --protocol tcp --port 22 --cidr 0.0.0.0/0
    # API NestJS
    aws ec2 authorize-security-group-ingress --region "$AWS_REGION" \
        --group-id "$SG_EC2_ID" --protocol tcp --port 3000 --cidr 0.0.0.0/0
    # HTTP
    aws ec2 authorize-security-group-ingress --region "$AWS_REGION" \
        --group-id "$SG_EC2_ID" --protocol tcp --port 80 --cidr 0.0.0.0/0
    # HTTPS
    aws ec2 authorize-security-group-ingress --region "$AWS_REGION" \
        --group-id "$SG_EC2_ID" --protocol tcp --port 443 --cidr 0.0.0.0/0
    echo "   ✅ SG EC2 creado: ${SG_EC2_ID}"
else
    echo "   ✅ SG EC2 ya existe: ${SG_EC2_ID}"
fi
save_state "sg_ec2_id" "$SG_EC2_ID"

# SG para RDS (solo acepta conexiones desde EC2)
SG_RDS_ID=$(aws ec2 describe-security-groups \
    --region "$AWS_REGION" \
    --filters "Name=group-name,Values=${SG_RDS_NAME}" "Name=vpc-id,Values=${VPC_ID}" \
    --query 'SecurityGroups[0].GroupId' --output text 2>/dev/null || echo "None")

if [ "$SG_RDS_ID" = "None" ] || [ -z "$SG_RDS_ID" ]; then
    SG_RDS_ID=$(aws ec2 create-security-group \
        --region "$AWS_REGION" \
        --group-name "$SG_RDS_NAME" \
        --description "ChaskiRutas - RDS PostgreSQL" \
        --vpc-id "$VPC_ID" \
        --query 'GroupId' --output text)

    # PostgreSQL solo desde el SG de EC2
    aws ec2 authorize-security-group-ingress --region "$AWS_REGION" \
        --group-id "$SG_RDS_ID" --protocol tcp --port 5432 \
        --source-group "$SG_EC2_ID"

    # También permitir desde tu IP local (para administración directa)
    MY_IP=$(curl -s https://checkip.amazonaws.com)/32
    aws ec2 authorize-security-group-ingress --region "$AWS_REGION" \
        --group-id "$SG_RDS_ID" --protocol tcp --port 5432 --cidr "$MY_IP"
    echo "   ✅ SG RDS creado: ${SG_RDS_ID} (acceso desde EC2 + tu IP: ${MY_IP})"
else
    echo "   ✅ SG RDS ya existe: ${SG_RDS_ID}"
fi
save_state "sg_rds_id" "$SG_RDS_ID"

# =====================================================================
# 4. RDS PostgreSQL
# =====================================================================
echo "🐘 [4/7] Creando RDS PostgreSQL..."

RDS_EXISTS=$(aws rds describe-db-instances \
    --region "$AWS_REGION" \
    --db-instance-identifier "$RDS_IDENTIFIER" \
    --query 'DBInstances[0].DBInstanceStatus' --output text 2>/dev/null || echo "not-found")

if [ "$RDS_EXISTS" = "not-found" ]; then
    # Crear subnet group
    aws rds create-db-subnet-group \
        --region "$AWS_REGION" \
        --db-subnet-group-name "$SUBNET_GROUP_NAME" \
        --db-subnet-group-description "ChaskiRutas subnets" \
        --subnet-ids "$SUBNET_1" "$SUBNET_2" 2>/dev/null || true

    aws rds create-db-instance \
        --region "$AWS_REGION" \
        --db-instance-identifier "$RDS_IDENTIFIER" \
        --db-instance-class "$RDS_INSTANCE_CLASS" \
        --engine postgres \
        --engine-version "$RDS_ENGINE_VERSION" \
        --master-username "$RDS_MASTER_USER" \
        --master-user-password "$RDS_MASTER_PASSWORD" \
        --db-name "$RDS_DB_NAME" \
        --allocated-storage "$RDS_STORAGE_GB" \
        --vpc-security-group-ids "$SG_RDS_ID" \
        --db-subnet-group-name "$SUBNET_GROUP_NAME" \
        --publicly-accessible \
        --no-multi-az \
        --backup-retention-period 1 \
        --storage-type gp3 \
        --tags ${AWS_TAGS} \
        --no-cli-pager

    echo "   ⏳ RDS creándose (toma ~5-8 min)..."
    echo "   Ejecuta './status.sh' para verificar cuando esté listo."
else
    echo "   ✅ RDS ya existe (estado: ${RDS_EXISTS})"
fi
save_state "rds_identifier" "$RDS_IDENTIFIER"

# =====================================================================
# 5. EC2 (API + Redis)
# =====================================================================
echo "🖥️  [5/7] Creando EC2..."

EC2_ID=$(get_state "ec2_instance_id")
if [ -n "$EC2_ID" ]; then
    EC2_STATE=$(aws ec2 describe-instances \
        --region "$AWS_REGION" \
        --instance-ids "$EC2_ID" \
        --query 'Reservations[0].Instances[0].State.Name' --output text 2>/dev/null || echo "terminated")
    if [ "$EC2_STATE" != "terminated" ]; then
        echo "   ✅ EC2 ya existe: ${EC2_ID} (estado: ${EC2_STATE})"
    else
        EC2_ID=""
    fi
fi

if [ -z "$EC2_ID" ]; then
    # Script de inicialización: instala Node.js 20, Redis, PM2, Git
    USER_DATA=$(cat <<'USERDATA'
#!/bin/bash
set -e

# Actualizar sistema
apt-get update && apt-get upgrade -y

# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Redis server
apt-get install -y redis-server
systemctl enable redis-server
systemctl start redis-server

# PM2 (process manager para NestJS)
npm install -g pm2

# Git + herramientas
apt-get install -y git build-essential

# Crear directorio de la app
mkdir -p /opt/chaskirutas
chown ubuntu:ubuntu /opt/chaskirutas

echo "✅ Inicialización completada" >> /var/log/chaskirutas-init.log
USERDATA
)

    EC2_ID=$(aws ec2 run-instances \
        --region "$AWS_REGION" \
        --image-id "$EC2_AMI" \
        --instance-type "$EC2_INSTANCE_TYPE" \
        --key-name "$EC2_KEY_NAME" \
        --security-group-ids "$SG_EC2_ID" \
        --subnet-id "$SUBNET_1" \
        --associate-public-ip-address \
        --user-data "$USER_DATA" \
        --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=${EC2_NAME}},{Key=Project,Value=ChaskiRutas}]" \
        --query 'Instances[0].InstanceId' --output text)

    echo "   ✅ EC2 creada: ${EC2_ID}"
    echo "   ⏳ Inicializando (Node.js, Redis, PM2)..."
fi
save_state "ec2_instance_id" "$EC2_ID"

# =====================================================================
# 6. S3 BUCKET
# =====================================================================
echo "📦 [6/7] Creando bucket S3..."

if aws s3api head-bucket --bucket "$S3_BUCKET" --region "$AWS_REGION" 2>/dev/null; then
    echo "   ✅ Bucket ya existe: ${S3_BUCKET}"
else
    aws s3api create-bucket \
        --region "$AWS_REGION" \
        --bucket "$S3_BUCKET" \
        --create-bucket-configuration LocationConstraint="$AWS_REGION" 2>/dev/null || \
    aws s3api create-bucket \
        --region "$AWS_REGION" \
        --bucket "$S3_BUCKET" 2>/dev/null || true

    # Bloquear acceso público
    aws s3api put-public-access-block \
        --region "$AWS_REGION" \
        --bucket "$S3_BUCKET" \
        --public-access-block-configuration \
        "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

    echo "   ✅ Bucket creado: ${S3_BUCKET} (acceso público bloqueado)"
fi
save_state "s3_bucket" "$S3_BUCKET"

# =====================================================================
# 7. RESUMEN
# =====================================================================
echo ""
echo "═══════════════════════════════════════════════════════"
echo "🎉 ¡Infraestructura provisionada!"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "📋 Recursos creados:"
echo "   EC2:  ${EC2_ID}"
echo "   RDS:  ${RDS_IDENTIFIER}"
echo "   S3:   ${S3_BUCKET}"
echo ""
echo "⏳ Próximos pasos:"
echo "   1. Espera ~5-8 min a que RDS esté 'available'"
echo "   2. Ejecuta: ./status.sh"
echo "   3. Ejecuta: ./02-deploy.sh"
echo ""
echo "💡 Para ahorrar crédito cuando NO estés usando:"
echo "   ./stop.sh   → Apaga EC2 + RDS (~\$0 mientras esté apagado)"
echo "   ./start.sh  → Prende todo de nuevo"
echo ""
