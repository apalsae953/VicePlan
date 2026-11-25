import {
  arrayRemove,
  arrayUnion,
  Bytes,
  deleteDoc,
  doc,
  getDoc,
  getDocFromCache,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "firebase/firestore";

import { getFirebase } from "@/lib/firebase";
import { compressImage, compressSquareImage, imageRejection, type CompressedImage } from "@/lib/images";
import {
  avatarDoc,
  projectDoc,
  projectLogoDoc,
  taskDoc,
  taskImageDoc,
  taskImagesCollection,
  userDoc,
} from "./refs";

/*
 * Imágenes guardadas dentro de Firestore (plan gratuito Spark, sin Cloud
 * Storage): fotos de perfil, imagen del proyecto e imágenes de las tareas.
 * Cada una es un documento con sus bytes ya comprimidos; aquí se suben y se
 * convierten en URLs `blob:` con caché en memoria durante la sesión.
 */

/** Máximo de imágenes por tarea. */
export const MAX_TASK_IMAGES = 12;

// ─── Carga con caché ─────────────────────────────────────────────────────────

const objectUrls = new Map<string, Promise<string>>();

function keyOf(path: string, version?: number | null) {
  return version ? `${path}?v=${version}` : path;
}

function blobUrl(image: Pick<CompressedImage, "blob">) {
  return URL.createObjectURL(image.blob);
}

/**
 * URL local de una imagen guardada en `path`. Las mutables (avatar, imagen
 * de proyecto) llevan `version`: si la copia en caché es de otra versión,
 * se pide al servidor.
 */
export function loadStoredImage(path: string, version?: number | null) {
  const key = keyOf(path, version);
  let url = objectUrls.get(key);
  if (!url) {
    url = (async () => {
      const { db } = getFirebase();
      const ref = doc(db, path);
      let snapshot = await getDocFromCache(ref).catch(() => null);
      if (!snapshot?.exists() || (version && snapshot.get("version") !== version)) snapshot = await getDoc(ref);
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

/** La imagen recién subida se muestra sin volver a descargarla. */
function prime(path: string, version: number | null, image: CompressedImage) {
  objectUrls.set(keyOf(path, version), Promise.resolve(blobUrl(image)));
}

async function bytesOf(image: CompressedImage) {
  return Bytes.fromUint8Array(new Uint8Array(await image.blob.arrayBuffer()));
}

function checkFile(file: File) {
  const problem = imageRejection(file);
  if (problem) throw new Error(problem);
}

// ─── Foto de perfil ──────────────────────────────────────────────────────────

/** Marca que los miembros guardan como foto: `avatar:<uid>?v=<versión>`. */
export const AVATAR_SCHEME = "avatar:";

export function avatarMarker(uid: string, version: number) {
  return `${AVATAR_SCHEME}${uid}?v=${version}`;
}

/** `avatar:<uid>?v=<n>` → ruta y versión del documento con la foto. */
export function parseAvatarMarker(value: string) {
  const match = /^avatar:([A-Za-z0-9]{1,128})\?v=(\d{1,16})$/.exec(value);
  return match ? { path: `avatars/${match[1]}`, version: Number(match[2]) } : null;
}

export async function uploadAvatar(uid: string, file: File) {
  checkFile(file);
  const { db } = getFirebase();
  const image = await compressSquareImage(file);
  const version = Date.now();
  await setDoc(avatarDoc(db, uid), {
    data: await bytesOf(image),
    mimeType: image.mimeType,
    size: image.blob.size,
    version,
    updatedAt: serverTimestamp(),
  });
  await setDoc(userDoc(db, uid), { avatar: version }, { merge: true });
  prime(`avatars/${uid}`, version, image);
  return version;
}

export async function removeAvatar(uid: string) {
  const { db } = getFirebase();
  await setDoc(userDoc(db, uid), { avatar: null }, { merge: true });
  await deleteDoc(avatarDoc(db, uid));
}

// ─── Imagen del proyecto ─────────────────────────────────────────────────────

export function projectLogoPath(projectId: string) {
  return `projects/${projectId}/branding/logo`;
}

export async function uploadProjectLogo(projectId: string, uid: string, file: File) {
  checkFile(file);
  const { db } = getFirebase();
  const image = await compressSquareImage(file);
  const version = Date.now();
  const batch = writeBatch(db);
  batch.set(projectLogoDoc(db, projectId), {
    data: await bytesOf(image),
    mimeType: image.mimeType,
    size: image.blob.size,
    version,
    updatedBy: uid,
    updatedAt: serverTimestamp(),
  });
  batch.update(projectDoc(db, projectId), { logo: version, updatedAt: serverTimestamp() });
  await batch.commit();
  prime(projectLogoPath(projectId), version, image);
  return version;
}

export function removeProjectLogo(projectId: string) {
  const { db } = getFirebase();
  const batch = writeBatch(db);
  batch.delete(projectLogoDoc(db, projectId));
  batch.update(projectDoc(db, projectId), { logo: null, updatedAt: serverTimestamp() });
  return batch.commit();
}

// ─── Imágenes de tareas ──────────────────────────────────────────────────────

export function taskImagePath(projectId: string, imageId: string) {
  return `projects/${projectId}/taskImages/${imageId}`;
}

/** Comprime, guarda la imagen y la añade a la lista de la tarea (un batch). */
export async function uploadTaskImage(projectId: string, taskId: string, uid: string, file: File) {
  checkFile(file);
  const { db } = getFirebase();
  const image = await compressImage(file);
  const ref = doc(taskImagesCollection(db, projectId));
  const batch = writeBatch(db);
  batch.set(ref, {
    taskId,
    name: file.name.slice(0, 200) || "imagen",
    mimeType: image.mimeType,
    width: image.width,
    height: image.height,
    size: image.blob.size,
    data: await bytesOf(image),
    createdBy: uid,
    createdAt: serverTimestamp(),
  });
  batch.update(taskDoc(db, projectId, taskId), { images: arrayUnion(ref.id), updatedAt: serverTimestamp() });
  await batch.commit();
  prime(taskImagePath(projectId, ref.id), null, image);
  return ref.id;
}

export function deleteTaskImage(projectId: string, taskId: string, imageId: string) {
  const { db } = getFirebase();
  const batch = writeBatch(db);
  batch.delete(taskImageDoc(db, projectId, imageId));
  batch.update(taskDoc(db, projectId, taskId), { images: arrayRemove(imageId), updatedAt: serverTimestamp() });
  return batch.commit();
}

/** Tras borrar una tarea (pasado el "Deshacer"), sus imágenes sobran. */
export async function deleteImagesOf(projectId: string, imageIds: string[]) {
  if (imageIds.length === 0) return;
  const { db } = getFirebase();
  const batch = writeBatch(db);
  imageIds.forEach((id) => batch.delete(taskImageDoc(db, projectId, id)));
  await batch.commit();
}
