---
name: LightFix
description: A Thai-first coordination centre for streetlight reporting and repair.
colors:
  deep: "#0e3b42"
  deep-hover: "#1e535b"
  ink: "#182d31"
  muted: "#4e656a"
  gold: "#f6c72c"
  gold-soft: "#fff3bd"
  surface: "#ffffff"
  page: "#f4f6ef"
  line: "#ced9d4"
  green: "#176851"
  blue: "#205e72"
  red: "#9c3c2e"
  control-line: "#768d89"
  selected-line: "#806100"
  pending: "#ffe4c7"
  pending-ink: "#854100"
  complete: "#dceee5"
  complete-ink: "#205a45"
  working: "#dceafa"
  working-ink: "#155786"
  subtle: "#e6ebe3"
typography:
  wordmark:
    fontFamily: "Urbanist, PlexThai, Noto Sans Thai, sans-serif"
    fontSize: "1.55rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-.035em"
  display:
    fontFamily: "PlexThai, Noto Sans Thai, sans-serif"
    fontSize: "2.1rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-.02em"
  headline:
    fontFamily: "PlexThai, Noto Sans Thai, sans-serif"
    fontSize: "1.28rem"
    fontWeight: 700
    lineHeight: 1.35
  body:
    fontFamily: "PlexThai, Noto Sans Thai, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "PlexThai, Noto Sans Thai, sans-serif"
    fontSize: ".96rem"
    fontWeight: 700
rounded:
  control: "12px"
  field: "14px"
  summary: "20px"
  panel: "18px"
  pill: "999px"
spacing:
  compact: "8px"
  field-gap: "24px"
  mobile-gutter: "20px"
  desktop-gutter: "28px"
components:
  button-primary:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "9px 16px"
    height: "48px"
  button-outline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.deep}"
    rounded: "{rounded.control}"
    padding: "9px 16px"
    height: "48px"
  field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "10px 13px"
    height: "56px"
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
  segmented-selected:
    backgroundColor: "{colors.deep}"
    textColor: "{colors.surface}"
    rounded: "13px"
    height: "48px"
  status-pending:
    backgroundColor: "{colors.pending}"
    textColor: "{colors.pending-ink}"
    rounded: "{rounded.pill}"
    padding: "6px 12px"
  status-working:
    backgroundColor: "{colors.working}"
    textColor: "{colors.working-ink}"
    rounded: "{rounded.pill}"
    padding: "6px 12px"
  status-complete:
    backgroundColor: "{colors.complete}"
    textColor: "{colors.complete-ink}"
    rounded: "{rounded.pill}"
    padding: "6px 12px"
---

# Design System: LightFix

## Overview

**Creative North Star: “ศูนย์ประสานงาน” (Coordination Centre).** A calm Thai-first workspace connects a numbered streetlight, readable repair status, and the next action. The eight user-supplied mobile mockups received 10 November 2026 are the visual authority for reporting, My Work, available work, pending management, pole registry, pole detail, repair history and accounts. Desktop expands their hierarchy into useful columns.

Deep teal headings and header anchor a warm pale working ground. White rounded records, generous fields, orange waiting states, mint completed states and blue active states support quick scanning. Yellow remains the brand and primary-action cue. Original interface fonts, animation behavior, functions and data are binding preservation constraints. The user-approved logo update of 10 November supersedes the earlier bulb/wordmark.

**Key Characteristics:**

- Pole identity and status precede secondary detail.
- The phone viewport begins the task directly.
- Segmented switches use a deep teal selected segment.
- Desktop adds room for side-by-side records and a docked pole reader.

## Colors

### Primary

- **Command Teal:** header, titles, selected segments, numbered form circles and dark controls.
- **Action Yellow:** outline bulb, role context and primary submission; soft yellow marks selected ordinary symptoms.

### Secondary

