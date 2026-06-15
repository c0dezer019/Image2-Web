# Legal Pages (ToS, EULA, Privacy) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Terms of Service, EULA, and Privacy Policy pages at `/terms`, `/eula`, `/privacy`, plus a shared `Footer` linking to them from the home page.

**Architecture:** Two new shared components (`Footer`, `LegalPage`) styled per `lib/theme.ts` conventions (inline `style`, `COLORS`/`FONT_MONO`). Three new static server-component routes under `app/`, each wrapping its content in `LegalPage`. `app/page.tsx` gets `<Footer />` appended.

**Tech Stack:** Next.js App Router (server components, no `"use client"` needed for these), TypeScript, inline styles via `lib/theme.ts`.

---

Spec: `docs/superpowers/specs/2026-06-14-legal-pages-design.md`

No new test files — this codebase only has `*.test.ts` for `lib/` logic (see `lib/*.test.ts`); there are no existing component tests, and these pages are static markup with no logic to test. Verification is `pnpm lint` per task and `pnpm build` at the end.

---

### Task 1: `Footer` component

**Files:**
- Create: `components/Footer.tsx`

- [ ] **Step 1: Create the component**

```tsx
import Link from "next/link";
import { COLORS, FONT_MONO } from "@/lib/theme";

const LINK_STYLE: React.CSSProperties = {
  color: COLORS.muted,
  textDecoration: "none",
};

export function Footer() {
  return (
    <footer
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        marginTop: 64,
        paddingTop: 24,
        borderTop: `1px solid ${COLORS.border}`,
        fontFamily: FONT_MONO,
        fontSize: 10,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: COLORS.muted,
      }}
    >
      <span>The App Foundry</span>
      <div style={{ display: "flex", gap: 20 }}>
        <Link href="/terms" style={LINK_STYLE}>
          Terms
        </Link>
        <Link href="/eula" style={LINK_STYLE}>
          EULA
        </Link>
        <Link href="/privacy" style={LINK_STYLE}>
          Privacy
        </Link>
      </div>
    </footer>
  );
}
```

- [ ] **Step 2: Lint**

Run: `pnpm lint`
Expected: no errors related to `components/Footer.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/Footer.tsx
git commit -m "feat: add site Footer component"
```

---

### Task 2: `LegalPage` shared shell + shared content styles

**Files:**
- Create: `components/LegalPage.tsx`

This component renders the nav (logo links back to `/`), the page `<h1>`,
the `children` body, and `<Footer />`. It also exports shared style
constants (`SECTION_STYLE`, `SECTION_LABEL_STYLE`, `P_STYLE`, `UL_STYLE`,
`EFFECTIVE_DATE_STYLE`) used by the three legal pages so section styling
stays consistent without repeating style objects in every page file.

- [ ] **Step 1: Create the component**

```tsx
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { COLORS, FONT_MONO } from "@/lib/theme";

export const SECTION_STYLE: React.CSSProperties = {
  marginBottom: 36,
};

export const SECTION_LABEL_STYLE: React.CSSProperties = {
  fontFamily: FONT_MONO,
  fontSize: 10,
  letterSpacing: "0.28em",
  textTransform: "uppercase",
  color: COLORS.accent,
  marginBottom: 10,
};

export const P_STYLE: React.CSSProperties = {
  fontSize: 15,
  lineHeight: 1.7,
  color: COLORS.text,
  margin: "0 0 12px",
  maxWidth: 720,
};

export const UL_STYLE: React.CSSProperties = {
  fontSize: 15,
  lineHeight: 1.7,
  color: COLORS.text,
  margin: "0 0 12px",
  paddingLeft: 22,
  maxWidth: 720,
};

export const EFFECTIVE_DATE_STYLE: React.CSSProperties = {
  fontFamily: FONT_MONO,
  fontSize: 11,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: COLORS.muted,
  marginBottom: 32,
};

interface LegalPageProps {
  title: string;
  children: React.ReactNode;
}

export function LegalPage({ title, children }: LegalPageProps) {
  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.text }}>
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "46px 40px 120px" }}>
        <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 54 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 11, textDecoration: "none", color: COLORS.text }}>
            <div
              style={{
                width: 24,
                height: 24,
                border: `1px solid ${COLORS.accent}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: FONT_MONO,
                fontSize: 12,
                color: COLORS.accent,
              }}
            >
              &gt;
            </div>
            <div style={{ fontFamily: FONT_MONO, fontSize: 13, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 500 }}>
              Image2
            </div>
          </Link>
          <div style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: COLORS.muted }}>
            The App Foundry
          </div>
        </nav>

        <h1 style={{ fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 700, letterSpacing: "-0.03em", margin: "0 0 12px" }}>
          {title}
        </h1>

        {children}

        <Footer />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Lint**

