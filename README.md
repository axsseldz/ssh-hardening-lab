# Auditoría de acceso remoto SSH

Laboratorio local que compara un servidor SSH **inseguro** contra uno
**endurecido**, con postura **red team** (atacar) y **blue team** (defender).

## Estructura

- `lab/` — contenedores Docker (SSH inseguro y endurecido)
- `scripts/` — escaneos (nmap, ssh-audit, hydra) y parser
- `data/` — resultados de la auditoría
- `dashboard/` — web en Next.js que presenta los resultados

## Cómo correrlo

```bash
# 1. Levantar el laboratorio
colima start
cd lab && docker compose up -d --build && cd ..

# 2. Escaneos y datos
./scripts/run-audit.sh
node scripts/parse-results.mjs

# 3. Dashboard
cd dashboard && npm install && npm run dev   # http://localhost:3000
```

> Proyecto académico. Todo corre en `127.0.0.1`; no se usa contra sistemas ajenos.
