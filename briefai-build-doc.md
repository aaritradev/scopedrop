# 🚀 ScopeDrop — Full Product & Build Specification
### *Paste a messy client conversation. Get a professional project brief in 60 seconds.*

> **Recommended Domain:** `scopedrop.com` · `getbriefed.com` · `briefdrop.com` · `pastetobrie.com`  
> **Top Pick:** **`scopedrop.com`** — short, memorable, verb-implied action, available on name.com as of late May 2026. Check also `briefdrop.com` and `getbriefed.com` as alternates.

---

## 1. What This Is

ScopeDrop is a **single-purpose AI web app** for freelancers, solo consultants, and small agencies. The user pastes any unstructured client communication — email, WhatsApp thread, Slack message, meeting notes, voice-to-text ramble — and the app instantly returns a complete, professional project onboarding pack:

- **Project Brief** (goals, context, success criteria)
- **Scope of Work** (inclusions, exclusions, assumptions)
- **Deliverables List** (with formats and acceptance criteria)
- **Timeline** (milestone-based, editable)
- **Payment Terms** (deposit, milestones, final payment)
- **Optional Invoice** (Razorpay payment link embedded)

The user edits in-app, exports as PDF or `.docx`, or shares a branded link the client can e-sign.

**One input. One click. Done.**

---

## 2. What This Is NOT

| ❌ Not This | ✅ This Instead |
|---|---|
| A full CRM or client management platform | A single-task, frictionless brief generator |
| A proposal builder with templates and editors | An AI that writes the proposal FOR you from raw input |
| A project management tool (no task boards, Gantt) | An onboarding document generator only |
| A complex product requiring onboarding | Zero-onboarding — paste text, get output |
| A tool for enterprise sales teams | Built for solo/micro freelance operators |
| A copywriter for outbound proposals | Structured inbound brief from existing client conversations |
| Multi-user collaboration software | Single-user or small team, simple sharing |

---

## 3. Target Users

**Primary:** Freelance designers, developers, copywriters, marketers  
**Secondary:** Solo consultants, coaches, real estate agents, small agencies (1–5 people)  
**Geography:** English-first — India, Southeast Asia, Middle East, Africa (Razorpay covers India; Stripe later for global)  
**Where they hang out:** r/freelance, r/webdesign, r/digital_marketing, Fiverr forums, IndieHackers, LinkedIn India freelance communities  

---

## 4. Positioning & Messaging

### Tagline Options
- *"Paste the chaos. Get the contract."*
- *"Turn any client message into a pro brief — in 60 seconds."*
- *"Your client is messy. Your brief doesn't have to be."*

### Positioning Statement
> For freelancers and consultants who lose hours every week writing proposals and briefs, ScopeDrop is the AI brief generator that turns any unstructured client conversation into a complete, signable project document — in under 60 seconds. Unlike Dubsado or HoneyBook, ScopeDrop requires zero setup, no templates, and no learning curve. Paste in, get out.

### Emotional Hook
The product sells itself the moment someone *sees the output*. The entire GTM strategy is: **show a real before/after demo**. Messy 8-message WhatsApp thread in → clean 4-section PDF out. That video gets shared.

---

## 5. Name & Domain Recommendations

| Name | Domain | Verdict |
|---|---|---|
| **ScopeDrop** | `scopedrop.com` | ✅ Best — punchy, action-implied, brandable |
| **BriefDrop** | `briefdrop.com` | ✅ Good — very literal, easy to remember |
| **GetBriefed** | `getbriefed.com` | ✅ Good — verb-forward, SEO-friendly |
| **PasteToScope** | `pastetoscope.com` | 🟡 Descriptive but clunky |
| **ScopeSnap** | `scopesnap.com` | ✅ Good — fast-feeling, memorable |

