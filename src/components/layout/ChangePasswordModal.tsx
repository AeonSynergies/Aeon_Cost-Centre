"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { PasswordInput } from "@/components/common/PasswordInput";
import { apiSend } from "@/lib/api-client";
import { toast } from "@/store/toastStore";

export function ChangePasswordModal({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [form, setForm] = React.useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => { if (open) { setForm({ currentPassword: "", newPassword: "", confirm: "" }); setError(null); } }, [open]);

  const save = async () => {
    if (form.newPassword !== form.confirm) { setError("New passwords do not match"); return; }
    if (form.newPassword.length < 8) { setError("New password must be at least 8 characters"); return; }
    setSaving(true); setError(null);
    try {
      await apiSend("/api/auth/change-password", "PATCH", { currentPassword: form.currentPassword, newPassword: form.newPassword });
      toast("Password changed");
      onOpenChange(false);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed"); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Change Password" width={420}>
        <DialogBody>
          {error && <div className="mb-3 rounded-[5px] bg-[#FAECE7] px-3 py-2 text-[12px] text-[#711B13]">{error}</div>}
          <div className="grid gap-3">
            <div><Label>Current Password</Label><PasswordInput value={form.currentPassword} onChange={(e) => setForm((f) => ({ ...f, currentPassword: e.target.value }))} /></div>
            <div><Label>New Password</Label><PasswordInput value={form.newPassword} onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))} /></div>
            <div><Label>Confirm New Password</Label><PasswordInput value={form.confirm} onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))} /></div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving || !form.currentPassword || !form.newPassword}>{saving ? "Saving…" : "Change Password"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
