# README & Licensing Notes

This document supplements the existing project README and MIT license by
capturing the operational expectations for the licensing and provisioning
workflow that integrates Pétanque Manager with Supabase and Prisma-backed
infrastructure.

## Mandatory environment variables

Set the following variables in your deployment environment (`.env`, CI/CD
secrets, or hosting control panel) **before** starting the application.
Variables prefixed with `VITE_` must be exposed to the client bundle because
Vite only inlines variables with that prefix.

| Variable | Required | Description | Example |
| --- | --- | --- | --- |
| `DATABASE_URL` | ✅ | Primary Postgres connection string used by Prisma for runtime queries and migrations. | `postgresql://user:pass@db.example.com:5432/petanque` |
| `SHADOW_DATABASE_URL` | ✅ (dev) | Secondary Postgres database Prisma uses to safely compute schema diffs during `migrate dev`. | `postgresql://user:pass@db.example.com:5432/petanque_shadow` |
| `SUPABASE_URL` | ✅ | Base URL of your Supabase project. Used server-side for admin automation. | `https://your-project.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role key with elevated privileges required for provisioning and licence revocation. **Never** expose this to the browser. | `eyJhbGciOiJI...` |
| `VITE_SUPABASE_URL` | ✅ | Same as `SUPABASE_URL`, but exposed to the front-end client for anonymous auth flows. | `https://your-project.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Supabase anonymous client key for the browser. | `eyJhbGciOiJI...` |
| `PRISMA_GENERATE_DATAPROXY` | optional | Set to `true` when using Prisma Data Proxy instead of direct database connections. | `false` |
| `RATE_LIMIT_WINDOW_MS` | ✅ | Sliding time window (in milliseconds) evaluated by the rate limiter. | `60000` |
| `RATE_LIMIT_MAX_REQUESTS` | ✅ | Maximum requests allowed within `RATE_LIMIT_WINDOW_MS` per API token/IP. | `120` |
| `REALLOCATION_QUOTA_DAILY` | ✅ | Allowed licence reallocations per organisation per 24 hours before escalation. | `5` |
| `SUPPORT_ESCALATION_EMAIL` | ✅ | Inbox monitored by the support team for quota overrides or emergency access. | `support@example.com` |

> **Tip:** When running locally, copy `.env.example` to `.env` (create the file if
> it does not exist) and populate the values above. In CI, store secrets in the
> platform’s secret manager.

## Supabase and Prisma setup

1. **Install CLI tooling**
   ```bash
   npm install --global supabase
   npx prisma -v   # verifies Prisma CLI availability
   ```
2. **Authenticate with Supabase**
   ```bash
   supabase login         # opens browser login
   supabase link --project-ref <your-project-ref>
   supabase db start      # optional: launch local development stack
   ```
3. **Generate Prisma client**
   ```bash
   npx prisma generate
   ```
4. **Sync schema with Supabase Postgres**
   - Use `npx prisma db pull` if the database already holds the canonical schema.
   - Otherwise, maintain migrations inside `prisma/migrations` and push via
     `npx prisma migrate deploy` (see below).
5. **Environment validation**
   ```bash
   npx prisma env check
   supabase functions list   # confirms CLI connectivity
   ```

## Database migrations & seeding

| Scenario | Command | Notes |
| --- | --- | --- |
| Create new migration during development | `npx prisma migrate dev --name <feature>` | Uses `SHADOW_DATABASE_URL`; ensure both URLs are reachable. |
| Apply pending migrations locally | `npx prisma migrate deploy` | Run after pulling the latest changes to stay in sync with teammates. |
| Reset and reseed database | `npx prisma migrate reset --force --skip-seed && npm run seed` | Use only on disposable environments; confirm `npm run seed` exists or replace with your seeding script. |
| Generate Prisma client after migration | `npx prisma generate` | Regenerates types for the application layer. |
| Inspect data during QA | `npx prisma studio` | Launches Prisma Studio at `http://localhost:5555`. |