> **Recommendation: `scopedrop.com`**  
> Register on name.com using your GitHub Student Developer Pack for a free `.me` or discounted `.com`. The `.com` is worth paying for if available — it signals legitimacy to clients who receive your shared brief links.

---

## 6. Tech Stack (24-Hour Build)

### Frontend
- **Next.js 14** (App Router) — or plain React if faster for you
- **Tailwind CSS** — utility-first, fast to style
- **shadcn/ui** — pre-built components (textarea, button, card, badge, tabs)

### Backend / AI
- **Anthropic Claude API** (`claude-sonnet-4-20250514`) — the brief generation engine
- **Next.js API routes** — serverless, no separate backend needed

### Auth
- **Clerk** (free tier) — social login (Google), magic link. No custom auth needed.

### Database
- **Supabase** (free tier) — store user briefs, usage counts, subscription status

### Payments
- **Razorpay** — subscription plans + pay-per-credit. Indian-friendly, great API docs.

### PDF Export
- **`@react-pdf/renderer`** or **`jsPDF`** — client-side PDF generation

### Hosting
- **Vercel** — free tier, perfect for Next.js, instant deploys from GitHub

### Email
- **Resend** (free tier) — send brief via email to client directly from app

---

## 7. Database Schema (Supabase)

```sql
-- Users (handled by Clerk, just sync user_id)
users
  id (uuid, PK)
  clerk_user_id (text, unique)
  email (text)
  plan (text) -- 'free' | 'starter' | 'pro'
  credits_remaining (int)
  created_at (timestamp)

-- Briefs
briefs
  id (uuid, PK)
  user_id (uuid, FK → users)
  raw_input (text)          -- original pasted text
  generated_brief (jsonb)   -- structured output from Claude
  title (text)              -- auto-generated
  client_name (text)
  status (text)             -- 'draft' | 'sent' | 'signed'
  share_token (text, unique)-- for public shareable link
  created_at (timestamp)
  updated_at (timestamp)

-- Payments
payments
  id (uuid, PK)
  user_id (uuid, FK → users)
  razorpay_order_id (text)
  razorpay_payment_id (text)
  plan (text)
  amount (int)              -- in paise
  status (text)             -- 'created' | 'paid' | 'failed'
  created_at (timestamp)
```

---

## 8. Claude API — The Core Prompt

This is the most important part of the build. Get this right and the product works.

```javascript
// lib/generateBrief.js

const SYSTEM_PROMPT = `You are an expert project manager and business consultant. 
Your job is to analyze unstructured client communications and extract structured project information.

You must return ONLY valid JSON — no preamble, no markdown, no explanation.

Return this exact structure:
{
  "projectTitle": "string — inferred project name",
  "clientName": "string — client name if mentioned, else 'Client'",
  "projectSummary": "string — 2-3 sentence summary of what the client wants",
  "objectives": ["string array — 3-5 clear project goals"],
  "scopeIncluded": ["string array — what is explicitly included"],
  "scopeExcluded": ["string array — what is NOT included (infer sensible exclusions)"],
  "assumptions": ["string array — assumptions made due to unclear info"],
  "deliverables": [
    {
      "name": "string",
      "description": "string",
      "format": "string — e.g. PDF, Figma file, live website",
      "duePhase": "string — e.g. Phase 1, Final"
    }
  ],
  "timeline": [
    {
      "milestone": "string",
      "description": "string",
      "estimatedDays": number
    }
  ],
  "paymentTerms": {
    "estimatedBudget": "string — if mentioned, else 'To be discussed'",
    "deposit": "string — e.g. 50% upfront",
    "milestonePayments": ["string array"],
    "finalPayment": "string"
  },
  "nextSteps": ["string array — 2-3 immediate action items"],
  "redFlags": ["string array — ambiguities or missing info that need client clarification"],
  "confidenceScore": number — 0 to 100, how complete the input was
}`;

export async function generateBrief(rawInput) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Here is the client communication to analyze:\n\n${rawInput}`
        }
      ]
    })
  });

  const data = await response.json();
  const text = data.content[0].text;
  
  try {
    return JSON.parse(text);
  } catch {
    const clean = text.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  }
}
```

---

## 9. UI/UX Specification

### Design Language
- **Style:** Clean, minimal, professional. Think Notion meets Linear.
- **Colors:** White background, deep slate (`#0F172A`) for text, electric indigo (`#6366F1`) as accent
- **Font:** Inter (Google Fonts) — clean, modern, reads well in documents
- **Tone:** Confident, no fluff. Every word earns its place.

