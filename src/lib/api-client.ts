"use client";

export async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" } });
  if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? `GET ${url} failed`);
  return res.json();
}

export async function apiSend<T>(
  url: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: unknown
): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const msg = (await res.json().catch(() => ({})))?.error ?? `${method} ${url} failed`;
    throw new Error(msg);
  }
  return res.json();
}
