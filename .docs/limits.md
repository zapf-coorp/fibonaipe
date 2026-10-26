# Free-tier limits

Fibonaipe stays on free plans during the test phase. Confirm current quotas before deploy. Alert around 80% of each quota.

| Service | What to watch |
| :--- | :--- |
| Managed Postgres (Supabase or Neon) | Storage, connection count, compute hours. Keep the pool small. |
| Realtime | Concurrent connections. HTTP polling every 2–3s is the fallback when the socket is unavailable. |
| Static / serverless host | Bandwidth and invocation count. Cold starts should show a reconnecting message. |
| Cron | One purge call is enough every 15 minutes for the 60-minute guest-room TTL. |

Room bundle budget is 150 KB gzip (`BUNDLE_BUDGET_ROOM_GZIP_BYTES` = 153600). Native addons (`better-sqlite3`, `bcrypt`, `sharp`, `canvas`) are not allowed.