- **Pending Orange:** waiting badges, pending complaint counts and waiting summaries.
- **Complete Mint:** completed repair counts and success badges.
- **Working Blue:** in-progress badges and active-work summaries.
- **Focus Green:** keyboard focus and success feedback. **Error Red:** validation and danger actions; hazardous symptoms receive a red border and pale red surface.

### Neutral

- **Ink** and **Muted:** main text and supporting details.
- **Working Ground**, **White Surface** and **Record Line:** page, records and dividers.
- **Subtle Ground:** segmented-switch tracks, footer and mobile report summary.
- **Control Line** and **Selected Line:** retained base control and selected-symptom strokes; reference-styled fields use a gray-green stroke, strengthened to teal for pole entry/search.

**The Status Words Rule.** Pair status color with readable words or an explicit count label; do not rely on color alone.

## Typography


**Wordmark:** User-approved lowercase `lightfix`, self-hosted Nunito variable at 750 weight, with white `light` and gold `fix` (#d4aa00). Live HTML text remains separate from the inline SVG white location pin and gold outline bulb; 1.8–1.95rem on phones and 2.2rem from 900px. **Interface:** Self-hosted IBM Plex Sans Thai (PlexThai), with Noto Sans Thai and sans-serif fallbacks.

Preload the regular and bold Thai faces and the Nunito wordmark. Font faces use `font-display: optional`: slow first visits retain a readable fallback instead of swapping text metrics after the page is already being read. Warm visits use the cached custom faces.

- **Display:** Bold page titles, 2.1rem with a 1.3 line height; public reporting uses 2rem on phones and 2.5rem from 900px.
- **Headline:** Bold section titles around 1.25–1.4rem; staff titles respond to context.
- **Body:** 16px / 1.6; introductory copy stays near 58ch on the report surface.
- **Label:** Bold, approximately .96rem. Pole numbers and metric counts are prominent; counts use tabular numerals.

**The Identifier First Rule.** Make the pole number and status easy to find before secondary detail.

## Layout

The shared shell is at most 1200px wide, with 20px side gutters below 900px and 28px above. The header is 64px tall on phones and 76px on desktop; its menu control remains present at both sizes. Staff work uses the existing desktop rail from 900px. Page content generally starts 30px below the header.

Public reporting stays a single-column four-section form on phones, with two-column ordinary symptom choices, full-width hazardous/other options, two photo-source buttons and a full-width yellow submit action. Four 6px completeness bars sit under the introduction. From 900px, a sticky white report overview sits beside the form, replacing the inline mobile summary; help sits at the upper right.

Pole registry rows share one white list surface with dividers, pole identity at left and vertically stacked orange/mint count pills at right. Below 1100px, selection opens a full-area reader with a back control that preserves list context. From 1100px, list and sticky reader sit side by side. The reader has three segmented tabs, two summary tiles and a registry disclosure. Repair-history cards and account cards become two-column grids from 900px. Account actions wrap within each card. Staff overview uses two colored metric tiles and a full-width neutral total tile.

## Elevation & Depth

Resting records, work cards and panels are flat, outlined white surfaces. Tonal backgrounds and thin dividers do most of the grouping. The retained shared shadow is `0 12px 32px rgba(20,63,70,.12)` for transient surfaces and record hover feedback; menus, toasts and dialogs keep their established depth. Avoid adding decorative elevation to the reference cards.

## Shapes

Standard buttons use 12px corners, fields and ordinary symptom choices 14px, and panels, records, work cards, history cards and account cards 18px. Summary/empty-state shapes use 18–20px corners. Status labels and count chips are pills. Segmented tracks have 18px corners, 4px inner padding and 13px selected segments. Form section numbers are 28px deep teal circles. Photo upload has a dashed outline and 16px corners; empty states also have dashed boundaries.

## Components

### Buttons and fields

Primary actions use yellow with dark bold text; outline actions use teal text and stroke on white. Standard buttons are at least 48px tall, compact actions at least 44px. The report submit action is 60px tall with 16px corners. Inputs, selects and textareas have a 56px minimum height; pole entry is bold and uppercase with a stronger teal stroke. Preserve visible focus, error copy, native form semantics and phone choice-sheet behavior.

### Report sections and completeness

Each of the four section labels begins with a teal numbered circle. Four slim bars indicate supplied information and readiness, with teal completed segments and accessible textual state. They do not represent wizard pages. Ordinary symptom cards use white backgrounds and soft-yellow selection; the hazardous symptom spans the form width with explicit red warning text. Photo privacy copy, callback reveal, preview/removal, validation, summary and successful submission remain functional.

### Work, history and account records

White outlined cards lead with pole identity and readable status. Symptoms, location, instructions, contact/photo disclosures and relevant role-scoped actions retain their behavior. History cards put completion status opposite the date, then use labeled divider rows and photo actions. Account cards use labeled rows with status and role, followed by wrapping management controls. Empty work lists use a spacious dashed panel with contextual actions.

### Segmented switches and summaries

My Work uses two equal segments with counts; pole detail uses three. The selected segment is deep teal with white text on a subtle neutral track. Orange waiting and blue working metric tiles use matching dark text. Pole summaries use mint completed and orange pending tiles. Counts use tabular numerals and explain whether they count poles, complaints or repairs.

### Navigation

Use the approved white location pin with gold outline bulb beside the lowercase Nunito lightfix wordmark. The deep teal header has a right-aligned rounded menu button and an anchored teal menu. Public navigation, authenticated destinations, role indicators and sign-out retain their existing access and behavior; staff desktop navigation also uses the established rail. The pale footer uses teal links.

### Motion and feedback


The focal moment is a signal becoming a report: the four slim report completeness segments fill as the user supplies the required fields; after a committed submission, the outline bulb draws and lights once over 620ms. These segments describe supplied information, not separate wizard pages or server validation. Submission and focus never wait for an animation.

The shared header stays in reach while scrolling. Crossing 24px settles it into an inset, rounded deep-teal bar over 320ms; scrolling back restores the full-width header. Reduced Motion keeps the inset state without the spatial transition. Menus and choice/work dialogs settle from their anchor in 140–220ms, with native focus and Escape behavior unchanged. Local records appear with an 8px, 260ms settle when they enter the viewport; each record runs once and list staggering is capped at 100ms. Initially visible content is not held back. Staff tab headings acknowledge the change locally, while controls respond in 140–220ms and disclosures unfold over 200ms. Photo preview retains its 180ms fade. Interrupted Web Animations are canceled before replay, and active animations are canceled when the page is hidden or Reduce Motion is enabled. Reduced motion keeps short color/opacity feedback, skips spatial entrances and bulb strokes, retains completed segments and the static success bulb, and replaces the loading spinner with a static dot. No decorative loop runs on idle screens.

Page text has one rendered layer. Do not crossfade old and new document snapshots or animate the whole main text region during font loading. Keep motion on local controls, photo feedback and the committed success state.

## Do's and Don'ts

### Do:

- **Do** use the eight supplied mobile mockups as visual authority and adapt their hierarchy to desktop.
- **Do** preserve the original font files, separate bulb/wordmark, animations and reduced-motion behavior.
- **Do** retain every existing function and data path while styling records, tabs and forms.
- **Do** keep status words and labels visible alongside color.

### Don't:

- **Don't** replace the original typefaces or redraw the logo as combined artwork.
- **Don't** restore the superseded square yellow form badges, yellow pending counts or pale-yellow selected work segments.
- **Don't** make mobile records depend on an unlabeled wide table or use the supplied mockups as fixed desktop-width canvases.


## Approved logo — 10 November 2026

User screenshot is authoritative for the new logo: white outlined location pin, gold bulb, lowercase white light and gold fix. Implement with inline SVG paths and live HTML text, never a screenshot or raster image. Only the logo font changes; Thai interface typography, motion and workflow remain intact. The favicon uses the same vector symbol.
