---
name: LightFix
description: Clear streetlight reporting and repair progress in a road-sign visual language.
colors:
  road-ink: "#17252b"
  sign-yellow: "#f4c928"
  road-cream: "#f6f2e7"
  card-white: "#fffdf8"
  muted-ink: "#53636a"
  line: "#cbd1ca"
  progress-green: "#277a64"
  danger-red: "#a43f31"
  progress-blue: "#21596e"
typography:
  display:
    fontFamily: "PlexThai, Noto Sans Thai, sans-serif"
    fontSize: "clamp(2rem, 5vw, 3.6rem)"
    fontWeight: 700
    lineHeight: 1.19
    letterSpacing: "-.025em"
  headline:
    fontFamily: "PlexThai, Noto Sans Thai, sans-serif"
    fontSize: "clamp(1.45rem, 3vw, 2.1rem)"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-.02em"
  body:
    fontFamily: "PlexThai, Noto Sans Thai, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "PlexThai, Noto Sans Thai, sans-serif"
    fontSize: ".96rem"
    fontWeight: 600
rounded:
  field: "9px"
  button: "9px"
  record: "11px"
  panel: "14px"
  feature: "16px"
  pill: "999px"
spacing:
  compact: "8px"
  field-gap: "18px"
  panel: "24px"
  section: "32px"
components:
  button-primary:
    backgroundColor: "{colors.sign-yellow}"
    textColor: "{colors.road-ink}"
    rounded: "{rounded.button}"
    padding: "9px 18px"
    height: "47px"
  button-dark:
    backgroundColor: "{colors.road-ink}"
    textColor: "{colors.card-white}"
    rounded: "{rounded.button}"
    padding: "9px 18px"
    height: "47px"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.road-ink}"
    rounded: "{rounded.button}"
    padding: "9px 18px"
    height: "47px"
  field:
    backgroundColor: "#ffffff"
    textColor: "{colors.road-ink}"
    rounded: "{rounded.field}"
    padding: "10px 13px"
    height: "48px"
  panel:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.road-ink}"
    rounded: "{rounded.panel}"
    padding: "{spacing.panel}"
---

# Design System: LightFix

## Overview

**Creative North Star: "The Repair Route"**

The selected road-sign and road-line direction makes each report feel like a short, legible route from a numbered pole to a finished repair. The visual language pairs high-contrast road ink with warm light surfaces and restrained sign yellow. A lightbulb mark remains the brand anchor.

The public form gives the pole number the strongest field treatment and pairs it with a dark three-step route panel. Staff screens use the same palette at a denser pace: rail navigation, thin dividers, compact metrics, rows, and status pills keep work scannable.

**Key Characteristics:**

- Thai-first IBM Plex Sans Thai with large, clear pole numbers and tabular numeric status data.
- Yellow reserved for brand, main actions, active tabs, and route markings.
- Cream canvas, off-white working surfaces, dark ink, and status colors with textual labels.
- Dashed road markings and numbered route circles used as recurring cues.

## Colors

Sign yellow is the action and wayfinding accent. Road ink carries navigation, headings, and the route panel; soft neutrals keep forms and records calm.

### Primary

- **Sign Yellow:** Brand bulb, main actions, active tab underline, and dashed route markings.
- **Road Ink:** Header, route panel, headings, and selected symptom controls.

### Secondary

- **Progress Green:** Focus outlines, timeline markers, and completed work.
- **Progress Blue:** In-progress information and status treatment.
- **Danger Red:** Required and error cues and destructive action.

### Neutral

- **Road Cream:** Page canvas.
- **Card White:** Reporting card, panels, dialogs, and record rows.
- **Muted Ink:** Supporting copy, dates, field notes, and table headings.
- **Line:** Quiet panel and row boundaries.

**The Sign Accent Rule.** Yellow identifies a route or a primary action; keep ordinary body text in road ink.

## Typography

**Display Font:** IBM Plex Sans Thai, with Noto Sans Thai and sans-serif fallbacks.
**Body Font:** The same family and fallbacks.

**Character:** Bold, plainly legible Thai headings sit over relaxed body copy. Pole identifiers and dashboard counts use tabular figures so changing numbers stay aligned.

### Hierarchy

