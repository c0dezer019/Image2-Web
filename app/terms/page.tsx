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
