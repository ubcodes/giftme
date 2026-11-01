# GiftMe

Wishlists for any occasion. Anyone signs in, makes a list (birthday, wedding, baby shower,
graduation, housewarming…), adds gifts by pasting a shop link or searching, and shares one
link. Friends chip in any amount in naira through Paystack, or reserve a gift to buy
themselves. Each owner's money settles straight to their own bank through a Paystack
subaccount, and every naira is recorded in a Blnk ledger.

Stack: TanStack Start 1.132, React 19, Tailwind v4, zod, Vite on Node 22, libsql (SQLite),
Clerk, Paystack, self-hosted Blnk Core.

## Local setup

You need Node 22.12+ and Docker. Keep the project outside iCloud-synced folders
(`~/Documents`), which offload `node_modules` and make tools hang.

1. Install packages:

   ```bash
   npm install
   ```

2. Create your `.env`:

   ```bash
   cp .env.example .env
   ```

3. Create GiftMe's Blnk config and key (writes `blnk/blnk.json` and `BLNK_SECRET_KEY` in `.env`):

   ```bash
   npm run blnk:init
   ```

4. Start GiftMe's own Blnk Core (containers `gm-*`, API on `localhost:5201`; it runs
   alongside the birthday wishlist's `wl-*` stack on 5101):

   ```bash
   npm run blnk:up
   ```

5. Put your Paystack **test** secret key (`sk_test_...`) in `.env` as `PAYSTACK_SECRET_KEY`.

6. Optional now, needed for real sign-in: add Clerk keys (see below). Without them you get a
   local test sign-in (name + email, no password) so you can try everything.

7. Run it:

   ```bash
   npm run dev
   ```

   Open http://localhost:3200.

### Try the whole flow

1. Click **Start your wishlist**, sign in, add a photo, pick your link name.
2. Create a wishlist. The **Add a gift** box opens: paste a product link (a Jumia product
   page works well) and the name, photo and price fill in. Save it.
3. Go to **Settings → Where gifts go** and add a bank account. In Paystack test mode use
   **Zenith Bank** and account number **0000000000** (resolves to "Test").
4. Open your share link (**View as a guest**) in another browser or a private window, click
   **Contribute**, and pay on Paystack's test checkout with the **Success** option.
5. You land on the thank-you page; the progress bar moves, and your dashboard shows the
   guest's name, amount and note.
6. See the money in Blnk: the item's balance has the credit, and the ledger "GiftMe" holds
   the inflight → committed contribution and the payout entry.

### Clerk (Google + email sign-in)

1. Create an application at https://dashboard.clerk.com. Turn on **Google** and **Email
   address** with **Email verification code** (no passwords).
2. Under **Configure → API keys**, copy the **Publishable key** and **Secret key** into
   `.env` as `CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`.
3. Restart `npm run dev`. The sign-in page now shows Clerk's sign-in, and new users get
   their Google photo as a starting profile photo.

### Product search and blocked shops (optional)

Create a key at https://serpapi.com, put it in `.env` as `SERPAPI_KEY`, and restart. Then:

