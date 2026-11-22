# Auditoría de acceso remoto SSH — laboratorio + dashboard

Proyecto individual de seguridad en cómputo. Demuestra el ciclo
**atacar → defender → verificar** sobre SSH: un laboratorio local con dos
contenedores Docker (uno inseguro, uno endurecido), escaneos reales con
herramientas de auditoría, y un dashboard en Next.js que separa la postura
**🔴 red team** (atacar) de la **🔵 blue team** (defender).

> **Alcance de seguridad:** todo escucha **solo en `127.0.0.1`**. La fuerza
> bruta se ejecuta **exclusivamente** contra el contenedor inseguro de este
> laboratorio. Nada fuera de él.

---

## Requisitos

- **Docker** con el daemon corriendo (`docker info`). En este equipo se usa
  **colima** como runtime (ver nota abajo).
- **Node.js** + npm (para el dashboard).
- **Herramientas de auditoría:** `nmap`, `ssh-audit`, `hydra`
  (`brew install nmap ssh-audit hydra`).

> **Nota (runtime Docker):** este equipo no tenía Docker Desktop operativo, así
> que el laboratorio corre sobre **colima** (`brew install colima docker
> docker-compose`). Arráncalo una vez con `colima start` antes de empezar.

---

## Arranque rápido (en orden)

```bash
# 0. (solo la primera vez, si usas colima) arrancar el runtime de Docker
colima start

# 1. Levantar el laboratorio (construye ambos contenedores)
cd lab
docker compose up -d --build
docker compose ps          # ambos deben estar "Up"
cd ..

# 2. Correr los escaneos reales (nmap + ssh-audit + hydra) -> data/raw/
./scripts/run-audit.sh

# 3. Generar el JSON tipado que consume el dashboard -> data/findings.json
node scripts/parse-results.mjs

# 4. Ver el dashboard
cd dashboard
npm install                # solo la primera vez
npm run dev                # abre http://localhost:3000
```

Para **exportar el PDF**: en el dashboard usa **Cmd/Ctrl+P** (imprimir →
guardar como PDF). Los `<details>` de evidencia se abren solos en la impresión.

Para **tumbar** el laboratorio:

```bash
cd lab && docker compose down
```

---

## Estructura

```
ciber/
├── lab/                 Laboratorio Docker (2 contenedores SSH)
│   ├── docker-compose.yml
│   ├── insecure/        Dockerfile + sshd_config DÉBIL a propósito (2221)
│   ├── hardened/        Dockerfile + sshd_config ENDURECIDO (2222)
│   ├── keys/            par ed25519 (privada ignorada por git)
│   ├── wordlist.txt     diccionario de la fuerza bruta
│   └── README.md        cómo levantar/verificar/tumbar + tabla de diferencias
├── scripts/
│   ├── run-audit.sh     escaneos reales -> data/raw/
│   └── parse-results.mjs parsea data/raw/ -> data/findings.json
├── data/
│   ├── raw/             salida CRUDA de las herramientas (evidencia)
│   ├── findings.json    resultados tipados (generado)
│   └── mitigations.json controles blue team + fuentes citadas
├── dashboard/           app Next.js (App Router + TypeScript)
└── capturas/            capturas de escritorio, móvil e impresión
```

El documento principal, autocontenido, está en
**`~/Desktop/AUDITOR-SSH-IMPLEMENTACION.md`**.
