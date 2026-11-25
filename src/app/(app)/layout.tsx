import { AuthGate } from "@/components/auth/auth-gate";
import { ProjectsProvider } from "@/components/auth/projects-provider";
import { TermsGate } from "@/components/legal/terms-gate";

/**
 * Zona protegida (inicio y proyectos): requiere sesión y expone los
 * proyectos del usuario en tiempo real. El grupo `(app)` no cambia las URLs.
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <AuthGate>
      <ProjectsProvider>
        {children}
        <TermsGate />
      </ProjectsProvider>
    </AuthGate>
  );
}
