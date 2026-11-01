---
name: LightFix
description: Mobile-first streetlight reporting and repair tracking with an outline bulb mark.
colors:
  ink: "#182b2d"
  muted: "#526267"
  gold: "#e9b915"
  gold-soft: "#fff3bb"
  surface: "#ffffff"
  page: "#f5f7f3"
  line: "#d9e1dc"
  green: "#176851"
  red: "#9c3c2e"
  blue: "#205e72"
  bulb-stroke: "#b58a00"
typography:
  display:
    fontFamily: "PlexThai, Noto Sans Thai, sans-serif"
    fontSize: "2rem"
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
    fontWeight: 600
rounded:
  control: "10px"
  record: "12px"
  panel: "14px"
  feature: "16px"
  pill: "999px"
spacing:
  compact: "8px"
  field-gap: "16px"
  mobile-gutter: "16px"
  tablet-gutter: "24px"
  desktop-gutter: "28px"
components:
  button-primary:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "9px 16px"
    height: "46px"
  button-outline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "9px 16px"
    height: "46px"
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

**Creative North Star: "The Clear Repair Path"**

LightFix puts the resident's next action and each repair status in plain view. White working surfaces, a pale green canvas, dark text, and measured gold accents support quick reporting on a phone and dense staff work on larger screens.

The only logo symbol is a yellow outline lightbulb. The LightFix name is separate text in the header and elsewhere; do not combine it with the mark into logo artwork. Thai-first labels, visible status words, and familiar controls carry the experience.

**Key Characteristics:**

- A single-column reporting flow at phone width, with the pole number first.
- White header and surfaces over a pale green canvas; gold marks primary actions and selected controls.
- Textual status badges and compact, readable records.
- Staff navigation as a select on mobile and a rail from desktop width.

## Colors

Gold is a selective action and brand cue. Green communicates focus and completed work; blue communicates work in progress; red identifies errors and danger.

### Primary

- **Gold:** Primary actions and route step numbers.
- **Gold Soft:** Selected symptom controls and active staff navigation.
- **Bulb Stroke:** The outline bulb mark in the header and favicon.
- **Ink:** Main text, dark buttons, and toast background.

### Secondary

- **Green:** Focus outlines, successful notes, and completed states.
- **Blue:** In-progress status treatment.
- **Red:** Required indicators, field errors, and danger actions.

### Neutral

- **Page:** Main canvas.
- **Surface:** Header, forms, panels, and record cards.
- **Muted:** Supporting copy and field notes.
- **Line:** Dividers and resting card boundaries.

**The Selective Gold Rule.** Reserve gold for the brand mark, primary action, selected control, and small progress cues; keep routine copy in ink.

## Typography

**Display Font:** IBM Plex Sans Thai with Noto Sans Thai and sans-serif fallbacks.
**Body Font:** The same family and fallbacks.

**Character:** Direct Thai labels and bold identifiers support quick scanning. Counts use tabular figures to stay aligned.

### Hierarchy

- **Display:** Bold page title, starting at 2rem on phones and rising to 2.55rem at 640px and 2.8rem at 900px.
- **Headline:** Bold section heading at 1.45rem; staff section headings are more compact.
- **Body:** Regular 16px text with 1.6 leading; introductory copy is limited to about 65ch.
- **Label:** Semibold .96rem for fields and controls.
- **Pole number:** Bold, uppercase input at 1.65rem; dashboard numbers use tabular figures.

**The Identifier First Rule.** Make the pole number and status easy to find before secondary detail.

## Layout

Start with a single column. The centered shell is at most 1200px wide, with 16px side gutters on phones, 24px from 640px, and 28px from 900px. The public report form, route panel, status views, staff workspace, and table rows begin as stacked content.

At 640px, the form gains two columns, symptoms become wrapping choices, detail and photo pairs gain columns, and staff forms gain two columns. From 640px through 1099px, staff table records form a two-column card grid. At 900px, the public form and route panel become two columns; the route panel is sticky, the global menu becomes inline navigation, and staff navigation becomes a left rail. At 1100px, staff tables change from labeled cards to conventional table rows, the staff rail widens, and report spacing grows.

