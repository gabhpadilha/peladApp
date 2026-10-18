/**
 * Aceita só caminhos internos (`/algo`), para o `next` de links de login
 * não virar redirecionamento para outro site.
 */
export function getSafeRedirectPath(next: string | null | undefined, fallback = "/"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return fallback;
  }
  return next;
}
