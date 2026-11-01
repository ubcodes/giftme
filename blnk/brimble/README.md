# GiftMe's Blnk Core on Brimble

Runs Blnk's official image (`ghcr.io/blnkfinance/blnk:0.15.5`) on Brimble, with no build and
no Git repo: Brimble pulls the image and we only set a start command and environment
variables. Tested locally with the same settings (env-only config, password-protected
Redis, no Typesense, queued inflight → commit, monitoring exporter on).

You end up with four Brimble projects (the free plan allows five):

| Project | Type | What it is |
| --- | --- | --- |
| `giftme-pg` | Database → PostgreSQL | The ledger's data |
| `giftme-redis` | Database → Redis | Blnk's queue |
| `giftme-blnk` | Docker image → Web service | The Blnk API GiftMe talks to |
| `giftme-blnk-worker` | Docker image → Worker | Processes queued transactions |

Pick the same region for all four.

## 1. Databases

1. **New project → Database → PostgreSQL**, name `giftme-pg`, **Provision**.
2. **New project → Database → Redis**, name `giftme-redis`, **Provision**.
3. When each says `active`, open it and copy its **connection string** into
   `blnk/brimble/brimble.env`: Postgres → `BLNK_DATA_SOURCE_DNS`, Redis → `BLNK_REDIS_DNS`.
   - If the Postgres string has no `sslmode`, add `?sslmode=require` at the end.

## 2. Blnk API (`giftme-blnk`)

1. **New project → Docker image**, image `ghcr.io/blnkfinance/blnk:0.15.5`.
2. **Service type:** Web service. Same region as the databases.
3. **Environment variables:** paste everything from `blnk/brimble/brimble.env`.
4. **Deploy**, then open **Settings → Build** and set the **start command**:

   ```
   sh -c 'cd /tmp && blnk migrate up && BLNK_SERVER_PORT=$PORT exec blnk start'
   ```

   Redeploy. The logs should end with `Server started on http port …`.
5. Copy the service's public URL (e.g. `https://giftme-blnk.brimble.app`).

## 3. Worker (`giftme-blnk-worker`)

Same as step 2, but **Service type: Worker**, the same environment variables, and start
command:

```
sh -c 'cd /tmp && exec blnk workers'
```

Logs should show `Workers started.`

## 4. Blnk Cloud

1. In Blnk Cloud, open your instance settings, turn on **monitoring**, and copy the
   **Blnk Cloud DSN** (`https://<write-key>@observe.blnk.cloud/<project-id>`).
2. Put it in both services as `BLNK_MONITORING_DSN` and `BLNK_CLOUD_DSN`
   (0.15.5 reads `BLNK_MONITORING_DSN`; newer versions read `BLNK_CLOUD_DSN`), keep
   `BLNK_ENABLE_OBSERVABILITY=true`, and redeploy both.
3. Logs should show `monitoring exporter enabled`. Every API call, transaction and worker job
   now shows up in Blnk Cloud as logs, traces and metrics.

## 5. Point GiftMe at it

In GiftMe's `.env`:

```
BLNK_URL=<the giftme-blnk URL from step 2>
BLNK_SECRET_KEY=<BLNK_SERVER_SECRET_KEY from brimble.env>
```

Then clear the IDs that belong to the local Blnk, so GiftMe recreates its ledger, owner
identities and item balances in the new one (past test payments stay only in the local
ledger):

```bash
npm run blnk:reset-ids
```

Restart `npm run dev`.

## Check it

```bash
curl -s -o /dev/null -w '%{http_code}\n' <URL>/ledgers                      # 401 without a key
curl -s <URL>/ledgers -H "X-Blnk-Key: <secret>"                             # [] or your ledgers
```
