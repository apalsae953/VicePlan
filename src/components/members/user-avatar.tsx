"use client";

import { useAuth, useCurrentUser } from "@/components/auth/auth-provider";
import { MemberAvatar, type AvatarSize } from "./member-avatar";

/** Avatar del usuario actual: su foto subida, la de Google, sus iniciales o el icono de invitado. */
export function UserAvatar({ size = "md", className }: { size?: AvatarSize; className?: string }) {
  const user = useCurrentUser();
  const { photoURL } = useAuth();
  return (
    <MemberAvatar
      size={size}
      className={className}
      name={user.isAnonymous ? null : user.displayName}
      email={user.email}
      photoURL={photoURL}
    />
  );
}
