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
