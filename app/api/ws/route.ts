export const runtime = "edge";

// Simple in-memory room registry (ephemeral). Suitable for demo only.
const globalAny: any = globalThis as any;
if (!globalAny.__rooms) {
  globalAny.__rooms = new Map<string, Set<WebSocket>>();
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const room = (searchParams.get("room") || "public").slice(0, 24);
  const user = (searchParams.get("user") || "Guest").slice(0, 24);

  const pair = new WebSocketPair();
  const [client, server] = Object.values(pair) as [WebSocket, WebSocket];
  const rooms: Map<string, Set<WebSocket>> = globalAny.__rooms;

  server.accept();

  const peers = rooms.get(room) || new Set<WebSocket>();
  rooms.set(room, peers);
  peers.add(server);

  const broadcast = (msg: any) => {
    const json = JSON.stringify(msg);
    for (const peer of peers) {
      try { peer.send(json); } catch {}
    }
  };

  server.addEventListener("message", (event: MessageEvent) => {
    try {
      const data = JSON.parse((event as any).data?.toString?.() || "{}");
      if (data.type === "chat") {
        broadcast({ type: "chat", payload: data.payload });
      }
    } catch {}
  });

  server.addEventListener("close", () => {
    peers.delete(server);
    if (peers.size === 0) rooms.delete(room);
  });

  // Initial hello
  server.send(JSON.stringify({ type: "system", payload: { hello: true, room, user } }));

  return new Response(null, { status: 101, webSocket: client });
}
