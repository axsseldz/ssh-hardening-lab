// Tipos que reflejan data/findings.json y data/mitigations.json.

export type Severity = "fail" | "warn" | "info";

export interface AuditFinding {
  type: "kex" | "cipher" | "mac" | "hostkey";
  typeLabel: string;
  algorithm: string;
  keysize: number | null;
  severity: Severity;
  note: string;
}

export interface Audit {
  complete: boolean;
  reason?: string;
  software?: string | null;
  banner?: string | null;
  counts: { fail: number; warn: number; info: number };
  findings: AuditFinding[];
}

export interface Attack {
  complete: boolean;
  reason?: string;
  tool?: string;
  success: boolean | null;
  expectedSuccess?: boolean;
  matchesExpectation?: boolean;
  candidates?: number | null;
  credential?: string | null;
  user?: string;
  connectionError?: boolean;
}

export interface Container {
  id: "inseguro" | "endurecido";
  name: string;
  port: number;
  description: string;
  sshVersion: string | null;
  nmapState: string | null;
  audit: Audit;
  attack: Attack;
}

export interface Findings {
  generatedAt: string;
  host: string;
  scope: string;
  tools: { nmap: string; sshAudit: string; hydra: string };
  evidence: {
    nmap: string[];
    inseguro: string[];
    endurecido: string[];
  };
  containers: Container[];
}

// --- Mitigaciones ----------------------------------------------------
export interface FuenteRef {
  nombre: string;
  url: string;
}

export interface Control {
  id: string;
  nombre: string;
  que: string;
  donde: string;
  directiva: string;
  corrige: string;
  antes: string;
  despues: string;
  fuente: string; // clave en Mitigations.fuentes
}

export interface Categoria {
  id: string;
  label: string;
  icono: string;
  resumen: string;
  controles: Control[];
}

export interface Mitigations {
  descripcion: string;
  fuentes: Record<string, FuenteRef>;
  categorias: Categoria[];
}
