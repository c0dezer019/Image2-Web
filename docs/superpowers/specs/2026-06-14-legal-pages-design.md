# ToS, EULA, and Privacy Policy pages

## Problem

Image2 is a public app (deployed to image2.theappfoundry.tech) with no
legal pages: no Terms of Service, EULA, or Privacy Policy. It accepts
user-uploaded images, sends them to a separate conversion server, and
runs Vercel Analytics — all of which should be disclosed and governed by
standard policy text.

## Goal

Add three static legal pages and link them from the home page so the app
has baseline ToS/EULA/Privacy coverage.

## Facts used in the content (verified against code)

- **Entity**: "The App Foundry" (per nav branding in `app/page.tsx`).
  Contact: `contact@theappfoundry.tech` (placeholder — swap for a real
  inbox before launch if this doesn't exist).
- **Governing law**: Texas, USA.
- **No accounts/auth**: confirmed — no login, no user records.
- **Image handling**: client compresses/validates (`lib/image-compress.ts`,
  `lib/validate.ts`), then uploads to the FastAPI server
  (`server/main.py`). Server writes to a temp file via `_save_upload`,
  processes it, and `os.remove(path)` in a `finally` block on every
  endpoint (`/analyze`, `/convert/ascii`, `/convert/ansi`). So: **images
  are processed transiently and deleted immediately after conversion**,
  never persisted. Privacy policy states this as fact.
- **Analytics**: `@vercel/analytics/next` `<Analytics />` is mounted in
  `app/layout.tsx` — anonymized usage analytics, no cookies/PII.
- **Output ownership**: users upload their own images; the generated
  ASCII/ANSI art is theirs to use freely (app claims no rights to
  user content or output).

## New files

### `components/Footer.tsx`

Site footer. Links to `/terms`, `/eula`, `/privacy`. Styled per
`lib/theme.ts` conventions (inline `style`, `FONT_MONO`, `COLORS.muted`,
`COLORS.border`), matching the visual language of `OutputHeader.tsx` /
the home page nav (uppercase, letter-spaced, small mono labels).
Rendered at the bottom of `app/page.tsx`'s content column, and inside
`LegalPage`.

### `components/LegalPage.tsx`

Shared shell for the three legal routes. Server component (no
`"use client"` — purely static markup, no interactivity). Props:
`title: string`, `children: React.ReactNode`.

Renders:
- Same background treatment as home (`COLORS.bg`, grid overlay) — or a
  simplified version (flat background, no animated grid) for a lighter
  static page. Recommend simplified: flat `COLORS.bg` background, no
  grid/radial overlays, since those are purely decorative on the
  interactive tool page.
- Nav bar matching home's nav (Image2 logo mark + "The App Foundry"),
  with the logo linking back to `/`.
- `<h1>{title}</h1>` styled like home's header (FONT_SANS, bold,
  `COLORS.text`).
- `children` — body content, styled via simple `<h2>`/`<p>`/`<ul>` with
  `FONT_SANS` body text (`COLORS.text`/`COLORS.muted`) and `FONT_MONO`
  section labels (matching the "01 / IMAGE → TEXT ART" eyebrow style on
  home, e.g. "01 / TERMS", "02 / ...").
- `Footer` at the bottom.

Max content width matches home's `1000px` container.

## New routes

All three are server components with a static `Metadata` export
(`title`, `description`), rendering `<LegalPage title="...">...content...</LegalPage>`.

### `app/terms/page.tsx` — Terms of Service

Sections: Acceptance of terms; Service description (image → ASCII/ANSI
text art conversion); Acceptable use (no uploading illegal, infringing,
or abusive content); No warranty / "as is"; Limitation of liability;
Changes to the service/terms; Governing law (Texas, USA); Contact.

### `app/eula/page.tsx` — End User License Agreement

Sections: License grant (non-exclusive, revocable, personal/non-commercial
use of the web app itself); Restrictions (no reverse-engineering,
scraping, or abusive automated use of the conversion server); Ownership
(The App Foundry retains rights to the app/tool; user retains all rights
to their uploaded images and to the ASCII/ANSI output generated from
them); Disclaimer of warranties; Termination (access may be revoked for
violations); Governing law.

### `app/privacy/page.tsx` — Privacy Policy

Sections: What we collect (uploaded images, processed transiently —
written to a temp file on the conversion server and deleted immediately
after processing; never stored or retained); Analytics (Vercel Analytics
— anonymized usage data, no cookies, no PII); No accounts (no user
registration or stored profiles); Third-party processing (image data is
sent to our conversion server, hosted separately from the Vercel
frontend); Children's privacy (not directed at children under 13);
Changes to this policy; Contact.

## `app/page.tsx` change

Add `<Footer />` at the end of the content column (after
`<OutputCanvas .../>`, inside the `position: relative, zIndex: 2`
wrapper div).

## Out of scope

- Cookie consent banner (no tracking cookies are used — Vercel Analytics
  is cookieless).
- Real legal review / jurisdiction-specific compliance (GDPR/CCPA
  boilerplate) — this is baseline placeholder policy text, not a
  substitute for counsel.
- i18n / multi-language policy text.
