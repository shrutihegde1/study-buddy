import { createServiceClient } from "@/lib/supabase/server";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke";

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

/**
 * Exchange an authorization code for access and refresh tokens.
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<GoogleTokenResponse> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token exchange failed: ${err}`);
  }

  return res.json();
}

/**
 * Use a refresh token to obtain a new access token.
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<{ access_token: string; expires_in: number }> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token refresh failed: ${err}`);
  }

  return res.json();
}

/**
 * Save Google tokens to the profiles table.
 */
export async function saveGoogleTokens(
  userId: string,
  tokens: {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  }
) {
  const supabase = await createServiceClient();
  const expiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  const update: Record<string, string | null> = {
    google_access_token: tokens.access_token,
    google_token_expiry: expiry,
  };

  if (tokens.refresh_token) {
    update.google_refresh_token = tokens.refresh_token;
  }

  const { error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", userId);

  if (error) {
    throw new Error(`Failed to save tokens: ${error.message}`);
  }
}

/**
 * Get a valid Google access token for a user. Refreshes if expired.
 * Returns null if no integration is connected.
 */
export async function getValidGoogleToken(
  userId: string
): Promise<string | null> {
  const supabase = await createServiceClient();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("google_access_token, google_refresh_token, google_token_expiry")
    .eq("id", userId)
    .single();

  if (error || !profile?.google_refresh_token) {
    return null;
  }

  // Check if the access token is still valid (with 5 min buffer)
  const expiry = profile.google_token_expiry
    ? new Date(profile.google_token_expiry).getTime()
    : 0;
  const isExpired = Date.now() > expiry - 5 * 60 * 1000;

  if (profile.google_access_token && !isExpired) {
    return profile.google_access_token;
  }

  // Refresh the token
  try {
    const refreshed = await refreshAccessToken(profile.google_refresh_token);
    await saveGoogleTokens(userId, refreshed);
    return refreshed.access_token;
  } catch (err) {
    console.error("Failed to refresh Google token:", err);
    // Token is invalid — clear stored tokens
    await supabase
      .from("profiles")
      .update({
        google_access_token: null,
        google_refresh_token: null,
        google_token_expiry: null,
      })
      .eq("id", userId);
    return null;
  }
}

/**
 * Revoke the Google integration and clear stored tokens.
 */
export async function revokeGoogleIntegration(userId: string) {
  const supabase = await createServiceClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("google_refresh_token")
    .eq("id", userId)
    .single();

  // Attempt to revoke at Google (best-effort)
  if (profile?.google_refresh_token) {
    try {
      await fetch(
        `${GOOGLE_REVOKE_URL}?token=${encodeURIComponent(profile.google_refresh_token)}`,
        { method: "POST" }
      );
    } catch {
      // Revocation is best-effort
    }
  }

  // Clear tokens from DB
  const { error } = await supabase
    .from("profiles")
    .update({
      google_access_token: null,
      google_refresh_token: null,
      google_token_expiry: null,
    })
    .eq("id", userId);

  if (error) {
    throw new Error(`Failed to clear tokens: ${error.message}`);
  }
}
