const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const url = require('url');

let wss = null;

const init = (server) => {
  // Mount WS on /dota/ws to match backend prefix
  wss = new WebSocket.Server({ server, path: '/dota/ws' });

  wss.on('connection', (ws, req) => {
    const parameters = url.parse(req.url, true);
    const token = parameters.query.token;

    if (!token) {
      ws.close(1008, 'Token requerido');
      return;
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'keyboard cat');
      ws.user = decoded; // { steam_id, role, ... }
      console.log(`WS Conectado: ${decoded.steam_id} (${decoded.role})`);
    } catch (err) {
      ws.close(1008, 'Token inválido');
      return;
    }
    
    ws.on('close', () => {
      // console.log('Cliente WebSocket desconectado');
    });
  });

  console.log('Servidor WebSocket inicializado en /dota/ws');
};

const broadcast = (data) => {
  if (!wss) return;
  const message = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
};

const broadcastAdmin = (data) => {
  if (!wss) return;
  const message = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && client.user?.role === 'admin') {
      client.send(message);
    }
  });
};

module.exports = { init, broadcast, broadcastAdmin };
