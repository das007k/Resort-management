import { requireStaff } from "../auth";

export async function GET(request: Request) {
  const identity = await requireStaff(request);
  if (identity instanceof Response) return identity;
  return Response.json({ user: identity });
}
