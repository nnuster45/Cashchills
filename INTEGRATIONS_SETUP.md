# Integrations Setup

This project now supports:

- Gmail OAuth for real email sync
- LINE LIFF login for entry from LINE rich menu

## 1. Environment variables

Copy `.env.example` to `.env.local` and fill these values:

```bash
APP_JWT_SECRET=
DATABASE_URL=
DATABASE_NAME=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3333/api/integrations/google/callback

NEXT_PUBLIC_LINE_LIFF_ID=
LINE_CHANNEL_ID=
```

## 2. Google Gmail OAuth

Required Google Cloud setup:

1. Create or open a Google Cloud project
2. Enable the Gmail API
3. Create an OAuth Client ID with application type `Web application`
4. Add this redirect URI:

```text
http://localhost:3333/api/integrations/google/callback
```

For production, add your production callback URL too.

Scopes used by the app:

- `openid`
- `email`
- `profile`
- `https://www.googleapis.com/auth/gmail.readonly`

After setup:

1. Login to the app
2. Open `Settings`
3. Press `เชื่อม Gmail`
4. Complete Google consent
5. Use `Sync จริง` to import email-based transactions

## 3. LINE LIFF login

Required LINE Developers setup:

1. Create a LINE Login channel
2. Create a LIFF app
3. Set the LIFF URL to your deployed app root or the page you want to open from rich menu
4. Copy the LIFF ID to `NEXT_PUBLIC_LINE_LIFF_ID`
5. Copy the channel ID to `LINE_CHANNEL_ID`

Recommended scopes:

- `openid`
- `profile`
- `email` (optional but recommended)

## 4. Rich menu entry

In LINE rich menu, create an action with:

- Type: `URI`
- URI:

```text
https://liff.line.me/<YOUR_LIFF_ID>
```

When the user opens the LIFF app from rich menu, the app can complete LINE login and create a local session.

## 5. Notes

- Gmail sync currently uses a heuristic parser for bank and payout emails
- Duplicate imports are prevented by Gmail message ID
- Gmail connection is stored per logged-in user
- LINE login creates or reuses a local app account based on the LINE-verified email when available
