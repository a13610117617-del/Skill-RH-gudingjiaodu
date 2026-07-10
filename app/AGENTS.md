# Design Constraints

This project is a local Skill Runner interface. All UI work must preserve the provided reference direction: a dark, cinematic software panel with a bright acid-lime action system.

## Visual System

- Use a full-viewport charcoal software shell with no outer light background or floating page card.
- The left panel is the lighter planning/status surface with an acid-lime header area and pale lower content.
- The right panel is the near-black working surface for forms, confirmations, and next actions.
- Primary color is acid lime (`#dfff00` or close). Use it for primary actions, active states, progress, and important chips.
- Use restrained neutral colors: black, off-white, graphite, muted gray. Do not turn the app into a colorful dashboard.
- Typography should feel editorial and minimal: large light-weight headings, compact labels, no negative letter spacing.

## Components

- The skill selector must be a searchable/select-style control and be visible before starting a run.
- Use pill buttons for selectable options, thin underline inputs for text fields, and compact confirmation cards.
- Do not nest cards inside cards. The main shell can contain panels; repeated items can be small cards or rows.
- Icons may be used for utility controls, but do not replace important workflow labels with unexplained icons.
- Generated image previews must appear in a stable grid with fixed aspect ratios so the layout does not jump.

## Workflow

- The interface is conversational from top to bottom: each step appears as a message, confirmation block, or result block.
- Every major step must require explicit confirmation in the UI before moving forward.
- The UI must expose which Skill and which references are being used.
- API keys are never shown raw after saving; show masked status only.

## Responsive Rules

- Desktop uses two columns inside the main shell.
- Narrow screens stack the panels vertically.
- Text, chips, buttons, inputs, and image previews must not overflow their containers.

## Avoid

- No marketing landing page.
- No generic light SaaS admin look.
- No decorative gradient orbs, bokeh blobs, or SVG hero illustrations.
- No card-heavy page sections outside repeated items or confirmation blocks.
