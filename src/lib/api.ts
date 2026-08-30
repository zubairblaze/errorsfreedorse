/**
 * Optional API-backed content.
 *
 * The site builds from the fixtures in src/data by default. Set EF_API_URL
 * and the same build reads from the Phase 2 backend instead:
 *
 *   EF_API_URL=http://localhost/errorsfree/api/ npm run build
 *
 * The switch lives here rather than in each data module so there is one
 * place that knows about transport, one place that handles failure, and no
 * page or component that knows either exists.
 *
 * Failure is deliberately loud. A build that silently falls back to fixtures
 * when the API is down would publish stale content that looks fine, which is
 * far worse than a build that stops and says the API is unreachable.
 */

const API = import.meta.env.EF_API_URL ?? process.env.EF_API_URL ?? '';

/** True when this build should read from the backend. */
export const useApi = (): boolean => API !== '';

/** Fetches one resource, or throws with enough detail to act on. */
export async function apiGet<T>(resource: string): Promise<T> {
  const url = `${API.replace(/\/+$/, '')}/?resource=${encodeURIComponent(resource)}`;

  let res: Response;
  try {
    res = await fetch(url);
  } catch (cause) {
    throw new Error(
      `Could not reach the ErrorsFree API at ${url}. ` +
      `Is the backend running, and is EF_API_URL correct?`,
      { cause },
    );
  }

  if (!res.ok) {
    throw new Error(`ErrorsFree API returned ${res.status} for ${resource} (${url}).`);
  }

  const payload = (await res.json()) as { data?: T };
  if (payload.data === undefined) {
    throw new Error(`ErrorsFree API returned no data for ${resource}.`);
  }
  return payload.data;
}
