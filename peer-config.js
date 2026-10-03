/* THREATWATCH V15 network configuration.
   STUN helps discover direct paths. For carrier NAT / symmetric NAT / strict
   firewalls, a TURN relay is required for dependable long-distance WebRTC.
   Add YOUR TURN service below; do not use placeholder credentials in production. */
window.THREATWATCH_CONFIG = {
  sessionMinutes: 1440,
  peer: { host: '0.peerjs.com', port: 443, path: '/', secure: true, key: 'peerjs' },
  iceServers: [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun.cloudflare.com:3478', 'stun:stun1.l.google.com:19302'] },
    // Production long-distance fallback: add a TURN service you control.
    // { urls: ['turn:turn.example.com:3478?transport=udp','turn:turn.example.com:3478?transport=tcp'], username: 'TURN_USER', credential: 'TURN_PASSWORD' },
    // { urls: 'turns:turn.example.com:5349?transport=tcp', username: 'TURN_USER', credential: 'TURN_PASSWORD' },
  ],
  photoChunkSize: 16 * 1024,
  photoWindow: 8,
  photoAckTimeoutMs: 3500,
  photoRetries: 4,
  videoMaxBitrate: 850000,
  videoMaxFramerate: 20,
  reconnectAttempts: 30,
  reconnectDelayMs: 1800,
  reconnectMaxDelayMs: 30000,
  pingIntervalMs: 12000,
  staleConnectionMs: 45000,
};
