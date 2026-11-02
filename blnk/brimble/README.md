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

1. **New project → Database → PostgreSQL** and **→ Redis**, in the same environment and region
   as the Blnk services below. Public access can stay off: Blnk reaches them over Brimble's
   private network.
2. Nothing to copy: the services reference the databases' `PRIVATE_CONNECTION_STRING` by name.

## 2. Blnk API (`giftme-blnk`) and worker (`giftme-blnk-worker`)

Created with the CLI (`brimble login` first, with a Full access API key). New projects go to
the workspace's **default environment**, so make the databases' environment the default while
creating them, or copy them over afterwards with `brimble project duplicate <name> --env <env>`.

```bash
brimble project create --image ghcr.io/blnkfinance/blnk:0.15.5 --name giftme-blnk --type web-service
brimble project create --image ghcr.io/blnkfinance/blnk:0.15.5 --name giftme-blnk-worker --type worker
```

Environment variables on **both** (`brimble env set <project> -f <file>`), with the database
names from step 1:

```
BLNK_SERVER_SECRET_KEY=<from brimble.env>
BLNK_PROJECT_NAME=GiftMe
BLNK_SERVER_SECURE=true
BLNK_ENABLE_OBSERVABILITY=true
BLNK_DATA_SOURCE_DNS={{@postgresql-db-krm5.PRIVATE_CONNECTION_STRING}}?sslmode=disable
BLNK_REDIS_DNS={{@redis-db-dt98.PRIVATE_CONNECTION_STRING}}
```

The private Postgres address has no TLS, hence `sslmode=disable` (traffic stays inside Brimble).

On the API service only, `BLNK_SERVER_PORT=8000` (the `PORT` Brimble routes to; check it with
`brimble env pull`).

Brimble has no start-command field for image projects, so the image's own `blnk start` runs,
and each service gets a **Pre-start command** in the dashboard (**Configuration → Build &
Deploy**):

| Service | Pre-start command |
| --- | --- |
| `giftme-blnk` | `blnk migrate up` |
| `giftme-blnk-worker` | `exec blnk workers` (replaces the process, so the worker never reaches `blnk start`) |

A background `blnk workers &` does not survive the pre-start step. With `exec`, the worker's
deployment keeps showing **Building** on the dashboard because its pre-start never returns, but
it processes jobs; check with a queued transaction (below).

## 4. Blnk Cloud

**Back-office (ledgers, balances, transactions).** In Blnk Cloud, **Instances → Connect on-prem
instance**, leave *Deploy Managed Core* unticked, set the Core URL to the `giftme-blnk` URL and
the Core secret key to `BLNK_SERVER_SECRET_KEY`. Cloud then shows a **query agent** command.
The agent must reach the private Postgres, so run it on Brimble in the same environment rather
than on a laptop:

```bash
brimble project create --image blnkfinance/query-agent:latest --name giftme-blnk-agent --type worker
brimble env set giftme-blnk-agent 'DB_URL={{@postgresql-db-krm5.PRIVATE_CONNECTION_STRING}}?sslmode=disable' CONNECTION_KEY
brimble project redeploy giftme-blnk-agent
```

Check it is in the right environment with `brimble project list -e <env>`; if it landed in
Production, `brimble project duplicate giftme-blnk-agent --env <env>` and delete the original
in the dashboard. From another environment the `{{@…}}` reference resolves to nothing and the
private database resets the connection. Logs should show `WebSocket connected` and
`query agent started`.

**Logs, traces and metrics.** If the instance settings offer a monitoring DSN
(`https://<write-key>@observe.blnk.cloud/<project-id>`), set it on `giftme-blnk` and
`giftme-blnk-worker` as `BLNK_MONITORING_DSN` and `BLNK_CLOUD_DSN` (0.15.5 reads the first,
newer versions the second), keep `BLNK_ENABLE_OBSERVABILITY=true`, and redeploy both.

## 5. Point GiftMe at it

In GiftMe's `.env`:

```
BLNK_URL=<the giftme-blnk URL, e.g. https://giftme-blnk-blnk-test.brimble.app>
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

Worker check: post a transaction without `skip_queue` and read the balance a few seconds later;
it only moves if the worker picked the job up.

Until a Blnk Cloud DSN is set, the logs repeat `traces export: ... localhost:4318 ... connection
refused` because observability is on with nowhere to send traces. Harmless; step 4 fixes it.
