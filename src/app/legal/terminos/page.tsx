import type { Metadata } from "next";
import Link from "next/link";

import { ContactEmail, Fill, LegalPage } from "@/components/legal/legal-page";
import { LEGAL, MIN_AGE } from "@/lib/legal";

export const metadata: Metadata = { title: "Términos de uso" };

export default function TermsPage() {
  return (
    <LegalPage
      title="Términos de uso"
      intro="Las condiciones para usar ControlTrabajo. Al crear una cuenta, entrar con Google o como invitado, las aceptas."
    >
      <h2>1. El servicio</h2>
      <p>
        ControlTrabajo es una herramienta gratuita de gestión de proyectos para estudios de videojuegos: tableros por
        hito, tareas, registro de horas, métricas y un documento de diseño compartido. La ofrece{" "}
        <Fill value={LEGAL.owner} label="titular" /> (ver el <Link href="/legal/aviso-legal">aviso legal</Link>).
      </p>

      <h2>2. Quién puede usarlo</h2>
      <p>
        Necesitas al menos {MIN_AGE} años, o el consentimiento de tu madre, padre o tutor. Si usas ControlTrabajo en nombre
        de una empresa o estudio, confirmas que puedes aceptar estos términos por ella.
      </p>

      <h2>3. Tu cuenta</h2>
      <ul>
        <li>Usa datos verdaderos y una contraseña que no uses en otros sitios. Eres responsable de lo que se haga con tu cuenta.</li>
        <li>Si sospechas que alguien ha entrado en ella, cambia la contraseña (Mi cuenta → Seguridad) y avísanos.</li>
        <li>
          Las <strong>sesiones de invitado</strong> solo existen en el navegador donde se crearon: si cierras sesión o
          borras los datos del navegador sin guardar la cuenta, pierdes el acceso a esos proyectos.
        </li>
      </ul>

      <h2>4. Uso aceptable</h2>
      <p>No puedes usar ControlTrabajo para:</p>
      <ul>
        <li>subir contenido ilegal, ofensivo o que infrinja derechos de otras personas (propiedad intelectual, imagen, intimidad);</li>
        <li>intentar acceder a cuentas o proyectos ajenos, o saltarte las medidas de seguridad;</li>
        <li>sobrecargar el servicio, automatizar su uso de forma abusiva o distribuir software malicioso;</li>
        <li>enviar spam o acosar a otras personas.</li>
      </ul>

      <h2>5. Tu contenido</h2>
      <p>
        Lo que creas (tareas, documentos, imágenes, comentarios) sigue siendo tuyo o de tu equipo. Solo nos das el permiso
        necesario para guardarlo y mostrarlo a quien tú decidas, es decir, a los miembros de cada proyecto. Garantizas que
        tienes derecho a subirlo. En un proyecto compartido, su propietario puede quitar miembros o eliminar el proyecto.
      </p>

      <h2>6. Servicio gratuito y sus límites</h2>
      <p>
        ControlTrabajo es gratis y se ofrece tal cual, sobre el plan gratuito de Firebase, que tiene cuotas diarias: si se
        superan, el servicio puede dejar de responder hasta el día siguiente. Podemos cambiarlo, pausarlo o cerrarlo; si
        lo cerramos, avisaremos con antelación razonable para que descargues tus datos (Mi cuenta → Datos y privacidad).
        Te recomendamos guardar copia de lo importante.
      </p>

      <h2>7. Responsabilidad</h2>
      <p>
        En la medida en que la ley lo permita, no respondemos de pérdidas de datos, interrupciones ni daños indirectos
        derivados del uso del servicio. Nada en estos términos limita la responsabilidad por dolo o culpa grave ni los
        derechos que te reconoce la normativa de protección de consumidores.
      </p>

      <h2>8. Baja y suspensión</h2>
      <p>
        Puedes darte de baja cuando quieras desde Mi cuenta → Datos y privacidad → Eliminar cuenta. Podemos suspender las
        cuentas que incumplan estos términos.
      </p>

      <h2>9. Privacidad</h2>
      <p>
        Cómo tratamos tus datos personales se explica en la <Link href="/legal/privacidad">política de privacidad</Link>.
      </p>

      <h2>10. Cambios y ley aplicable</h2>
      <p>
        Si cambiamos estos términos de forma relevante, te pediremos que los aceptes de nuevo al entrar. Se rigen por la
        ley española; si eres consumidor, podrás acudir a los juzgados de tu domicilio.
      </p>

      <h2>11. Contacto</h2>
      <p>
        <ContactEmail />
      </p>
    </LegalPage>
  );
}
