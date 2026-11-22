import { getFindings, getMitigations, getRawExcerpt } from "@/lib/data";
import type { Container, AuditFinding } from "@/lib/types";
import CopyButton from "@/components/CopyButton";
import PdfButton from "@/components/PdfButton";

export const dynamic = "force-static";

function SevBadge({ sev }: { sev: "fail" | "warn" | "info" }) {
  const label = sev === "fail" ? "fail" : sev === "warn" ? "warn" : "info";
  return <span className={`badge ${sev}`}>{label}</span>;
}

function CmdBlock({ cmd }: { cmd: string }) {
  return (
    <div className="cmd">
      <code>{cmd}</code>
      <CopyButton text={cmd} />
    </div>
  );
}

function FindingItems({ findings }: { findings: AuditFinding[] }) {
  if (findings.length === 0) {
    return (
      <p className="empty-ok">✓ Sin hallazgos fail/warn</p>
    );
  }
  return (
    <ul className="findlist">
      {findings.map((f, i) => (
        <li key={i}>
          <SevBadge sev={f.severity} />
          <span className="algo">
            {f.algorithm}
            <span style={{ color: "var(--text-faint)" }}> · {f.typeLabel}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function AttackLine({ c }: { c: Container }) {
  const a = c.attack;
  if (a.success) {
    return (
      <>
        <span className="badge fail">ENTRÓ</span>{" "}
        <span className="mono">{a.credential}</span>{" "}
        <span style={{ color: "var(--text-muted)" }}>
          ({a.candidates ?? "?"} contraseñas del diccionario)
        </span>
      </>
    );
  }
  return (
    <>
      <span className="badge ok">RECHAZADO</span>{" "}
      <span style={{ color: "var(--text-muted)" }}>
        solo clave pública — {a.candidates ?? "?"} contraseñas probadas, ninguna
        aceptada
      </span>
    </>
  );
}

// Barra comparativa de severidades (CSS puro, sin librería de gráficas).
function SevBar({ c }: { c: Container }) {
  const { fail, warn, info } = c.audit.counts;
  const total = Math.max(fail + warn + info, 1);
  const seg = (n: number, cls: string) =>
    n > 0 ? (
      <div
        className={`bar-seg ${cls}`}
        style={{ width: `${(n / total) * 100}%` }}
        title={`${n} ${cls}`}
      >
        {n}
      </div>
    ) : null;
  return (
    <div className="bar-row">
      <span className="name">{c.name}</span>
      <div className="bar-track" role="img" aria-label={`${fail} fail, ${warn} warn, ${info} info`}>
        {seg(fail, "fail")}
        {seg(warn, "warn")}
        {seg(info, "info")}
      </div>
    </div>
  );
}

export default function Page() {
  const data = getFindings();
  const mit = getMitigations();
  const inseguro = data.containers.find((c) => c.id === "inseguro")!;
  const endurecido = data.containers.find((c) => c.id === "endurecido")!;

  const hydraCmd =
    "hydra -l axel -P lab/wordlist.txt -s 2221 -t 4 127.0.0.1 ssh";

  return (
    <>
      <nav className="nav">
        <strong>🔐 Auditoría SSH</strong>
        <a href="#resumen">Resumen</a>
        <a href="#redteam">🔴 Red team</a>
        <a href="#blueteam">🔵 Blue team</a>
        <a href="#evidencia">Evidencia</a>
        <a href="#limitaciones">Limitaciones</a>
      </nav>

      <div className="wrap">
        {/* ============ 1. PORTADA / RESUMEN ============ */}
        <section id="resumen">
          <div className="hero">
            <h1>Auditoría de acceso remoto SSH</h1>
            <div className="meta">
              <span>
                <strong>Alcance:</strong> laboratorio local, 2 contenedores,
                127.0.0.1
              </span>
            </div>
            <p className="verdict">
              <strong>Resultado:</strong> el contenedor inseguro fue vulnerado
              por fuerza bruta (
              <span className="mono">{inseguro.attack.credential}</span>) y
              acumula <strong>{inseguro.audit.counts.fail} hallazgos
              críticos</strong> de ssh-audit; el contenedor endurecido{" "}
              <strong>rechazó el mismo ataque</strong> y presenta{" "}
              <strong>{endurecido.audit.counts.fail} hallazgos críticos</strong>.
            </p>
            <div className="actions">
              <a className="btn" href="#redteam">
                Ver ataque ↓
              </a>
            </div>
          </div>

          <div className="kpi-grid">
            <div className="kpi red">
              <h3>🔴 ssh-inseguro · 2221</h3>
              <div className="row">
                <span>Críticos (fail)</span>
                <span style={{ color: "var(--sev-fail)" }}>
                  {inseguro.audit.counts.fail}
                </span>
              </div>
              <div className="row">
                <span>Advertencias (warn)</span>
                <span style={{ color: "var(--sev-warn)" }}>
                  {inseguro.audit.counts.warn}
                </span>
              </div>
              <div className="row">
                <span>Fuerza bruta</span>
                <span style={{ color: "var(--sev-fail)" }}>Vulnerado</span>
              </div>
            </div>

            <div className="kpi blue">
              <h3>🔵 ssh-endurecido · 2222</h3>
              <div className="row">
                <span>Críticos (fail)</span>
                <span style={{ color: "var(--sev-ok)" }}>
                  {endurecido.audit.counts.fail}
                </span>
              </div>
              <div className="row">
                <span>Advertencias (warn)</span>
                <span style={{ color: "var(--sev-warn)" }}>
                  {endurecido.audit.counts.warn}
                </span>
              </div>
              <div className="row">
                <span>Fuerza bruta</span>
                <span style={{ color: "var(--sev-ok)" }}>Rechazado</span>
              </div>
            </div>

            <div className="kpi">
              <h3>📊 Comparación ssh-audit</h3>
              <div className="bars" style={{ marginTop: 2 }}>
                <SevBar c={inseguro} />
                <SevBar c={endurecido} />
              </div>
              <p
                style={{
                  margin: "10px 0 0",
                  fontSize: "0.78rem",
                  color: "var(--text-faint)",
                }}
              >
                Segmentos: <span style={{ color: "var(--sev-fail)" }}>fail</span>{" "}
                · <span style={{ color: "var(--sev-warn)" }}>warn</span> · info
              </p>
            </div>
          </div>
        </section>

        {/* ============ 2. RED TEAM ============ */}
        <section id="redteam">
          <h2 className="section-title">
            <span className="posture red">🔴 Red team — ataque</span>
          </h2>
          <p className="section-sub">
            Escaneos reales con nmap, ssh-audit y hydra contra ambos
            contenedores. Comparación lado a lado.
          </p>

          <div className="compare">
            {[inseguro, endurecido].map((c) => (
              <div key={c.id} className={`cardcol ${c.id}`}>
                <div className="head">
                  <h3>{c.name}</h3>
                  <span className="port">127.0.0.1:{c.port}</span>
                </div>
                <div className="body">
                  <div className="field">
                    <div className="label">Versión SSH (nmap)</div>
                    <div className="val">{c.sshVersion ?? "—"}</div>
                  </div>
                  <div className="field">
                    <div className="label">
                      ssh-audit · {c.audit.counts.fail} fail /{" "}
                      {c.audit.counts.warn} warn
                    </div>
                    <FindingItems findings={c.audit.findings} />
                  </div>
                  <div className="field">
                    <div className="label">Fuerza bruta (hydra)</div>
                    <div className="val" style={{ fontFamily: "var(--sans)" }}>
                      <AttackLine c={c} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <h3 style={{ marginTop: 28, fontSize: "1rem" }}>
            Comando de fuerza bruta utilizado
          </h3>
          <p className="section-sub" style={{ marginBottom: 6 }}>
            Ejecutado <strong>solo</strong> contra el contenedor inseguro de
            este laboratorio (y, para contraste, contra el endurecido, donde
            falla).
          </p>
          <CmdBlock cmd={hydraCmd} />
        </section>

        {/* ============ 3. BLUE TEAM ============ */}
        <section id="blueteam">
          <h2 className="section-title">
            <span className="posture blue">🔵 Blue team — defensa</span>
          </h2>
          <p className="section-sub">
            Controles ya aplicados en <span className="mono">ssh-endurecido</span>{" "}
            que corrigen los hallazgos del inseguro, con fuente citada y un
            &ldquo;antes y después&rdquo;.
          </p>

          {mit.categorias.map((cat) => (
            <div className="catblock" key={cat.id}>
              <h3>
                <span>{cat.icono}</span> {cat.label}
              </h3>
              <p className="cat-sub">{cat.resumen}</p>
              {cat.controles.map((ctrl) => {
                const fuente = mit.fuentes[ctrl.fuente];
                return (
                  <div className="control" key={ctrl.id}>
                    <h4>{ctrl.nombre}</h4>
                    <p>{ctrl.que}</p>
                    <div className="meta-line">
                      Dónde: <code>{ctrl.donde}</code>
                    </div>
                    <div className="directiva">{ctrl.directiva}</div>
                    <div className="meta-line">
                      <strong>Corrige:</strong> {ctrl.corrige}
                    </div>
                    <div className="ba">
                      <div className="antes">
                        <span className="tag">🔴 Antes (inseguro)</span>
                        {ctrl.antes}
                      </div>
                      <div className="despues">
                        <span className="tag">✓ Después (endurecido)</span>
                        {ctrl.despues}
                      </div>
                    </div>
                    <div className="src">
                      Fuente:{" "}
                      <a href={fuente.url} target="_blank" rel="noopener noreferrer">
                        {fuente.nombre}
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </section>

        {/* ============ 4. EVIDENCIA / METODOLOGÍA ============ */}
        <section id="evidencia">
          <h2 className="section-title">🧾 Evidencia y metodología</h2>
          <p className="section-sub">
            Cada resultado se respalda con un archivo crudo en{" "}
            <span className="mono">data/raw/</span>.
          </p>

          <div className="tbl-scroll">
            <table>
              <thead>
                <tr>
                  <th>Herramienta</th>
                  <th>Comando</th>
                  <th>Respalda</th>
                  <th>Archivo(s) en data/raw/</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>nmap</td>
                  <td className="mono">{data.tools.nmap}</td>
                  <td>Versión de SSH de cada puerto</td>
                  <td className="mono">nmap.txt · nmap.xml</td>
                </tr>
                <tr>
                  <td>ssh-audit</td>
                  <td className="mono">{data.tools.sshAudit}</td>
                  <td>Algoritmos KEX/cifrado/MAC/host-key y severidad</td>
                  <td className="mono">
                    ssh-audit-inseguro.* · ssh-audit-endurecido.*
                  </td>
                </tr>
                <tr>
                  <td>hydra</td>
                  <td className="mono">{data.tools.hydra}</td>
                  <td>Resultado de la fuerza bruta (éxito/fallo, credencial)</td>
                  <td className="mono">
                    hydra-inseguro.txt · hydra-endurecido.txt
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <EvidenceDetails />
        </section>

        {/* ============ 5. LIMITACIONES ============ */}
        <section id="limitaciones">
          <h2 className="section-title">⚠️ Limitaciones y lo que queda</h2>
          <p className="section-sub">Lectura honesta del alcance.</p>
          <ul className="notelist">
            <li>
              <strong>Laboratorio local y acotado:</strong> todo escucha solo en{" "}
              <span className="mono">127.0.0.1</span>; no representa una red real
              con balanceadores, bastiones ni tráfico de internet.
            </li>
            <li>
              <strong>Diccionario mínimo:</strong> la fuerza bruta usa{" "}
              {inseguro.attack.candidates ?? 6} contraseñas con una correcta. Es
              una demostración del vector, no una campaña realista.
            </li>
            <li>
              <strong>Riesgo que seguiría presente en el endurecido:</strong> si
              se <em>filtrara la clave privada</em>{" "}
              <span className="mono">lab/keys/lab_key</span>, un atacante entraría
              como <span className="mono">axel</span> sin necesidad de
              contraseña. La defensa se desplaza a proteger y rotar la clave y a
              exigir un segundo factor.
            </li>
            <li>
              <strong>Sin MFA:</strong> el endurecido no implementa autenticación
              multifactor (p. ej. TOTP vía PAM); es la siguiente mejora natural.
            </li>
            <li>
              <strong>fail2ban omitido por alcance:</strong> la contención de
              fuerza bruta se cubre con{" "}
              <span className="mono">PasswordAuthentication no</span>,{" "}
              <span className="mono">MaxAuthTries 3</span> y{" "}
              <span className="mono">PerSourcePenalties</span> (por defecto en
              OpenSSH ≥ 9.8). Añadir fail2ban o un IDS queda como mejora futura.
            </li>
            <li>
              <strong>Rotación de llaves:</strong> no hay proceso de rotación ni
              caducidad de claves; recomendable en un entorno real.
            </li>
          </ul>

          <div className="foot">
            <p>
              Generado a partir de ejecución real · datos en{" "}
              <span className="mono">data/findings.json</span> y{" "}
              <span className="mono">data/mitigations.json</span> · herramientas:
              nmap, ssh-audit, hydra · Docker (contenedores sobre Debian + OpenSSH
              10.0p2).
            </p>
            <div className="actions">
              <PdfButton />
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

// Extractos de salida cruda (server component): <details> con recortes.
function EvidenceDetails() {
  const items: { titulo: string; archivo: string; lineas: number }[] = [
    { titulo: "nmap — detección de versión", archivo: "data/raw/nmap.txt", lineas: 14 },
    { titulo: "ssh-audit — inseguro (2221)", archivo: "data/raw/ssh-audit-inseguro.txt", lineas: 60 },
    { titulo: "ssh-audit — endurecido (2222)", archivo: "data/raw/ssh-audit-endurecido.txt", lineas: 60 },
    { titulo: "hydra — inseguro (ENTRÓ)", archivo: "data/raw/hydra-inseguro.txt", lineas: 12 },
    { titulo: "hydra — endurecido (rechazado)", archivo: "data/raw/hydra-endurecido.txt", lineas: 12 },
  ];
  return (
    <>
      {items.map((it) => {
        const excerpt = getRawExcerpt(it.archivo, it.lineas);
        return (
          <details key={it.archivo}>
            <summary>
              {it.titulo} — <span className="mono">{it.archivo}</span>
            </summary>
            <pre>{excerpt || "(archivo no encontrado; corre ./scripts/run-audit.sh)"}</pre>
          </details>
        );
      })}
    </>
  );
}
