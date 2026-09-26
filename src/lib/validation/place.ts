import { z } from "zod";

const coordinateField = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .transform((value) => (value ? value : undefined))
  .refine((value) => value === undefined || !Number.isNaN(Number(value)), {
    message: "Некорректная координата",
  });

export const createPlaceSchema = z
  .object({
    name: z.string().trim().min(1, "Введите название места").max(200),
    description: z.string().trim().max(2000).optional().or(z.literal("")),
    country: z.string().trim().max(120).optional().or(z.literal("")),
    region: z.string().trim().max(120).optional().or(z.literal("")),
    latitude: coordinateField,
    longitude: coordinateField,
  })
  .refine(
    (data) => (data.latitude === undefined) === (data.longitude === undefined),
    {
      message: "Укажите обе координаты или ни одной",
      path: ["latitude"],
    },
  );

export type CreatePlaceInput = z.infer<typeof createPlaceSchema>;

export const updatePlaceSchema = createPlaceSchema;
export type UpdatePlaceInput = z.infer<typeof updatePlaceSchema>;

/**
 * A not-yet-saved Place from a form's place field (PlaceField), posted as
 * JSON in a hidden `<field>Draft` input — see domain/place/place-draft.ts.
 */
export const placeDraftSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    region: z.string().trim().max(120).nullable(),
    country: z.string().trim().max(120).nullable(),
    latitude: z.number().min(-90).max(90).nullable(),
    longitude: z.number().min(-180).max(180).nullable(),
  })
  .refine((draft) => (draft.latitude === null) === (draft.longitude === null));
