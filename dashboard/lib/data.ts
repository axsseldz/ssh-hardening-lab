import type { Findings, Mitigations } from "./types";

// Self-contained para Vercel (Root Directory = dashboard/): los datos se
// importan directamente desde dashboard/data/ en vez de leer ../data con fs.
// Para refrescarlos tras una nueva corrida de los scripts, vuelve a copiar
// data/findings.json, data/mitigations.json y regenera raw-excerpts.json.
import findings from "@/data/findings.json";
import mitigations from "@/data/mitigations.json";
import rawExcerpts from "@/data/raw-excerpts.json";

export function getFindings(): Findings {
  return findings as unknown as Findings;
}

export function getMitigations(): Mitigations {
  return mitigations as unknown as Mitigations;
}

// Extracto (primeras `maxLines` líneas) de un archivo crudo de data/raw,
// desde el JSON precomputado. Devuelve "" si no existe.
export function getRawExcerpt(relPath: string, maxLines = 40): string {
  const raw = (rawExcerpts as Record<string, string>)[relPath];
  if (!raw) return "";
  return raw.split("\n").slice(0, maxLines).join("\n");
}
