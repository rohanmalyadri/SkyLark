"use client";

import { Download, Trash2 } from "lucide-react";
import { useState } from "react";
import { deleteAccountAction } from "@/app/actions/candidate";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/overlay";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { useAction } from "@/lib/hooks/use-action";

/** Data portability and erasure, as described in the Privacy Policy. */
export function PrivacyPanel({ canDelete }: { canDelete: boolean }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const del = useAction(deleteAccountAction, { successToast: false });

  return (
    <Panel id="privacy" className="scroll-mt-20">
      <PanelHeader title="Your data" description="Download everything we hold about you, or delete your account." />
      <div className="divide-y divide-line">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[13px] font-medium">Export your data</p>
            <p className="text-xs text-muted">Profile, verification status, matches, applications, notifications and settings as a JSON file.</p>
          </div>
          <Button asChild size="sm" variant="secondary">
            <a href="/api/me/export" download>
              <Download /> Download
            </a>
          </Button>
        </div>
        {canDelete && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div className="min-w-0">
              <p className="text-[13px] font-medium">Delete your account</p>
              <p className="text-xs text-muted">Permanently removes your profile, resumes, matches and applications. This can&apos;t be undone.</p>
            </div>
            <Button size="sm" variant="danger" onClick={() => setOpen(true)}>
              <Trash2 /> Delete account
            </Button>
          </div>
        )}
      </div>
      <Dialog open={open} onOpenChange={(o) => (setOpen(o), setConfirm(""))}>
        <DialogContent title="Delete your account?" description="Your profile, resumes, matches, applications and notifications are erased immediately. A record that an account was deleted is kept for security, without your personal details.">
          <Field label="Type DELETE to confirm" htmlFor="delete-confirm">
            <Input id="delete-confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" />
          </Field>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Keep my account
            </Button>
            <Button variant="danger" disabled={confirm !== "DELETE"} loading={del.pending} onClick={() => void del.execute(confirm)}>
              Delete permanently
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Panel>
  );
}
