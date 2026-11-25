"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useAuth, useCurrentUser } from "@/components/auth/auth-provider";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { firestoreErrorMessage } from "@/lib/firestore/errors";
import { acceptedTermsVersion, acceptTerms } from "@/lib/firestore/users";
import { TERMS_VERSION, takePendingTermsAcceptance } from "@/lib/legal";
import { LegalLink } from "./legal-links";

/**
 * Deja constancia de que cada persona acepta los términos y la política de
 * privacidad vigentes (`users/{uid}.termsVersion`). Quien acaba de aceptarlos
 * en la pantalla de acceso se registra sin preguntar; una sesión anterior, o
 * una versión nueva de los textos, muestra este diálogo una vez.
 */
export function TermsGate() {
  const user = useCurrentUser();
  const { signOut } = useAuth();
  const [pendingFor, setPendingFor] = useState<string | null>(null);
  const [accepting, startAccepting] = useTransition();

  useEffect(() => {
    let cancelled = false;
    if (takePendingTermsAcceptance()) {
      void acceptTerms(user.uid).catch((error) => console.warn("[términos]", error));
      return;
    }
    acceptedTermsVersion(user.uid)
      .then((version) => {
        if (!cancelled && version !== TERMS_VERSION) setPendingFor(user.uid);
      })
      // Sin conexión o sin permiso: no se bloquea la app por esto.
      .catch((error) => console.warn("[términos]", error));
    return () => {
      cancelled = true;
    };
  }, [user.uid]);

  function accept() {
    startAccepting(async () => {
      try {
        await acceptTerms(user.uid);
        setPendingFor(null);
      } catch (error) {
        toast.error(firestoreErrorMessage(error, "No se pudo guardar"));
      }
    });
  }

  return (
    <AlertDialog open={pendingFor === user.uid}>
      <AlertDialogContent className="sm:max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-sm">Términos de uso y privacidad</AlertDialogTitle>
          <AlertDialogDescription className="text-[13px] leading-relaxed">
            Para seguir usando ControlTrabajo, revisa y acepta los{" "}
            <LegalLink href="/legal/terminos">términos de uso</LegalLink> y la{" "}
            <LegalLink href="/legal/privacidad">política de privacidad</LegalLink>. Explican qué datos guardamos, para
            qué y cómo borrarlos.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void signOut().catch(() => toast.error("No se pudo cerrar la sesión."))}
          >
            Cerrar sesión
          </Button>
          <Button type="button" size="sm" onClick={accept} disabled={accepting}>
            {accepting && <Loader2 className="animate-spin" />}
            Aceptar y continuar
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