Run: `pnpm lint`
Expected: no errors related to `components/LegalPage.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/LegalPage.tsx
git commit -m "feat: add shared LegalPage shell and section styles"
```

---

### Task 3: Terms of Service page

**Files:**
- Create: `app/terms/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
import type { Metadata } from "next";
import { LegalPage, EFFECTIVE_DATE_STYLE, SECTION_STYLE, SECTION_LABEL_STYLE, P_STYLE, UL_STYLE } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Service — Image2",
  description: "Terms of Service for Image2, the image-to-text-art converter.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service">
      <p style={EFFECTIVE_DATE_STYLE}>Effective date: June 14, 2026</p>

      <section style={SECTION_STYLE}>
        <div style={SECTION_LABEL_STYLE}>01 / Acceptance of Terms</div>
        <p style={P_STYLE}>
          By accessing or using Image2 (the &ldquo;Service&rdquo;), operated by The App
          Foundry (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;), you agree to be
          bound by these Terms of Service (&ldquo;Terms&rdquo;). If you do not agree, do
          not use the Service.
        </p>
      </section>

      <section style={SECTION_STYLE}>
        <div style={SECTION_LABEL_STYLE}>02 / The Service</div>
        <p style={P_STYLE}>
          Image2 lets you upload an image and convert it into ASCII or ANSI text art.
          Uploaded images are sent to our conversion server for processing and are not
          stored — see our{" "}
          <a href="/privacy" style={{ color: "inherit", textDecoration: "underline" }}>
            Privacy Policy
          </a>{" "}
          for details.
        </p>
      </section>

      <section style={SECTION_STYLE}>
        <div style={SECTION_LABEL_STYLE}>03 / Acceptable Use</div>
        <p style={P_STYLE}>You agree not to upload or process any content that:</p>
        <ul style={UL_STYLE}>
          <li>is illegal, infringes another party&rsquo;s intellectual property or privacy rights, or that you do not have the right to use;</li>
          <li>is obscene, abusive, or otherwise objectionable;</li>
          <li>is designed to disrupt, damage, or gain unauthorized access to the Service or its infrastructure.</li>
        </ul>
        <p style={P_STYLE}>
          We may suspend or block access for violations of this section.
        </p>
      </section>

      <section style={SECTION_STYLE}>
        <div style={SECTION_LABEL_STYLE}>04 / No Warranty</div>
        <p style={P_STYLE}>
          The Service is provided &ldquo;as is&rdquo; and &ldquo;as available,&rdquo;
          without warranties of any kind, express or implied, including
          merchantability, fitness for a particular purpose, and non-infringement. We do
          not guarantee the Service will be uninterrupted, error-free, or available at
          all times.
        </p>
      </section>

      <section style={SECTION_STYLE}>
        <div style={SECTION_LABEL_STYLE}>05 / Limitation of Liability</div>
        <p style={P_STYLE}>
          To the maximum extent permitted by law, The App Foundry shall not be liable
          for any indirect, incidental, special, consequential, or punitive damages, or
          any loss of data, arising from your use of, or inability to use, the Service.
        </p>
      </section>

      <section style={SECTION_STYLE}>
        <div style={SECTION_LABEL_STYLE}>06 / Changes to These Terms</div>
        <p style={P_STYLE}>
          We may update these Terms from time to time. Changes take effect when posted
          on this page. Continued use of the Service after changes are posted
          constitutes acceptance of the revised Terms.
        </p>
      </section>

      <section style={SECTION_STYLE}>
        <div style={SECTION_LABEL_STYLE}>07 / Governing Law</div>
        <p style={P_STYLE}>
          These Terms are governed by the laws of the State of Texas, USA, without
          regard to conflict-of-law principles.
        </p>
      </section>

      <section style={SECTION_STYLE}>
        <div style={SECTION_LABEL_STYLE}>08 / Contact</div>
        <p style={P_STYLE}>
          Questions about these Terms? Contact us at{" "}
          <a href="mailto:contact@theappfoundry.tech" style={{ color: "inherit", textDecoration: "underline" }}>
            contact@theappfoundry.tech
          </a>
          .
        </p>
      </section>
    </LegalPage>
  );
}
```

