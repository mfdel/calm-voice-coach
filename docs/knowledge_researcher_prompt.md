# ParentPilot — Knowledge Base Researcher Guide

## What Is ParentPilot?

ParentPilot is an AI-powered SOS parenting coach for parents of children aged 0–10. When a child has a meltdown, refuses to eat, won’t go to bed, or any of a dozen high-stress behavioral moments, the parent taps a button on their phone. Within seconds, the app delivers 2–3 short, actionable suggestions and a ready-to-say script — grounded in their specific child’s age, known triggers, and the parenting values they’ve set up.

**The app is not a generic chatbot.** Before the AI generates anything, it runs a retrieval pipeline: it pulls the most relevant parenting strategies from a curated database, filters them against the parent’s red lines (tactics they’ve explicitly forbidden — e.g. no time-outs, no yelling), ranks them by how well they match the child’s age and triggers, and feeds them to the LLM as evidence. The LLM’s job is then to adapt that evidence into language this specific parent can use right now.

That curated database is what you are building.

---

## Why This Work Matters

The quality of the retrieval database is the biggest lever on the app’s usefulness. Without good knowledge content:
- The LLM has no evidence to ground its advice and may hallucinate plausible-sounding but incorrect guidance
- Suggestions won’t adapt to different parenting styles or child ages
- Red-line enforcement becomes less reliable

Your goal: populate a library of practical, evidence-backed parenting strategies across all 15 problem categories and all 4 age bands, covering at least 3 parenting styles per scenario.

---

## The Two Tables You Are Populating

### Table 1: `knowledge_articles`

One article = one problem type in one or more age bands. Think of this as a structured encyclopedia entry.

| Column | Type | Rules |
|--------|------|-------|
| `problem_category` | text | **Must be one of the 15 codes listed below.** |
| `title` | text | 5–10 words. Neutral, descriptive. E.g. "Bedtime Power Struggles in Toddlers" |
| `age_groups` | JSON array | One or more of: `"infant"`, `"toddler"`, `"preschool"`, `"school_age"` |
| `description` | text | 2–4 sentences. What is happening developmentally? Why does this behaviour occur at this age? No advice here — just context. |
| `editorial_status` | text | Set to `"draft"` when you submit. Reviewer will change to `"reviewed"` then `"published"`. |
| `source_notes` | text | Full citation: author, title, year, publisher or URL. Required. |

**One article per problem + age band cluster.** If a strategy applies differently to toddlers vs. school-age children, create two articles. If the behaviour and approach are essentially the same across toddler and preschool, one article with `["toddler", "preschool"]` is fine.

---

### Table 2: `knowledge_snippets`

One snippet = one specific tactic or script that lives under an article. This is what the app actually retrieves and shows to parents. Each article should have **4–8 snippets**.

| Column | Type | Rules |
|--------|------|-------|
| `article_id` | UUID | The ID of the parent `knowledge_article`. |
| `snippet_type` | text | One of: `"explanation"`, `"strategy"`, `"script"`, `"warning"` — see definitions below |
| `title` | text | 4–8 words. A crisp label for the tactic. E.g. "Offer two bounded choices" |
| `content` | text | The full guidance text. See length rules per type below. |
| `applicable_triggers` | JSON array | Which triggers make this snippet more relevant. Choose from the 9 trigger tags. |
| `blocked_by_red_lines` | JSON array | If recommending this tactic conflicts with a red line, list those codes here. Critical for safety. |
| `success_signals` | JSON array | 1–3 short phrases describing what it looks like when this works. E.g. `["child accepts choice", "power struggle ends"]` |
| `weight` | number | Default `1.0`. Use `1.5` for strongly evidence-backed tactics. Use `0.7` for tactics that work but have mixed evidence. |

---

## Snippet Types — Definitions and Length Rules

| Type | Purpose | Length |
|------|---------|--------|
| `explanation` | Why the child is behaving this way right now. Written for a stressed parent who needs quick context, not a lecture. | 2–3 sentences |
| `strategy` | A concrete action the parent can take. Behavioural, step-by-step. | 2–4 sentences |
| `script` | Exact words the parent can say aloud within the next 60 seconds. Must sound like a real human, not a textbook. | 1–3 sentences, ≤ 30 words per sentence |
| `warning` | A common mistake to avoid for this scenario, often linked to a red line. | 1–2 sentences |

**The most valuable snippet type is `script`.** Parents in crisis can’t improvise empathetic language. A good script is the heart of this knowledge base.

---

## Parenting Styles — Cover All Three

The app supports three parenting styles. For each scenario, aim to include at least one strategy/script calibrated to each:

| Style code | Philosophy | What this looks like in a script |
|------------|------------ |----------------------------------|
| `gentle` | Connection before correction. Child’s feelings are always validated first. Natural consequences over punishment. | "I can see you’re really upset. I’m here with you." |
| `structured` | Predictable routines and clear, consistent limits. Calm authority; consequences are explained in advance. | "We always brush teeth before bed. That’s our rule. Let’s do it together." |
| `balanced` | Empathy first, then a boundary. Acknowledges feelings AND holds the limit. | "I hear that you don’t want to stop. It’s hard. AND it’s time to go." |

