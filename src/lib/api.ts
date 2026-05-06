/**
 * Helper to call the NestJS public API with the API key.
 * Used by Astro server-side API routes only.
 */

const PROD_API_URL = "https://api.formulang.com.py/api";

function resolveApiUrl(): string {
  const configured = String(process.env.API_URL || import.meta.env.API_URL || "").trim();

  if (!configured) {
    return import.meta.env.PROD ? PROD_API_URL : "http://localhost:3001/api";
  }

  try {
    const parsed = new URL(configured);
    const host = parsed.hostname.toLowerCase();

    // Evita configuraciones que apuntan al frontend/panel y no al backend API
    if (
      host === "formulang.com.py" ||
      host === "www.formulang.com.py" ||
      host === "panel.formulang.com.py"
    ) {
      return PROD_API_URL;
    }

    if (host === "api.formulang.com.py" && parsed.pathname === "/") {
      return `${parsed.origin}/api`;
    }

    return configured.replace(/\/+$/, "");
  } catch {
    return configured.replace(/\/+$/, "");
  }
}

const API_URL = resolveApiUrl();
const API_KEY = process.env.API_KEY_LANDING || import.meta.env.API_KEY_LANDING;

export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<{ data?: T; error?: string; errorBody?: Record<string, unknown> | null; status: number }> {
  if (!API_KEY) {
    return {
      error:
        "API_KEY_LANDING no está configurada en el servidor de la landing.",
      status: 500,
    };
  }

  const url = `${API_URL}/public${path}`;

  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
        ...options.headers,
      },
    });

    // Try to parse JSON; if it fails, use text as fallback for error context
    let body: any = null;
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      body = await res.json().catch(() => null);
    } else {
      // Non-JSON response (e.g., nginx 502 HTML page)
      const text = await res.text().catch(() => "");
      if (!res.ok) {
        const preview = text
          .substring(0, 200)
          .replace(/<[^>]*>/g, "")
          .trim();
        return {
          error: preview || `Error ${res.status}`,
          status: res.status,
        };
      }
      // Success but non-JSON — return null data (unusual but handled)
      return { data: null as unknown as T, status: res.status };
    }

    if (!res.ok) {
      // NestJS returns message as string or array (class-validator errors)
      let errorMsg = `Error ${res.status}`;
      if (body?.message) {
        errorMsg = Array.isArray(body.message)
          ? body.message.join(". ")
          : String(body.message);
      }
      return {
        error: errorMsg,
        errorBody: body && typeof body === "object" ? (body as Record<string, unknown>) : null,
        status: res.status,
      };
    }

    return { data: body as T, status: res.status };
  } catch (err: any) {
    console.error(`[apiFetch] ${url} failed:`, err.message, err.cause || "");
    return {
      error: "No se pudo conectar con el servidor. Intente más tarde.",
      status: 503,
    };
  }
}
