import { FirebaseError } from "firebase/app";
import { Bytes, doc, getDoc, getDocFromCache, serverTimestamp, setDoc } from "firebase/firestore";

import { getFirebase } from "@/lib/firebase";
import { compressImage } from "@/lib/images";
import { firestoreErrorMessage } from "./errors";
import { gddAssetDoc, gddAssetsCollection } from "./refs";

/*
 * Concept art del GDD guardado dentro de Firestore (plan gratuito Spark, sin
 * Cloud Storage): cada imagen, ya comprimida, es un documento de
 * `projects/{id}/gddAssets` con sus bytes. El Markdown la referencia como
 * `![alt](asset:<id>)` y el visor la carga bajo demanda.
 */

export const ASSET_SCHEME = "asset:";

export function assetIdFromSrc(src: string) {
  return src.startsWith(ASSET_SCHEME) ? src.slice(ASSET_SCHEME.length) : null;
}

/** Comprime y guarda una imagen; devuelve la URL para el Markdown (`asset:<id>`). */
export async function uploadGddImage(projectId: string, nodeId: string, uid: string, file: File) {
  const { db } = getFirebase();
  const image = await compressImage(file);
  const bytes = new Uint8Array(await image.blob.arrayBuffer());
  const ref = doc(gddAssetsCollection(db, projectId));
  await setDoc(ref, {
    nodeId,
    name: file.name.slice(0, 200) || "imagen",
    mimeType: image.mimeType,
    width: image.width,
    height: image.height,
    size: bytes.byteLength,
    data: Bytes.fromUint8Array(bytes),
    createdBy: uid,
    createdAt: serverTimestamp(),
  });
  // La que acabamos de subir se muestra sin volver a descargarla.
  objectUrls.set(cacheKey(projectId, ref.id), Promise.resolve(URL.createObjectURL(image.blob)));
  return `${ASSET_SCHEME}${ref.id}`;
}

const objectUrls = new Map<string, Promise<string>>();
const cacheKey = (projectId: string, assetId: string) => `${projectId}/${assetId}`;

/**
 * URL local (blob:) de una imagen del GDD. Las imágenes no cambian nunca:
 * primero se busca en la caché de Firestore (sin coste de lectura) y se
 * recuerda en memoria durante la sesión.
 */
export function loadGddImage(projectId: string, assetId: string) {
  const key = cacheKey(projectId, assetId);
  let url = objectUrls.get(key);
  if (!url) {
    url = (async () => {
      const { db } = getFirebase();
      const ref = gddAssetDoc(db, projectId, assetId);
      const snapshot = await getDocFromCache(ref).catch(() => getDoc(ref));
      const data = snapshot.data();
      if (!data || !(data.data instanceof Bytes)) throw new Error("La imagen ya no existe.");
      const type = typeof data.mimeType === "string" ? data.mimeType : "image/webp";
      const bytes = data.data.toUint8Array();
      return URL.createObjectURL(new Blob([bytes.slice().buffer as ArrayBuffer], { type }));
    })();
    // Si falla (sin conexión, borrada), se reintenta en el siguiente render.
    url.catch(() => objectUrls.delete(key));
    objectUrls.set(key, url);
  }
  return url;
}

export function imageErrorMessage(error: unknown) {
  if (error instanceof FirebaseError) return firestoreErrorMessage(error, "No se pudo guardar la imagen");
  return error instanceof Error ? error.message : "No se pudo guardar la imagen.";
}
