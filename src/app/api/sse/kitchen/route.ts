import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { sseBroker } from "@/lib/sse";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const restaurantId = session.user.restaurantId;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial ping
      controller.enqueue(encoder.encode("event: connected\ndata: {}\n\n"));

      const unsubscribe = sseBroker.subscribe(
        `kitchen:${restaurantId}`,
        (data) => {
          try {
            controller.enqueue(encoder.encode(data));
          } catch {
            unsubscribe();
          }
        }
      );

      // Keep alive
      const interval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keepalive\n\n"));
        } catch {
          clearInterval(interval);
          unsubscribe();
        }
      }, 30000);

      req.signal.addEventListener("abort", () => {
        clearInterval(interval);
        unsubscribe();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
