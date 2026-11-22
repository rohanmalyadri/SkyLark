/**
 * Groups a job into a broad discipline from its title (and the source's department, when it gave one).
 *
 * Most sources leave `department` blank (Arbeitnow never sends one) and the ones that do use their own
 * fine-grained team names, so the home page's "Domains" row and its search links use this instead.
 * Rules are checked in order and the first match wins, so specific roles come before broad ones.
 * Titles are often German (Arbeitnow), hence the German keywords.
 */
const RULES: [name: string, pattern: RegExp][] = [
  ["Security", /secur|cyber|sicherheit|devsecops|\bsoc\b|pentest/],
  ["People & HR", /\bhr\b|human resources|recruit|talent|\bpersonal(?!i[sz])|people (ops|partner)|candidate experience|ressources humaines|payroll|lohnbuchhalt/],
  ["IT & Infrastructure", /devops|\bsre\b|site reliability|platform engineer|cloud|kubernetes|sysadmin|system ?administrat|systemadministrat|systemelektronik|network|netzwerk|helpdesk|service desk|it[- ]support|it[- ]spezialist|client[- ]management|infrastructure/],
  ["Data & AI", /data scien|data engineer|data analy|datenanaly|data warehouse|machine learning|\bml\b|scientist|analytics|\bbi\b|business intelligence|quantitative/],
  ["Software Engineering", /software|developer|entwickler|programmier|back-?end|front-?end|full[- ]?stack|\bmobile\b|\bios\b|android|^engineering\b|engineering manager|product engineer|\bqa\b|test manager|\bweb\b|développeu|architect|fachinformatik|wirtschaftsinformatik|\bit jobs\b/],
  ["Product", /product (manager|owner|lead|management|director)|produktmanag|program manager/],
  ["Design", /design|\bux\b|\bui\b|art director|grafik|mediengestalt|illustrat|creative/],
  ["Data & AI", /\bai\b|\bki\b|\bdata\b|\bdaten/],
  ["Finance", /financ|finanz|accountant|accounting|buchhalt|controll|\btax\b|steuer|audit|treasury|rechnung|bank|trader|invest|\bfund|kredit/],
  ["Legal & Compliance", /legal|lawyer|counsel|jurist|\brecht|compliance|datenschutz|privacy|regulier/],
  ["Marketing & Communications", /marketing|content|social media|\bseo\b|brand|\bpr\b|kommunikation|communication|redakt|editor|copywrit|growth/],
  ["Sales & Business Development", /sales|vertrieb|verkauf|\bvente|account executive|account manager|account develop|business develop|market develop|\bbdr\b|\bsdr\b|key account|außendienst|partnerships/],
  ["Customer Success & Support", /customer|kunden|support|client success|rezeption|after sales|call ?center/],
  ["Healthcare", /pflege|nurse|nursing|medizin|medical|\barzt|ärzt|doctor|therap|clinic|klinik|health|gesundheit|apothe|pharma/],
  ["Education", /teacher|lehrer|tutor|erzieh|education|pädagog|dozent/],
  ["Hospitality & Retail", /hotel|gastro|\bkoch\b|\bchef\b|restaurant|retail|filial|einzelhandel|barista|beauty|wellness|\bstore\b/],
  ["Project Management", /project manag|projektmanag|projektleit|\bpmo\b|scrum master/],
  ["Industrial Engineering", /ingenieur|engineer|\bbau|bauleit|konstrukt|mechani|elektr|electric|manufactur|fertigung|produktion|production|techniker|technician|maintenance|instandhalt|anlagen|energ|photovoltai|process/],
  ["Operations", /operations|logisti|supply chain|\blager|warehouse|einkauf|procurement|purchas|office|assisten|sachbearbeit|consult|berat|founder|qualit|angebot|research|interviewer|manag|director|leadership|graduate|venture|associate|intern|praktik|werkstudent/],
];

export const OTHER_DISCIPLINE = "Other";

function match(text: string) {
  const t = text.toLowerCase();
  for (const [name, re] of RULES) if (re.test(t)) return name;
  return null;
}

export function jobDiscipline(job: { title: string; department?: string | null }): string {
  return match(job.title) ?? (job.department ? match(job.department) : null) ?? OTHER_DISCIPLINE;
}
