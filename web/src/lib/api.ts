const isServer = typeof window === "undefined";

const API_URL = isServer
  ? (process.env.INTERNAL_API_URL ??
     process.env.NEXT_PUBLIC_API_URL ??
     "http://localhost:3001/api")
  : (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api");

interface NestErrorBody {
  statusCode: number;
  message: string | string[];
  error?: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface ApiFetchOptions extends Omit<RequestInit, "body"> {
  token?: string;
  body?: unknown;
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { token, body, headers, ...rest } = options;

  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  if (res.status === 204) return undefined as T;

  const contentType = res.headers.get("content-type") ?? "";
  const data = contentType.includes("application/json") ? await res.json() : null;

  if (!res.ok) {
    throw new ApiError(extractMessage(data), res.status, data);
  }

  return data as T;
}

/** Achata o formato de erro do Nest numa unica frase legivel. */
function extractMessage(body: unknown): string {
  const nest = body as NestErrorBody | null;
  if (!nest?.message) return "Algo deu errado. Tente novamente.";
  return Array.isArray(nest.message) ? nest.message.join(" ") : nest.message;
}