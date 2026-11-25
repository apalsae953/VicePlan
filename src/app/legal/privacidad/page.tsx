import type { Metadata } from "next";
import Link from "next/link";

import { ContactEmail, Fill, LegalPage, TableScroll } from "@/components/legal/legal-page";
import { LEGAL, MIN_AGE } from "@/lib/legal";

export const metadata: Metadata = { title: "Política de privacidad" };

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Política de privacidad"
      intro="Qué datos personales trata VicePlan, para qué, durante cuánto tiempo y cómo puedes ejercer tus derechos, conforme al Reglamento General de Protección de Datos (RGPD) y a la Ley Orgánica 3/2018 (LOPDGDD)."
    >
      <h2>1. Responsable del tratamiento</h2>
      <ul>
        <li>
          Responsable: <Fill value={LEGAL.owner} label="nombre y apellidos o razón social" />
        </li>
        <li>
          Contacto para privacidad: <ContactEmail />
        </li>
        <li>
          Más datos del titular en el <Link href="/legal/aviso-legal">aviso legal</Link>.
        </li>
      </ul>

      <h2>2. Qué datos tratamos</h2>
      <ul>
        <li>
          <strong>Datos de cuenta:</strong> nombre, email, foto de perfil (si entras con Google) y un identificador
          interno. Si usas email y contraseña, la contraseña la guarda Firebase Authentication cifrada con un hash: nadie
          puede verla.
        </li>
        <li>
          <strong>Sesión de invitado:</strong> solo un identificador anónimo, sin email ni nombre.
        </li>
        <li>
          <strong>Contenido que creas:</strong> proyectos, hitos, tareas, comentarios, horas registradas y el documento de
          diseño, incluidas las imágenes que subas.
        </li>
        <li>
          <strong>Datos de uso:</strong> el registro de actividad de cada proyecto (quién hizo qué y cuándo), la fecha de
          tu último acceso y la fecha en que aceptaste estos textos.
        </li>
        <li>
          <strong>Datos técnicos</strong> que Google Firebase procesa para prestar el servicio y protegerlo (por ejemplo,
          la dirección IP o el navegador).
        </li>
      </ul>
      <p>
        No tratamos categorías especiales de datos, no elaboramos perfiles, no mostramos publicidad y no vendemos ni
        cedemos datos a terceros con fines comerciales.
      </p>

      <h2>3. Para qué los usamos y con qué base legal</h2>
      <TableScroll>
        <table>
          <thead>
            <tr>
              <th>Finalidad</th>
              <th>Base jurídica</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Crear y mantener tu cuenta y prestar el servicio (tableros, documento de diseño, trabajo en equipo).</td>
              <td>Ejecución del contrato: los términos de uso que aceptas (art. 6.1.b RGPD).</td>
            </tr>
            <tr>
              <td>Enviarte los emails imprescindibles: verificar tu email y restablecer tu contraseña.</td>
              <td>Ejecución del contrato (art. 6.1.b RGPD).</td>
            </tr>
            <tr>
              <td>Proteger las cuentas y el servicio frente a accesos indebidos y abusos.</td>
              <td>Interés legítimo en la seguridad del servicio (art. 6.1.f RGPD).</td>
            </tr>
            <tr>
              <td>Atender requerimientos legales.</td>
              <td>Obligación legal (art. 6.1.c RGPD).</td>
            </tr>
          </tbody>
        </table>
      </TableScroll>
      <p>No te enviaremos comunicaciones comerciales.</p>

      <h2>4. Quién más puede ver tus datos</h2>
      <ul>
        <li>
          <strong>Las personas de tus proyectos</strong> ven tu nombre, tu email y tu foto, además del contenido del
          proyecto. Tú decides a quién invitas.
        </li>
        <li>
          <strong>Google</strong> (Google Ireland Limited y Google LLC), como encargado del tratamiento, a través de
          Firebase Authentication y Cloud Firestore, con sus condiciones de tratamiento de datos. Los datos de la app se
          guardan en servidores de la Unión Europea (región <code>eur3</code>). Firebase Authentication puede tratar datos
          fuera del Espacio Económico Europeo (Estados Unidos); esas transferencias se amparan en el Marco de Privacidad
          de Datos UE-EE. UU., en el que Google LLC está certificada, y en las cláusulas contractuales tipo de la Comisión
          Europea.
        </li>
        <li>Autoridades públicas, solo cuando una ley lo exija.</li>
      </ul>

      <h2>5. Cuánto tiempo los conservamos</h2>
      <p>
        Mientras mantengas la cuenta. Si la eliminas (Mi cuenta → Datos y privacidad), se borran al momento tu cuenta, tu
        perfil, tus comentarios y los proyectos que elijas eliminar. En los proyectos compartidos que siguen existiendo,
        las tareas que creaste se quedan para el equipo sin tu nombre ni tu email, y el registro de actividad conserva solo
        un identificador interno que ya no lleva a ningún perfil. No guardamos copias de seguridad adicionales.
      </p>

      <h2>6. Tus derechos</h2>
      <p>
        Puedes ejercer tus derechos de acceso, rectificación, supresión, oposición, limitación del tratamiento y
        portabilidad:
      </p>
      <ul>
        <li>
          Desde la propia app, en <strong>Mi cuenta</strong>: cambiar tu nombre, descargar todos tus datos en un archivo
          JSON y eliminar tu cuenta.
        </li>
        <li>
          Escribiendo a <ContactEmail />. Responderemos en un plazo máximo de un mes.
        </li>
      </ul>
      <p>
        Si crees que no hemos atendido bien tu solicitud, puedes reclamar ante la Agencia Española de Protección de Datos
        (<a href="https://www.aepd.es" target="_blank" rel="noreferrer noopener">www.aepd.es</a>).
      </p>

      <h2>7. Menores</h2>
      <p>
        Necesitas al menos {MIN_AGE} años para crear una cuenta (art. 7 LOPDGDD). Si tienes menos, tu madre, padre o tutor
        tiene que consentirlo.
      </p>

      <h2>8. Seguridad</h2>
      <p>
        La conexión va cifrada (HTTPS). La base de datos aplica reglas de acceso: solo los miembros de un proyecto pueden
        leerlo o modificarlo. Las contraseñas las gestiona Firebase con hash, la app envía cabeceras de seguridad al
        navegador, los documentos no ejecutan HTML y, al cerrar sesión, se borra la copia local de tus datos de este
        navegador.
      </p>

      <h2>9. Cookies y almacenamiento local</h2>
      <p>
        Solo usamos almacenamiento técnico y de preferencias, sin publicidad ni analítica. El detalle está en la{" "}
        <Link href="/legal/cookies">política de cookies</Link>.
      </p>

      <h2>10. Cambios</h2>
      <p>
        Si cambiamos esta política de forma relevante, te lo diremos y te pediremos que la aceptes de nuevo al entrar en
        la app.
      </p>
    </LegalPage>
  );
}
