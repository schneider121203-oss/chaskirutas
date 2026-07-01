#!/usr/bin/env bash
set -euo pipefail

# =====================================================================
# ChaskiRutas — stop.sh
# Apaga EC2 + RDS para NO consumir crédito.
# EC2 detenida = $0. RDS detenida = $0 (máximo 7 días, luego auto-enciende).
# =====================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/config.env"

echo "🛑 ChaskiRutas — Apagando infraestructura"

if [ ! -f "$STATE_FILE" ]; then
    echo "❌ No se encontró state.json. Ejecuta primero: ./01-provision.sh"
    exit 1
fi

EC2_ID=$(jq -r '.ec2_instance_id' "$STATE_FILE")
RDS_ID=$(jq -r '.rds_identifier' "$STATE_FILE")

# --- Apagar EC2 ---
echo "🖥️  Deteniendo EC2 (${EC2_ID})..."
aws ec2 stop-instances \
    --region "$AWS_REGION" \
    --instance-ids "$EC2_ID" \
    --no-cli-pager 2>/dev/null && \
    echo "   ✅ EC2 deteniéndose..." || \
    echo "   ⚠️  EC2 ya estaba detenida o no existe"

# --- Apagar RDS ---
echo "🐘 Deteniendo RDS (${RDS_ID})..."
aws rds stop-db-instance \
    --region "$AWS_REGION" \
    --db-instance-identifier "$RDS_ID" \
    --no-cli-pager 2>/dev/null && \
    echo "   ✅ RDS deteniéndose..." || \
    echo "   ⚠️  RDS ya estaba detenida o no se pudo detener"

echo ""
echo "═══════════════════════════════════════════════════════"
echo "💤 ¡Infraestructura apagándose!"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "💰 Mientras esté apagada:"
echo "   EC2: \$0/hora (solo pagas almacenamiento EBS ~\$0.80/mes)"
echo "   RDS: \$0/hora (auto-enciende tras 7 días)"
echo ""
echo "⚠️  IMPORTANTE: AWS auto-enciende RDS tras 7 días."
echo "   Si no la necesitas, ejecuta ./stop.sh cada semana."
echo ""
echo "   Para volver a encender: ./start.sh"
echo ""
