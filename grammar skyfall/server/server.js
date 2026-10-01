const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT || 3000);
const rooms = new Map();

function json(ws, payload) {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(payload));
}

function makeRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  do {
    code = '';
    for (let i = 0; i < 6; i += 1) code += chars[Math.floor(Math.random() * chars.length)];
  } while (rooms.has(code));
  return code;
}

function makeClientId() {
  return 'c_' + crypto.randomBytes(6).toString('hex');
}

function broadcastClients(room, payload, exceptId = null) {
  for (const [id, client] of room.clients.entries()) {
    if (id === exceptId) continue;
    json(client.ws, payload);
  }
}

function mime(ext) {
  const map = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8',
    '.mp3': 'audio/mpeg',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
  };
  return map[ext.toLowerCase()] || 'application/octet-stream';
}

function serveFile(req, res) {
  let reqPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  if (reqPath === '/') reqPath = '/index.html';
  if (reqPath === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({ ok: true, rooms: rooms.size }));
    return;
  }
  const full = path.resolve(ROOT, '.' + reqPath);
  if (!full.startsWith(ROOT + path.sep) && full !== ROOT) {
    res.writeHead(403); res.end('Forbidden'); return;
  }
  fs.stat(full, (err, stat) => {
    if (!err && stat.isDirectory()) return servePath(path.join(full, 'index.html'), res);
    servePath(full, res);
  });
}

function servePath(file, res) {
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(err.code === 'ENOENT' ? 404 : 500); res.end(err.code === 'ENOENT' ? 'Not found' : 'Server error'); return; }
    res.writeHead(200, {
      'Content-Type': mime(path.extname(file)),
      'Cache-Control': path.extname(file) === '.html' ? 'no-cache' : 'public, max-age=3600'
    });
    res.end(data);
  });
}

const httpServer = http.createServer(serveFile);
const wss = new WebSocketServer({ noServer: true });

httpServer.on('upgrade', (req, socket, head) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (url.pathname !== '/ws') { socket.destroy(); return; }
    wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws, req));
  } catch (_) { socket.destroy(); }
});

wss.on('connection', ws => {
  ws.role = null;
  ws.roomCode = null;
  ws.clientId = null;
  ws.on('message', raw => {
    let msg;
    try { msg = JSON.parse(String(raw)); } catch (_) { return; }
    if (!msg || typeof msg.type !== 'string') return;

    if (msg.type === 'createRoom') {
      if (ws.role) return;
      const code = makeRoomCode();
      const room = { code, host: ws, clients: new Map() };
      rooms.set(code, room);
      ws.role = 'host';
      ws.roomCode = code;
      json(ws, { type: 'roomCreated', code });
      return;
    }

    if (msg.type === 'joinRoom') {
      if (ws.role) return;
      const code = String(msg.code || '').toUpperCase().trim();
      const room = rooms.get(code);
      if (!room) { json(ws, { type: 'error', error: 'ROOM NOT FOUND' }); return; }
      if (room.clients.size >= 5) { json(ws, { type: 'roomFull' }); return; }
      const clientId = makeClientId();
      const name = String(msg.name || 'Player').slice(0, 18);
      room.clients.set(clientId, { ws, name });
      ws.role = 'client';
      ws.roomCode = code;
      ws.clientId = clientId;
      json(ws, { type: 'joined', code, clientId });
      json(room.host, { type: 'joinRequest', clientId, name });
      return;
    }

    const room = ws.roomCode ? rooms.get(ws.roomCode) : null;
    if (!room) return;

    if (msg.type === 'toHost' && ws.role === 'client') {
      json(room.host, { type: 'toHost', clientId: ws.clientId, payload: msg.payload });
      return;
    }

    if (msg.type === 'broadcast' && ws.role === 'host') {
      broadcastClients(room, { type: 'broadcast', payload: msg.payload });
      return;
    }

    if (msg.type === 'sendToClient' && ws.role === 'host') {
      const target = room.clients.get(String(msg.clientId));
      if (target) json(target.ws, { type: 'serverMessage', payload: msg.payload });
      return;
    }
  });

  ws.on('close', () => {
    const room = ws.roomCode ? rooms.get(ws.roomCode) : null;
    if (!room) return;
    if (ws.role === 'host') {
      broadcastClients(room, { type: 'hostClosed' });
      rooms.delete(room.code);
      return;
    }
    const clientId = ws.clientId;
    room.clients.delete(clientId);
    json(room.host, { type: 'clientClosed', clientId });
  });
});

httpServer.listen(PORT, () => {
  console.log(`Grammar Skyfall server listening on ${PORT}`);
});
