/** Uniform JSON error response for API route handlers. */
export function jsonError(
  message: string,
  status: number,
  extra?: Record<string, unknown>,
) {
  return Response.json({ error: message, ...extra }, { status });
}
