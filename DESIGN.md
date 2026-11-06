# Casefile AI visual direction

Modern noir detective bureau: archival precision, warm brass, cool green-grey
materials and restrained cinematic contrast. No external fonts or new dependencies.

## Shared system

`frontend/src/tokens.css` owns the palette, font stacks, spacing scale, panel and
control radii, shadows, motion durations and semantic colour aliases. Feature
styles reference these tokens instead of independent hex palettes.

`frontend/src/noir.css` defines the shared compositions: dossier panels, selection
states, metadata, file cards, personnel jackets, record transcripts, supply lockers,
progression reports and archive rows. Feature CSS retains layout-specific rules.

- Background #111315; main surface #1A1F1D; raised surface #232927.
- Brass #C9A96A: navigation, selection, primary actions and career milestones.
- Teal #4C7A74: investigative context, evidence provenance and recorded findings.
- Aged red #8C4B4B: warnings and mismatched deductions.
- Text #ECE7DD; secondary text #B7B0A4. Lighter teal and red variants carry text;
  the darker accent values are reserved for borders and background washes.
- Local serif display stack for case titles and dossier headings; Segoe UI body
  stack; local monospace stack for sources, numbered sections and bureau notation.
- Spacing follows .25/.5/.75/1/1.5/2/3/4.5rem. Small radii and thin dividers make
  surfaces feel like records and instruments rather than floating dashboard tiles.
- The shield and inspection-lens mark appears in the masthead and SVG favicon.

## Interaction and accessibility

Selected states use borders and inset rules as well as colour. Existing status
labels and icons remain visible. Keyboard focus uses a two-pixel brass outline.
Buttons have a 44px minimum height; numbered lens hotspots remain 30px to fit the
diagram and have equivalent full-size labelled controls underneath.

The body, secondary, brass, teal-text and red-text pairs on their intended dark
surfaces exceed 4.5:1 contrast. The primary button pair is 8.31:1. Disabled controls
are visually subdued. Reduced-motion preferences disable transitions and reveals.
Layouts stack at narrow widths; phone navigation becomes a two-column index.

## Future artwork

Existing portraits are retained and graded with reduced saturation for continuity.
Future commissioned or generated portraits could use consistent photographic
lighting, restrained expressions and a shared bureau backdrop. Case-specific
environment artwork and bespoke evidence illustrations would deepen immersion
without changing the interface system. Keep illustrations subordinate to evidence
readability and avoid decorative effects over text.