Automate the `migrate deploy` command in CI/CD before releasing to production to
ensure schema drift never reaches end users.

## Rate-limit expectations

- Default policy allows **120 activation-related requests per minute** (matching
  `RATE_LIMIT_MAX_REQUESTS=120` and `RATE_LIMIT_WINDOW_MS=60000`).
- Burst tolerance: short-lived spikes (<10 seconds) may exceed the limit by up
  to 20% and are automatically evened out; larger surges return HTTP 429.
- The API responds with headers `X-RateLimit-Limit`, `X-RateLimit-Remaining`,
  and `Retry-After` to aid client-side backoff strategies.
- Adjust limits per environment by overriding the variables—production usually
  runs stricter quotas than staging.

## Activation lifecycle endpoints

All examples assume the API is hosted at `https://api.petanque.example.com` and
secured with bearer tokens. Replace `{{TOKEN}}` with a valid access token and
`{{LICENSE_ID}}` with the licence identifier.

### Activate a licence

```bash
curl --request POST \
  --url https://api.petanque.example.com/api/v1/licenses/activate \
  --header 'Authorization: Bearer {{TOKEN}}' \
  --header 'Content-Type: application/json' \
  --data '{
    "licenseKey": "PET-ABC-123",
    "deviceId": "workstation-42",
    "metadata": {
      "operator": "Sandrine",
      "notes": "Club championship finals kiosk"
    }
  }'
```

**Postman setup:** create a request named _Activate licence_, set method `POST`,
URL `/api/v1/licenses/activate`, add `Authorization` tab → `Bearer Token`, and
paste the JSON payload above under the `Body` tab (raw `JSON`).

### Check licence status

```bash
curl --request GET \
  --url https://api.petanque.example.com/api/v1/licenses/{{LICENSE_ID}}/status \
  --header 'Authorization: Bearer {{TOKEN}}'
```

Typical response:

```json
{
  "licenseId": "PET-ABC-123",
  "state": "active",
  "assignedTo": "workstation-42",
  "expiresAt": "2024-12-01T00:00:00.000Z",
  "remainingReallocations": 3
}
```

In Postman, duplicate the activation request, switch method to `GET`, and remove
the request body.

### Deactivate a licence

```bash
curl --request POST \
  --url https://api.petanque.example.com/api/v1/licenses/{{LICENSE_ID}}/deactivate \
  --header 'Authorization: Bearer {{TOKEN}}' \
  --header 'Content-Type: application/json' \
  --data '{
    "deviceId": "workstation-42",
    "reason": "Hardware refresh"
  }'
```

Postman mirrors the curl configuration: method `POST`, path
`/api/v1/licenses/{{LICENSE_ID}}/deactivate`, JSON body as shown.

> **Note:** If the API issues HTTP 429 due to rate limiting, retry with
> exponential backoff. If a licence remains in an `activating` or
> `deactivating` state for longer than two minutes, consult the support
> escalation procedure below.

## Reallocation quotas & support escalation

- Every organisation receives `REALLOCATION_QUOTA_DAILY` successful licence
  reallocations per rolling 24-hour period.
- When the quota is exhausted, the API returns HTTP 403 with the code
  `REALLOCATION_QUOTA_EXCEEDED`. The `Retry-After` header indicates when the
  quota resets.
- Emergency overrides:
  1. Capture evidence (error ID, tenant, affected licence).
  2. Email `SUPPORT_ESCALATION_EMAIL` with the subject `Licence quota override`
     and include logs and customer impact.
  3. Support staff can temporarily lift quotas by running the privileged
     Supabase function `manage_license_quota` via the Supabase SQL editor or CLI.
- Any override remains active for **12 hours** and must be documented in the
  incident tracker.

## License reminder

This project is distributed under the [MIT License](./LICENSE). Ensure that any
third-party code bundled with the application remains compatible with MIT terms
and that customer-facing documentation reflects the same licence obligations.
