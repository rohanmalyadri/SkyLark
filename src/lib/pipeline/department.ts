/*
 * Some job boards (Arbeitnow, most of the default feed) send no department. Without one every
 * listing lands in a single nameless group, so the home page shows one blank domain card and
 * "similar roles" matches everything. This infers a discipline from the title, in English and
 * German, and falls back to the listing's skills.
 */

const RULES: [department: string, title: RegExp][] = [
  ["Data", /\b(data|daten|analytics|machine learning|business intelligence|scientist|statisti)|\b(ai|ki|ml|bi|llm)\b/i],
  ["Design", /\b(design|designer|ux|ui|grafik|creative|illustrat)/i],
  ["Product", /\b(product (manager|owner|lead|director)|produktmanager|product management|po)\b/i],
  ["Infrastructure", /\b(devops|sre|site reliability|platform|cloud|infrastructure|system ?administrat|systemadministrator|netzwerk|network|it[- ]?support|it[- ]?administrator|security|sicherheit|cyber)|\bit\b/i],
  ["Engineering", /(engineer|ingenieur|ingénieur|architekt|technical staff|researcher|developer|entwickler|programmier|software|frontend|front-end|backend|back-end|full[- ]?stack|architect|informatik|tester|qa\b|quality assurance|embedded|mobile|ios|android)/i],
  ["Marketing", /\b(marketing|seo|sem\b|content|social media|brand|communications?|kommunikation|pr\b|growth|media relations|campaign|influencer|artist manager|marketer|community|redact|redakt)/i],
  ["Sales", /\b(sales|vertrieb|account (executive|manager)|business development|key account|verkauf|außendienst|aussendienst|kundenberater|renewals|account development|partner|alliances|deal desk|pricing|revenue|account director|client director)/i],
  ["Customer Success", /\b(customer (success|support|service)|kundenservice|kundenbetreuung|customer|support agent|helpdesk|call ?center)/i],
  ["Consulting", /(consult|berater|advisory)/i],
  ["Finance", /\b(finance|financial|finanz|accountant|accounting|buchhalt|controller|controlling|steuer|tax\b|audit|payroll|lohn|comptab|risk|fraud|credit|fund)/i],
  ["People", /\b(hr\b|hrbp|human resources|personal|recruit|talent|people)/i],
  ["Operations", /\b(operations|logisti|supply chain|einkauf|procurement|lager|warehouse|projektmanager|project manager|office|assistenz|assistant|administration|verwaltung|qualität|quality|kaufmann|kauffrau|chief of staff|project management|projektleit|pmo|operation)/i],
  ["Healthcare", /\b(pflege|nurse|nursing|arzt|ärzt|medizin|medical|therap|kranken|gesundheit|health|pharma|apothe)/i],
  ["Skilled Trades", /\b(elektrik|elektroniker|mechanik|mechatron|techniker|technician|monteur|handwerk|schweiß|installateur|fahrer|driver|koch|chef|maler|tischler|anlagen)/i],
  ["Education", /\b(teacher|lehrer|erzieher|tutor|trainer|education|pädagog|dozent)/i],
  ["Legal", /\b(legal|lawyer|jurist|rechtsanwalt|counsel|compliance|paralegal)/i],
];

const SKILL_HINTS: [department: string, skills: RegExp][] = [
  ["Data", /^(sql|python|pandas|tableau|power bi|spark|pytorch|tensorflow|machine learning|statistics|excel)$/i],
  ["Design", /^(figma|sketch|adobe|photoshop|illustrator|user research|prototyping)$/i],
  ["Engineering", /^(typescript|javascript|react|node\.js|java|go|c#|c\+\+|php|ruby|kotlin|swift|rust)$/i],
  ["Infrastructure", /^(kubernetes|docker|terraform|aws|azure|gcp|linux)$/i],
];

/** A discipline for a listing that came without one. Never returns an empty string. */
export function inferDepartment(title: string, skills: readonly string[] = []): string {
  for (const [dept, re] of RULES) if (re.test(title)) return dept;
  const votes = new Map<string, number>();
  for (const s of skills)
    for (const [dept, re] of SKILL_HINTS) if (re.test(s)) votes.set(dept, (votes.get(dept) ?? 0) + 1);
  const best = [...votes.entries()].sort((a, b) => b[1] - a[1])[0];
  return best && best[1] >= 2 ? best[0] : "Other";
}

/** The listing's own department when it has one, otherwise the inferred one. */
export const departmentOf = (job: { department?: string | null; title: string; requiredSkills?: readonly string[] }) =>
  job.department?.trim() || inferDepartment(job.title, job.requiredSkills ?? []);
