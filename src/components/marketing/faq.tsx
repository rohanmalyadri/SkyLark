export const FAQ: [string, string][] = [
  ["What exactly does Skylark do?", "Skylark takes the repetitive work out of applying. You share your profile and resume once; we match you to roles you're eligible for, tailor each application, and — on plans with managed applications — a specialist reviews and submits it for you. You follow everything from one dashboard."],
  ["How many applications will be submitted for me?", "It depends on your plan. Each plan's monthly allowance of tailored and specialist-submitted applications is listed in the pricing table. We only submit to roles that pass the eligibility check and that you've approved, so volume always follows relevance."],
  ["Which roles and industries do you support?", "Matching is skills-based, so it works across disciplines. The disciplines shown on this page come straight from the current job catalog, with the skills employers there ask for most."],
  ["Will I see proof of what was applied for?", "Yes. Every application keeps its status history, the exact tailored documents that were sent, and the reviewer's checklist. You get an in-app alert whenever its status changes."],
  ["Can I choose the roles or companies I target?", "Yes. Your preferred roles, countries, work mode and salary floor shape every match. You can save or dismiss roles, and nothing is submitted without your approval."],
  ["Do you guarantee interviews, offers or visa sponsorship?", "No. No one can honestly promise that. We improve the odds by applying where you're eligible with materials tailored to each role, and we show the reasoning behind every match."],
  ["Can I change or cancel my plan?", "Anytime, from Settings. Upgrades apply immediately; cancellations take effect at the end of the current billing period."],
];

export function FaqList() {
  return (
    <div className="faq-list">
      {FAQ.map(([q, a]) => (
        <details key={q}>
          <summary>
            <span className="text --xlarge">{q}</span>
            <span className="plus" aria-hidden />
          </summary>
          <p className="answer text --large">{a}</p>
        </details>
      ))}
    </div>
  );
}
