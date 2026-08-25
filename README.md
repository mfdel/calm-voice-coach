# ParentPilot (Calm Voice Coach) 🧭

> **Instant, non-judgmental, and style-aligned AI coaching for parents during high-stress moments.**

[![Live Demo](https://img.shields.io/badge/Live_App-kindguide.lovable.app-4F46E5?style=for-the-badge&logo=react)](https://kindguide.lovable.app/)
[![GitHub Repo](https://img.shields.io/badge/GitHub-mfdel%2Fcalm--voice--coach-181717?style=for-the-badge&logo=github)](https://github.com/mfdel/calm-voice-coach)
[![Tech Stack](https://img.shields.io/badge/Stack-React_•_TypeScript_•_Tailwind_•_Supabase-38B2AC?style=for-the-badge)](https://github.com/mfdel/calm-voice-coach)

---

## 🌟 Live Demo & Test Access

* **Live Web Application:** [https://kindguide.lovable.app/](https://kindguide.lovable.app/)
* **Demo Test Credentials for Reviewers:**
  * **Email:** `test@gmail.com`
  * **Password:** `test.password`

---

## 1. Product Overview & Executive Summary

**ParentPilot** is an intelligent parenting co-pilot engineered to deliver grounded, immediate de-escalation guidance when children experience meltdowns, mealtime resistance, bedtime battles, or transition anxiety.

Unlike generic chatbot wrappers, ParentPilot combines **curated behavioral strategies**, **child-specific developmental context**, **strict parenting "Red Lines"**, and **prior incident history** using Retrieval-Augmented Generation (RAG). It provides parents with actionable, 1-handed scripts in **under 5 seconds** during high-stress scenarios.

```
                  ┌──────────────────────────────────────────────────────────┐
                  │                 HIGH-STRESS TRIGGER                      │
                  │   Child tantrum, screaming, refusal to get dressed       │
                  └────────────────────────────┬─────────────────────────────┘
                                               │
                                               ▼
                  ┌──────────────────────────────────────────────────────────┐
                  │                   1-TAP SOS MODE                         │
                  │   One-handed UI, large-target preset selection           │
                  └────────────────────────────┬─────────────────────────────┘
                                               │
                        ┌──────────────────────┴──────────────────────┐
                        │ Context & Retrieval Engine                  │
                        ├─────────────────────────────────────────────┤
                        │ • Child Profile & Stage (Age, Triggers)     │
                        │ • Family Values & Communication Style       │
                        │ • "Red Lines" Filter (Forbidden tactics)    │
                        │ • Curated RAG Parenting Knowledge Base      │
                        │ • Historical Incident Success / Feedback    │
                        └──────────────────────┬──────────────────────┘
                                               │
                                               ▼
                  ┌──────────────────────────────────────────────────────────┐
                  │                 GROUNDED ACTION SCRIPT                   │
                  │   Massive high-contrast text, 2-3 calm phrases,          │
                  │   grounded physical cues (< 5s response time)            │
                  └────────────────────────────┬─────────────────────────────┘
                                               │
                                               ▼
                  ┌──────────────────────────────────────────────────────────┐
                  │               EVENING DEBRIEF & RECALIBRATE              │
                  │   Parent feedback loop continuously optimizes advice     │
                  └──────────────────────────────────────────────────────────┘
```

---

## 2. Target Audience

* **Primary:** Parents of toddlers and school-aged children (ages 1–10) navigating emotional dysregulation, defiance, sensory overload, and developmental transitions.
* **Secondary:** Nannies, grandparents, and co-parents requiring uniform consistency with household parenting philosophies.

---

## 3. Core Capabilities & Functional Specifications

### 🚨 1. The "SOS Mode" (Core De-escalation Engine)
* **Instant Activation:** Fast access designed for urgent situations while holding or attending to a dysregulated child.
* **Rapid Context Capture:** Select from common presets (*Mealtime Refusal*, *Bedtime Resistance*, *Sibling Conflict*, *Transition Meltdowns*, *Sensory Overload*) with optional voice or typed notes.
* **One-Handed Ergonomics & Big Text Display:** Large-button layout in the bottom third of the screen, displaying oversized, high-contrast text scripts readable from arm's length.

### 🛡️ 2. Quality Control: The "Red Lines" Safety Engine
* **Strict Constraint Enforcement:** During onboarding, parents define non-negotiable boundaries they **never** want suggested (e.g., *"No cry-it-out"*, *"No time-outs"*, *"No physical discipline"*, *"No empty threats"*).
* **Pre-Render Safety Pass:** Every AI-generated response is validated against the family's active Red Lines before being displayed.

### 🧠 3. Grounded Retrieval-Augmented Generation (RAG)
* **Domain Knowledge Base:** Indexed repository of evidence-based gentle parenting strategies and de-escalation frameworks.
* **Multi-Factor Prompt Assembly:** Synthesizes child age, specific triggers, household communication tone, and past incident ratings to eliminate generic or repetitive advice.

### 👤 4. Longitudinal Child & Household Profile
* **Developmental Markers:** Tracks age, sensory triggers, transition sensitivities, and soothing preferences.
* **Coaching Preferences:** Adapts tone to Authoritative, Gentle/Respectful, or Playful framing based on parental style.

### 🌙 5. Retrospective "Nightly Debrief" & Feedback Loop
* **Low-Pressure Review:** Evening summary displaying daily incidents for reflection.
* **"Reject & Recalibrate":** Allows parents to rate or reject specific suggestions, feeding negative and positive reinforcement back into the prompt ranking engine for continuous personalization.

---

## 4. Product Roadmap: v1 MVP vs. Long-Term Vision

| Feature Category | **v1 (Current Web App & Spec)** | **Long-Term Evolution** |
|---|---|---|
| **Activation** | Manual 1-tap SOS trigger via web & mobile UI | Lock-screen widgets, smartwatch complication |
| **Input** | Problem picker presets + typed notes / voice note | Ambient audio detection, video situational context |
| **Output** | High-contrast Big Text scripts + calming pacing | Earbud "Whisper Mode" audio coaching |
| **Intelligence** | Structured prompt assembly + RAG retrieval | On-device private SLM / edge reasoning |
| **Knowledge Layer** | Curated behavioral scenarios & strategies | Predictive meltdown forecasting from time/trigger logs |
| **Collaboration** | Single-household profile & incident history | "Village Sync" multi-caregiver alignment (nannies/grandparents) |

---

## 5. User Journey: The "Meltdown to Mastery" Loop

| Stage | 1. The Trigger | 2. SOS Activation | 3. Rapid Context Capture | 4. Grounded Coaching | 5. Nightly Debrief |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **User Action** | Child escalates (e.g., throwing shoes). Parent feels elevated stress. | Parent opens app with one hand. | Taps preset category (*Transitions / Refusal*) and adds brief context. | Reads large script aloud. Child feels validated; tension eases. | Evening review: marks whether the script succeeded. |
| **System Flow** | System stands by (no passive listening). | App opens instantly to SOS composer. | Fetches child profile, red lines, and matching RAG knowledge snippets. | Delivers bounded, style-aligned 3-sentence script in < 5s. | Logs feedback into incident history to fine-tune future rankings. |
| **Emotional State** | 😫 Overwhelmed | 🏃‍♀️ Focused | 🧘‍♀️ Grounded | 😌 Empowered | 🤔 Reflective & Confident |
| **Pain Solved** | Inability to think clearly under stress. | Fumbling through long menus or complex apps. | Generic AI giving irrelevant or forbidden advice. | Long walls of text impossible to read during a crisis. | Lingering parental guilt after challenging moments. |

---

## 6. Privacy & Trust Architecture ("The Trust Fortress")

* **Explicit Triggering Only:** Zero ambient or passive listening. The system only processes data when deliberately initiated by the parent.
* **Data Minimization:** Audio recordings are transcribed ephemerally and discarded immediately after processing.
* **Encrypted Context Storage:** Child profiles, parent preferences, and incident histories are encrypted at rest and in transit.

---

## 7. Technology Stack

* **Frontend Framework:** React 18 with TypeScript
* **Build Tooling:** Vite
* **Component System:** shadcn-ui + Radix UI primitives
* **Styling:** Tailwind CSS with custom responsive tokens
* **State & Backend:** Supabase (Auth, Postgres, Realtime storage)
* **Application Platform:** Engineered and deployed via Lovable

---

## 8. Local Development & Setup

### Prerequisites
* [Node.js](https://nodejs.org/) (v18+ recommended)
* `npm` or `bun`

### Installation & Run

```bash
# 1. Clone the repository
git clone https://github.com/mfdel/calm-voice-coach.git
cd calm-voice-coach

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev
```

Visit `http://localhost:5173` to interact with the application locally.

### Available Scripts

* `npm run dev` — Launch Vite local development server with HMR.
* `npm run build` — Compile TypeScript and generate production bundle.
* `npm run preview` — Locally preview the production build.
* `npm run lint` — Run ESLint across codebase.

---

## 9. Comprehensive Product Documentation

For deep dives into data schemas, prompt architectures, and UX evaluations, inspect the detailed specifications in `docs/parentpilot/`:

* [`docs/parentpilot/parenting.md`](docs/parentpilot/parenting.md) — Comprehensive Product Requirements Document (PRD).
* [`docs/parentpilot/V1_SYSTEM_DESIGN.md`](docs/parentpilot/V1_SYSTEM_DESIGN.md) — API schemas, endpoint specs, and architecture flows.
* [`docs/parentpilot/V1_DATA_MODEL.md`](docs/parentpilot/V1_DATA_MODEL.md) — Relational Postgres database design & pgvector indexing.
* [`docs/parentpilot/V1_PROMPT_RAG_STRATEGY.md`](docs/parentpilot/V1_PROMPT_RAG_STRATEGY.md) — Prompt templates, safety filters, and retrieval ranking logic.
* [`docs/parentpilot/V1_UX_IMPROVEMENTS.md`](docs/parentpilot/V1_UX_IMPROVEMENTS.md) — Ergonomics, high-stress visual hierarchy, and one-handed interactions.

---

## 📄 License

MIT License. Designed and built by [M. Fuat Deligoz](https://github.com/mfdel).
