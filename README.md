# THREATWATCH V15

V15 focuses on WebRTC reliability over mobile and long-distance networks.

## Improvements
- Multiple STUN servers and tighter ICE configuration
- Connection watchdog and automatic reconnect with exponential backoff
- Longer reconnect window
- Smaller adaptive photo chunks for higher-latency links
- Video bitrate/framerate caps to reduce congestion
- Session persistence across refresh

## Important network requirement
STUN can establish direct peer-to-peer paths, but some mobile carriers, symmetric NATs, VPNs, corporate networks, and firewalls require a TURN relay. A GitHub Pages site cannot provide TURN itself. Add credentials for a TURN service you control in `peer-config.js` for the strongest long-distance reliability.

The browser's camera and location permission system remains enforced.
