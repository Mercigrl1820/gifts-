# GiftIdea – Personalized Gift Recommendation App (MVP)

A simple, beautiful web app that asks questions about the person you’re buying for and uses AI to generate thoughtful gift ideas with Amazon shopping links.

**Perfect for beginners** – you do **not** need coding experience to get this live.

---

## What this app does

1. User answers questions (occasion, relationship, interests, personality, budget, etc.)
2. AI generates 6 personalized gift ideas with explanations
3. Each idea has a “Search on Amazon” button (your affiliate link)
4. Users can save recipient profiles for next time (stored in their browser)

---

## Step-by-step: How to get it online (no coding required)

### 1. Get your free accounts (do these first)

**A. OpenAI API Key**
1. Go to https://platform.openai.com
2. Sign up / log in
3. Click your profile → “API keys” → “Create new secret key”
4. Copy the key (starts with `sk-...`). Keep it private!

**B. Amazon Associates (for income)**
1. Go to https://affiliate-program.amazon.com
2. Sign up and get approved (can take 1–3 days)
3. Once approved, go to Tools → SiteStripe or Account settings to find your **Associate Tag** (looks like `yourname-20`)

**C. Vercel account (free hosting)**
1. Go to https://vercel.com
2. Sign up with GitHub, Google, or email (free)

---

### 2. Put the code on GitHub (easiest way)

1. Create a free account at https://github.com if you don’t have one
2. Click the green **“New”** button to create a new repository
3. Name it something like `gift-idea-app`
4. Leave it Public and click **Create repository**
5. On the next page, click **“uploading an existing file”**
6. Drag **all the files and folders** from this project into the browser window
7. Click **Commit changes**

(Alternatively you can download this whole folder as a ZIP and upload the contents.)

---

### 3. Deploy to Vercel (makes it live on the internet)

1. Go to https://vercel.com/new
2. Click **“Import Git Repository”** and choose the repo you just created
3. Click **Import**
4. Before deploying, click **Environment Variables**
5. Add this variable:
   - **Name**: `OPENAI_API_KEY`
   - **Value**: paste your OpenAI key (the `sk-...` one)
6. Click **Deploy**

Wait 1–2 minutes. Vercel will give you a live link like:
`https://gift-idea-app-xxxxx.vercel.app`

Your app is now live!

---

## Free search limit

Each visitor can run a few gift searches for free. After that, the existing upgrade window opens with the message “You’ve used your 2 free searches.” The number follows the setting below. The count is kept on the server, so a private window or a cleared browser does not start the allowance over.

The limit stays **off** until Redis and the cookie secret are set. Searches keep working, and the server logs a warning. Add these in the Vercel project (Preview first, then Production) before you expect the limit to turn on. Do not put the secret in the code, and do not commit it.

### Required before the limit turns on

1. **Upstash Redis** from the Vercel Marketplace (`vercel integration add upstash`, or the Marketplace page in the dashboard). That integration fills in one of these pairs:
   - `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
   - or the older names `KV_REST_API_URL` and `KV_REST_API_TOKEN`
2. **`GIFT_VISITOR_COOKIE_SECRET`**: a long random string (at least 32 characters). It signs the visitor cookie. If you change it later, everyone gets a new visitor id.

### Optional settings

| Name | Default | What it does |
| --- | --- | --- |
| `FREE_SEARCH_LIMIT` | `2` | How many gift searches a visitor gets. “Load more gifts” is not included unless the flag below is turned on. |
| `FREE_SEARCH_RESET` | `never` | `never` keeps the count. `daily` starts it over each UTC day. |
| `FREE_SEARCH_IP_DAILY_CAP` | `20` | How many gift generations one network connection can run per UTC day, including “Load more gifts”. This is the backstop when cookies are cleared. |
| `FREE_SEARCH_COUNT_LOAD_MORE` | `false` | Set to `true` if “Load more gifts” should use up a free search. |
| `STRIPE_WEBHOOK_SECRET` | unset | Lets Stripe tell the site that a payment finished, so that visitor skips the search limit. |
| `STRIPE_SECRET_KEY` | unset | Lets the site double-check a checkout when the shopper comes back. |

A valid unlock code also skips the search limit, once Redis and the cookie secret are set. The code is still checked only on the server.

### Stripe, so a payment skips the limit

In the Stripe Dashboard:

1. Open the pricing table and set the confirmation page to your site address. Stripe adds `session_id` when the shopper returns, which records the purchase.
2. Add a webhook endpoint: `https://your-domain/api/stripe/webhook`
3. Subscribe it to `checkout.session.completed` and `checkout.session.async_payment_succeeded`
4. Copy the webhook signing secret into `STRIPE_WEBHOOK_SECRET`, and the secret key into `STRIPE_SECRET_KEY`

The pricing table sends the visitor’s anonymous id with the checkout. The site stores “paid” against that id after Stripe’s signature checks out. Shopper email addresses are not saved for this.

### How to try it on a preview

1. Add the Upstash integration and `GIFT_VISITOR_COOKIE_SECRET` to the **Preview** environment. Leave Production alone until you like the preview.
2. Open the preview link, run a search, then run a second search. Both should return ideas.
3. Run a third search. The upgrade window should open and say you’ve used your 2 free searches. No new ideas are generated for that click.
4. “Load more gifts” on a result you already have should still work.
5. Enter a valid unlock code (one already saved in `GIFT_UNLOCK_CODES`), then search again. Ideas should come back.
6. Until the Redis variables and the cookie secret exist, the preview keeps allowing searches. That is intentional.

---

### 4. Add your Amazon affiliate tag (so you earn money)

1. Open the file `src/app/page.tsx` on GitHub
2. Click the pencil icon (Edit)
3. Find this line near the top:

```js
const AMAZON_TAG = "yourtag-20"; // ← CHANGE THIS to your Amazon Associates tag
```

4. Replace `yourtag-20` with your real Amazon Associates tag
5. Scroll down and click **Commit changes**
6. Vercel will automatically redeploy in about a minute

---

## Testing it

1. Open your live Vercel link on your phone or computer
2. Tap “Start finding gifts”
3. Fill in some details and generate ideas
4. Click an Amazon button – it should go to Amazon with your tag

---

## How you make money

Every time someone clicks an Amazon link from your app and buys something (within Amazon’s cookie window), you earn a commission.  
The more people use the app, the more potential income.

Later you can add:
- A small monthly subscription for unlimited profiles
- More retailers
- Native iOS / Android apps

---

## Updating the app later

Just edit the files on GitHub. Vercel will automatically update the live site.

Common things you might want to change:
- The questions in the form
- The AI prompt (in `src/lib/prompts.ts`)
- Colors / branding
- Adding more occasions or relationships

---

## Need help?

If something doesn’t work:
1. Make sure the `OPENAI_API_KEY` environment variable is set correctly in Vercel
2. Make sure you replaced the Amazon tag
3. Check the Vercel deployment logs if the build fails

You now have a real working product you can share with friends and start driving traffic to!

---

Made for non-coders who want to launch a real income-generating gift idea app.