You do not need to add a `parenting_style` column — the content itself should reflect the style. The LLM will choose the snippet that fits the family’s declared style based on content. Write strategy and script snippets with the style clearly embedded in the language and tone.

---

## Valid Values Reference

### Problem Categories (15)

| Code | Label |
|------|-------|
| `bedtime_resistance` | Bedtime resistance |
| `meal_refusal` | Won’t eat / food refusal |
| `morning_routine` | Morning routine meltdown |
| `sibling_conflict` | Sibling conflict |
| `transition_meltdown` | Transition meltdown |
| `dressing_refusal` | Refuses to get dressed |
| `public_tantrum` | Public tantrum |
| `screen_time_battle` | Screen time battle |
| `homework_resistance` | Homework resistance |
| `bath_time_refusal` | Bath time refusal |
| `sharing_conflict` | Won’t share |
| `separation_anxiety` | Separation anxiety |
| `hitting_aggression` | Hitting / aggression |
| `whining_crying` | Constant whining / crying |
| `cleanup_refusal` | Won’t clean up |

### Age Groups (4)

| Value | Age range |
|-------|-----------|
| `infant` | 0–1 years |
| `toddler` | 1–3 years |
| `preschool` | 3–5 years |
| `school_age` | 5–10 years |

### Applicable Triggers (9)

Use lowercase versions of these in the JSON array:

```
"transitions", "fatigue", "hunger", "loud noises", "new environments",
"sharing toys", "schedule changes", "sensory overload", "sibling conflict"
```

### Red-Line Codes (8)

A snippet should be listed in `blocked_by_red_lines` if following the tactic would require the parent to use one of these methods:

| Code | What it covers |
|------|---------------|
| `cry_it_out` | Extinction sleep methods, Ferber, letting child cry without response |
| `time_outs` | Sending child to a separate space as punishment, naughty step/chair |
| `physical_punishment` | Any spanking, smacking, hitting, or physical force as discipline |
| `yelling` | Raising voice in anger, shouting at the child |
| `screen_bribery` | Offering screen time as a behavioural reward or bribe |
| `food_rewards` | Using food, candy, or treats as a behavioural reward |
| `shame_language` | Labelling the child as "bad", "naughty"; "What’s wrong with you?"; "Why can’t you be normal?" |
| `comparison` | "Your sister doesn’t do this"; "Other kids your age can handle this" |

**Important:** `blocked_by_red_lines` is a safety filter. If you are unsure whether a tactic triggers a red line, err on the side of including the code. A snippet incorrectly blocked is invisible to some parents; a snippet incorrectly shown to parents who prohibit that method undermines their trust.

---

## Worked Example

### Article row

```
problem_category: "bedtime_resistance"
title: "Bedtime Power Struggles in Toddlers"
age_groups: ["toddler", "preschool"]
description: "Toddlers resist bedtime because their growing autonomy drive conflicts with an adult-imposed transition. At this age, the brain does not yet have reliable self-regulation, so fatigue itself amplifies protest behaviour. Bedtime resistance is rarely defiance — it is almost always a child whose nervous system is overwhelmed and who lacks the language to say so."
editorial_status: "draft"
source_notes: "Lansbury, J. (2014). No Bad Kids: Toddler Discipline Without Shame. JLML Press. | Mindell, J.A. et al. (2015). Pediatric sleep disorders. Pediatric Clinics of North America, 48(4), 977-1000."
```

### Snippet rows (under the article above)

**Snippet 1 — explanation**
```
snippet_type: "explanation"
title: "Why toddlers resist bedtime"
content: "Toddlers experience bedtime as a loss of connection and control. Their frontal lobe — the part that manages transitions — is immature, so the shift from play to sleep feels abrupt and alarming. Overtired children are paradoxically harder to settle because cortisol levels rise when they push past their sleep window."
applicable_triggers: ["transitions", "fatigue"]
blocked_by_red_lines: []
success_signals: ["parent feels less frustrated", "child’s behaviour reframed"]
weight: 1.0
```

**Snippet 2 — strategy (gentle style)**
```
snippet_type: "strategy"
title: "Wind-down connection ritual"
content: "15 minutes before bed, dim the lights and shift to calm, one-on-one connection: one short book, one song, one moment of physical closeness. This signals safety, not loss. The transition becomes ‘getting closer to you’ rather than ‘being left alone’."
applicable_triggers: ["transitions", "fatigue"]
blocked_by_red_lines: []
success_signals: ["child settles with less protest", "bedtime routine becomes predictable"]
weight: 1.5
```