---

### Page 1: Landing Page (`/`)

**Layout:** Single-scroll, 5 sections

**Hero Section**
```
[NAV: ScopeDrop logo | Features | Pricing | Login | → Get Started free]

H1: "Paste the chaos.
     Get the contract."

Subtext: Turn any client email, WhatsApp thread, or meeting notes into 
a professional brief, scope of work, and payment terms — in 60 seconds.

[Large textarea, placeholder: "Paste your client message here..."]
[Button: → Generate Brief Free]

Social proof: "Trusted by 500+ freelancers" + avatar stack
```

**How It Works Section**
3-step horizontal layout with icons:
1. 📋 **Paste** — Drop in any client message
2. ✨ **Generate** — AI builds your full onboarding pack
3. 📤 **Send & Get Paid** — Export PDF or share link with e-sign

**Before/After Section**
Split screen — left: messy WhatsApp screenshot. Right: clean generated brief. This is the conversion driver.

**Pricing Section** (see Section 11)

**Footer:** Links, Twitter/X, GitHub (if open), contact

---

### Page 2: App Dashboard (`/dashboard`)

**Left Sidebar (200px)**
```
ScopeDrop logo
─────────────
+ New Brief
─────────────
📄 My Briefs
⚙️ Settings
💳 Billing
─────────────
[User avatar]
[Credits: 3 remaining]
```

**Main Area — Brief List**
Cards showing:
- Brief title (auto-generated)
- Client name
- Date created
- Status badge (Draft / Sent / Signed)
- Quick actions: View | Share | Export PDF

---

### Page 3: Generator (`/generate` or modal)

**Step 1: Input**
```
┌─────────────────────────────────────────────────────┐
│  Paste client message, email, or meeting notes       │
│                                                      │
│  [Large textarea — min 200px tall]                   │
│  "Hi I need a website for my restaurant by next      │
│  month. It should have online ordering, menus..."    │
│                                                      │
│  Tip: More context = better brief. Include budget,   │
│  deadline, and goals if mentioned.                   │
│                                                      │
│  [→ Generate Brief]        [Characters: 340]         │
└─────────────────────────────────────────────────────┘
```

**Step 2: Loading State (3–5 seconds)**
```
✨ Reading client intent...
📋 Building scope of work...
📅 Estimating timeline...
💰 Structuring payment terms...
```
Animated progress dots. Do NOT use a spinner — feels cheap.

**Step 3: Output (tabbed view)**

```
[Project: Restaurant Website Redesign]   [Edit Title]
Client: Rahul Sharma · Generated: 29 May 2026

Tabs: [Brief] [Scope] [Timeline] [Payment] [Red Flags]

─── BRIEF TAB ───────────────────────────────────────
Project Summary
Client requires a full restaurant website with online 
ordering system, digital menu, and table reservation 
functionality. Deadline: 30 days.

Objectives
• Increase online orders by enabling direct ordering
• Replace physical menu with updatable digital version  
• Enable table reservations without phone calls

─── SCOPE TAB ───────────────────────────────────────
✅ Included          ❌ Not Included
Website design       Mobile app
Online ordering      POS integration
Menu CMS             Ongoing maintenance

⚠️  Assumptions
• Client provides all food photography
• Hosting costs borne by client

─── TIMELINE TAB ────────────────────────────────────
Week 1  Discovery & Wireframes        ● ─────
Week 2  Design mockups                    ● ──
Week 3  Development                           ●─
Week 4  Testing + Launch                        ●

─── PAYMENT TAB ─────────────────────────────────────
Deposit:     50% upfront    → [Create Razorpay Link]
Milestone 1: 25% on design approval
Final:       25% on launch

─── RED FLAGS ───────────────────────────────────────
⚠️  Budget not mentioned — confirm before proceeding
⚠️  "Next month" is vague — get exact go-live date
⚠️  Online ordering platform not specified (build custom
    or use Zomato/Swiggy integration?)

──────────────────────────────────────────────────────
[✏️ Edit]  [📤 Export PDF]  [📧 Send to Client]  [🔗 Share Link]
[Confidence: 78%  ℹ️]
```

