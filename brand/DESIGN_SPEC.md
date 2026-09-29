# Ridgeline / visual identity 1.2

## 1. Brand definition

Performance training for mountain athletes. The product should make the next training decision obvious: what to do, how much, when to rest, and what to record. The experience is precise, composed, capable and encouraging. The mountain connection lives in the logo, occasional landscape imagery and useful training context.

Brand expression: measured energy. Warm neutrals create a calm base; orange supplies a focused point of attention; teal organizes time and supporting information. Avoid a survival-equipment aesthetic, distressed lettering, aggressive slogans, noisy texture and excessive sci-fi styling.

Existing descriptive line: "Strength for mountain athletes." Use on brand/marketing materials when relevant, not repeatedly inside workouts. Product copy should acknowledge endurance and durability where appropriate rather than implying strength is the only discipline.

## 2. Logo system

Canonical geometry is `source/logo-geometry.json`. The SVG, PDF and EPS marks are generated from those identical commands. Do not trace a PNG or re-create the mark in CSS.

The rounded R retains the reference character. The lower mountain is a closed six-point polygon: one straight rising edge, a single apex, one straight descending edge, two horizontal feet and a clean inner notch. Its outer slopes mirror around x=266. The inner slopes are almost parallel to their corresponding outer slopes, with approximately 69 units of perpendicular body weight. The R's top band is 66 units. This close visual weight is intentional; do not make all measurements mechanically identical at the expense of the rounded R.

The climber is a separate 64-unit-diameter circle, center (158,180). Its position is above the rising left slope. Preserve its separation and circular shape. It is not a sun or a removable decoration.

Mark artboard: 532 x 385. Painted bounds: x=40..492, y=40..345. Built-in padding is 40 units at each extreme. Standard clear space: at least one dot diameter (64 units) from painted bounds to unrelated content; add layout padding beyond the file's built-in padding. The horizontal lockup intentionally uses its own internal mark-to-type relationship; external clear space still applies.

Use orange on light or dark plain surfaces. Use charcoal for a one-color light-background reproduction; white for a one-color dark-background reproduction. Never outline the logo, add shadows, split its colors, fill it with topographic lines, or crop its dot. Do not use a gradient or redraw an apex rounding.

Practical size targets: standalone mark at least 24px painted width for routine UI, preferably 32px or more. At 16px use only the supplied favicon and inspect it at actual size; the dot will necessarily be small. Horizontal lockup target minimum 180px width; use mark-only below that rather than making the wordmark unreadable. Validate physical print at the intended size rather than assuming a screen minimum applies.

App icon: square 1024 x 1024 master, orange mark, opaque charcoal or off-white background. No baked-in corner rounding; the platform applies its mask. The mark occupies about 64% of the square width and is optically raised slightly. The PNG is opaque RGB. Smaller icon previews are QA aids, not an exhaustive Apple/Android delivery manifest.

Wordmark: RIDGELINE in Michroma Regular, .10em tracking, outlined. It is a new proposed v1 wordmark, not an assertion of the original generated image's exact font. Use the supplied paths rather than synthetic bolding. Horizontal light and dark lockups are included. The wordmark remains secondary to product readability.

## 3. Color roles

Canonical values live in `tokens/ridgeline.tokens.json`; CSS names use the `--rl-` prefix. Light is the default visual reference. Dark has a dedicated map; never merely invert the light screen.

| Token | Light | Role |
|---|---|---|
| bg | #F7F5F0 | Main reading surface |
| surface | #FFFFFF | Elevated grouped work and fields |
| surface-subtle | #EFEBE4 | Secondary neutral areas |
| text | #1C2628 | Headings, exercise names and prescriptions |
| text-secondary | #5E696B | Supporting prose; darkened slightly from the initial recommendation to work on subtle surfaces |
| border | #D8D3CB | Decorative dividers; not a sufficient input boundary by itself |
| control-border | #7A8586 | Editable field boundary |
| brand / action | #EB4817 | Logo, main action and selected calendar date |
| on-action | #111718 | Text on orange; use this near-black, not the slightly lighter primary text token |
| action-hover | #F65B2E | Hover on filled primary action |
| action-pressed | #FF7047 | Pressed fill; retains dark-label contrast |
| accent-text | #B73610 | Small orange text on light surfaces |
| accent-soft | #FCE6DE | Small supporting orange surface |
| info | #4E8A94 | Dusty teal accent, non-text graphics |
| info-text | #35636B | Readable timing and interval information |
| info-soft | #E6EFF0 | Timing/preparation background |
| focus | #35636B | Visible keyboard focus |

