'use strict';
/*
 * Memory-only relay for exactly 2 people.
 * - No database, no files, no logs of content. Messages are forwarded and forgotten.
 * - Room is opened only by the secret code (default 445566, override with ROOM_CODE env).
 * - Wrong-code attempts are throttled per IP (in memory).
 */
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const ROOM_CODE = String(process.env.ROOM_CODE || '445566');
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const ROOM = 'r';
const MAX_USERS = 2;
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_FAILS = 8;
const BLOCK_MS = 10 * 60 * 1000;

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', true);

app.use((req, res, next) => {
  res.set({
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'X-Frame-Options': 'DENY',
  });
  next();
});

// Health check endpoint for cloud platforms (Render, Railway, Fly.io)
app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

app.use(express.static(path.join(__dirname, 'public'), { etag: false, lastModified: false }));

const server = http.createServer(app);
const io = new Server(server, {
  maxHttpBufferSize: MAX_BYTES,
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  serveClient: true,
});

const fails = new Map(); // ip -> { n, until }
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of fails) if (v.until && v.until < now) fails.delete(k);
}, 60 * 1000).unref();

function clientIp(socket) {
  const xff = socket.handshake.headers['x-forwarded-for'];
  return (xff ? String(xff).split(',')[0].trim() : socket.handshake.address) || 'x';
}

function peers() {
  const r = io.sockets.adapter.rooms.get(ROOM);
  return r ? r.size : 0;
}

io.on('connection', (socket) => {
  socket.on('join', (code, ack) => {
    if (typeof ack !== 'function') return;
    const key = clientIp(socket);
    const f = fails.get(key) || { n: 0, until: 0 };
    if (Date.now() < f.until) return ack({ ok: false });

    if (typeof code !== 'string' || code !== ROOM_CODE) {
      f.n += 1;
      if (f.n >= MAX_FAILS) { f.until = Date.now() + BLOCK_MS; f.n = 0; }
      fails.set(key, f);
      return ack({ ok: false });
    }
    fails.delete(key);

    if (socket.data.joined) return ack({ ok: true, peers: peers() });
    if (peers() >= MAX_USERS) return ack({ ok: false });

    socket.join(ROOM);
    socket.data.joined = true;
    const n = peers();
    ack({ ok: true, peers: n });
    socket.to(ROOM).emit('peer', n);
  });

  socket.on('msg', (m) => {
    if (!socket.data.joined || !m || typeof m !== 'object') return;
    const id = typeof m.id === 'string' ? m.id.slice(0, 40) : '';
    if (m.type === 'text') {
      if (typeof m.text !== 'string' || m.text.length > 2000) return;
      socket.to(ROOM).emit('msg', { id, type: 'text', text: m.text });
    } else if (m.type === 'audio') {
      const data = m.data;
      if (!Buffer.isBuffer(data) || data.length === 0 || data.length > MAX_BYTES) return;
      const mime = typeof m.mime === 'string' && m.mime.startsWith('audio/') ? m.mime.slice(0, 60) : 'audio/webm';
      socket.to(ROOM).emit('msg', { id, type: 'audio', mime, data });
    }
  });

  socket.on('disconnect', () => {
    if (socket.data.joined) {
      io.to(ROOM).emit('peer', peers());
    }
  });
});

server.listen(PORT, HOST, () => console.log(`Server listening on ${HOST}:${PORT}`));
