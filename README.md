THREATWATCH V16

V16 focuses on performance and responsive layout.
- Stabilized desktop/tablet/mobile console sizing and removed horizontal overflow.
- Reduced signaling/debug noise and made reconnects less aggressive.
- Slower heartbeat/watchdog cadence to reduce unnecessary traffic.
- Happy Photos actions (Selfie / Pro / Filter) are kept at the top on Device B.
- Sticker grid is responsive and uses lazy image decoding.
- Keep the entire stickers/ folder beside participant.html when deploying.
- Camera and location remain controlled by the browser permission system.

Long-distance WebRTC still depends on the networks involved; restrictive carrier NAT/firewalls may require a properly configured TURN relay.
