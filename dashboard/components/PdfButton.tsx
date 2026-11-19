"use client";

import { useEffect } from "react";

// Abre todos los <details> antes de imprimir (para no ocultar evidencia en
// el PDF) y restaura su estado después. Cubre tanto el botón como Ctrl/Cmd+P.
export default function PdfButton() {
  useEffect(() => {
    const open: HTMLDetailsElement[] = [];
    const before = () => {
      document
        .querySelectorAll<HTMLDetailsElement>("details:not([open])")
        .forEach((d) => {
          open.push(d);
          d.open = true;
        });
    };
    const after = () => {
      open.forEach((d) => (d.open = false));
      open.length = 0;
    };
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, []);

  return (
    <button
      type="button"
      className="btn primary"
      onClick={() => window.print()}
      aria-label="Exportar a PDF"
    >
      🖨️ Exportar PDF
    </button>
  );
}