- [ ] **Step 2: Lint**

Run: `pnpm lint`
Expected: no errors related to `app/terms/page.tsx`.

- [ ] **Step 3: Commit**

```bash
git add app/terms/page.tsx
git commit -m "feat: add Terms of Service page"
```

---

### Task 4: EULA page

**Files:**
- Create: `app/eula/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
import type { Metadata } from "next";
import { LegalPage, EFFECTIVE_DATE_STYLE, SECTION_STYLE, SECTION_LABEL_STYLE, P_STYLE, UL_STYLE } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "End User License Agreement — Image2",
  description: "End User License Agreement for Image2, the image-to-text-art converter.",
};

export default function EulaPage() {
  return (
    <LegalPage title="End User License Agreement">
      <p style={EFFECTIVE_DATE_STYLE}>Effective date: June 14, 2026</p>

      <section style={SECTION_STYLE}>
        <div style={SECTION_LABEL_STYLE}>01 / License Grant</div>
        <p style={P_STYLE}>
          The App Foundry grants you a limited, non-exclusive, non-transferable,
          revocable license to access and use Image2 for your personal,
          non-commercial purposes, subject to these Terms.
        </p>
      </section>

      <section style={SECTION_STYLE}>
        <div style={SECTION_LABEL_STYLE}>02 / Restrictions</div>
        <p style={P_STYLE}>You agree not to:</p>
        <ul style={UL_STYLE}>
          <li>copy, modify, reverse-engineer, decompile, or create derivative works of the Service or its underlying software;</li>
          <li>scrape, crawl, or use automated means to access the Service or the image-conversion server beyond normal interactive use;</li>
          <li>circumvent any rate limits, size limits, or other usage restrictions.</li>
        </ul>
      </section>

      <section style={SECTION_STYLE}>
        <div style={SECTION_LABEL_STYLE}>03 / Ownership</div>
        <p style={P_STYLE}>
          The App Foundry owns the Image2 application, including its design, code, and
          branding. You retain all rights to the images you upload and to the
          ASCII/ANSI output Image2 generates from them. We claim no ownership over your
          content or output.
        </p>
      </section>

      <section style={SECTION_STYLE}>
        <div style={SECTION_LABEL_STYLE}>04 / Disclaimer of Warranties</div>
        <p style={P_STYLE}>
          The Service is licensed &ldquo;as is,&rdquo; without warranty of any kind. The
          App Foundry disclaims all warranties, express or implied, to the fullest
          extent permitted by law.
        </p>
      </section>

      <section style={SECTION_STYLE}>
        <div style={SECTION_LABEL_STYLE}>05 / Termination</div>
        <p style={P_STYLE}>
          This license is effective until terminated. We may terminate or suspend your
          access at any time, without notice, for conduct that violates these Terms or
          is otherwise harmful to the Service or other users. Upon termination, your
          right to use the Service ceases immediately.
        </p>
      </section>

      <section style={SECTION_STYLE}>
        <div style={SECTION_LABEL_STYLE}>06 / Governing Law</div>
        <p style={P_STYLE}>
          This Agreement is governed by the laws of the State of Texas, USA.
        </p>
      </section>
    </LegalPage>
  );
}
```

- [ ] **Step 2: Lint**

Run: `pnpm lint`
Expected: no errors related to `app/eula/page.tsx`.

- [ ] **Step 3: Commit**

```bash
git add app/eula/page.tsx
git commit -m "feat: add EULA page"
```

---

### Task 5: Privacy Policy page

