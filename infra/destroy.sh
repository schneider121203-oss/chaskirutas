#!/usr/bin/env bash
set -euo pipefail

# =====================================================================
# ChaskiRutas — destroy.sh
# ⚠️ DESTRUYE toda la infraestructura AWS del proyecto.
# Esto es IRREVERSIBLE. Se pierden los datos de RDS y S3.
# =====================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/config.env"

echo ""
echo "⚠️  ═══════════════════════════════════════════════════"
echo "⚠️  DESTRUIR TODA LA INFRAESTRUCTURA DE CHASKIRUTAS"
echo "⚠️  ═══════════════════════════════════════════════════"
echo ""
echo "Esto eliminará PERMANENTEMENTE:"
echo "  - EC2 (servidor API + Redis)"
echo "  - RDS (base de datos PostgreSQL con TODOS los datos)"
echo "  - S3 (documentos subidos)"
echo "  - Security Groups"
echo "  - Key Pair"
echo ""
read -p "¿Estás SEGURO? Escribe 'DESTRUIR' para confirmar: " CONFIRM

if [ "$CONFIRM" != "DESTRUIR" ]; then
    echo "❌ Cancelado."
    exit 0
fi

echo ""
echo "🗑️  Destruyendo infraestructura..."

if [ ! -f "$STATE_FILE" ]; then
    echo "❌ No se encontró state.json."
    exit 1
fi

EC2_ID=$(jq -r '.ec2_instance_id // ""' "$STATE_FILE")
RDS_ID=$(jq -r '.rds_identifier // ""' "$STATE_FILE")
S3_BUCKET=$(jq -r '.s3_bucket // ""' "$STATE_FILE")
SG_EC2_ID=$(jq -r '.sg_ec2_id // ""' "$STATE_FILE")
SG_RDS_ID=$(jq -r '.sg_rds_id // ""' "$STATE_FILE")

# 1. Terminar EC2
if [ -n "$EC2_ID" ]; then
    echo "   🖥️  Terminando EC2 ${EC2_ID}..."
    aws ec2 terminate-instances \
        --region "$AWS_REGION" \
        --instance-ids "$EC2_ID" --no-cli-pager 2>/dev/null || true

    echo "   Esperando terminación..."
    aws ec2 wait instance-terminated \
        --region "$AWS_REGION" \
        --instance-ids "$EC2_ID" 2>/dev/null || true
    echo "   ✅ EC2 terminada"
fi

# 2. Eliminar RDS (sin snapshot final para ahorrar)
if [ -n "$RDS_ID" ]; then
    echo "   🐘 Eliminando RDS ${RDS_ID}..."
    aws rds delete-db-instance \
        --region "$AWS_REGION" \
        --db-instance-identifier "$RDS_ID" \
        --skip-final-snapshot \
        --delete-automated-backups \
        --no-cli-pager 2>/dev/null || true
    echo "   ⏳ RDS eliminándose (puede tardar unos minutos)..."
fi

# 3. Vaciar y eliminar S3
if [ -n "$S3_BUCKET" ]; then
    echo "   📦 Vaciando y eliminando S3 ${S3_BUCKET}..."
    aws s3 rm "s3://${S3_BUCKET}" --recursive --region "$AWS_REGION" 2>/dev/null || true
    aws s3api delete-bucket --bucket "$S3_BUCKET" --region "$AWS_REGION" 2>/dev/null || true
    echo "   ✅ S3 eliminado"
fi

# 4. Eliminar Security Groups (esperar a que EC2 esté terminada)
sleep 5
if [ -n "$SG_EC2_ID" ]; then
    echo "   🛡️  Eliminando SG EC2 ${SG_EC2_ID}..."
    aws ec2 delete-security-group --region "$AWS_REGION" --group-id "$SG_EC2_ID" 2>/dev/null || true
fi
if [ -n "$SG_RDS_ID" ]; then
    echo "   🛡️  Eliminando SG RDS ${SG_RDS_ID}..."
    aws ec2 delete-security-group --region "$AWS_REGION" --group-id "$SG_RDS_ID" 2>/dev/null || true
fi

# 5. Eliminar DB Subnet Group
echo "   🌐 Eliminando DB Subnet Group..."
aws rds delete-db-subnet-group \
    --region "$AWS_REGION" \
    --db-subnet-group-name "$SUBNET_GROUP_NAME" 2>/dev/null || true

# 6. Eliminar Key Pair
echo "   🔑 Eliminando Key Pair..."
aws ec2 delete-key-pair --region "$AWS_REGION" --key-name "$EC2_KEY_NAME" 2>/dev/null || true
rm -f "$EC2_KEY_FILE"

# 7. Limpiar state
rm -f "$STATE_FILE"

echo ""
echo "═══════════════════════════════════════════════════════"
echo "🗑️  ¡Infraestructura destruida!"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "   RDS puede tardar unos minutos más en eliminarse."
echo "   Para re-crear todo: ./01-provision.sh"
echo ""