Approximate visual balance on workout screens: at least 85-90% neutral surface area; colored information and actions occupy a small fraction. This is a composition guide, not a pixel quota. Do not force orange and teal to equal prominence. One dominant orange action per visible task area; a selected calendar day may coexist with it.

Teal organizes section structure and timing information. A plain teal label is not automatically a link. Links need an underline or another persistent action cue. Orange is not an error state. Success, warning and error have their own semantic pairs and explicit text/icons. Never assign arbitrary colors to warm-up, strength and conditioning.

Use `qa/contrast.json` for measured token pairs. Bright orange and dusty teal are not small-text colors on white/off-white. Light theme deep teal on pale teal is approximately 5.71:1. Contrast applies to the rendered pair, including opacity, images, blending and hover state; the palette check is not full application accessibility certification.

## 4. Typography

Inter is the UI family, with system-ui / SF / Segoe UI fallback. Michroma appears only in the supplied brand wordmark. Use Inter tabular numerals for timers, dates and aligned measurements (`font-variant-numeric: tabular-nums`). Do not apply monospace to long instructions.

| Role | Size / line height | Weight |
|---|---|---|
| Display | 32 / 38px | 650 |
| Session/page title | 30 / 36px | 700 |
| Section heading | 20 / 26px | 650; deep teal on pale teal band |
| Exercise name | 18 / 24px | 600 |
| Body / prescription | 16 / 24px | 400; 600 for key values |
| Label | 14 / 20px | 600 |
| Supporting caption | 14 / 20px | 400 |
| Prominent time structure | 32 / 38px | 650, tabular |

Body copy uses sentence case. Keep uppercase to the wordmark and short, rare metadata labels. Do not letter-space long section headings or use tiny uppercase instructions. Input text is at least 16px. Support OS/browser text scaling; no fixed heights on content cards. Keep prose lines to roughly 45-70 characters on larger screens.

## 5. Layout and hierarchy

Use a 4px spacing base: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64. Default mobile gutter 20px; 16px at very narrow widths. Reading column max 720px; wider desktop space may support existing navigation or a contextual summary, not stretched workout lines.

Section separation 32px; section heading to content 16px; exercise name to prescription 4px; related exercise rows 20-24px apart. Card padding 16-20px. Interactive controls at least 44 x 44 CSS pixels; main button height 48px. Use 8px control radius, 12px cards, 16px dialogs. Reserve pill radius for compact status/timing badges. No clipped corners in routine UI; the logo already supplies angular identity.

Use three levels of containment: the page, a related workout group, then plain exercise rows. Avoid card-in-card-in-card composition. Main workout sections stay open on the page, introduced by a pale-teal heading band. One shared surface contains exercises that belong to the same circuit or timed interval. Optional notes are subordinate and close to the movement they explain.

Sticky workout chrome must remain compact and have scroll padding so focused content is not hidden. Use a flat opaque header with a quiet divider, not a large gradient shadow. Respect safe-area insets on devices. Do not add a large branded hero above every session.

## 6. Component rules

PRODUCT_REQUIREMENTS.md adds binding v1.2 behavior: all weighted exercises get adjacent lb/kg entry; published sessions can be performed out of planned-date order; runs and weight sets have no timer. Static interval and rest structure remains visible. Optional WOD timing is deferred.


Primary button: orange fill, near-black semibold text, 48px minimum height, 8px radius. Hover/press use the provided lighter fills. Focus uses a 3px ring plus a 3px surface gap. Secondary action: neutral surface with visible boundary and charcoal text. Text action: underlined or clearly button-shaped; at least 44px effective hit area. Destructive action uses semantic error colors with a confirmation only when the product warrants it.

Calendar: 44px day targets. At 320px use 4px gaps and 16px page gutters; if seven columns cannot maintain targets, switch to a compact week scroller with explicit accessible navigation rather than shrinking buttons. Selected day has orange fill, dark number and aria-selected/pressed. Today has an outline and accessible current-date label; complete has a check. Completion and selection can coexist. Future unavailable days must be explicitly described, not merely faded.

Workout header: date, session title, duration/context. Avoid unexplained TRT as the primary label; use "45 min" or "Estimated duration" when appropriate. Keep existing domain terms where users rely on them, but define unfamiliar abbreviations on first use.

Exercise row: movement name, then prescription, then optional technique note. Keep units with values. Use a stable start-time column only within clock-managed blocks; do not add empty time columns everywhere. Long names wrap. Do not truncate the only copy of an exercise prescription.

Interval card: neutral surface, quiet boundary, pale-teal timing header. "Every 2:30 / 5 sets" describes the group. Exercises remain charcoal. Rest is a deep-teal line, not a stack of oversized colored pills. No permanent orange rail on every training card. Orange may identify a currently running action if accompanied by a label.

