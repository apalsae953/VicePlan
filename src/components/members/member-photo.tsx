"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useStoredImage } from "@/hooks/use-stored-image";
import { memberDisplayName } from "@/lib/firestore/mappers";
import { parseAvatarMarker } from "@/lib/firestore/stored-images";
import type { MemberProfile } from "@/lib/types";
import { MemberAvatar, type AvatarSize } from "./member-avatar";

/** Las fotos de Google vienen a 96 px (`=s96-c`): se piden a 800 px para verlas en grande. */
function largeGooglePhoto(url: string) {
  return /=s\d+(-c)?$/.test(url) ? url.replace(/=s\d+(-c)?$/, "=s800-c") : url;
}

/**
 * Avatar que, si la persona tiene foto, se puede pulsar para verla en grande.
 * Sin foto (iniciales) es un avatar normal.
 */
export function ClickableMemberAvatar({ member, size = "lg" }: { member: MemberProfile; size?: AvatarSize }) {
  const [open, setOpen] = useState(false);
  const name = memberDisplayName(member);

  if (!member.photoURL) return <MemberAvatar size={size} name={member.name} email={member.email} />;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Ver la foto de ${name}`}
        title="Ver la foto en grande"
        className="shrink-0 cursor-zoom-in rounded-full outline-none transition-opacity duration-150 hover:opacity-85 focus-visible:ring-2 focus-visible:ring-ring"
      >
        <MemberAvatar size={size} name={member.name} email={member.email} photoURL={member.photoURL} />
      </button>
      {open && <PhotoDialog member={member} name={name} onClose={() => setOpen(false)} />}
    </>
  );
}

function PhotoDialog({ member, name, onClose }: { member: MemberProfile; name: string; onClose: () => void }) {
  const stored = member.photoURL ? parseAvatarMarker(member.photoURL) : null;
  const storedUrl = useStoredImage(stored?.path ?? null, stored?.version);
  const src = stored ? storedUrl : member.photoURL ? largeGooglePhoto(member.photoURL) : null;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[calc(100vw-2rem)] gap-3 p-4 sm:max-w-md">
        <DialogTitle className="text-sm">{name}</DialogTitle>
        <DialogDescription className="-mt-2 truncate text-xs">{member.email ?? "Cuenta de invitado"}</DialogDescription>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element -- foto de perfil (Google o blob:)
          <img
            src={src}
            alt={`Foto de ${name}`}
            referrerPolicy="no-referrer"
            className="aspect-square w-full rounded-lg border object-cover"
          />
        ) : (
          <Skeleton className="aspect-square w-full rounded-lg" />
        )}
        {src && (
          <Button asChild variant="ghost" size="sm" className="ml-auto gap-1.5 text-muted-foreground">
            <a href={src} target="_blank" rel="noreferrer noopener">
              <ExternalLink /> Abrir en otra pestaña
            </a>
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
