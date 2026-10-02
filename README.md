# THREATWATCH V3 — Professional GitHub Pages build

Static, consent-first two-device browser experiment.

## Files
- `index.html` — console dashboard
- `participant.html` — participant consent screen
- `app.js` — console logic
- `participant.js` — participant logic
- `style.css` — responsive UI

## Deploy
Upload/replace all files in the same GitHub Pages folder. Use **Settings → Pages → Deploy from branch → root/static HTML**. No Jekyll setup is required.

The project uses PeerJS for signaling/WebRTC and QRCodeJS for QR rendering. The QR image fallback uses an external QR image service only if QRCodeJS fails to load.

## Safety
Camera and location are never requested automatically. The participant must explicitly press the relevant control and approve the browser permission prompt. The console cannot bypass those permissions or silently capture from the participant device.
