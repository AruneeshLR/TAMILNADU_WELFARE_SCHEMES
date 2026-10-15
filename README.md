# TN Welfare Connect — Scheduled Scheme Updates

## Run locally
1. Install Node.js 18 or newer from https://nodejs.org/.
2. Extract the whole folder.
3. Double-click `START_PROJECT.bat`, or run `node server.js` in this folder.
4. Open http://localhost:3000.

## Automatic updates
- The backend checks the configured Tamil Nadu government source pages on startup and every 6 hours.
- Users of the same hosted app see the same update feed; the app refreshes the feed every 5 minutes while open.
- Use the Refresh button to request a scan immediately.
- The server saves detected links in `data/updates.json`.

## Important limitations
This is a scheduled link-discovery prototype, not an official government API. It detects links whose text matches scheme-related keywords; it cannot guarantee that every new scheme will be detected, and a matching link may be an old or general information page. All results are labelled as requiring verification. A production version should use official RSS/API feeds where available and an administrator approval workflow before presenting a link as a confirmed new scheme. For updates to reach users when they are away from the app, host this backend continuously on a server. A laptop running locally only serves that laptop.
