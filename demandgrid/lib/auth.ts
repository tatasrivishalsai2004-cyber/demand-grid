// TODO(production): replace with phone-OTP sessions (e.g. MSG91 + signed cookie / Auth.js).
// Every API handler must call requireStore() and filter queries by the returned storeId.
export function requireStore(req: Request): { storeId: string; userId: string } {
  const storeId = req.headers.get("x-store-id"); // DEV ONLY stub
  if (!storeId) throw new Response("Unauthorized", { status: 401 });
  return { storeId, userId: req.headers.get("x-user-id") ?? "dev" };
}
