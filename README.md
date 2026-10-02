# THREATWATCH V4 Professional

Consent-based two-device privacy experiment for GitHub Pages.

## V4 changes
- Device A: professional security console with received-photo gallery and zoomable photo viewer.
- Device B: NovaShop-inspired storefront UI based on the supplied reference image.
- Device B keeps camera/location/photo controls behind an explicit Privacy & permissions panel.
- Browser permissions are never bypassed.
- Camera starts only after participant action + browser permission.
- Location starts only after participant action + browser permission.
- Photos are captured only from the participant's enabled camera after participant action.
- Temporary pairing token and session expiry remain enabled.

## GitHub Pages
Upload/replace all files in the same folder: `index.html`, `participant.html`, `style.css`, `app.js`, `participant.js`. Use static HTML (not Jekyll).

## Important
This version intentionally does not implement permission bypass, covert capture, or silent device access.
