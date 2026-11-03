import { handleDraftRequest } from "@/lib/assistant/draft-handler";

export const dynamic = "force-dynamic";

export function POST(request: Request): Promise<Response> {
  return handleDraftRequest(request);
}
