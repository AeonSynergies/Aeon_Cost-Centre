"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { useReference } from "@/hooks/useReference";
import { DEPT_CATEGORY_OPTIONS } from "@/components/common/StatusBadge";
import { apiSend } from "@/lib/api-client";

export function DepartmentForm({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; onSaved: () => void }) {
  const { data: ref } = useReference();
  const [form, setForm] = React.useState({ name: "", category: "CLIENT_FACING", headId: "" });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => { if (open) { setForm({ name: "", category: "CLIENT_FACING", headId: "" }); setError(null); } }, [open]);

  const submit = async () => {
    setSaving(true); setError(null);
    try {
      await apiSend("/api/departments", "POST", { ...form, headId: form.headId || null });
      onSaved(); onOpenChange(false);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed"); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Add Department">
        <DialogBody>
          {error && <div className="mb-3 rounded-[5px] bg-[#FAECE7] px-3 py-2 text-[12px] text-[#711B13]">{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Department Name</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>Category</Label>
              <Select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                {DEPT_CATEGORY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
            </div>
            <div><Label>Head</Label>
              <Select value={form.headId} onChange={(e) => setForm((f) => ({ ...f, headId: e.target.value }))}>
                <option value="">None</option>
                {ref?.resources.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </Select>
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving || !form.name}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
