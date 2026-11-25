import type { Metadata } from "next";
import Link from "next/link";

import { ContactEmail, Fill, LegalPage } from "@/components/legal/legal-page";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = { title: "Aviso legal" };

export default function LegalNoticePage() {
  return (
    <LegalPage
      title="Aviso legal"
      intro="Información general sobre el titular de VicePlan, conforme al artículo 10 de la Ley 34/2002, de servicios de la sociedad de la información y de comercio electrónico (LSSI-CE)."
    >
      <h2>Titular</h2>
      <ul>
        <li>
          Nombre o razón social: <Fill value={LEGAL.owner} label="nombre y apellidos o razón social" />
        </li>
        {LEGAL.taxId && <li>NIF/CIF: {LEGAL.taxId}</li>}
        <li>{LEGAL.address ? `Domicilio: ${LEGAL.address}, ${LEGAL.country}` : `País: ${LEGAL.country}`}</li>
        <li>
          Email: <ContactEmail />
        </li>
      </ul>

      <h2>Objeto</h2>
      <p>
        VicePlan es una aplicación web gratuita de gestión de proyectos para el desarrollo de videojuegos. Su uso se
        rige por los <Link href="/legal/terminos">términos de uso</Link> y la{" "}
        <Link href="/legal/privacidad">política de privacidad</Link>.
      </p>

      <h2>Propiedad intelectual</h2>
      <p>
        El código, el diseño y el nombre de VicePlan pertenecen a su titular o se usan con licencia. Los contenidos
        que crean los usuarios (tareas, documentos, imágenes) son de sus autores, que responden de ellos.
      </p>

      <h2>Responsabilidad</h2>
      <p>
        El titular no se hace responsable de los contenidos que publiquen los usuarios ni de los sitios externos enlazados
        desde ellos, aunque retirará con diligencia cualquier contenido ilícito del que tenga conocimiento efectivo.
      </p>

      <h2>Legislación aplicable</h2>
      <p>Este aviso se rige por la legislación española.</p>
    </LegalPage>
  );
}
