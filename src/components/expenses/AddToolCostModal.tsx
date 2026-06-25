"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { MonthSelect, YearSelect } from "@/components/common/MonthSelect";
import { apiSend } from "@/lib/api-client";
import { toast } from "@/store/toastStore";
import { formatInr, formatUsd } from "@/lib/utils";

const TOOL_NAMES = ["MS 365", "Zoom", "Google Workspace", "Software", "Other"];

/** Adds a TOOL_COST expense tagged to a resource or a client. */
export function AddToolCostModal({
  open,
  onOpenChange,
  resourceId,
  clientId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  resourceId?: string;
  clientId?: string;
  onSaved: () => void;
}) {
  const now = new Date();
  const [form, setForm] = React.useState({ toolName: TOOL_NAMES[0], currency: "INR" as "INR" | "USD", rate: 0, seats: 1, periodYear: now.getFullYear(), periodMonth: now.getMonth() + 1, notes: "" });
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) setForm({ toolName: TOOL_NAMES[0], currency: "INR", rate: 0, seats: 1, periodYear: now.getFullYear(), periodMonth: now.getMonth() + 1, notes: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const total = form.rate * form.seats;

  const save = async () => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        periodYear: Number(form.periodYear), periodMonth: Number(form.periodMonth), currency: form.currency,
        category: "TOOL_COST", description: `${form.toolName}${form.notes ? ` — ${form.notes}` : ""}`,
        toolName: form.toolName, rate: Number(form.rate), seats: Number(form.seats),
        resourceId: resourceId ?? null, clientId: clientId ?? null, notes: form.notes || null,
      };
      if (form.currency === "USD") body.amountUsd = total; else body.amountInr = total;
      await apiSend("/api/expenses", "POST", body);
      toast("Tool cost added");
      onSaved(); onOpenChange(false);
    } catch (e) { toast(e instanceof Error ? e.message : "Failed", "error"); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Add Tool Cost">
        <DialogBody>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Tool Name</Label><Select value={form.toolName} onChange={(e) => setForm((f) => ({ ...f, toolName: e.target.value }))}>{TOOL_NAMES.map((t) => <option key={t} value={t}>{t}</option>)}</Select></div>
            <div><Label>Currency</Label><Select value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value as "INR" | "USD" }))}><option value="INR">INR</option><option value="USD">USD</option></Select></div>
            <div><Label>Cost per seat ({form.currency === "USD" ? "$" : "₹"})</Label><Input type="number" step="0.01" value={form.rate} onChange={(e) => setForm((f) => ({ ...f, rate: Number(e.target.value) }))} /></div>
            <div><Label>Number of seats</Label><Input type="number" value={form.seats} onChange={(e) => setForm((f) => ({ ...f, seats: Number(e.target.value) }))} /></div>
            <div><Label>Month</Label><MonthSelect value={form.periodMonth} onChange={(m) => setForm((f) => ({ ...f, periodMonth: m }))} /></div>
            <div><Label>Year</Label><YearSelect value={form.periodYear} onChange={(y) => setForm((f) => ({ ...f, periodYear: y }))} /></div>
            <div><Label>Total ({form.currency === "USD" ? "$" : "₹"})</Label><Input value={form.currency === "USD" ? formatUsd(total) : formatInr(total)} disabled /></div>
            <div className="col-span-2"><Label>Notes (optional)</Label><Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving || !form.rate}>{saving ? "Saving…" : "Add Tool Cost"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
