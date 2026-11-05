import { getLatestReport } from "@/lib/reports";

export async function GET() {
  const latest = await getLatestReport();
  return Response.json(latest ? [latest] : []);
}
