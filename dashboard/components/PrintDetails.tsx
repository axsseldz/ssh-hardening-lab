"use client";

import { useEffect } from "react";

// Sin UI: abre todos los <details> antes de imprimir (para no ocultar la
// evidencia en el PDF al usar Cmd/Ctrl+P) y restaura su estado después.
export default function PrintDetails() {
  useEffect(() => {
    const abiertos: HTMLDetailsElement[] = [];
    const before = () => {
      document
        .querySelectorAll<HTMLDetailsElement>("details:not([open])")
        .forEach((d) => {
          abiertos.push(d);
          d.open = true;
        });
    };
    const after = () => {
      abiertos.forEach((d) => (d.open = false));
      abiertos.length = 0;
    };
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, []);

  return null;
}
