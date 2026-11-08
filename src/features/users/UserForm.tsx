"use client";

import { useId, useState } from "react";
import { useUserStore } from "@/stores/useUserStore";
import { alertDialog } from "@/stores/useModalStore";
import { EntityFormDialog } from "@/components/layout/EntityFormDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Firebase Auth rejects shorter passwords. */
const MIN_PASSWORD_LENGTH = 6;

/** Register a user, or edit `user` when given (password is only set on register). */
export function UserForm({ user }: { user?: User }) {
  const isEdit = user != null;
  const id = useId();
  const { createUser, updateUser } = useUserStore();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("staff");

  const canSubmit =
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    (isEdit || password.length >= MIN_PASSWORD_LENGTH);

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setName(user?.name ?? "");
      setEmail(user?.email ?? "");
      setPassword("");
      setRole(user?.role ?? "staff");
    }
    setOpen(next);
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const data = { name: name.trim(), email: email.trim(), role };
      if (isEdit) await updateUser(user.id!, data);
      else await createUser({ ...data, password });
      setOpen(false);
    } catch (err) {
      console.error(err);
      await alertDialog(`Couldn't ${isEdit ? "update" : "register"} user. Try again.`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <EntityFormDialog
      isEdit={isEdit}
      addLabel="+ Add user"
      title={isEdit ? "Edit user" : "Register new user"}
      submitLabel={isEdit ? undefined : "Create user"}
      open={open}
      onOpenChange={handleOpenChange}
      saving={saving}
      canSubmit={canSubmit}
      onSubmit={handleSubmit}
      contentClassName="sm:max-w-md"
    >
      <div className="space-y-2">
        <Label htmlFor={`${id}-name`}>Name</Label>
        <Input id={`${id}-name`} value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${id}-email`}>Email</Label>
        <Input
          id={`${id}-email`}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      {!isEdit && (
        <div className="space-y-2">
          <Label htmlFor={`${id}-password`}>Password</Label>
          <Input
            id={`${id}-password`}
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="text-xs text-foreground/60">
            At least {MIN_PASSWORD_LENGTH} characters.
          </p>
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor={`${id}-role`}>Role</Label>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger id={`${id}-role`} className="w-full">
            <SelectValue placeholder="Select a role" />
          </SelectTrigger>
          <SelectContent>
            {/* Must match the roles the apps and security rules accept. */}
            <SelectItem value="staff">Staff (POS, KDS, Orders app)</SelectItem>
            <SelectItem value="admin">Admin (everything, incl. this app)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </EntityFormDialog>
  );
}