- **Display:** Bold, responsive large size and tight leading for page headings.
- **Headline:** Bold, smaller responsive size for section headings.
- **Body:** Regular weight with generous leading for explanations and forms; short introductions stay near 60 characters wide.
- **Label:** Semibold, compact size for field labels and controls.
- **Pole number:** Bold, large field text (2.05rem on desktop; 1.75rem on narrow screens) with slight positive tracking.

**The Number First Rule.** Give pole identifiers and status counts immediate visual priority before decorative road cues.

## Layout

The shared shell is centered at a 1240px maximum with 28px side padding, reducing to 20px at 900px and 16px at 640px. The public report hero is a two-column grid: a wider form and a narrower route panel separated by 32px. At 900px it becomes one column; at 640px form fields also stack and the header navigation becomes a menu.

The staff workspace uses a 210px rail and a flexible content column with a 30px gap. At 900px the rail moves above content; at 640px its buttons form a compact grid. Metrics use three columns. Records, tables, and forms favor visible labels and thin separators. At 640px, records reflow and before/after photos stack. Status text remains visible alongside color.

## Elevation & Depth

The system uses borders and tonal contrast for most separation. A soft shadow lifts the main public report card and transient overlays. Record hover and buttons gain a smaller lift; the staff workspace remains mostly flat.

### Shadow Vocabulary

- **Feature card and overlay:** `0 12px 32px rgba(23,37,43,.12)`.
- **Record hover:** `0 6px 20px rgba(23,37,43,.08)`.
- **Button hover:** `0 7px 18px rgba(23,37,43,.14)`.
- **Dialog:** `0 25px 70px rgba(0,0,0,.3)`.

**The Quiet Workspace Rule.** Use lines and surface color to separate routine staff data; reserve lifting shadows for prominent or interactive surfaces.

## Shapes

Forms and controls have gently rounded corners; records and panels are slightly broader, and feature surfaces are broadest. Status badges are full pills with a colored dot. The route uses circular step numbers and dashed yellow lines. A dashed border also marks the upload field and empty states. Photo pairs share a 4:3 image frame.

## Components

### Buttons

- **Primary:** Sign-yellow fill, road-ink text, bold label, 47px minimum height, and a subtle lift on hover.
- **Dark, outline, ghost, danger:** Shared button geometry. Dark reverses to ink and white; outline uses a visible muted border; ghost is transparent; danger uses the red alert color.
- **Focus:** Shared 3px green visible outline with 3px offset. Disabled controls dim and hold their position.

### Inputs / Fields

- **Style:** White fill, gray stroke, 9px rounding, and 48px minimum height. Pole input is 70px high with enlarged uppercase characters.
- **Focus:** Green border and translucent green ring. Error fields turn red and retain a textual error line.
- **Symptom choices:** Bordered rectangular radio chips become dark and white when selected; keyboard focus stays visible.

### Cards / Containers

- **Report card:** Off-white feature surface, thin border, 16px corners, generous responsive padding, and the feature shadow.
- **Staff panel:** Off-white, thin border, 14px corners, 24px padding on desktop and 16px on mobile.
- **Record:** Off-white bordered row with 11px corners; its hover state adds a green border and modest lift.

### Navigation

- **Global:** Dark ink header with bulb mark, light links, and a yellow staff entry. On narrow screens, a menu button reveals stacked links.
- **Staff:** Text rail with a warm highlighted current page. At narrower widths it moves above the work area and becomes a button grid.

### Status badges and route

- **Badges:** Compact rounded pills with a dot and a readable status word; waiting, doing, done, and canceled each have distinct soft backgrounds.
- **Route:** Dark panel with three numbered yellow circles and a dashed yellow line. The route motif also appears as a short divider beneath the report timeline.

## Do's and Don'ts

### Do:

- **Do** lead a public reporting flow with the pole number and one clear yellow submit action.
- **Do** keep status words visible with their colored dots.
- **Do** preserve the lightbulb, sign yellow, and dashed route cue across public and staff surfaces.
- **Do** keep staff data compact enough to scan while retaining readable labels on mobile.

### Don't:

- **Don't** spread warning colors or dashed markings across routine content; the selected direction treats them as purposeful cues.
- **Don't** rely on color alone for progress, selection, or errors.
- **Don't** replace clear pole and status labels with decorative road graphics.
