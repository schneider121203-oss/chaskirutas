#!/usr/bin/env bash
set -euo pipefail

# =====================================================================
# ChaskiRutas — status.sh
# Muestra el estado de TODOS los recursos AWS del proyecto.
# =====================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/config.env"

echo "📊 ChaskiRutas — Estado de infraestructura AWS"
echo ""

if [ ! -f "$STATE_FILE" ]; then
    echo "❌ No se encontró state.json. Ejecuta primero: ./01-provision.sh"
    exit 1
fi

EC2_ID=$(jq -r '.ec2_instance_id // "N/A"' "$STATE_FILE")
RDS_ID=$(jq -r '.rds_identifier // "N/A"' "$STATE_FILE")
S3_BUCKET=$(jq -r '.s3_bucket // "N/A"' "$STATE_FILE")

# --- EC2 ---
echo "🖥️  EC2 (${EC2_ID})"
if [ "$EC2_ID" != "N/A" ]; then
    EC2_INFO=$(aws ec2 describe-instances \
        --region "$AWS_REGION" \
        --instance-ids "$EC2_ID" \
        --query 'Reservations[0].Instances[0].{State:State.Name,IP:PublicIpAddress,Type:InstanceType,LaunchTime:LaunchTime}' \
        --output json 2>/dev/null || echo '{"State":"not-found"}')

    EC2_STATE=$(echo "$EC2_INFO" | jq -r '.State')
    EC2_IP=$(echo "$EC2_INFO" | jq -r '.IP // "Sin IP"')
    EC2_TYPE=$(echo "$EC2_INFO" | jq -r '.Type // "?"')

    case "$EC2_STATE" in
        running)  echo "   Estado: 🟢 ${EC2_STATE}" ;;
        stopped)  echo "   Estado: 🔴 ${EC2_STATE}" ;;
        *)        echo "   Estado: 🟡 ${EC2_STATE}" ;;
    esac
    echo "   IP:     ${EC2_IP}"
    echo "   Tipo:   ${EC2_TYPE}"
    if [ "$EC2_STATE" = "running" ]; then
        echo "   SSH:    ssh -i ${EC2_KEY_FILE} ubuntu@${EC2_IP}"
        echo "   API:    http://${EC2_IP}:3000"
    fi
else
    echo "   ❌ No provisionada"
fi
echo ""

# --- RDS ---
echo "🐘 RDS PostgreSQL (${RDS_ID})"
if [ "$RDS_ID" != "N/A" ]; then
    RDS_INFO=$(aws rds describe-db-instances \
        --region "$AWS_REGION" \
        --db-instance-identifier "$RDS_ID" \
        --query 'DBInstances[0].{Status:DBInstanceStatus,Endpoint:Endpoint.Address,Port:Endpoint.Port,Class:DBInstanceClass,Storage:AllocatedStorage,Engine:EngineVersion}' \
        --output json 2>/dev/null || echo '{"Status":"not-found"}')

    RDS_STATUS=$(echo "$RDS_INFO" | jq -r '.Status')
    RDS_ENDPOINT=$(echo "$RDS_INFO" | jq -r '.Endpoint // "Sin endpoint"')
    RDS_PORT=$(echo "$RDS_INFO" | jq -r '.Port // "5432"')
    RDS_CLASS=$(echo "$RDS_INFO" | jq -r '.Class // "?"')
    RDS_STORAGE=$(echo "$RDS_INFO" | jq -r '.Storage // "?"')
    RDS_VERSION=$(echo "$RDS_INFO" | jq -r '.Engine // "?"')

    case "$RDS_STATUS" in
        available) echo "   Estado:   🟢 ${RDS_STATUS}" ;;
        stopped)   echo "   Estado:   🔴 ${RDS_STATUS}" ;;
        *)         echo "   Estado:   🟡 ${RDS_STATUS}" ;;
    esac
    echo "   Endpoint: ${RDS_ENDPOINT}:${RDS_PORT}"
    echo "   Clase:    ${RDS_CLASS}"
    echo "   Storage:  ${RDS_STORAGE} GB"
    echo "   Engine:   PostgreSQL ${RDS_VERSION}"
    if [ "$RDS_STATUS" = "available" ]; then
        echo "   Conexión: psql postgresql://${RDS_MASTER_USER}:****@${RDS_ENDPOINT}:${RDS_PORT}/${RDS_DB_NAME}"
    fi
else
    echo "   ❌ No provisionada"
fi
echo ""

# --- S3 ---
echo "📦 S3 (${S3_BUCKET})"
if [ "$S3_BUCKET" != "N/A" ]; then
    if aws s3api head-bucket --bucket "$S3_BUCKET" --region "$AWS_REGION" >/dev/null 2>&1; then
        S3_SIZE=$(aws s3 ls "s3://${S3_BUCKET}" --recursive --summarize 2>/dev/null | grep "Total Size" | awk '{print $3, $4}' || echo "0 Bytes")
        S3_COUNT=$(aws s3 ls "s3://${S3_BUCKET}" --recursive --summarize 2>/dev/null | grep "Total Objects" | awk '{print $3}' || echo "0")
        echo "   Estado:  🟢 activo"
        echo "   Objetos: ${S3_COUNT}"
        echo "   Tamaño:  ${S3_SIZE}"
    else
        echo "   Estado:  🔴 no encontrado"
    fi
else
    echo "   ❌ No provisionado"
fi

echo ""
echo "═══════════════════════════════════════════════════════"

# --- Estimación de costo ---
COST_EC2=0
COST_RDS=0
[ "$EC2_STATE" = "running" ] 2>/dev/null && COST_EC2=8
[ "$RDS_STATUS" = "available" ] 2>/dev/null && COST_RDS=15

COST_TOTAL=$((COST_EC2 + COST_RDS))
echo "💰 Costo estimado este mes: ~\$${COST_TOTAL}/mes"
if [ "$COST_TOTAL" -gt 0 ]; then
    echo "   EC2 running:  ~\$${COST_EC2}/mes"
    echo "   RDS available: ~\$${COST_RDS}/mes"
    echo "   S3 + EBS:      ~\$1/mes"
fi
echo ""
echo "💡 Ejecuta './stop.sh' para reducir a ~\$1/mes (solo almacenamiento)"
echo "═══════════════════════════════════════════════════════"
echo ""
