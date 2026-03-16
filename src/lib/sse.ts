type Listener = (data: string) => void;

class SSEBroker {
  private channels: Map<string, Set<Listener>> = new Map();

  subscribe(channel: string, listener: Listener): () => void {
    if (!this.channels.has(channel)) {
      this.channels.set(channel, new Set());
    }
    this.channels.get(channel)!.add(listener);

    return () => {
      this.channels.get(channel)?.delete(listener);
      if (this.channels.get(channel)?.size === 0) {
        this.channels.delete(channel);
      }
    };
  }

  publish(channel: string, event: string, data: unknown): void {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    this.channels.get(channel)?.forEach((listener) => listener(message));
  }
}

const globalForSSE = globalThis as unknown as { sseBroker: SSEBroker | undefined };
export const sseBroker = globalForSSE.sseBroker ?? new SSEBroker();
if (process.env.NODE_ENV !== "production") globalForSSE.sseBroker = sseBroker;
