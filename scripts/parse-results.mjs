#!/usr/bin/env node
// =====================================================================
// parse-results.mjs — Convierte la salida cruda de data/raw/ en
// data/findings.json tipado. TODO sale de data/raw/; no se inventa nada.
// Si un bloque no se puede parsear, se marca { complete:false } y sigue.
// =====================================================================
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RAW = join(ROOT, 'data', 'raw');
const OUT = join(ROOT, 'data', 'findings.json');

const read = (f) => readFileSync(join(RAW, f), 'utf8');
const tryRead = (f) => { try { return read(f); } catch { return null; } };

// --- Nmap: versión de SSH por puerto (desde el XML) ------------------
function parseNmap() {
  const byPort = {};
  const xml = tryRead('nmap.xml');
  if (!xml) return byPort;
  // Cada <port ...> ... <service .../> </port>
  const portRe = /<port protocol="tcp" portid="(\d+)">([\s\S]*?)<\/port>/g;
  let m;
  while ((m = portRe.exec(xml))) {
    const port = Number(m[1]);
    const block = m[2];
    const state = (block.match(/<state state="(\w+)"/) || [])[1] || 'unknown';
    const svc = block.match(/<service\b([^>]*)\/?>/);
    let product = '', version = '', banner = '';
    if (svc) {
      const attrs = svc[1];
      product = (attrs.match(/product="([^"]*)"/) || [])[1] || '';
      version = (attrs.match(/version="([^"]*)"/) || [])[1] || '';
      const name = (attrs.match(/name="([^"]*)"/) || [])[1] || '';
      banner = [product, version].filter(Boolean).join(' ') || name;
    }
    byPort[port] = { state, product, version, banner };
  }
  return byPort;
}

// --- ssh-audit JSON --> hallazgos por tipo ---------------------------
const TIPO = { kex: 'kex', enc: 'cipher', mac: 'mac', key: 'hostkey' };
const TIPO_ES = { kex: 'Intercambio de claves (KEX)', cipher: 'Cifrado', mac: 'MAC', hostkey: 'Clave de host' };

function severidad(notes) {
  if (notes && Array.isArray(notes.fail) && notes.fail.length) return 'fail';
  if (notes && Array.isArray(notes.warn) && notes.warn.length) return 'warn';
  return 'info';
}

function parseSshAudit(etiqueta) {
  const txt = tryRead(`ssh-audit-${etiqueta}.json`);
  if (!txt) return { complete: false, reason: 'falta ssh-audit json', counts: { fail: 0, warn: 0, info: 0 }, findings: [] };
  let j;
  try { j = JSON.parse(txt); }
  catch { return { complete: false, reason: 'json ilegible', counts: { fail: 0, warn: 0, info: 0 }, findings: [] }; }

  const counts = { fail: 0, warn: 0, info: 0 };
  const findings = [];
  for (const cat of ['kex', 'enc', 'mac', 'key']) {
    const arr = Array.isArray(j[cat]) ? j[cat] : [];
    for (const item of arr) {
      const sev = severidad(item.notes);
      counts[sev]++;
      if (sev === 'fail' || sev === 'warn') {
        const notesArr = (item.notes && (item.notes[sev] || [])) || [];
        findings.push({
          type: TIPO[cat],
          typeLabel: TIPO_ES[TIPO[cat]],
          algorithm: item.algorithm,
          keysize: item.keysize ?? null,
          severity: sev,
          note: notesArr[0] || '',
        });
      }
    }
  }
  // fail primero, luego warn
  findings.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'fail' ? -1 : 1));
  return {
    complete: true,
    software: j.banner?.software || null,
    banner: j.banner?.raw || null,
    counts,
    findings,
  };
}

// --- Hydra: éxito / intentos / credencial ----------------------------
function parseHydra(etiqueta, esperadoExito) {
  const txt = tryRead(`hydra-${etiqueta}.txt`);
  if (txt === null) return { complete: false, reason: 'falta salida de hydra', success: null };
  const credMatch = txt.match(/login:\s*(\S+)\s+password:\s*(\S+)/);
  const triesMatch = txt.match(/l:(\d+)\/p:(\d+)/);
  const candidatos = triesMatch ? Number(triesMatch[2]) : null;
  const success = /valid password found/.test(txt) || !!credMatch;
  const connError = /Socket error|could not connect/i.test(txt);
  return {
    complete: true,
    tool: 'hydra',
    success,
    expectedSuccess: esperadoExito,
    matchesExpectation: success === esperadoExito,
    candidates: candidatos,            // nº de contraseñas del diccionario probadas
    credential: credMatch ? `${credMatch[1]}:${credMatch[2]}` : null,
    user: credMatch ? credMatch[1] : 'axel',
    connectionError: connError,
  };
}

// --- Ensamblado ------------------------------------------------------
const nmap = parseNmap();

function buildContainer(id, name, port, hydraLabel, esperadoExito, desc) {
  return {
    id,
    name,
    port,
    description: desc,
    sshVersion: nmap[port]?.banner || null,
    nmapState: nmap[port]?.state || null,
    audit: parseSshAudit(id),
    attack: parseHydra(hydraLabel, esperadoExito),
  };
}

const result = {
  generatedAt: new Date().toISOString(),
  host: '127.0.0.1',
  scope: 'Laboratorio local, 2 contenedores, solo 127.0.0.1',
  tools: {
    nmap: 'nmap -Pn -sV -p 2221,2222 127.0.0.1',
    sshAudit: 'ssh-audit -p <puerto> 127.0.0.1',
    hydra: 'hydra -l axel -P lab/wordlist.txt -s <puerto> -t 4 127.0.0.1 ssh',
  },
  evidence: {
    nmap: ['data/raw/nmap.txt', 'data/raw/nmap.xml'],
    inseguro: ['data/raw/ssh-audit-inseguro.txt', 'data/raw/ssh-audit-inseguro.json', 'data/raw/hydra-inseguro.txt'],
    endurecido: ['data/raw/ssh-audit-endurecido.txt', 'data/raw/ssh-audit-endurecido.json', 'data/raw/hydra-endurecido.txt'],
  },
  containers: [
    buildContainer('inseguro', 'ssh-inseguro', 2221, 'inseguro', true,
      'Configuración débil a propósito: root por SSH, contraseñas, algoritmos heredados.'),
    buildContainer('endurecido', 'ssh-endurecido', 2222, 'endurecido', false,
      'Configuración endurecida: solo clave pública, sin root, algoritmos modernos.'),
  ],
};

writeFileSync(OUT, JSON.stringify(result, null, 2));

// --- Resumen en consola ---------------------------------------------
console.log('findings.json generado en data/findings.json\n');
for (const c of result.containers) {
  const a = c.audit, k = c.attack;
  console.log(`• ${c.name} (${c.port}) — ${c.sshVersion ?? 'versión ?'}`);
  console.log(`    ssh-audit: ${a.counts.fail} fail / ${a.counts.warn} warn / ${a.counts.info} info${a.complete ? '' : '  [INCOMPLETO]'}`);
  console.log(`    ataque:    ${k.success ? 'ENTRÓ' : 'falló'}${k.credential ? ' (' + k.credential + ')' : ''} — esperado: ${k.expectedSuccess ? 'entrar' : 'fallar'} -> ${k.matchesExpectation ? 'OK' : '¡DISCREPANCIA!'}`);
}
