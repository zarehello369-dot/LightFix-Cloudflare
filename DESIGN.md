---
name: LightFix
description: A Thai-first coordination centre for streetlight reporting and repair.
colors:
  deep: "#143f46"
  deep-hover: "#1e535b"
  ink: "#142e32"
  muted: "#52676b"
  gold: "#f1c62b"
  gold-soft: "#fff3bd"
  surface: "#ffffff"
  page: "#eff4f1"
  line: "#cbdad5"
  green: "#176851"
  blue: "#205e72"
  red: "#9c3c2e"
  control-line: "#768d89"
  selected-line: "#806100"
typography:
  wordmark:
    fontFamily: "Urbanist, PlexThai, Noto Sans Thai, sans-serif"
    fontSize: "1.55rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-.035em"
  display:
    fontFamily: "PlexThai, Noto Sans Thai, sans-serif"
    fontSize: "clamp(1.8rem, 7vw, 2.55rem)"
    fontWeight: 700
    lineHeight: 1.24
    letterSpacing: "-.025em"
  headline:
    fontFamily: "PlexThai, Noto Sans Thai, sans-serif"
    fontSize: "1.45rem"
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
  panel: "16px"
  pill: "999px"
spacing:
  compact: "8px"
  field-gap: "20px"
  mobile-gutter: "16px"
  tablet-gutter: "24px"
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
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "9px 16px"
    height: "48px"
  field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 13px"
    height: "48px"
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
---

# Design System: LightFix

## Overview

**Creative North Star: “ศูนย์ประสานงาน” (Coordination Centre).** One visual grammar connects a numbered streetlight, its status, and the next action across resident, technician, and administrator journeys. The public form remains the quickest route to submit a report.

A deep teal command header anchors pale green-gray working space and white records. Yellow identifies the outline bulb, role context, selected controls, and primary actions. “LightFix” is separate Urbanist text, never part of the bulb artwork. Thai interface copy uses self-hosted IBM Plex Sans Thai.

**Key Characteristics:**

- Pole identifiers and readable status words lead each record.
- The first phone viewport starts the current task immediately.
- Shared cards and controls connect public and staff surfaces.
- Layout grows into two columns at tablet width and a staff rail at desktop width.

## Colors

### Primary

- **Command Teal** (`#143f46`): header, route panel, dark action; `#1e535b` on hover.
- **Action Yellow** (`#f1c62b`): bulb outline, role pill, primary buttons and route numbers.
- **Soft Yellow** (`#fff3bd`): selected symptom, switch and navigation states.

### Secondary

- **Green** (`#176851`): focus and success; **Blue** (`#205e72`): work in progress; **Red** (`#9c3c2e`): errors and danger actions. Status badges pair color with words.

### Neutral

- **Ink** (`#142e32`) and **Muted** (`#52676b`): main and supporting text.
- **Page** (`#eff4f1`), **Surface** (`#ffffff`), and **Line** (`#cbdad5`): canvas, records and boundaries.
- **Control Line** (`#768d89`) and **Selected Line** (`#806100`): field borders and selected controls.

**The Selective Yellow Rule.** Use yellow to mark the brand and a clear next action, rather than coloring routine copy.

## Typography

**Wordmark:** Self-hosted Urbanist variable, 800 weight, separate from the bulb; 1.55rem on phones and 1.75rem from 900px. **Interface:** Self-hosted IBM Plex Sans Thai (PlexThai), with Noto Sans Thai and sans-serif fallbacks.

Preload the regular and bold Thai faces and the Urbanist wordmark. Font faces use `font-display: optional`: slow first visits retain a readable fallback instead of swapping text metrics after the page is already being read. Warm visits use the cached custom faces.

- **Display:** Bold page titles, `clamp(1.8rem, 7vw, 2.55rem)` on phones, 2.35rem from 640px, with a 1.24 line height.
- **Headline:** Bold section titles around 1.45rem; staff titles respond to context.
- **Body:** 16px / 1.6; introductory copy stays near 58ch on the report surface.
- **Label:** Bold, approximately .96rem. Pole numbers and metric counts are prominent; counts use tabular numerals.

**The Identifier First Rule.** Make the pole number and status easy to find before secondary detail.

## Layout

The shell tops out at 1200px. Side gutters are 16px on phones, 24px from 640px, and 28px from 900px. The public report starts directly on the page ground without a large enclosing white form card. Pole input precedes symptom choices; its primary submit button fills the phone width.

