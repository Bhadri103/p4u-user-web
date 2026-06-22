/**
 * Same identity commerce uses in customerIdFromAuth: explicit customer_id claim, else Keycloak sub.
 */
export function resolveCustomerIdFromAccessToken(accessToken: string | null | undefined): string | null {
  if (!accessToken?.trim()) return null;
  try {
    const parts = accessToken.split(".");
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64)) as {
      customer_id?: string | number;
      customerId?: string | number;
      sub?: string;
    };
    const explicit = payload.customer_id ?? payload.customerId;
    if (explicit != null && String(explicit).trim() !== "") return String(explicit);
    if (payload.sub != null && String(payload.sub).trim() !== "") return String(payload.sub);
    return null;
  } catch {
    return null;
  }
}

/**
 * Friendly label for the header from JWT (Keycloak: name, preferred_username, …) or login id / phone.
 */
export function displayNameFromAccessToken(
  accessToken: string | null | undefined,
  fallbackLogin?: string | null,
): string {
  if (accessToken?.trim()) {
    try {
      const parts = accessToken.split(".");
      if (parts.length >= 2) {
        const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        const payload = JSON.parse(atob(base64)) as {
          name?: string;
          preferred_username?: string;
          given_name?: string;
          family_name?: string;
          email?: string;
        };
        if (payload.name?.trim()) return payload.name.trim();
        const gn = payload.given_name?.trim();
        const fn = payload.family_name?.trim();
        if (gn || fn) return [gn, fn].filter(Boolean).join(" ");
        if (payload.preferred_username?.trim()) return payload.preferred_username.trim();
        const em = payload.email?.trim();
        if (em) return em.split("@")[0] || em;
      }
    } catch {
      /* fall through */
    }
  }
  if (fallbackLogin?.trim()) return fallbackLogin.trim();
  return "Account";
}

/** One character for compact header avatar */
export function avatarLetterFromDisplayName(displayName: string): string {
  const t = displayName.trim();
  if (!t) return "?";
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return parts[0].charAt(0).toUpperCase();
  return t.charAt(0).toUpperCase();
}
