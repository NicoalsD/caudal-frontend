/** Read side of the token holder: what the HTTP decorators are allowed to see. */
export interface AccessTokenSource {
  /** The access token, or null when nobody is signed in. */
  get(): string | null;
}

/**
 * Keeps the access token in memory and nowhere else (security.md section 2).
 * The fields are `#private`: the token does not appear in JSON.stringify, console.log of the
 * object or enumerations, and nothing here touches localStorage, sessionStorage or IndexedDB.
 */
export class TokenStore implements AccessTokenSource {
  #accessToken: string | null = null;
  #expiresAtMs: number | null = null;

  get(): string | null {
    return this.#accessToken;
  }

  /** Epoch milliseconds when the token stops being valid, or null without a token. */
  expiresAtMs(): number | null {
    return this.#expiresAtMs;
  }

  set(accessToken: string, expiresAtMs: number): void {
    this.#accessToken = accessToken;
    this.#expiresAtMs = expiresAtMs;
  }

  clear(): void {
    this.#accessToken = null;
    this.#expiresAtMs = null;
  }
}
