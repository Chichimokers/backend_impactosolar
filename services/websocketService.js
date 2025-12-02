const WebSocket = require('ws');

let wss = null;

const init = (server) => {
  wss = new WebSocket.Server({ server });

  wss.on('connection', (ws) => {
    console.log('Cliente WebSocket conectado');
    
    ws.on('close', () => {
      console.log('Cliente WebSocket desconectado');
    });
  });

  console.log('Servidor WebSocket inicializado');
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

module.exports = { init, broadcast };
