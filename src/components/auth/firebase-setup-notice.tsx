import { Flame } from "lucide-react";

const STEPS = [
  "Copia .env.example a .env.local.",
  "Pega la configuración de tu app web de Firebase (Consola → Configuración del proyecto).",
  "Reinicia npm run dev.",
];

/** Pantalla mostrada cuando faltan las variables de entorno de Firebase. */
export function FirebaseSetupNotice() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-md space-y-5 rounded-xl border bg-card p-6">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg border bg-background">
            <Flame className="size-4 text-warning" aria-hidden />
          </div>
          <h1 className="text-sm font-medium">Falta configurar Firebase</h1>
        </div>
        <ol className="space-y-2 text-[13px] text-muted-foreground">
          {STEPS.map((step, index) => (
            <li key={step} className="flex gap-2.5">
              <span className="font-mono text-xs text-foreground/70">{index + 1}.</span>
              {step}
            </li>
          ))}
        </ol>
        <p className="border-t pt-4 text-xs text-muted-foreground">
          ¿Sin cuenta todavía? Ejecuta <code className="font-mono text-foreground">npm run emulators</code> y añade{" "}
          <code className="font-mono text-foreground">NEXT_PUBLIC_FIREBASE_USE_EMULATORS=true</code> y{" "}
          <code className="font-mono text-foreground">NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-controltrabajo</code> a{" "}
          <code className="font-mono text-foreground">.env.local</code>.
        </p>
      </div>
    </main>
  );
}
