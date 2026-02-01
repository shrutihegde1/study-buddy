import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createHmac } from "crypto";
import {
  exchangeCodeForTokens,
  saveGoogleTokens,
} from "@/lib/integrations/google-tokens";

function verifyState(state: string): string | null {
  const dotIndex = state.indexOf(".");
  if (dotIndex === -1) return null;

  const userId = state.substring(0, dotIndex);
  const signature = state.substring(dotIndex + 1);

  const hmac = createHmac("sha256", process.env.GOOGLE_CLIENT_SECRET!);
  hmac.update(userId);
  const expected = hmac.digest("hex");

  if (signature !== expected) return null;
  return userId;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

    if (error) {
      return NextResponse.redirect(
        `${appUrl}/settings?google=error&message=${encodeURIComponent(error)}`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(`${appUrl}/settings?google=error&message=missing_params`);
    }

    // Verify CSRF state
    const stateUserId = verifyState(state);
    if (!stateUserId) {
      return NextResponse.redirect(`${appUrl}/settings?google=error&message=invalid_state`);
    }

    // Verify the authenticated user matches the state
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || user.id !== stateUserId) {
      return NextResponse.redirect(`${appUrl}/settings?google=error&message=user_mismatch`);
    }

    // Exchange code for tokens
    const redirectUri = `${appUrl}/api/integrations/google/callback`;
    const tokens = await exchangeCodeForTokens(code, redirectUri);

    // Save tokens to DB
    await saveGoogleTokens(user.id, tokens);

    return NextResponse.redirect(`${appUrl}/settings?google=connected`);
  } catch (err) {
    console.error("Google callback error:", err);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
    return NextResponse.redirect(
      `${appUrl}/settings?google=error&message=token_exchange_failed`
    );
  }
}
