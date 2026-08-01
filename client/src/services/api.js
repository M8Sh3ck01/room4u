export async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const err = new Error(body?.error?.message || `Request failed (${res.status})`);
    err.status = res.status;
    err.code = body?.error?.code;
    throw err;
  }

  return res.json();
}
