import type { APIRoute } from "astro";

export const prerender = false;

/**
 * GET /api/callback?status=add_new_card_success|add_new_card_fail&description=...
 *
 * Pagopar redirects here after the hosted checkout (card enrollment).
 * We redirect the user back to the landing with query params so the
 * client-side JS in RegistroModal can react accordingly.
 */
export const GET: APIRoute = async ({ url }) => {
  try {
    const status = url.searchParams.get("status") || "";
    const description = url.searchParams.get("description") || "";

    const redirectUrl = new URL("/gracias", url.origin);
    redirectUrl.searchParams.set(
      "checkout",
      status === "add_new_card_success" ? "ok" : "error",
    );
    if (description) {
      redirectUrl.searchParams.set("checkout_msg", description);
    }

    return new Response(null, {
      status: 302,
      headers: { Location: redirectUrl.toString() },
    });
  } catch {
    return new Response(null, {
      status: 302,
      headers: { Location: "/gracias?checkout=error" },
    });
  }
};
