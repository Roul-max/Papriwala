import { WebSocket } from "ws";

const clients = new Set<WebSocket>();

export function handleWebSocketConnection(ws: WebSocket) {
  clients.add(ws);
  ws.on("close", () => clients.delete(ws));
  ws.on("error", console.error);
}

export function broadcast(message: any) {
  const data = JSON.stringify(message);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}
