import { useTranslations } from "next-intl";
import { UploadError } from "@/lib/upload-error";

/** Turns whatever an upload threw into text in the viewer's language. A
 *  plain Error's message already came translated from our own API route. */
export function useUploadErrorMessage(): (error: unknown) => string {
  const t = useTranslations("errors");
  return (error) => {
    if (error instanceof UploadError) return t(error.code, error.values);
    if (error instanceof Error && error.message) return error.message;
    return t("uploadFailed");
  };
}
