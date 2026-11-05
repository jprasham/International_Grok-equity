import { listReports } from "@/lib/reports";

export async function GET() {
  return Response.json(await listReports());
}
