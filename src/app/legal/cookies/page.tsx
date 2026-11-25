import type { Metadata } from "next";

import { LegalPage, TableScroll } from "@/components/legal/legal-page";

export const metadata: Metadata = { title: "Política de cookies" };

const ITEMS = [
  {
    name: "firebaseLocalStorageDb",
    kind: "IndexedDB · técnica",
    purpose: "Mantener tu sesión iniciada (Firebase Authentication).",
    duration: "Hasta que cierras sesión",
  },
  {
    name: "firestore/…",
    kind: "IndexedDB · técnica",
    purpose: "Copia local de tus proyectos para que la app cargue rápido y aguante cortes de conexión (Cloud Firestore).",
    duration: "Se borra al cerrar sesión",
  },
  {
    name: "viceplan:terms-accepted",
    kind: "sessionStorage · técnica",
    purpose: "Anotar que aceptaste los términos al entrar, hasta guardarlo en tu perfil.",
    duration: "Segundos (o hasta cerrar la pestaña)",
  },
  {
    name: "viceplan:last-project",
    kind: "localStorage · preferencia",
    purpose: "Abrir el último proyecto que usaste.",
    duration: "Hasta que borras los datos del navegador",
  },
  {
    name: "sidebar_state",
    kind: "Cookie propia · preferencia",
    purpose: "Recordar si la barra lateral está abierta o cerrada.",
    duration: "7 días",
  },
];

export default function CookiesPage() {
  return (
    <LegalPage
      title="Política de cookies"
      intro="VicePlan no usa cookies de publicidad ni de analítica, ni propias ni de terceros."
    >
      <p>
        Solo guarda en tu navegador lo imprescindible para funcionar y un par de preferencias que eliges tú al usar la
        app. Ese almacenamiento está exento de consentimiento (art. 22.2 de la Ley 34/2002, LSSI, y guía sobre el uso de
        las cookies de la AEPD), por eso no verás un banner de cookies.
      </p>

      <h2>Qué se guarda</h2>
      <TableScroll>
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Para qué</th>
              <th>Duración</th>
            </tr>
          </thead>
          <tbody>
            {ITEMS.map((item) => (
              <tr key={item.name}>
                <td>
                  <code>{item.name}</code>
                </td>
                <td>{item.kind}</td>
                <td>{item.purpose}</td>
                <td>{item.duration}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableScroll>

      <h2>Google</h2>
      <p>
        Solo si eliges «Continuar con Google», se abre una ventana de Google (accounts.google.com) donde Google usa sus
        propias cookies para identificarte, según su{" "}
        <a href="https://policies.google.com/technologies/cookies?hl=es" target="_blank" rel="noreferrer noopener">
          política de cookies
        </a>
        . VicePlan no puede leerlas.
      </p>

      <h2>Cómo borrarlo</h2>
      <p>
        Al cerrar sesión se borra tu sesión y la copia local de tus proyectos. También puedes eliminar todo desde la
        configuración de tu navegador (Privacidad → Cookies y datos de sitios). Si lo bloqueas por completo, no podrás
        iniciar sesión.
      </p>
    </LegalPage>
  );
}