**Files:**
- Create: `app/privacy/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
import type { Metadata } from "next";
import { LegalPage, EFFECTIVE_DATE_STYLE, SECTION_STYLE, SECTION_LABEL_STYLE, P_STYLE } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy — Image2",
  description: "Privacy Policy for Image2, the image-to-text-art converter.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <p style={EFFECTIVE_DATE_STYLE}>Effective date: June 14, 2026</p>

      <section style={SECTION_STYLE}>
        <div style={SECTION_LABEL_STYLE}>01 / What We Collect</div>
        <p style={P_STYLE}>
          When you upload an image to Image2, it is sent to our conversion server for
          processing. The server writes the image to a temporary file, performs the
          conversion, and immediately deletes the file once processing completes. We do
          not store, retain, or back up your images.
        </p>
      </section>

      <section style={SECTION_STYLE}>
        <div style={SECTION_LABEL_STYLE}>02 / Analytics</div>
        <p style={P_STYLE}>
          We use Vercel Analytics to understand aggregate, anonymized usage of the
          Service (e.g. page views). This does not use cookies and does not collect
          personally identifiable information.
        </p>
      </section>

      <section style={SECTION_STYLE}>
        <div style={SECTION_LABEL_STYLE}>03 / No Accounts</div>
        <p style={P_STYLE}>
          Image2 does not require an account, login, or registration. We do not collect
          names, email addresses, or other personal information through the Service
          itself.
        </p>
      </section>

      <section style={SECTION_STYLE}>
        <div style={SECTION_LABEL_STYLE}>04 / Third-Party Processing</div>
        <p style={P_STYLE}>
          Image conversion is performed by a separate server operated by us, hosted
          independently from the Vercel-hosted frontend. Image data is transmitted to
          this server solely to perform the requested conversion, as described in
          Section 1.
        </p>
      </section>

      <section style={SECTION_STYLE}>
        <div style={SECTION_LABEL_STYLE}>05 / Children&rsquo;s Privacy</div>
        <p style={P_STYLE}>
          Image2 is not directed at children under 13, and we do not knowingly collect
          information from children under 13.
        </p>
      </section>

      <section style={SECTION_STYLE}>
        <div style={SECTION_LABEL_STYLE}>06 / Changes to This Policy</div>
        <p style={P_STYLE}>
          We may update this Privacy Policy from time to time. Changes take effect when
          posted on this page.
        </p>
      </section>

      <section style={SECTION_STYLE}>
        <div style={SECTION_LABEL_STYLE}>07 / Contact</div>
        <p style={P_STYLE}>
          Questions about this Privacy Policy? Contact us at{" "}
          <a href="mailto:contact@theappfoundry.tech" style={{ color: "inherit", textDecoration: "underline" }}>
            contact@theappfoundry.tech
          </a>
          .
        </p>
      </section>
    </LegalPage>
  );
}
```

- [ ] **Step 2: Lint**

Run: `pnpm lint`
Expected: no errors related to `app/privacy/page.tsx`.

- [ ] **Step 3: Commit**

```bash
git add app/privacy/page.tsx
git commit -m "feat: add Privacy Policy page"
```

---

### Task 6: Link Footer from the home page

**Files:**
- Modify: `app/page.tsx:1-14` (imports), `app/page.tsx:295-296` (end of content column)

- [ ] **Step 1: Add the import**

In `app/page.tsx`, add to the existing import block (near the other component imports, e.g. after the `OutputCanvas` import on line 7):

```tsx
import { Footer } from "@/components/Footer";
```

- [ ] **Step 2: Render `<Footer />` after `<OutputCanvas .../>`**

Currently (end of the component, around line 295-296):

```tsx
        <OutputCanvas ref={canvasRef} hasOutput={!!result} errorMessage={error} />
      </div>
    </div>
  );
}
```

Change to:

```tsx
        <OutputCanvas ref={canvasRef} hasOutput={!!result} errorMessage={error} />

        <Footer />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Lint**

Run: `pnpm lint`
Expected: no errors related to `app/page.tsx`.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat: link Terms/EULA/Privacy from home page footer"
```

---

### Task 7: Full build verification

**Files:** none (verification only)

- [ ] **Step 1: Run the production build**

Run: `pnpm build`
Expected: build succeeds with no type or lint errors, and `/terms`, `/eula`,
`/privacy` appear in the route output (e.g. `○ /terms`, `○ /eula`,
`○ /privacy` as static routes alongside `○ /`).

- [ ] **Step 2: Run the existing test suite (regression check)**

Run: `pnpm test`
Expected: all existing `lib/*.test.ts` tests still pass (this change touches
no `lib/` code, so this is a pure regression check).

---

## Self-Review Notes

- **Spec coverage:** Footer (Task 1), LegalPage shell (Task 2), three routes
  with the sections specified in the spec (Tasks 3-5), home page link
  (Task 6), build verification (Task 7) — all spec sections covered.
- **Placeholders:** `contact@theappfoundry.tech` is a placeholder per the
  spec (flagged there too) — intentional, not a plan gap.
- **Type consistency:** `LegalPage` props (`title: string`,
  `children: React.ReactNode`) match usage in Tasks 3-5. Exported style
  constant names (`SECTION_STYLE`, `SECTION_LABEL_STYLE`, `P_STYLE`,
  `UL_STYLE`, `EFFECTIVE_DATE_STYLE`) match between Task 2's exports and
  Tasks 3-5's imports.
