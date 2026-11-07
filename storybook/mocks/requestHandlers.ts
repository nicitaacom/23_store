type RequestResolver = (info: { request: Request }) => Promise<Response> | Response

export type RequestHandler = {
  method: string
  pattern: string
  resolver: RequestResolver
}

function matchPattern(pattern: string, url: string) {
  if (pattern === "*") return true
  const pathname = new URL(url).pathname
  const expected = pattern.startsWith("*") ? pattern.slice(1) : pattern
  return pathname === expected
}

function createHandler(method: string) {
  return (pattern: string, resolver: RequestResolver): RequestHandler => ({ method, pattern, resolver })
}

export const http = {
  get: createHandler("GET"),
  post: createHandler("POST"),
  put: createHandler("PUT"),
  patch: createHandler("PATCH"),
  delete: createHandler("DELETE"),
}

export const HttpResponse = {
  json(body: unknown, init?: { status?: number }) {
    return new Response(JSON.stringify(body), {
      status: init?.status ?? 200,
      headers: { "Content-Type": "application/json" },
    })
  },
  arrayBuffer(body: ArrayBuffer, init?: { headers?: Record<string, string> }) {
    return new Response(body, { status: 200, headers: init?.headers })
  },
}

export function delay(duration: number | "infinite") {
  if (duration === "infinite") return new Promise<void>(() => undefined)
  return new Promise<void>(resolve => setTimeout(resolve, duration))
}

let handlers: RequestHandler[] = []
let installed = false

export function installRequestHandlers(nextHandlers: RequestHandler[] = []) {
  handlers = nextHandlers.flat()
  if (installed || typeof window === "undefined") return
  installed = true
  const originalFetch = window.fetch.bind(window)
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init)
    const match = handlers.find(handler => handler.method === request.method && matchPattern(handler.pattern, request.url))
    if (match) return match.resolver({ request })
    const url = new URL(request.url)
    if (url.origin === window.location.origin && url.pathname.startsWith("/api/")) {
      return new Response(JSON.stringify({ error: `Unhandled ${request.method} ${url.pathname}` }), { status: 500 })
    }
    return originalFetch(input, init)
  }
}