---

### Page 4: Share Link (`/brief/[token]`)

Public-facing, clean read-only view of the brief. Client sees:
- Project title + their name
- All sections in clean card layout
- [✍️ Approve & Sign] button (simple e-sign via email verification)
- [💬 Request Changes] button (opens comment field)

No ScopeDrop branding on Pro plan (white-label).

---

### Page 5: Settings (`/settings`)

- Profile info
- Default payment terms (pre-fill for future briefs)
- Your business name / logo (shown on exported PDFs)
- Notification preferences
- API key if they want to connect to their own tools

---

## 10. Build Steps — Ordered for 24-Hour Sprint

### Hour 0–2: Setup
- [ ] Create Next.js app: `npx create-next-app@latest scopedrop --typescript --tailwind --app`
- [ ] Install deps: `shadcn/ui`, `@clerk/nextjs`, `supabase-js`, `jspdf`, `razorpay`
- [ ] Set up Clerk (auth), Supabase (DB), Vercel project
- [ ] Create `.env.local` with all keys
- [ ] Push to GitHub, connect to Vercel

### Hour 2–5: Core AI Feature
- [ ] Build `lib/generateBrief.js` with Claude API call (use prompt from Section 8)
- [ ] Create API route `/api/generate` — accepts POST with `{rawInput}`, returns JSON brief
- [ ] Test with 5 real messy client message examples (see Section 14)
- [ ] Add error handling + rate limiting (1 request per 10s per user)

### Hour 5–9: Generator UI
- [ ] Build `/generate` page with big textarea input
- [ ] Wire up to `/api/generate`
- [ ] Build tabbed output component (Brief / Scope / Timeline / Payment / Red Flags)
- [ ] Add loading animation with rotating status messages
- [ ] Make each section inline-editable (contentEditable or controlled inputs)

### Hour 9–12: Auth + Save
- [ ] Add Clerk `<SignIn>` and `<SignUp>` flows
- [ ] On generate, if logged in → auto-save to Supabase `briefs` table
- [ ] Build `/dashboard` — list of past briefs as cards
- [ ] Free users: 3 briefs. Track via `credits_remaining` in DB.

### Hour 12–15: Export + Share
- [ ] PDF export using `jsPDF` — render all sections with clean typography
- [ ] Generate share token on save, create `/brief/[token]` public page
- [ ] Add [Send to Client] — email input → Resend API sends link

### Hour 15–18: Payments (Razorpay)
- [ ] Create Razorpay account, get API keys
- [ ] Build `/api/payment/create-order` route
- [ ] Build `/api/payment/verify` route (webhook or frontend verify)
- [ ] Add plan upgrade UI in `/settings/billing`
- [ ] On payment success → update `plan` and `credits_remaining` in Supabase

### Hour 18–21: Landing Page
- [ ] Build `/` with hero, how-it-works, before/after, pricing, footer
- [ ] Add live demo in hero — textarea that actually works, no login required
- [ ] Mobile-responsive (Tailwind makes this easy)

