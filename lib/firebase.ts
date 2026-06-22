"use client";

import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import {
  getAuth,
  Auth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
} from "firebase/auth";

/**
 * Browser-side Firebase init for Phone Auth.
 *
 * Only the values exposed under NEXT_PUBLIC_FIREBASE_* are bundled. The Admin
 * service account stays server-side. The `apiKey` here is a *client* key — it's
 * intentionally embeddable; access is gated by Firebase Auth domain rules.
 *
 * The reCAPTCHA verifier is created lazily on first OTP send. We keep a single
 * invisible verifier per page because Firebase complains if we attach more
 * than one to the same DOM element.
 */

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

let cachedApp: FirebaseApp | null = null;
let cachedAuth: Auth | null = null;
let cachedVerifier: RecaptchaVerifier | null = null;

function ensureApp(): FirebaseApp {
  if (cachedApp) return cachedApp;
  if (!config.apiKey || !config.projectId) {
    throw new Error(
      "Firebase is not configured. Set NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN and NEXT_PUBLIC_FIREBASE_PROJECT_ID in .env.local.",
    );
  }
  cachedApp = getApps().length > 0 ? getApp() : initializeApp(config);
  return cachedApp;
}

function ensureAuth(): Auth {
  if (cachedAuth) return cachedAuth;
  cachedAuth = getAuth(ensureApp());
  return cachedAuth;
}

/**
 * Get (or create) the invisible reCAPTCHA verifier bound to a hidden DOM
 * element with the given id. Caller is responsible for rendering the element
 * (typically `<div id="p4u-recaptcha" />`) and for clearing the verifier on
 * unmount via `clearRecaptcha`.
 */
export function getRecaptchaVerifier(elementId: string): RecaptchaVerifier {
  if (cachedVerifier) return cachedVerifier;
  cachedVerifier = new RecaptchaVerifier(ensureAuth(), elementId, {
    size: "invisible",
  });
  return cachedVerifier;
}

export function clearRecaptcha(): void {
  if (!cachedVerifier) return;
  try {
    cachedVerifier.clear();
  } catch {
    // ignore
  }
  cachedVerifier = null;
}

/**
 * Send the SMS OTP. The returned `ConfirmationResult` is what we then call
 * `.confirm(code)` on to get a Firebase ID token.
 */
export async function sendPhoneOtp(
  phoneE164: string,
  recaptchaElementId: string,
): Promise<ConfirmationResult> {
  const auth = ensureAuth();
  const verifier = getRecaptchaVerifier(recaptchaElementId);
  return signInWithPhoneNumber(auth, phoneE164, verifier);
}
