import { handleAssistantRequest } from "@/lib/assistant/handler";

export const dynamic = "force-dynamic";

export function POST(request: Request): Promise<Response> {
  return handleAssistantRequest(request);
}
