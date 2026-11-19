import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Findings, Mitigations } from "./types";

// Los JSON viven en ../data (fuera de la app Next). Se leen en el
// servidor/build con fs. cwd = carpeta dashboard/ al correr dev/build.
const DATA_DIR = join(process.cwd(), "..", "data");

export function getFindings(): Findings {
  const raw = readFileSync(join(DATA_DIR, "findings.json"), "utf8");
  return JSON.parse(raw) as Findings;
}

export function getMitigations(): Mitigations {
  const raw = readFileSync(join(DATA_DIR, "mitigations.json"), "utf8");
  return JSON.parse(raw) as Mitigations;
}

// Lee un extracto de un archivo crudo de data/raw para la sección de
// evidencia (primeras `maxLines` líneas). Devuelve "" si no existe.
export function getRawExcerpt(relPath: string, maxLines = 40): string {
  try {
    const raw = readFileSync(join(DATA_DIR, "..", relPath), "utf8");
    // Quita secuencias de color ANSI por si quedara alguna.
    const clean = raw.replace(/\u001b\[[0-9;]*m/g, "");
    return clean.split("\n").slice(0, maxLines).join("\n");
  } catch {
    return "";
  }
}