**Snippet 3 — strategy (structured style)**
```
snippet_type: "strategy"
title: "Visual bedtime chart"
content: "Create a 4-step visual bedtime sequence (bath, teeth, story, lights out) and post it where the child can see it. Each night, the chart — not the parent — is the authority. ‘What’s next on our chart?’ shifts the power dynamic from child vs. parent to child + parent vs. the chart."
applicable_triggers: ["transitions", "schedule changes"]
blocked_by_red_lines: []
success_signals: ["child follows sequence with less negotiation", "parent feels less like the ‘bad guy’"]
weight: 1.5
```

**Snippet 4 — script (gentle style)**
```
snippet_type: "script"
title: "Validate and stay close"
content: "I know you don’t want to stop playing. That makes sense — you were having so much fun. I’m going to stay right here with you while we get ready for bed."
applicable_triggers: ["transitions", "fatigue"]
blocked_by_red_lines: []
success_signals: ["child protest reduces", "child feels heard"]
weight: 1.0
```

**Snippet 5 — script (structured style)**
```
snippet_type: "script"
title: "State the rule, offer small choice"
content: "It’s bedtime. That’s our family rule. Do you want to walk to your room, or should I carry you?"
applicable_triggers: ["transitions"]
blocked_by_red_lines: []
success_signals: ["child chooses rather than protests", "transition completes faster"]
weight: 1.0
```

**Snippet 6 — warning**
```
snippet_type: "warning"
title: "Avoid negotiating after lights out"
content: "Once the routine begins, avoid re-entering for non-urgent reasons or extending requests for ‘one more’ of anything — this teaches the child that protest gets results. Consistency over several nights is what changes the pattern."
applicable_triggers: ["transitions", "fatigue"]
blocked_by_red_lines: []
success_signals: []
weight: 0.7
```

---

## Quality Bar

Before submitting any snippet, check it against these questions:

1. **Is it immediately actionable?** A parent holding a screaming toddler must be able to use this in the next 60 seconds.
2. **Is every script word-for-word speakable?** Read it aloud. Does it sound like something a real, stressed, caring adult would say?
3. **Is the style clearly embedded?** Gentle scripts lead with feelings. Structured scripts lead with the rule or routine. You should be able to tell which is which just by reading the content.
4. **Is the red-line tagging honest?** If the strategy involves any form of the 8 red-line methods, even softened, tag it.
5. **Is the trigger match genuine?** Only list a trigger if the snippet is materially more useful when that trigger is present.
6. **Is the source credible?** Primary sources: peer-reviewed research (AAP, pediatric sleep, developmental psychology journals). Secondary: established practitioner authors (see recommended sources below). Avoid generic parenting blogs.

---

## Recommended Sources

**Books / Practitioners**
- Janet Lansbury — RIE approach; *Elevating Child Care*, *No Bad Kids*
- Dr. Becky Kennedy — Good Inside framework; *Good Inside* (2022)
- Daniel Siegel & Tina Payne Bryson — *The Whole-Brain Child*, *No-Drama Discipline*
- Laura Markham — Peaceful Parenting; *Peaceful Parent, Happy Kids*
- Ross Greene — Collaborative Problem Solving; *The Explosive Child*
- Stuart Shanker — Self-Reg framework; *Self-Reg* (2016)

**Research / Clinical**
- American Academy of Pediatrics (healthychildren.org) — clinical guidelines
- Zero to Three (zerotothree.org) — infant/toddler development
- CDC Developmental Milestones
- Pediatric sleep research: Mindell & Owens (2015), Sadeh (2011)
- Emotion coaching research: Gottman & DeClaire (1997)

---

## Submission Format

Submit your collected data as a CSV file with the following column headers. Use one sheet for articles and one for snippets, or clearly label them.

**Articles sheet columns:**
```
problem_category | title | age_groups | description | source_notes
```

**Snippets sheet columns:**
```
article_title | problem_category | snippet_type | title | content | applicable_triggers | blocked_by_red_lines | success_signals | weight
```

(Use `article_title` rather than `article_id` — the engineer will link them after import.)

For JSON array fields (`age_groups`, `applicable_triggers`, `blocked_by_red_lines`, `success_signals`), write values comma-separated inside square brackets: `["toddler","preschool"]`. If empty: `[]`.

---

## Priority Order

Work in this order to maximise early coverage:

1. **Tier 1 — Highest frequency** (every parent hits these weekly):
   `bedtime_resistance`, `meal_refusal`, `morning_routine`, `transition_meltdown`, `whining_crying`

2. **Tier 2 — High frequency** (at least several times per week for many parents):
   `public_tantrum`, `screen_time_battle`, `hitting_aggression`, `sibling_conflict`, `separation_anxiety`

3. **Tier 3 — Moderate frequency**:
   `dressing_refusal`, `bath_time_refusal`, `sharing_conflict`, `cleanup_refusal`, `homework_resistance`

For each category, cover **all four age groups** before moving to the next tier. An article with 0 snippets is useless; a single age group fully covered is immediately useful.

---

## Questions?

Contact the product team. When in doubt: shorter scripts, more words in the parent’s voice, harder red-line tagging.
