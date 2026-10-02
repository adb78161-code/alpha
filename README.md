# THREATWATCH V12 Professional

Static GitHub Pages build for the THREATWATCH two-device privacy experiment.

## V12 changes
- 60-minute session lifetime.
- Session ID, token and expiry persist across a Device A browser refresh until the session expires or is ended.
- QR is regenerated only for a new/regenerated session.
- Activity log persists locally.
- Received photos are stored locally on Device A and can be individually deleted, multi-selected, deleted in bulk, viewed, zoomed and exported as a metadata manifest.
- Photo transport uses reliable 64 KB chunks over PeerJS instead of sending large base64 strings as single messages.
- Improved reconnect handling and multiple STUN servers.
- Device B has a minimal three-mode UI: Selfie, Pro, Filter.
- Device B has no leave-session control; the console can end the session.
- Sensitive actions use a small confirmation sheet before the browser permission prompt. A web page cannot legitimately bypass the browser camera/location permission system.

## Long-distance / restrictive networks
WebRTC reachability is affected by NAT/firewall configuration, not physical distance. PeerJS documents TURN as the fallback when STUN cannot establish a direct connection. The default configuration contains STUN servers only. For maximum reachability, add a TURN server that you control to `peer-config.js` in `iceServers`, for example:

```js
{ urls: 'turn:turn.example.com:3478', username: 'YOUR_USER', credential: 'YOUR_PASSWORD' }
```

PeerJS Cloud provides signaling; it does not automatically relay every WebRTC media/data connection. For production, use your own PeerServer and TURN service as appropriate.

## Deployment
Upload all files to the same GitHub Pages directory:
- index.html
- participant.html
- app.js
- participant.js
- peer-config.js
- style.css

Use **Static HTML** deployment. After replacing the files, open the console in a private/incognito tab once to avoid stale cached JavaScript.
