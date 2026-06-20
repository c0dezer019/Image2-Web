import type { Metadata } from "next";
import { LegalPage, SECTION_STYLE, P_STYLE } from "@/components/LegalPage";
import { FeedbackForm } from "@/components/FeedbackForm";

export const metadata: Metadata = {
  title: "Feedback — Image2",
  description: "Send feedback or report a bug for Image2.",
};

export default function FeedbackPage() {
  return (
    <LegalPage title="Feedback">
      <section style={SECTION_STYLE}>
        <p style={P_STYLE}>
          Found a bug, or have a suggestion? Let us know below.
        </p>
        <FeedbackForm />
      </section>
    </LegalPage>
  );
}
