"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/ui/status-badge";
import { useCurrentAgency } from "@/components/agency/agency-context";

export default function AgencyProfilePage() {
  const agency = useCurrentAgency();
  const router = useRouter();

  const [name, setName] = useState(agency.name);
  const [phone, setPhone] = useState(agency.contactPhone);
  const [description, setDescription] = useState(agency.description);
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  async function saveProfile() {
    setSavingProfile(true);
    try {
      const res = await fetch("/api/agency/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, contactPhone: phone, description }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(body?.error ?? "Impossible d'enregistrer le profil.");
        return;
      }
      toast.success("Profil mis à jour");
      router.refresh();
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePassword() {
    setSavingPassword(true);
    try {
      const res = await fetch("/api/agency/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(body?.error ?? "Impossible de mettre à jour le mot de passe.");
        return;
      }
      toast.success("Mot de passe mis à jour");
      setCurrentPassword("");
      setNewPassword("");
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight">Mon profil</h1>
        <p className="text-muted-foreground">Informations publiques et paramètres de {agency.name}.</p>
      </div>

      <Card className="space-y-4 p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold">Informations de l&apos;agence</h2>
          <StatusBadge kind="agency" status={agency.verificationStatus} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Nom de l&apos;agence</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="manager">Gérant (non modifiable)</Label>
            <Input id="manager" value={agency.managerName} disabled />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email (non modifiable)</Label>
            <Input id="email" value={agency.contactEmail} disabled />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Téléphone</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <Button onClick={saveProfile} disabled={savingProfile}>
          {savingProfile ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Enregistrer
        </Button>
      </Card>

      <Card className="space-y-4 p-6">
        <h2 className="font-heading text-lg font-bold">Mot de passe</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="current-password">Mot de passe actuel</Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-password">Nouveau mot de passe</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
        </div>
        <Separator />
        <Button
          variant="outline"
          disabled={!currentPassword || !newPassword || savingPassword}
          onClick={savePassword}
        >
          {savingPassword && <Loader2 className="size-4 animate-spin" />}
          Mettre à jour le mot de passe
        </Button>
      </Card>
    </div>
  );
}