### Hour 21–23: Polish
- [ ] Loading states on all async operations
- [ ] Error messages that make sense ("That message was too short — add more details")
- [ ] Empty states on dashboard
- [ ] SEO meta tags (`<title>`, `<description>`, og:image)
- [ ] Add "Powered by ScopeDrop" footer on free shared links

### Hour 23–24: Ship
- [ ] Test full flow: paste → generate → edit → export PDF → share link
- [ ] Test Razorpay payment end-to-end (use test mode)
- [ ] Push to Vercel, check production build
- [ ] Post to r/freelance with demo video

---

## 11. Monetization Strategy

### Plans (Razorpay Subscriptions)

| Plan | Price | Credits | Features |
|---|---|---|---|
| **Free** | ₹0 | 3 briefs total | Generate, view, copy text |
| **Starter** | ₹299/mo (~$3.50) | 15 briefs/mo | + PDF export, email send |
| **Pro** | ₹799/mo (~$9.50) | Unlimited | + White-label PDF, share links, e-sign, priority AI |
| **Pay-per-Brief** | ₹49/brief | 1 credit | No subscription, just buy what you need |

> **Why lower than your original $19–$49?** India-first pricing. The pain is real here, but $19 is a hard sell in INR. ₹299–799 is the sweet spot for Indian freelancers, and you can raise prices after validation.

### Razorpay Integration

```javascript
// pages/api/payment/create-order.js
import Razorpay from 'razorpay';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export default async function handler(req, res) {
  const { plan } = req.body;
  
  const prices = {
    starter: 29900,   // paise
    pro: 79900,
    credit: 4900,
  };

  const order = await razorpay.orders.create({
    amount: prices[plan],
    currency: 'INR',
    receipt: `receipt_${Date.now()}`,
  });

  res.json({ orderId: order.id, amount: order.amount });
}
```

### Revenue Projections

| Users | Mix | MRR |
|---|---|---|
| 100 users | 60% Starter, 40% Pro | ~₹49,000/mo |
| 500 users | 60% Starter, 40% Pro | ~₹2,40,000/mo |
| 1000 users | Mixed + credits | ~₹5,00,000+/mo |

---

## 12. GTM — Getting First 100 Users (No Ads)

### Week 1: Demo Video First
Record a 60-second Loom:
1. Show a real messy client email (use a fake one)
2. Paste it into ScopeDrop
3. Show the generated brief appearing section by section
4. Export the PDF
5. **Don't narrate. Let the product speak.**

### Posts (same week, different communities)
- **r/freelance:** "I was spending 3+ hours writing client briefs. Built this tool — here's a before/after. Free to try."
- **r/webdesign:** "Quick demo of a tool I built for the proposal problem"
- **IndieHackers:** Full build story post with revenue updates
- **LinkedIn India:** Target "freelance designer", "independent consultant" keywords
- **Fiverr Community Forum:** "How I cut client onboarding from 3 hours to 5 minutes"
- **WhatsApp groups** for Indian freelancers and designers (high ROI, zero cost)

### Hook for virality
Add a "Made with ScopeDrop" badge on free shared links. Every shared brief = an impression.

---

## 13. Environment Variables

```bash
# .env.local

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Razorpay
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_...

# Resend (email)
RESEND_API_KEY=re_...

# App
NEXT_PUBLIC_APP_URL=https://scopedrop.com
```

---

## 14. Test Input Examples (Use These to Test Your Prompt)

**Test 1 — WhatsApp style**
```
hey i need a logo + full branding done for my bakery. we're called 
"Flour & Co". need it asap like by end of this month. budget is around 
15k. colors should be warm, earthy. also need business cards maybe 50 
of them and a menu design for the cafe. let me know
```

**Test 2 — Email style**
```
Hi, I'm reaching out because we need a new e-commerce website built.
We currently use Shopify but want to migrate to a custom solution.
We have about 200 products, need a fast checkout, and want the design
to feel premium. We have a dev team that can help with backend. 
Timeline is flexible but ideally 2-3 months. Budget TBD.
```

