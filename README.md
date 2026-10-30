# Fanari Voices — voices.farosincepta.com

A shop run by Faros Incepta LLC that sells voice clips for $1 each. Buyers preview a clip, pay with Stripe, and download the full file.

## How it fits together

| Part | Where it lives | Cost |
|---|---|---|
| Shop page (`public/index.html`) | Cloudflare Pages | Free |
| Clip list (`public/clips.json`) | Cloudflare Pages | Free |
| Previews (`public/previews/FV-0001.mp3`) | Cloudflare Pages, public | Free |
| Full clips (`FV-0001.mp3`) | Cloudflare R2 bucket `faros-incepta-voices-clips`, private | Free up to 10 GB |
| Checkout and download checks (`functions/api/`) | Cloudflare Pages Functions | Free tier |
| Payments | Stripe, account for Faros Incepta LLC | About 30¢ + 2.9% per checkout |

Full clips are never public. `/api/download` only hands a file over after Stripe confirms the payment included that clip, and only for 24 hours.

## One-time setup

1. **Stripe.** Create an account for Faros Incepta LLC, using the LLC's legal name, EIN and business bank account. Set the public business name to **Fanari Voices** (shown on checkout and card statements) and the support email to `farosincepta@outlook.com`. In Developers → API keys, copy the **test** secret key (`sk_test_...`). Turn on "Email customers about successful payments" in Settings → Customer emails, so buyers get a receipt.
2. **GitHub.** Upload everything in this folder to a private repository, for example `faros-incepta-voices`.
3. **Cloudflare.** Create a free account.
   - R2 → Create bucket → name it `faros-incepta-voices-clips`.
   - Workers & Pages → Create → Pages → Connect to Git → pick the repository. Framework preset: None. Build command: none. Output folder: `public`.
   - The bucket is linked by `wrangler.toml` under the name `CLIPS`. If Cloudflare asks you to add it yourself: Settings → Bindings → R2 bucket, variable name `CLIPS`, bucket `faros-incepta-voices-clips`.
   - Settings → Variables and Secrets → add secret `STRIPE_SECRET_KEY` with your test key, then redeploy.
4. **Domain.** In the Pages project: Custom domains → add `voices.farosincepta.com`. Cloudflare shows a CNAME target like `faros-incepta-voices.pages.dev`. Where farosincepta.com is registered, open its DNS settings and add a **CNAME** record: host `voices`, answer `faros-incepta-voices.pages.dev`.
5. **Test.** Open https://voices.farosincepta.com, buy a clip, and pay with Stripe's test card `4242 4242 4242 4242`, any future date, any CVC. You should land on the download page.
6. **Go live.** Replace `STRIPE_SECRET_KEY` with your live key (`sk_live_...`) and redeploy.

## Adding a new clip

1. Generate it in ElevenLabs (paid plan, not a Beta feature) and download it. Name it with the next id, for example `FV-0018.mp3`.
2. **Upload the full file** to the R2 bucket `faros-incepta-voices-clips` (Cloudflare dashboard → R2 → bucket → Upload).
3. **Make the preview** with a soft tone so it can't be used as-is. With ffmpeg installed:

   ```
   ffmpeg -i FV-0018.mp3 -f lavfi -i "sine=frequency=880:duration=0.35" -filter_complex "[1]volume=0.25,adelay=1200|1200[t];[0][t]amix=inputs=2:duration=first:normalize=0" -ac 1 -b:a 64k previews/FV-0018.mp3
   ```

   Put the result in `public/previews/`.
4. **Add a line to `public/clips.json`:**

   ```json
   {"id":"FV-0018","cat":"sports","lang":"en","title":"Final whistle","voice":"Stadium announcer","secs":4,"text":"And that's the final whistle!","file":"FV-0018.mp3"}
   ```

   Categories: `intro`, `business`, `sports`, `gaming`, `events`. Languages: `en`, `el`. Add `"price_cents": 200` to charge more than $1 for a clip.
5. Commit to GitHub. Cloudflare redeploys in about a minute.

## Things to set up before launch

- **Support email.** The footer shows `farosincepta@outlook.com`. To change it, edit `src/index.html` and run `node build.mjs`.
- **Sales tax.** Ask your accountant how Illinois treats digital downloads for Faros Incepta LLC. If you need to collect it, enable Stripe Tax and set `STRIPE_TAX = "on"` in `wrangler.toml`.
- **ElevenLabs confirmation.** Keep the email from ElevenLabs support confirming you may sell the clips.
- **Lost links.** Buyers who close the download page can reopen it from their browser history for 24 hours. After that, you can look up the payment in Stripe and send the file by email.

## Editing the page

`src/index.html` is the shop page. Running `node build.mjs` copies it to `public/index.html`. The page detects voices.farosincepta.com and switches from preview mode (browser voice, simulated payment) to live mode (real preview files, real Stripe checkout).
