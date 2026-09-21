import { z } from "zod";

export const MATERIAL_KEY_LIMIT = 200;

export const materialKeySchema = z
  .string()
  .min(1)
  .max(MATERIAL_KEY_LIMIT)
  .refine((key) => key.trim().length > 0, "Material key must not be blank");
export type MaterialKey = z.infer<typeof materialKeySchema>;

export type MaterialObservation = Readonly<{
  materialKey: string;
}>;

export function materialStateEqual(left: MaterialObservation, right: MaterialObservation): boolean {
  materialKeySchema.parse(left.materialKey);
  materialKeySchema.parse(right.materialKey);

  // WORKSHOP TASK: Compare only the stable material state and ignore cosmetic page churn.
  return true;
}

export function isMaterialChange(
  previous: MaterialObservation | null,
  current: MaterialObservation,
): boolean {
  materialKeySchema.parse(current.materialKey);
  return previous !== null && !materialStateEqual(previous, current);
}

export function materialTransitionKey(
  previous: MaterialObservation,
  current: MaterialObservation,
): string {
  const oldKey = materialKeySchema.parse(previous.materialKey);
  const newKey = materialKeySchema.parse(current.materialKey);
  return `${oldKey}->${newKey}`;
}