Logging: persistent field labels and units; field boundary uses control-border, not decorative border. Show previous values as contextual text, never as placeholder-only labels. Invalid entries have inline explanation and error icon/text; preserve the entered value. Save confirmation occurs only after persistence succeeds.

Disclosure: use a real details/summary or an accessible button with expanded state. "Alternative exercise" is usually clearer than "Fallback." Collapse optional detail, never required technique or safety guidance. Keep rest times and prescriptions visible.

States: loading uses a stable neutral placeholder and text where necessary; never endless decorative shimmer. Empty states explain the next useful action. Disabled controls use explicit disabled semantics; keep their label legible where possible. Errors say what happened and how to recover. Offline behavior must reflect the actual app's data guarantees. Do not invent sync or backup promises.

## 7. Iconography, graphics, imagery and motion

UI icons: a consistent rounded-stroke family, 20px nominal size and approximately 1.75px stroke; 24px where needed. Use a familiar library already in the app. Pair unfamiliar icons with visible labels. Logo paths are not part of the UI icon stroke system.

Supporting terrain artwork is optional. Use the supplied nested topographic contour field in brand covers, onboarding or a program header. The earlier angular ridge illustration is retired. It stays behind or away from text, never inside the canonical mark. Avoid rock cracks in everyday controls. Do not rely on scenery for section distinction.

Photography: real training and mountain context, natural light, restrained color, no obligatory orange grade. Favor believable effort, varied athletes, and terrain with breathing room for short headings. Keep photography off dense workout-reading surfaces. No stock-photo bundle is included; use owned/licensed imagery.

Motion: 120ms for control feedback, 180ms for short transitions, ease cubic-bezier(.2,0,0,1). Honor prefers-reduced-motion. No parallax, springy navigation, pulsing active cards or automatic celebratory overlays during training. Timers update without layout shift and are not announced every second to screen readers; announce meaningful phase changes.

## 8. Voice and data visualization

Be direct, encouraging and specific. Say "Session complete," "Rest 60 sec," "Load saved," and "Could not save. Try again." Avoid "Crush it," "Beast mode," and "Conquer your limits." Never invent physiological certainty or override coaching content during a visual redesign.

Use labels and units on charts. Historical series default to deep teal with a neutral grid. Orange is a current/selected point, not every data line. Add direct series labels, distinct line styles or markers, and a data table/text alternative. A completed session uses a check and label, not green alone. Do not fabricate readiness scores or training metrics for visual decoration.

## 9. Accessibility and QA

Normal text target >=4.5:1; large text >=3:1 where applicable. Essential control boundaries and focus indicators target >=3:1 against adjacent colors. Decorative dividers are intentionally quieter. Avoid color-only meaning. Validate keyboard navigation, screen-reader names/states, 200% text scaling and 320px layouts in the real app. This kit's tests verify token pairs and reference layout, not every production interaction.

Inspect logo at 16, 24, 32, 60 and 1024px. Preserve the dot at all sizes. Check the mountain apex and feet for raster artifacts, and compare the three export formats against their single source. Never edit exported formats independently.

## Sources and font licenses

Inter and Michroma font files and OFL texts were retrieved from the official Google Fonts repository on 2026-09-29. Original files are bundled unchanged.

- https://github.com/google/fonts/tree/main/ofl/inter
- https://github.com/google/fonts/tree/main/ofl/michroma
- https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
- https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html

The supplied screenshots and prior conversation informed composition and brand direction. This kit does not include or alter the original app source, and does not verify Claude's separate logo file.

## v1.2 refinements

Section identity is now carried by color and shape as well as type: use section-text, section-bg and section-rule tokens. Light values are #35636B on #E6EFF0 with #4E8A94 side rule; dark values reuse the readable dark-theme info pair. Apply a 3px left rule and 10px vertical / 12px horizontal inset to section headings, with 16px separation to content. Session titles remain 30/36px weight 700 charcoal; exercises remain 18/24px weight 600 charcoal. Warm-up, Strength intensity and Conditioning share the same section treatment. Never give every category its own color.

The session picker lists date plus actual session title, allows search over either, wraps long names, retains the selection in the closed control, and supplies keyboard-visible focus and an empty-result message. The detail-screen picker switches to the chosen session; the schedule picker changes selection before Open this session. A direct date input is a fallback, not the only discovery interface.

Supporting topography uses a larger cropped contour field. The hypothetical peak is anchored near the bottom-right of the panel, with most of the field extending beyond the frame. Keep the logo and upper-left title area quiet. Preserve this composition across responsive crops instead of recentering the whole summit.
