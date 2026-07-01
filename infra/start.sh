#!/usr/bin/env bash
set -euo pipefail

# =====================================================================
# ChaskiRutas — start.sh
# Enciende EC2 + RDS. Espera a que estén listas y muestra las IPs.
# =====================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/config.env"

echo "🚀 ChaskiRutas — Encendiendo infraestructura"

if [ ! -f "$STATE_FILE" ]; then
    echo "❌ No se encontró state.json. Ejecuta primero: ./01-provision.sh"
    exit 1
fi

EC2_ID=$(jq -r '.ec2_instance_id' "$STATE_FILE")
RDS_ID=$(jq -r '.rds_identifier' "$STATE_FILE")

# --- Encender RDS (tarda más, iniciar primero) ---
echo "🐘 Iniciando RDS (${RDS_ID})..."
RDS_STATUS=$(aws rds describe-db-instances \
    --region "$AWS_REGION" \
    --db-instance-identifier "$RDS_ID" \
    --query 'DBInstances[0].DBInstanceStatus' --output text 2>/dev/null || echo "not-found")

if [ "$RDS_STATUS" = "stopped" ]; then
    aws rds start-db-instance \
        --region "$AWS_REGION" \
        --db-instance-identifier "$RDS_ID" \
        --no-cli-pager
    echo "   ⏳ RDS iniciándose (tarda ~5-8 min)..."
elif [ "$RDS_STATUS" = "available" ]; then
    echo "   ✅ RDS ya estaba encendida"
else
    echo "   ⚠️  RDS en estado: ${RDS_STATUS} (espera un momento)"
fi

# --- Encender EC2 ---
echo "🖥️  Iniciando EC2 (${EC2_ID})..."
EC2_STATE=$(aws ec2 describe-instances \
    --region "$AWS_REGION" \
    --instance-ids "$EC2_ID" \
    --query 'Reservations[0].Instances[0].State.Name' --output text 2>/dev/null || echo "unknown")

if [ "$EC2_STATE" = "stopped" ]; then
    aws ec2 start-instances \
        --region "$AWS_REGION" \
        --instance-ids "$EC2_ID" \
        --no-cli-pager
    echo "   ⏳ EC2 iniciándose..."

    # Esperar a que esté running
    echo "   Esperando que EC2 esté running..."
    aws ec2 wait instance-running \
        --region "$AWS_REGION" \
        --instance-ids "$EC2_ID"
    echo "   ✅ EC2 running"
elif [ "$EC2_STATE" = "running" ]; then
    echo "   ✅ EC2 ya estaba encendida"
else
    echo "   ⚠️  EC2 en estado: ${EC2_STATE}"
fi

# --- Obtener IP nueva (cambia cada vez que se enciende) ---
EC2_IP=$(aws ec2 describe-instances \
    --region "$AWS_REGION" \
    --instance-ids "$EC2_ID" \
    --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)

RDS_ENDPOINT=$(aws rds describe-db-instances \
    --region "$AWS_REGION" \
    --db-instance-identifier "$RDS_ID" \
    --query 'DBInstances[0].Endpoint.Address' --output text 2>/dev/null || echo "esperando...")

echo ""
echo "═══════════════════════════════════════════════════════"
echo "🟢 ¡Infraestructura encendida!"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "📋 Conexiones:"
echo "   API:  http://${EC2_IP}:3000"
echo "   SSH:  ssh -i ${EC2_KEY_FILE} ubuntu@${EC2_IP}"
echo "   RDS:  ${RDS_ENDPOINT}:5432 (${RDS_STATUS})"
echo ""

if [ "$RDS_STATUS" != "available" ]; then
    echo "⏳ RDS aún no está lista. Ejecuta './status.sh' en unos minutos."
fi

echo "⚠️  NOTA: La IP pública de EC2 cambia al reiniciar."
echo "   IP actual: ${EC2_IP}"
echo ""
echo "   Para reconectar el backend al nuevo endpoint:"
echo "   ssh -i ${EC2_KEY_FILE} ubuntu@${EC2_IP}"
echo "   cd /opt/chaskirutas && pm2 restart chaskirutas-api"
echo ""
