"use client";

import { useState } from "react";
import { ChevronsUpDown, CloudUpload, LogOut, MailWarning, RefreshCw, UserCog } from "lucide-react";
import { toast } from "sonner";

import { GuestSignOutDialog, SaveAccountDialog } from "@/components/auth/account-dialogs";
import { AccountSettingsDialog } from "@/components/auth/account-settings-dialog";
import { displayNameOf, useAuth, useCurrentUser } from "@/components/auth/auth-provider";
import { UserAvatar } from "@/components/members/user-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { authErrorMessage, resendVerification } from "@/lib/auth";
import { usingEmulators } from "@/lib/firebase";

export function UserMenu() {
  const user = useCurrentUser();
  const { signOut, isGuest, refresh } = useAuth();
  const { isMobile } = useSidebar();
  const [saveOpen, setSaveOpen] = useState(false);
  const [guestSignOutOpen, setGuestSignOutOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const name = displayNameOf(user);
  const unverified = !isGuest && !!user.email && !user.emailVerified;

  async function checkVerified() {
    await refresh();
    if (user.emailVerified) toast.success("Email verificado", { description: "Ya puedes recibir invitaciones." });
    else toast("Todavía no está verificado", { description: "Abre el enlace del email y vuelve a comprobarlo." });
  }

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton tooltip={name} className="data-[state=open]:bg-sidebar-accent">
                <UserAvatar />
                <span className="grid min-w-0 flex-1 text-left leading-tight">
                  <span className="truncate text-[13px]">{name}</span>
                  {(isGuest || unverified) && (
                    <span className="truncate text-[11px] text-warning">
                      {isGuest ? "Sesión sin guardar" : "Email sin verificar"}
                    </span>
                  )}
                </span>
                <ChevronsUpDown className="ml-auto text-muted-foreground" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent side={isMobile ? "top" : "right"} align="end" sideOffset={6} className="w-64">
              <DropdownMenuLabel className="font-normal">
                <p className="truncate text-[13px] text-foreground">{name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {isGuest ? "Invitado · los datos viven en este navegador" : user.email}
                </p>
                {usingEmulators && <p className="mt-1 text-[11px] text-warning">Emulador local de Firebase</p>}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setAccountOpen(true)}>
                <UserCog /> Mi cuenta
              </DropdownMenuItem>
              {isGuest && (
                <DropdownMenuItem onSelect={() => setSaveOpen(true)}>
                  <CloudUpload /> Guardar cuenta
                </DropdownMenuItem>
              )}
              {unverified && (
                <>
                  <DropdownMenuItem
                    onSelect={() =>
                      void resendVerification(user)
                        .then(() => toast.success("Email de verificación enviado", { description: user.email ?? undefined }))
                        .catch((error) => toast.error(authErrorMessage(error, "No se pudo enviar el email.")))
                    }
                  >
                    <MailWarning /> Reenviar verificación
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => void checkVerified()}>
                    <RefreshCw /> Ya lo he verificado
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => {
                  if (isGuest) setGuestSignOutOpen(true);
                  else void signOut().catch(() => toast.error("No se pudo cerrar la sesión. Inténtalo de nuevo."));
                }}
              >
                <LogOut /> Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      {isGuest && <SaveAccountDialog open={saveOpen} onOpenChange={setSaveOpen} />}
      <AccountSettingsDialog open={accountOpen} onOpenChange={setAccountOpen} onSaveAccount={() => setSaveOpen(true)} />
      <GuestSignOutDialog
        open={guestSignOutOpen}
        onOpenChange={setGuestSignOutOpen}
        onSaveAccount={() => setSaveOpen(true)}
      />
    </>
  );
}
