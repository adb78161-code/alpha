/* THREATWATCH V12 network configuration.
   The defaults improve ICE discovery. For users behind symmetric NATs or strict
   firewalls, add a TURN relay that you control. PeerJS documents TURN as the
   fallback for NAT combinations that STUN cannot traverse. */
window.THREATWATCH_CONFIG = {
  sessionMinutes: 60,
  peer: {
    host: '0.peerjs.com',
    port: 443,
    path: '/',
    secure: true,
    key: 'peerjs',
  },
  iceServers: [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun.cloudflare.com:3478'] },
    // Add your own TURN server here for maximum reachability:
    // { urls: 'turn:turn.example.com:3478', username: 'YOUR_USER', credential: 'YOUR_PASSWORD' },
    // { urls: 'turns:turn.example.com:5349', username: 'YOUR_USER', credential: 'YOUR_PASSWORD' },
  ],
  photoChunkSize: 64 * 1024,
  reconnectAttempts: 10,
  reconnectDelayMs: 1800,
};
