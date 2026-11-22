"use client";

import { useEffect } from "react";

// Sin UI: revela con una transición sutil los elementos con la clase
// `reveal` a medida que entran en viewport. Mejora progresiva: si no hay
// JS o se prefiere movimiento reducido, el contenido se muestra completo.
export default function RevealObserver() {
  useEffect(() => {
    const els = Array.from(
      document.querySelectorAll<HTMLElement>(".reveal")
    );
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (reduce || !("IntersectionObserver" in window)) {
      els.forEach((e) => e.classList.add("in"));
      return;
    }

    // Solo ahora (con JS activo) permitimos que el CSS oculte para animar.
    document.documentElement.classList.add("reveal-on");

    const io = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            obs.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );

    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);

  return null;
}
