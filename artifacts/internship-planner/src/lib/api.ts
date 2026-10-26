export class ApiError extends Error {
  constructor(message: string, public status: number, public code: string) { super(message); }
}

export async function api<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin',
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let result;
  try { result = await response.json(); }
  catch { throw new ApiError('The server response could not be read. Your progress is preserved.', response.status, 'invalid_response'); }
  if (!response.ok) throw new ApiError(result.error?.message ?? 'The request failed. Your progress is preserved.', response.status, result.error?.code ?? 'request_failed');
  return result as T;
}
