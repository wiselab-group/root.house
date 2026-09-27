import { useTranslations } from "next-intl";
import {
  DEMO_PERSON_IDS,
  type DemoPerson,
  type DemoPersonId,
} from "./hartley-family";

/** The landing's fictional family in the viewer's language — the Hartleys
 *  in English, the Sokolovs in Russian. */
export function useDemoFamily(): Record<DemoPersonId, DemoPerson> {
  const t = useTranslations("landing.family");
  return Object.fromEntries(
    DEMO_PERSON_IDS.map((id) => [
      id,
      { id, name: t(`${id}.name`), years: t(`${id}.years`) },
    ]),
  ) as Record<DemoPersonId, DemoPerson>;
}
