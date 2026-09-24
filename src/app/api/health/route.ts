import { getHealth } from "@/server/services/health";

export function GET() {
  return Response.json(getHealth());
}
