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
          revocable license to access and use Image2, including for producing
          outputs used in commercial projects, subject to these Terms. You may
          not resell, sublicense, or provide the Service as a component of your
          own product or service offering to third parties.
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
