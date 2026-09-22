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
