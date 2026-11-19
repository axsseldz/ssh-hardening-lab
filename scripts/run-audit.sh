#!/usr/bin/env bash
# =====================================================================
# run-audit.sh — Escaneos reales (RED TEAM) contra el laboratorio local.
# ---------------------------------------------------------------------
# ALCANCE: SOLO 127.0.0.1 puertos 2221 (inseguro) y 2222 (endurecido).
# La fuerza bruta se ejecuta EXCLUSIVAMENTE contra el contenedor
# inseguro de este laboratorio. Nada fuera de él.
#
# Idempotente: cada corrida sobrescribe su propia salida en data/raw/.
# No borra datos de otras herramientas; avisa antes de sobrescribir.
# =====================================================================
set -uo pipefail

# --- Rutas (relativas a la ubicación del script) ---------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
LAB_DIR="$ROOT_DIR/lab"
RAW_DIR="$ROOT_DIR/data/raw"
WORDLIST="$LAB_DIR/wordlist.txt"

HOST="127.0.0.1"
PORT_INSEGURO=2221
PORT_ENDURECIDO=2222
USER_OBJETIVO="axel"

mkdir -p "$RAW_DIR"

log()  { printf '\033[1;36m[*]\033[0m %s\n' "$*"; }
ok()   { printf '\033[1;32m[+]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[!]\033[0m %s\n' "$*"; }

if [ -n "$(ls -A "$RAW_DIR" 2>/dev/null)" ]; then
  warn "data/raw/ ya tiene archivos; esta corrida los sobrescribe (no se borra nada más)."
fi

# --- 1. Asegurar que el laboratorio está arriba ----------------------
log "Verificando laboratorio Docker..."
if ! docker compose -f "$LAB_DIR/docker-compose.yml" ps --status running 2>/dev/null | grep -q ssh-inseguro; then
  log "Levantando laboratorio (docker compose up -d --build)..."
  docker compose -f "$LAB_DIR/docker-compose.yml" up -d --build
fi

# --- Esperar a que ambos puertos respondan ---------------------------
esperar_puerto() {
  local port="$1" n=0
  until nc -z -w2 "$HOST" "$port" 2>/dev/null; do
    n=$((n+1)); [ "$n" -ge 30 ] && { warn "Puerto $port no respondió tras 30 intentos"; return 1; }
    sleep 1
  done
  ok "Puerto $port responde."
}
esperar_puerto "$PORT_INSEGURO"   || exit 1
esperar_puerto "$PORT_ENDURECIDO" || exit 1

# =====================================================================
# 2. NMAP — detección de versión de SSH en ambos puertos
# =====================================================================
log "Nmap -sV sobre $PORT_INSEGURO y $PORT_ENDURECIDO (texto + XML)..."
# -sV: detecta versión del servicio; -Pn: no ping (es localhost)
nmap -Pn -sV -p "$PORT_INSEGURO,$PORT_ENDURECIDO" \
     -oN "$RAW_DIR/nmap.txt" -oX "$RAW_DIR/nmap.xml" "$HOST" >/dev/null
ok "Nmap guardado en data/raw/nmap.txt y nmap.xml"

