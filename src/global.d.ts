import type { Locale } from "@/domain/shared/locale";
import type messages from "../messages/ru.json";

// Russian is the source dictionary: every key used in code must exist in
// ru.json (typecheck), and messages.test.ts keeps en.json in lockstep.
declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof messages;
  }
}