- **Search as you type** in **Add a gift**: Nigerian shops come from Google web results in
  Nigeria (with naira prices; each shop page's own photo and price are added), and
  international shops from Google Shopping (US, converted to naira). SerpApi's Google
  Shopping doesn't support `gl=ng`, which is why Nigeria uses web results.
- **Shops that block page reads** still work when a link is pasted: Amazon links go through
  SerpApi's Amazon product API (by ASIN); others (e.g. Temu) use the product words in the URL
  to find the closest match, and the app tells the owner to check name and price.

Each search uses about 2 SerpApi credits (results are cached for 30 minutes). Without a key,
search is hidden and link pasting reads the page's own metadata only.

### Paystack webhook (optional locally)

The thank-you page confirms each payment with Paystack itself, so local testing works
without a webhook. For bank transfers that land later, point Paystack at
`<PUBLIC_SITE_URL>/api/paystack/webhook` (use `npm run tunnel` for an ngrok URL and set
`PUBLIC_SITE_URL` to it). Note: a Paystack account has one webhook URL, and the test
account is shared with the birthday wishlist; GiftMe only handles references that start
with `gm_`.

## Environment variables

| Variable | Required | What it is |
| --- | --- | --- |
| `PUBLIC_SITE_URL` | yes | Public base URL, used for Paystack callbacks and share links. `http://localhost:3200` locally. |
| `DATABASE_URL` | yes | libsql URL for app data. `file:giftme.db` locally, `libsql://…` (Turso) in production. |
| `DATABASE_AUTH_TOKEN` | prod | Turso auth token. |
| `BLNK_URL` | yes | Blnk Core API. `http://localhost:5201` locally; later the Brimble-hosted URL. |
| `BLNK_SECRET_KEY` | yes | Must equal `server.secret_key` in `blnk/blnk.json`. Set by `npm run blnk:init`. |
| `PAYSTACK_SECRET_KEY` | yes | `sk_test_…` locally, `sk_live_…` in production. |
| `CLERK_PUBLISHABLE_KEY` | prod | Clerk publishable key. Without Clerk keys the local test sign-in is used (never in production). |
| `CLERK_SECRET_KEY` | prod | Clerk secret key. |
| `DEV_AUTH_SECRET` | no | Signs the local test sign-in cookie. |
| `SERPAPI_KEY` | no | Turns on product search (SerpApi Google Shopping, `gl=ng`). |
| `USD_NGN_RATE` | no | Naira per dollar for dollar prices. Default `1500`. |
| `PLATFORM_FEE_PERCENT` | no | GiftMe's cut of each gift, kept by the main Paystack account. Default `0`. |
| `RESEND_API_KEY` | no | Sends emails (new-gift alerts, thank-you notes) via Resend. Without it emails go to the server log. |
| `EMAIL_FROM` | no | Sender, quoted, e.g. `"GiftMe <hello@yourdomain>"`. Until you verify a domain in Resend, use `"GiftMe <onboarding@resend.dev>"`, which only delivers to your own Resend account email. |
| `VITE_REPO_URL` | no | Link to the public source code; shows a "View the code" button on the landing page. |
| `UPLOAD_DIR` | no | Folder for uploaded and copied images. Default `uploads`. |

## How money moves

```
Guest pays on Paystack ──► split by Paystack: fee (if any) to GiftMe, the rest to the owner's subaccount → owner's bank

Blnk ledger "GiftMe"
  @PaystackNGN ──inflight──► item balance        (when checkout starts; reference = Paystack reference)
                  commit on verified success, void on failure (webhook HMAC-SHA512 check + thank-you page verify)
  item balance ──► @GiftMeFeesNGN                 (platform fee, 0% by default)
  item balance ──► @Payouts                       (the owner's share, settled by Paystack)
  @OfflineGiftsNGN ──► item balance              (cash/transfer gifts the owner records)
```

- One Blnk **identity** per owner, one **balance** per item or cash fund with `owner_id`,
  `wishlist_id` and `item_id` metadata.
- An item's `credit_balance` is what it has raised (drives progress bars and dashboards);
  `debit_balance` is what has been paid out.
- Settling is idempotent: a `pending → settling` status claim lets one caller through, and
  fee/payout entries use fixed references (`<ref>_fee`, `<ref>_payout`) so a retry never
  doubles them.
- GiftMe never holds funds: Paystack routes each payment to the owner's subaccount.

## Code map

- `src/server/auth.ts`, `src/components/auth.tsx`: the only files that know about Clerk.
- `src/server/blnk.ts`, `src/server/paystack.ts`: all Blnk and Paystack calls.
- `src/server/gifts.ts`: contributions, settlement, reservations, payouts setup, dashboards.
- `src/server/wishlists.ts`: wishlists, items, Blnk balances per item.
- `src/server/products.ts`: link previews from JSON-LD `Product`, OpenGraph and meta tags.
  Honours robots.txt and fetches only the one page; big shops that block bots fall back to
  "add by hand".
- `src/server/search.ts`: product search behind a `ProductSearchProvider` interface.
- `src/server/storage.ts`: pluggable image store (local disk now; add S3/R2 by implementing
  `ImageStore`). Remote images are saved as URLs first, then copied in the background.
- `src/server/net.ts`: SSRF-safe fetch for user-supplied URLs.
- Routes: `/` landing, `/start` sign-in, `/welcome` profile setup, `/dashboard…` owner
  pages, `/w/<handle>/<slug>` public wishlist, `/thank-you`, `/api/paystack/webhook`,
  `/api/upload`, `/media/*`.

## Checks

```bash
npm run typecheck
```

## Image credits

Landing-page demo photos in `public/images/demo` come from Wikimedia Commons and are public
domain or CC0: "Christian wedding - Couples dancing - Northern Nigeria", "Zanzibar Beach",
"Chemex (Unsplash)", "Kitchen aid mixer", "Headphones on white background", "Appareil photo
instantané Polaroid Spirit 600", "Rick Owens Geobasket sneaker".

