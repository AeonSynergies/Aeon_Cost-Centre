"use client";

import * as React from "react";
import useSWR from "swr";
import { Plus, Trash2 } from "lucide-react";
import { PageShell } from "@/components/common/PageShell";
import { Card, SectionTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/input";
import { apiGet, apiSend } from "@/lib/api-client";
import { toast } from "@/store/toastStore";

type Category = { id: string; key: string; name: string; isBuiltIn: boolean };

export default function SettingsPage() {
  const { data, mutate } = useSWR<{ data: Category[] }>("/api/settings/categories", apiGet);
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const add = async () => {
    setSaving(true);
    try { await apiSend("/api/settings/categories", "POST", { name }); toast("Category added"); setName(""); setOpen(false); mutate(); }
    catch (e) { toast(e instanceof Error ? e.message : "Failed", "error"); }
    finally { setSaving(false); }
  };
  const del = async (id: string) => {
    try { await apiSend(`/api/settings/categories/${id}`, "DELETE"); toast("Category removed"); mutate(); }
    catch (e) { toast(e instanceof Error ? e.message : "Failed", "error"); }
  };

  return (
    <PageShell title="Settings">
      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
        </TabsList>
        <TabsContent value="general">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <SectionTitle>Department Categories</SectionTitle>
              <Button size="sm" onClick={() => setOpen(true)}><Plus size={13} /> Add Category</Button>
            </div>
            <table className="mt-2 w-full text-[12px]">
              <thead><tr className="border-b border-[#E8ECF4] text-left text-[10px] uppercase text-[#64748B]"><th className="py-2">Category Name</th><th>Type</th><th></th></tr></thead>
              <tbody>
                {data?.data.map((c) => (
                  <tr key={c.id} className="border-b border-[#E8ECF4]">
                    <td className="py-2 font-medium">{c.name}</td>
                    <td><Badge tone={c.isBuiltIn ? "neutral" : "purple"}>{c.isBuiltIn ? "Built-in" : "Custom"}</Badge></td>
                    <td className="py-1 text-right">
                      {!c.isBuiltIn && <Button size="sm" variant="ghost" onClick={() => del(c.id)}><Trash2 size={12} /></Button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title="Add Category" width={420}>
          <DialogBody>
            <Label>Category Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={add} disabled={saving || !name}>{saving ? "Saving…" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
