import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import {
  EditPanelBody,
  EditPanelHeader,
} from "@/components/edit-panel/edit-panel-parts";

/** The panel's contents while the person loads — same header/field rhythm
 *  as page.tsx, so the swap doesn't jump. */
export default function EditPersonPanelLoading() {
  const t = useTranslations("editPanel");
  return (
    <>
      <EditPanelHeader
        title={t("title")}
        leading={<Skeleton className="size-16 shrink-0 rounded-full" />}
      />
      <EditPanelBody>
        <div className="flex flex-col gap-6" aria-busy="true">
          <span className="sr-only">{t("loading")}</span>
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex flex-col gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-11 w-full" />
            </div>
          ))}
        </div>
      </EditPanelBody>
    </>
  );
}
