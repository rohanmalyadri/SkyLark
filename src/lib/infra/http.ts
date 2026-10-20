import "server-only";

/** An upstream API answered with an error or couldn't be reached. */
export class UpstreamError extends Error {
  constructor(
    public service: string,
    message: string,
    public status: number | null = null,
  ) {
    super(`${service}: ${message}`);
    this.name = "UpstreamError";
  }
  /** Rate limits and server errors are worth retrying later; 4xx answers are final. */
  get transient() {
    return this.status === null || this.status === 429 || this.status >= 500;
  }
}

const UA = "Skylark/1.0 (+https://github.com; job matching platform)";

/** GET JSON with a hard timeout. Never throws anything but UpstreamError. */
export async function getJson<T>(service: string, url: string, opts: { timeoutMs?: number; headers?: Record<string, string>; revalidate?: number } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { accept: "application/json", "user-agent": UA, ...opts.headers },
      signal: AbortSignal.timeout(opts.timeoutMs ?? 8_000),
      cache: "no-store",
    });
  } catch (err) {
    const reason = err instanceof Error && err.name === "TimeoutError" ? "timed out" : "network error";
    throw new UpstreamError(service, reason);
  }
  if (!res.ok) throw new UpstreamError(service, `HTTP ${res.status}`, res.status);
  try {
    return (await res.json()) as T;
  } catch {
    throw new UpstreamError(service, "invalid JSON", res.status);
  }
}

/** Small TTL cache shared by the lookups that call third-party APIs, so repeated queries stay off the network. */
export class TtlCache<V> {
  private map = new Map<string, { v: V; exp: number }>();
  constructor(
    private ttlMs: number,
    private max = 2_000,
  ) {}
  get(key: string): V | undefined {
    const hit = this.map.get(key);
    if (!hit) return undefined;
    if (hit.exp < Date.now()) {
      this.map.delete(key);
      return undefined;
    }
    return hit.v;
  }
  set(key: string, v: V) {
    if (this.map.size >= this.max) this.map.delete(this.map.keys().next().value!);
    this.map.set(key, { v, exp: Date.now() + this.ttlMs });
  }
}