**Test 3 — Meeting notes style**
```
Call with Priya from StartupX - 28 May
- Need MVP of their SaaS dashboard by August
- Core features: user auth, analytics charts, CSV export
- Team: 1 designer (them), I handle frontend
- Stack: React + Supabase
- Budget: 80k INR fixed
- Will need 2 rounds of revisions
- They handle hosting
```

---

## 15. Folder Structure

```
scopedrop/
├── app/
│   ├── (auth)/
│   │   ├── sign-in/page.tsx
│   │   └── sign-up/page.tsx
│   ├── (app)/
│   │   ├── dashboard/page.tsx
│   │   ├── generate/page.tsx
│   │   └── settings/page.tsx
│   ├── brief/
│   │   └── [token]/page.tsx        ← Public shareable brief
│   ├── api/
│   │   ├── generate/route.ts       ← Claude API call
│   │   ├── briefs/route.ts         ← CRUD for briefs
│   │   └── payment/
│   │       ├── create-order/route.ts
│   │       └── verify/route.ts
│   ├── layout.tsx
│   └── page.tsx                    ← Landing page
├── components/
│   ├── BriefOutput/
│   │   ├── BriefTab.tsx
│   │   ├── ScopeTab.tsx
│   │   ├── TimelineTab.tsx
│   │   ├── PaymentTab.tsx
│   │   └── RedFlagsTab.tsx
│   ├── GeneratorInput.tsx
│   ├── BriefCard.tsx
│   └── ui/                         ← shadcn components
├── lib/
│   ├── generateBrief.ts            ← Claude prompt + API call
│   ├── supabase.ts
│   ├── exportPDF.ts
│   └── utils.ts
├── types/
│   └── brief.ts                    ← TypeScript types for Brief JSON
└── .env.local
```

---

## 16. TypeScript Types

```typescript
// types/brief.ts

export interface Deliverable {
  name: string;
  description: string;
  format: string;
  duePhase: string;
}

export interface TimelineMilestone {
  milestone: string;
  description: string;
  estimatedDays: number;
}

export interface PaymentTerms {
  estimatedBudget: string;
  deposit: string;
  milestonePayments: string[];
  finalPayment: string;
}

export interface GeneratedBrief {
  projectTitle: string;
  clientName: string;
  projectSummary: string;
  objectives: string[];
  scopeIncluded: string[];
  scopeExcluded: string[];
  assumptions: string[];
  deliverables: Deliverable[];
  timeline: TimelineMilestone[];
  paymentTerms: PaymentTerms;
  nextSteps: string[];
  redFlags: string[];
  confidenceScore: number;
}
```

---

## 17. Launch Checklist

- [ ] Domain registered on name.com
- [ ] Vercel project live at custom domain
- [ ] Clerk auth working (Google login)
- [ ] Supabase DB initialized with schema
- [ ] Claude API key in Vercel env vars
- [ ] Razorpay in test mode → then live mode
- [ ] PDF export working
- [ ] Share link working (public, no auth)
- [ ] Free tier limit enforced (3 briefs)
- [ ] Payment flow tested end-to-end
- [ ] OG image set (for social sharing)
- [ ] Google Analytics / Posthog added
- [ ] Demo video recorded
- [ ] r/freelance post drafted and ready

---

## 18. Things to Build in V2 (Do NOT scope into V1)

- E-sign (use a library like `signature_pad` later)
- Invoice generation with Razorpay payment link embedded in brief
- Client portal (client logs in to view/approve briefs)
- Multi-language support
- Team/agency accounts
- CRM integrations (HubSpot, Notion)
- Brief templates by industry
- AI follow-up email drafts
- Stripe for non-India markets

---

*Built with Claude API · Hosted on Vercel · Payments by Razorpay*  
*Document version: May 29, 2026*
