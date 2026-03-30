/**
 * Retourne "sera" (singulier) ou "seront" (pluriel) selon le nombre.
 * @example conjuguerEtre(1) → "sera"  |  conjuguerEtre(2) → "seront"
 */
export function conjuguerEtre(count: number): "sera" | "seront" {
  return count <= 1 ? "sera" : "seront";
}

/**
 * Retourne la forme singular ou plural selon le count.
 * @example frPlural(1, "supprimé", "supprimés") → "supprimé"
 */
export function frPlural(count: number, singular: string, plural: string): string {
  return count <= 1 ? singular : plural;
}

/**
 * Accord du mot "programme" avec son count.
 * @example frProgramme(1) → "programme"  |  frProgramme(2) → "programmes"
 */
export function frProgramme(count: number): string {
  return count <= 1 ? "programme" : "programmes";
}
