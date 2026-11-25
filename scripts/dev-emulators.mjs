// `npm run dev:emulators`: arranca `next dev` contra el Firebase Emulator
// Suite local (lanza antes `npm run emulators` en otra terminal).
// Las variables se pasan por el entorno del proceso, que tiene prioridad
// sobre .env.local: se fijan TODAS las NEXT_PUBLIC_FIREBASE_* para no mezclar
// la configuración del proyecto real con la del emulador.
import { spawn } from "node:child_process";

const child = spawn("npx", ["next", "dev", ...process.argv.slice(2)], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: {
    ...process.env,
    NEXT_PUBLIC_FIREBASE_USE_EMULATORS: "true",
    NEXT_PUBLIC_FIREBASE_API_KEY: "demo-api-key",
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-controltrabajo",
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "demo-controltrabajo.firebaseapp.com",
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "demo-controltrabajo.appspot.com",
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "000000000000",
    NEXT_PUBLIC_FIREBASE_APP_ID: "1:000000000000:web:demo",
  },
});

child.on("exit", (code) => process.exit(code ?? 0));