# =====================================================================
# 3. SSH-AUDIT — análisis de algoritmos por puerto (texto + JSON)
# =====================================================================
run_ssh_audit() {
  local port="$1" etiqueta="$2" intento
  # Texto (sin color) para lectura humana (reintenta si no hay banner):
  for intento in 1 2 3 4; do
    ssh-audit -p "$port" "$HOST" > "$RAW_DIR/ssh-audit-${etiqueta}.txt" 2>&1 || true
    grep -q "did not receive banner" "$RAW_DIR/ssh-audit-${etiqueta}.txt" || break
    sleep 12   # deja expirar las conexiones en LoginGraceTime del endurecido
  done
  # JSON para el parser (-j = JSON). ssh-audit abre muchas conexiones de
  # sondeo; el endurecido (LoginGraceTime + MaxStartups) puede soltar
  # alguna ('did not receive banner'), así que se reintenta hasta obtener
  # un JSON con la clave "kex". Código !=0 si hay 'fail', por eso '|| true'.
  for intento in 1 2 3 4; do
    ssh-audit -j -p "$port" "$HOST" > "$RAW_DIR/ssh-audit-${etiqueta}.json" 2>/dev/null || true
    grep -q '"kex"' "$RAW_DIR/ssh-audit-${etiqueta}.json" && break
    sleep 12
  done
  ok "ssh-audit $etiqueta -> ssh-audit-${etiqueta}.txt / .json"
}
# El endurecido se escanea PRIMERO (fuente "fresca", sin conexiones previas
# colgando en su LoginGraceTime), para un resultado limpio y reproducible.
log "ssh-audit sobre contenedor endurecido ($PORT_ENDURECIDO)..."
run_ssh_audit "$PORT_ENDURECIDO" "endurecido"
log "ssh-audit sobre contenedor inseguro ($PORT_INSEGURO)..."
run_ssh_audit "$PORT_INSEGURO" "inseguro"

# =====================================================================
# 4. HYDRA — fuerza bruta controlada
# =====================================================================
# 4a. Contra el INSEGURO (2221): DEBE ENTRAR (password123 está en la lista).
log "Hydra contra INSEGURO ($PORT_INSEGURO), usuario '$USER_OBJETIVO'..."
# -l usuario  -P diccionario  -s puerto  -t 4 hilos  -I ignora restore  -V verboso
hydra -l "$USER_OBJETIVO" -P "$WORDLIST" -s "$PORT_INSEGURO" -t 4 -I -f \
      "$HOST" ssh > "$RAW_DIR/hydra-inseguro.txt" 2>&1 || true
if grep -q "password:" "$RAW_DIR/hydra-inseguro.txt"; then
  ok "Hydra ENTRÓ en el inseguro (credencial encontrada)."
else
  warn "Hydra NO encontró credencial en el inseguro (revisar hydra-inseguro.txt)."
fi

# 4b. Mismo intento contra el ENDURECIDO (2222): DEBE FALLAR (password auth off).
log "Hydra contra ENDURECIDO ($PORT_ENDURECIDO) — se espera FALLO..."
hydra -l "$USER_OBJETIVO" -P "$WORDLIST" -s "$PORT_ENDURECIDO" -t 4 -I \
      "$HOST" ssh > "$RAW_DIR/hydra-endurecido.txt" 2>&1 || true
if grep -q "password:" "$RAW_DIR/hydra-endurecido.txt"; then
  warn "Hydra ENTRÓ en el endurecido (inesperado; revisar configuración)."
else
  ok "Hydra NO entró en el endurecido (esperado: solo clave pública)."
fi

# =====================================================================
# 5. RESUMEN
# =====================================================================
echo
log "================ RESUMEN ================"
printf '  Nmap:        %s\n' "$(grep -c 'open' "$RAW_DIR/nmap.txt" 2>/dev/null || echo '?') puerto(s) abierto(s)"
printf '  ssh-audit:   inseguro -> %s | endurecido -> %s\n' \
  "$(grep -c -- '-- \[fail\]' "$RAW_DIR/ssh-audit-inseguro.txt" 2>/dev/null || echo 0) fail" \
  "$(grep -c -- '-- \[fail\]' "$RAW_DIR/ssh-audit-endurecido.txt" 2>/dev/null || echo 0) fail"
printf '  Hydra inseguro:   %s\n' "$(grep -oE 'login: .* password: .*' "$RAW_DIR/hydra-inseguro.txt" 2>/dev/null | head -1 || echo 'sin credencial')"
printf '  Hydra endurecido: %s\n' "$(grep -q 'password:' "$RAW_DIR/hydra-endurecido.txt" 2>/dev/null && echo 'ENTRÓ (inesperado)' || echo 'fallo (esperado)')"
log "Salida cruda en: data/raw/"
log "Siguiente paso:  node scripts/parse-results.mjs"
