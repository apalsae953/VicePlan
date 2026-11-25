/*
 * Preferencias por navegador (comodidades, no datos): pueden no existir o
 * fallar (modo privado, almacenamiento bloqueado), así que todo va en
 * try/catch y la app funciona igual sin ellas.
 */

const LAST_PROJECT_KEY = "viceplan:last-project";

export function getLastProjectId() {
  try {
    return window.localStorage.getItem(LAST_PROJECT_KEY);
  } catch {
    return null;
  }
}

export function setLastProjectId(projectId: string) {
  try {
    window.localStorage.setItem(LAST_PROJECT_KEY, projectId);
  } catch {
    // Sin almacenamiento: no pasa nada, se abrirá el proyecto más reciente.
  }
}
