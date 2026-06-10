"use client";

import { useRouter } from "next/navigation";
import { ResourceForm } from "@/components/resources/ResourceForm";

/**
 * Full-page entry to the resource creation form. The form renders as a modal
 * over the resources list; closing or saving returns to /resources.
 */
export default function NewResourcePage() {
  const router = useRouter();
  return (
    <div className="flex-1 p-5">
      <ResourceForm
        open
        onOpenChange={(o) => {
          if (!o) router.push("/resources");
        }}
        onSaved={() => router.push("/resources")}
      />
    </div>
  );
}
