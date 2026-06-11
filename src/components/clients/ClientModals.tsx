"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { apiSend } from "@/lib/api-client";
import { toast } from "@/store/toastStore";

const DRIVER_BANDS = ["0-49", "50-99", "100-149", "150-199", "200-250", "250+"];
const VAN_BANDS = ["0-20", "21-30", "31-40", "41-50", "51-60", "61-70", "71-80", "81-90", "91-100", "100+"];

export interface ClientEditData {
  id: string;
  name: string;
  startDate: string;
  endDate: string | null;
  paymentMethod: string;
  billingType: string;
  driverBand: string | null;
  vanBand: string | null;
  routeBand: string | null;
}

export function ClientEditModal({
  open,
  onOpenChange,
  client,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  client: ClientEditData | null;
  onSaved: () => void;
}) {
  const [form, setForm] = React.useState({ name: "", startDate: "", endDate: "", paymentMethod: "ACH", billingType: "LEGACY", driverBand: "", vanBand: "", routeBand: "" });
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open && client) setForm({
      name: client.name,
      startDate: client.startDate.slice(0, 10),
      endDate: client.endDate?.slice(0, 10) ?? "",
      paymentMethod: client.paymentMethod,
      billingType: client.billingType,
      driverBand: client.driverBand ?? "",
      vanBand: client.vanBand ?? "",
      routeBand: client.routeBand ?? "",
    });
  }, [open, client]);

  if (!client) return null;

  const save = async () => {
    setSaving(true);
    try {
      await apiSend(`/api/clients/${client.id}`, "PATCH", {
        name: form.name,
        startDate: form.startDate,
        endDate: form.endDate || null,
        paymentMethod: form.paymentMethod,
        billingType: form.billingType,
        driverBand: form.driverBand || null,
        vanBand: form.vanBand || null,
        routeBand: form.routeBand || null,
      });
      toast("Client updated");
      onSaved(); onOpenChange(false);
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Edit Client">
        <DialogBody>
          <Tabs defaultValue="basic">
            <TabsList>
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="fleet">Fleet Details</TabsTrigger>
            </TabsList>
            <TabsContent value="basic">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><Label>Client Name</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
                <div><Label>Start Date</Label><Input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} /></div>
                <div><Label>End Date</Label><Input type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} /></div>
                <div><Label>Payment Method</Label><Select value={form.paymentMethod} onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value }))}><option value="ACH">ACH</option><option value="CARD">Card</option></Select></div>
                <div><Label>Billing Type</Label><Select value={form.billingType} onChange={(e) => setForm((f) => ({ ...f, billingType: e.target.value }))}><option value="LEGACY">Legacy</option><option value="NEW">New</option></Select></div>
              </div>
            </TabsContent>
            <TabsContent value="fleet">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>No. of Drivers</Label><Select value={form.driverBand} onChange={(e) => setForm((f) => ({ ...f, driverBand: e.target.value }))}><option value="">—</option>{DRIVER_BANDS.map((b) => <option key={b} value={b}>{b}</option>)}</Select></div>
                <div><Label>No. of Vans</Label><Select value={form.vanBand} onChange={(e) => setForm((f) => ({ ...f, vanBand: e.target.value }))}><option value="">—</option>{VAN_BANDS.map((b) => <option key={b} value={b}>{b}</option>)}</Select></div>
                <div><Label>No. of Daily Routes</Label><Select value={form.routeBand} onChange={(e) => setForm((f) => ({ ...f, routeBand: e.target.value }))}><option value="">—</option>{VAN_BANDS.map((b) => <option key={b} value={b}>{b}</option>)}</Select></div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving || !form.name || !form.startDate}>{saving ? "Saving…" : "Update Client"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ClientTerminateModal({
  open,
  onOpenChange,
  clientId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  clientId: string | null;
  onSaved: () => void;
}) {
  const [form, setForm] = React.useState({ endDate: "", reason: "Client Request", notes: "" });
  const [saving, setSaving] = React.useState(false);
  React.useEffect(() => { if (open) setForm({ endDate: new Date().toISOString().slice(0, 10), reason: "Client Request", notes: "" }); }, [open]);
  if (!clientId) return null;

  const save = async () => {
    setSaving(true);
    try {
      await apiSend(`/api/clients/${clientId}`, "PATCH", { endDate: form.endDate });
      toast("Client service ended");
      onSaved(); onOpenChange(false);
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="End Client Service" width={460}>
        <DialogBody>
          <div className="grid gap-3">
            <div><Label>End Date</Label><Input type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} /></div>
            <div><Label>Reason</Label><Select value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}>{["Client Request", "Non-payment", "Contract End", "Other"].map((r) => <option key={r} value={r}>{r}</option>)}</Select></div>
            <div><Label>Notes (optional)</Label><Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></div>
            <p className="text-[11px] text-[#94A3B8]">All active assignments for this client will be auto-closed on the end date.</p>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="danger" onClick={save} disabled={saving || !form.endDate}>{saving ? "Working…" : "Terminate Service"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ClientReactivateModal({
  open,
  onOpenChange,
  clientId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  clientId: string | null;
  onSaved: () => void;
}) {
  const [form, setForm] = React.useState({ endDate: "", notes: "" });
  const [saving, setSaving] = React.useState(false);
  React.useEffect(() => { if (open) setForm({ endDate: "", notes: "" }); }, [open]);
  if (!clientId) return null;

  const save = async () => {
    setSaving(true);
    try {
      await apiSend(`/api/clients/${clientId}`, "PATCH", { endDate: form.endDate || null });
      toast("Client reactivated");
      onSaved(); onOpenChange(false);
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Reactivate Client" width={460}>
        <DialogBody>
          <div className="grid gap-3">
            <div><Label>New End Date (optional — blank = ongoing)</Label><Input type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} /></div>
            <div><Label>Notes (optional)</Label><Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="success" onClick={save} disabled={saving}>{saving ? "Working…" : "Reactivate"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
