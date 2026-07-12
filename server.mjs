import { createHash } from "node:crypto";
import { createServer } from "node:http";
import next from "next";

const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const hostname = process.env.HOSTNAME ?? "0.0.0.0";
const dev = process.argv.includes("--dev");
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

function sendWebSocketText(socket, value) {
  const payload = Buffer.from(JSON.stringify(value));

  // The status payload is intentionally tiny, but keep the framing valid if it grows.
  if (payload.length >= 65_536) {
    throw new Error("Status WebSocket payload is too large.");
  }

  const header = payload.length < 126
    ? Buffer.from([0x81, payload.length])
    : Buffer.from([0x81, 126, payload.length >> 8, payload.length & 0xff]);

  socket.write(Buffer.concat([header, payload]));
}

function respondToWebSocketPings(socket) {
  let pending = Buffer.alloc(0);

  socket.on("data", (chunk) => {
    pending = Buffer.concat([pending, chunk]);

    while (pending.length >= 2) {
      const firstByte = pending[0];
      const secondByte = pending[1];
      const masked = (secondByte & 0x80) !== 0;
      let payloadLength = secondByte & 0x7f;
      let headerLength = 2;

      if (payloadLength === 126) {
        if (pending.length < 4) return;
        payloadLength = pending.readUInt16BE(2);
        headerLength = 4;
      } else if (payloadLength === 127) {
        socket.destroy();
        return;
      }

      const maskLength = masked ? 4 : 0;
      const frameLength = headerLength + maskLength + payloadLength;
      if (pending.length < frameLength) return;

      const mask = pending.subarray(headerLength, headerLength + maskLength);
      const payload = Buffer.from(pending.subarray(headerLength + maskLength, frameLength));
      pending = pending.subarray(frameLength);

      if (masked) {
        for (let index = 0; index < payload.length; index += 1) {
          payload[index] ^= mask[index % 4];
        }
      }

      const opcode = firstByte & 0x0f;
      if (opcode === 0x9 && payload.length <= 125) {
        socket.write(Buffer.concat([Buffer.from([0x8a, payload.length]), payload]));
      }
    }
  });
}

app.prepare().then(() => {
  const server = createServer((request, response) => handle(request, response));

  server.on("upgrade", (request, socket) => {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

    if (url.pathname !== "/status" || request.headers.upgrade?.toLowerCase() !== "websocket") {
      socket.write("HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }

    const key = request.headers["sec-websocket-key"];
    if (typeof key !== "string") {
      socket.write("HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }

    const accept = createHash("sha1")
      .update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
      .digest("base64");

    socket.write(
      "HTTP/1.1 101 Switching Protocols\r\n"
      + "Upgrade: websocket\r\n"
      + "Connection: Upgrade\r\n"
      + `Sec-WebSocket-Accept: ${accept}\r\n\r\n`,
    );
    sendWebSocketText(socket, { status: "online", checkedAt: new Date().toISOString() });
    respondToWebSocketPings(socket);
    socket.on("error", () => {});
  });

  server.listen(port, hostname, () => {
    console.info(`> Ready on http://${hostname}:${port} (${dev ? "development" : "production"})`);
  });
});