Below 900px, the deep teal header is compact and the public and staff areas use fixed, white bottom navigation with safe-area padding. Staff navigation opens as an overlay with direct buttons grouped by task; it has no native view select. Below 640px, form selects present a short choice sheet while retaining the native select as the form value. At 640px, report fields and supporting details gain columns, the submit button returns to intrinsic width, and the three metrics align in one row. From 768px through 899px, the public report and help form a two-column layout and staff work cards form a two-column grid. At 900px, header links become inline, bottom navigation disappears, the public route/help panel sits beside the form, and a 220px sticky staff rail appears. From 1100px, conventional staff table rows replace labeled cards and work cards use two columns.

## Elevation & Depth

Tonal layering and borders organize resting content. The shared shadow token is `0 12px 32px rgba(20,63,70,.12)`; menu, toast, hover, and dialog treatments carry transient depth. The bottom bar casts a soft upward shadow; the staff rail is a bordered white panel at desktop width. Reduced-motion preference removes spatial movement while preserving visible state and a static loading marker.

## Shapes

Buttons, fields, symptom choices and disclosures use 12px corners. Panels, records, work cards and dialogs use 16px corners. Role and status labels are pill-shaped. The bulb remains an outlined symbol, route steps are numbered circles, and empty states have a dashed boundary.

## Components

### Buttons and fields

Primary buttons have a yellow fill, dark bold text, a minimum 48px height and a brighter hover state. Dark buttons use command teal; outline controls have a visible gray-green stroke; danger buttons are red. Active buttons compress slightly. Inputs, selects and textareas use 12px corners, a visible border, green focus ring and text errors. Phone choice sheets use the same yellow selected state and restore focus to their trigger. The pole input remains 58px high. Selected symptoms use soft yellow and a stronger border.

### Records and work cards

White 16px panels sit on the pale ground. Pole cards lead with the pole number, status, location and symptoms, then show instructions and evidence. Status badges always contain a word. Staff actions sit on the relevant pole card; disclosures hold additional contact and photo evidence. Preserve the established reporting, drafts, conflict recovery, and management behavior described in PRODUCT.md.

### Navigation

The deep teal header contains the yellow outline bulb, separate Urbanist wordmark and menu at narrow widths. Public and staff fixed bottom navigation expose the current destination with soft yellow. At 900px, header links and the staff rail replace those bars. Route help uses a dark teal panel with yellow step circles.

### Motion and feedback

The focal moment is a signal becoming a report: the three report information markers fill as the user supplies the required fields; after a committed submission, the outline bulb draws and lights once over 620ms. These markers describe supplied information, not separate wizard pages or server validation. Submission and focus never wait for an animation.

The shared header stays in reach while scrolling. Crossing 24px settles it into an inset, rounded deep-teal bar over 320ms; scrolling back restores the full-width header. Reduced Motion keeps the inset state without the spatial transition. Menus and choice/work dialogs settle from their anchor in 140–220ms, with native focus and Escape behavior unchanged. Local records appear with an 8px, 260ms settle when they enter the viewport; each record runs once and list staggering is capped at 100ms. Initially visible content is not held back. Staff tab headings acknowledge the change locally, while controls respond in 140–220ms and disclosures unfold over 200ms. Photo preview retains its 180ms fade. Interrupted Web Animations are canceled before replay, and active animations are canceled when the page is hidden or Reduce Motion is enabled. Reduced motion keeps short color/opacity feedback, skips spatial entrances and bulb strokes, retains completed markers and the static success bulb, and replaces the loading spinner with a static dot. No decorative loop runs on idle screens.

Page text has one rendered layer. Do not crossfade old and new document snapshots or animate the whole main text region during font loading. Keep motion on local controls, photo feedback and the committed success state.

## Do's and Don'ts

### Do:

- **Do** put the pole number and current status before secondary record details.
- **Do** keep the first public action visible early and use one clear yellow submit action.
- **Do** label progress, selections, errors, and status in words as well as color.
- **Do** keep the outline bulb and Urbanist wordmark as separate elements.

### Don't:

- **Don't** merge “LightFix” into the bulb artwork or fill the bulb symbol.
- **Don't** return to a white header or a large framed form that delays the first task.
- **Don't** make mobile data depend on an unlabeled wide table.