On phones, the global menu opens beneath the header while a direct tracking link stays visible. Staff choose views from a labeled select. Mobile table cards carry visible per-cell labels, and actions wrap. The three metric tiles remain side by side and permit their labels to wrap. A narrow-width adjustment at 390px reduces header and metric text slightly.

## Elevation & Depth

Borders and surface contrast do most of the work. A soft shadow appears on record hover, the mobile menu, toasts, success panels, and dialogs; the main report form stays flat. Buttons gain a modest shadow on hover without moving.

### Shadow Vocabulary

- **Soft surface:** `0 10px 30px rgba(24,43,45,.08)` for records on hover, menu, toast, and success panel.
- **Button hover:** `0 4px 14px rgba(24,43,45,.10)`.
- **Dialog:** `0 24px 70px rgba(0,0,0,.24)`.

**The Flat Workspace Rule.** Use lines and white surfaces to organize routine work; apply shadows to transient or interactive states.

## Shapes

Controls use gentle 10px corners, record cards 12px, panels 14px, and the public report form 16px. Status badges are rounded pills with a dot and a word. Route steps are numbered circles. Empty states use a dashed border. Before and after photos crop to a 4:3 frame.

## Components

### Buttons

- **Primary:** Gold fill, dark bold label, 46px minimum height, and a subtle shadow on hover.
- **Outline, dark, ghost, danger:** Share the same 10px geometry. Outline uses a visible muted border; dark uses ink fill; ghost is transparent; danger uses red.
- **Focus and disabled:** A 3px green focus outline with 3px offset. Disabled buttons dim and keep their position. Reduced-motion preference removes transitions.

### Inputs / Fields

- **Style:** White fill, visible gray-green stroke, 10px corners, and 48px minimum height. The pole field is 58px high.
- **Focus and error:** Green border and a translucent green ring on focus; red border and text error on invalid fields.
- **Symptoms:** Two-column phone grid with 54px-high choices; at 640px they wrap in a row. Selected choices use pale gold fill and a stronger gold stroke.
- **Upload:** Pale surface with a bordered button, filename text, and visible keyboard focus.

### Cards / Containers

- **Report form:** White, thin line, 16px corners, and padding that grows at 640px, 900px, and 1100px.
- **Panel and record:** White, thin line, rounded corners. Records lift on hover; regular panels stay flat.
- **Staff table:** Labeled cards below 1100px, two columns from 640px, and a full table at 1100px.
- **Admin management:** Keep add, edit, password reset, and delete actions beside the relevant record. Destructive actions use the red button and a typed pole number or username confirmation. Records tied to reports or jobs show a deactivation path instead of delete; one-time temporary passwords remain visible until the admin closes their dialog.

### Navigation

- **Global:** White header with a linked outline bulb, separate LightFix text, direct tracking link, and menu button on mobile. The menu becomes inline at 900px.
- **Staff:** Labeled view select below 900px; a sticky, text-labeled rail at 900px and above. Current views have a pale gold background.

### Status and route

- **Badges:** Dot plus readable word; waiting, in progress, done, and canceled each have a separate tonal background.
- **Route:** Dark teal panel with numbered gold circles. On desktop it sits beside the form; on mobile it follows the form.

## Do's and Don'ts

### Do:

- **Do** place the pole number first in the public report flow and use one clear gold submit action.
- **Do** keep status words visible alongside status color.
- **Do** use the yellow outline bulb as the sole logo symbol and render LightFix as separate text.
- **Do** keep staff controls usable in labeled mobile cards and a compact desktop table.

### Don't:

- **Don't** merge the word LightFix into the bulb logo artwork or replace the outline bulb with a filled mark.
- **Don't** rely on color alone for progress, selection, or errors.
- **Don't** make mobile data depend on an unlabeled wide table.

