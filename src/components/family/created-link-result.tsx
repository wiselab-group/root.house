"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEditPanel } from "@/components/edit-panel/edit-panel";
import { EditPanelFooter } from "@/components/edit-panel/edit-panel-parts";

/**
 * What a «Новая ссылка» / «Пригласить участника» panel turns into once the
 * link exists: the panel stays open with the URL and «Копировать» instead
 * of closing itself like other add-forms — a share link is shown only this
 * once (only its hash is stored), and an invite email may never arrive.
 * The input is saved by now — closing no longer asks about unsaved changes.
 */
export function CreatedLinkResult({
  message,
  url,
}: {
  message: string;
  url: string;
}) {
  const tc = useTranslations("common");
  const panel = useEditPanel();
  const [copied, setCopied] = useState(false);

  const markClean = panel?.markClean;
  useEffect(() => {
    markClean?.();
  }, [markClean]);

  async function copyLink() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
  }

  return (
    <div className="flex min-h-full flex-col gap-3">
      <p className="text-sm text-muted-foreground">{message}</p>
      <div className="flex items-center gap-2">
        <Input readOnly value={url} className="text-xs" />
        <Button type="button" variant="outline" onClick={copyLink}>
          {copied ? tc("copied") : tc("copy")}
        </Button>
      </div>
      <EditPanelFooter>
        <Button type="button" onClick={panel?.closeAfterSave}>
          {tc("done")}
        </Button>
      </EditPanelFooter>
    </div>
  );
}
