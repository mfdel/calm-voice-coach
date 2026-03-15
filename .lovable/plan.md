

# SOS Result Page — Restructure to Per-Tip Layout

## Current Structure
The result view shows:
1. All suggestion cards (title + reason) grouped together
2. One prominent "SAY THIS" block (only first suggestion's script)
3. Summary text
4. Safety note

## New Structure
Each suggestion becomes a self-contained card with three sections in order:
1. **Title** (short, bold)
2. **Explanation** (the `reason` field)
3. **"Say this"** script (the `script` field, per suggestion)

Then after all cards: summary and safety note remain as-is.

## Changes

**File:** `src/pages/SOSModePage.tsx` (lines ~448–475)

- Replace the two separate blocks (action cards loop + single bestScript block) with a single loop over `suggestions`
- Each card renders: title → reason → script (if present)
- Remove the `bestScript` variable and its standalone block
- Keep all existing motion/animation, className styling, and other visual elements unchanged
- Summary and safety note blocks remain untouched

