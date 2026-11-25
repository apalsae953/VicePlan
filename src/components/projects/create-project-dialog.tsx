"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useProjectCreation } from "@/hooks/use-project-creation";
import { suggestProjectKey } from "@/lib/firestore/projects";

/** Nuevo proyecto vacío: nombre, clave de las tareas (AET-12) y descripción. */
export function CreateProjectDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { pending, create } = useProjectCreation();
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [keyEdited, setKeyEdited] = useState(false);
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const effectiveKey = keyEdited ? key : name.trim() ? suggestProjectKey(name) : "";

  async function submit() {
    if (!name.trim()) return setError("Ponle un nombre al proyecto.");
    if (!/^[A-Z0-9]{2,5}$/.test(effectiveKey)) return setError("La clave debe tener de 2 a 5 letras o números.");
    if (await create({ name, key: effectiveKey, description: description || null })) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent className="gap-5 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Nuevo proyecto</DialogTitle>
          <DialogDescription className="text-[13px]">
            Empieza con el tablero vacío; podrás crear milestones, tareas y el GDD desde dentro.
          </DialogDescription>
        </DialogHeader>
        <form
          id="create-project"
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <div className="grid grid-cols-[1fr_6rem] gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="project-name" className="text-xs text-muted-foreground">
                Nombre
              </Label>
              <Input
                id="project-name"
                autoFocus
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setError(null);
                }}
                placeholder="p. ej. Ember Run"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="project-key" className="text-xs text-muted-foreground">
                Clave
              </Label>
              <Input
                id="project-key"
                value={effectiveKey}
                maxLength={5}
                onChange={(event) => {
                  setKeyEdited(true);
                  setKey(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""));
                  setError(null);
                }}
                placeholder="ER"
                className="font-mono uppercase"
                aria-describedby="project-key-hint"
              />
            </div>
          </div>
          <p id="project-key-hint" className="-mt-2 text-xs text-muted-foreground">
            Las tareas se numerarán como <span className="font-mono text-foreground">{effectiveKey || "KEY"}-1</span>,{" "}
            <span className="font-mono text-foreground">{effectiveKey || "KEY"}-2</span>…
          </p>
          <div className="grid gap-1.5">
            <Label htmlFor="project-description" className="text-xs text-muted-foreground">
              Descripción <span className="text-muted-foreground/60">(opcional)</span>
            </Label>
            <Textarea
              id="project-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="min-h-16 text-[13px]"
              placeholder="Género, plataforma, el gancho del juego…"
            />
          </div>
          {error && (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          )}
        </form>
        <DialogFooter>
          <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={pending !== null}>
            Cancelar
          </Button>
          <Button type="submit" form="create-project" size="sm" disabled={pending !== null}>
            {pending === "empty" && <Loader2 className="animate-spin" />}
            Crear proyecto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
