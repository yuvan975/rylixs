# Google sign-in release 1.3.0

Customer login uses Google's authorization-code flow with PKCE and a server-side secret. Google Cloud project primal-archive-512606-t6 has External, In production audience and basic identity scopes only. Callback URLs are configured for the Render hostname, rylixs.com, and www.rylixs.com. Credentials are stored privately in Render environment variables and are not committed.

Android opens the system browser. The server issues a two-minute single-use grant bound to the SHA-256 challenge of a random app-held secret. Returning to the app redeems the grant through HTTPS and sets its HTTP-only session cookie. Deep links contain no credentials. Android 8+ is supported; a physical-device test remains necessary.

Public demo login is disabled even when the legacy hosting bootstrap flag remains enabled. Local preview login requires both explicit local flags.

Validation: production build and lint passed; all 46 then-existing unit tests passed, followed by all 6 OAuth tests including an additional mocked verified callback test; 58 HTTP integration checks passed. APK signature v2/v3 verified.

Hosting limitation: existing Render Free service uses ephemeral SQLite storage; real Google authentication does not make account/order data persistent. Production storage needs separate hosting configuration.
