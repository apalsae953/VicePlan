import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";
const usingEmulators = process.env.NEXT_PUBLIC_FIREBASE_USE_EMULATORS === "true";
const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;

/*
 * Política de seguridad de contenidos (CSP): el navegador solo ejecuta
 * scripts de esta web y de Google (inicio de sesión), solo se conecta a
 * Firebase y nadie puede incrustar la app en un iframe (clickjacking).
 * `'unsafe-inline'` en scripts lo necesita Next (sus scripts de arranque
 * en línea en páginas estáticas); los datos del usuario nunca se insertan
 * como HTML (react-markdown no interpreta HTML crudo).
 */
const emulatorHosts = usingEmulators ? ["http://127.0.0.1:9099", "http://127.0.0.1:8080", "http://localhost:9099"] : [];
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://apis.google.com https://www.gstatic.com`,
  "style-src 'self' 'unsafe-inline'",
  // Imágenes: propias, del GDD (blob:), avatares de Google y las enlazadas en el documento de diseño.
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  [
    "connect-src 'self'",
    "https://*.googleapis.com",
    "https://apis.google.com",
    ...emulatorHosts,
    ...(isDev ? ["ws:", "wss:"] : []),
  ].join(" "),
  [
    "frame-src",
    authDomain ? `https://${authDomain}` : "https://*.firebaseapp.com",
    "https://accounts.google.com",
    "https://apis.google.com",
    ...emulatorHosts,
  ].join(" "),
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  },
  // La ventana de Google (signInWithPopup) necesita comunicarse con la app.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  // Solo tiene efecto servida por HTTPS (en http://localhost el navegador la ignora).
  ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=31536000" }]),
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  // Permite abrir el servidor de desarrollo también en 127.0.0.1 (el host del
  // Firebase Emulator Suite); útil para probar con dos cuentas a la vez.
  allowedDevOrigins: ["127.0.0.1"],
  experimental: {
    // Los datos (Firebase Auth + Firestore) solo existen en el navegador y las
    // vistas del proyecto son Client Components: el servidor nunca puede
    // prerenderizarlas con datos. Validamos solo los segmentos que lo pidan con
    // `export const instant = true` en vez de avisar en todas las páginas.
    instantInsights: { validationLevel: "manual-warning" },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    return [
      // La vista por defecto de un proyecto es su tablero.
      { source: "/projects/:projectId", destination: "/projects/:projectId/board", permanent: false },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
