/*
 * The blog, authored in the repository as typed content blocks rather than Markdown or HTML.
 *
 * Why blocks and not Markdown: a post renders as real React with no `dangerouslySetInnerHTML`
 * anywhere, so there is no HTML-injection surface and no Markdown dependency to keep patched.
 * The trade is that authoring is a little more verbose — worth it for content that ships
 * inside the same type system as everything else.
 */

export type Block =
  | { kind: "paragraph"; text: string }
  | { kind: "heading"; text: string }
  | { kind: "list"; items: string[]; ordered?: boolean }
  | { kind: "callout"; title: string; text: string }
  | { kind: "quote"; text: string; attribution?: string };

export interface Post {
  slug: string;
  title: string;
  /** Used as the meta description, the card excerpt and the OpenGraph summary. */
  description: string;
  /** YYYY-MM-DD. */
  publishedAt: string;
  updatedAt?: string;
  author: string;
  tags: string[];
  blocks: Block[];
}

/** Newest first. The order here is the order on the index. */
export const POSTS: Post[] = [
  {
    slug: "will-this-job-sponsor-you",
    title: "How to tell whether a job will sponsor you — before you apply",
    description:
      "Sponsorship is rarely stated outright in a job ad. Here is what actually predicts it, what to ignore, and how to check a company in about five minutes.",
    publishedAt: "2026-10-14",
    author: "Rohan Malyadri",
    tags: ["Sponsorship", "Research"],
    blocks: [
      {
        kind: "paragraph",
        text: "The single most expensive mistake in an international job search is spending three weeks on applications for roles you were never eligible for. Job ads are written by people optimising for applicant volume, not for your clarity, so sponsorship is usually either absent from the post or buried in a sentence that means less than it appears to.",
      },
      { kind: "heading", text: "What the wording actually means" },
      {
        kind: "paragraph",
        text: "A few phrases recur often enough to be worth decoding. None of them is a guarantee, but together they move the odds a long way.",
      },
      {
        kind: "list",
        items: [
          "“Must have the right to work in <country>” — almost always means no sponsorship. Treat it as a no unless something else contradicts it.",
          "“Visa sponsorship available for exceptional candidates” — sponsorship exists as a process, but the bar is higher than the advertised one. Worth applying to if you are genuinely senior for the role.",
          "“We are unable to sponsor at this time” — a real no, and usually honest about being temporary. Note the company and check again in two quarters.",
          "Silence — the most common case, and genuinely ambiguous. This is where the company's history matters more than the ad.",
        ],
      },
      { kind: "heading", text: "The five-minute check" },
      {
        kind: "paragraph",
        text: "Instead of reading the ad harder, look at what the company has already done. Past sponsorship is the best available predictor of future sponsorship, and in several countries it is a matter of public record.",
      },
      {
        kind: "list",
        ordered: true,
        items: [
          "Check the public sponsor register for your target country. The UK publishes a list of licensed sponsors; Ireland, the Netherlands and Australia publish equivalents. If the company is not on it, sponsorship is not merely unlikely — it is not currently possible.",
          "Look at where the team actually is. A company with one office and no relocation history is a different proposition from one with five and an internal mobility team.",
          "Read the careers page, not the job board listing. Companies that sponsor routinely tend to say so once, in one place, rather than on every ad.",
          "Check whether the specific role is one they would sponsor. Many companies sponsor engineers and not support staff, for structural reasons rather than snobbery.",
        ],
      },
      {
        kind: "callout",
        title: "What Skylark does with this",
        text: "Every role in your feed is scored on eligibility and sponsorship as two separate factors, using the company's sponsorship history rather than the wording of the ad. When a role is blocked on eligibility, the score says so in writing instead of quietly ranking it lower.",
      },
      { kind: "heading", text: "When to apply anyway" },
      {
        kind: "paragraph",
        text: "There is a real case for applying to a role that does not advertise sponsorship: when you are clearly above the bar, when the company is on the sponsor register, and when you can say in one line why hiring you is worth the paperwork. What does not work is applying to fifty of them and hoping. That is the behaviour the eligibility filter exists to stop.",
      },
      {
        kind: "paragraph",
        text: "The goal is not to apply to fewer jobs out of caution. It is to spend the same effort on the roles that can actually end in an offer.",
      },
    ],
  },
  {
    slug: "answer-the-forms-once",
    title: "The questions every application form asks — and how to answer them once",
    description:
      "Work authorisation, background checks, EEO self-identification: the same two dozen questions, every time. Here is what each one is really asking, and why a blank is safer than a guess.",
    publishedAt: "2026-10-09",
    author: "Abhiram Meda",
    tags: ["Applications", "Practical"],
    blocks: [
      {
        kind: "paragraph",
        text: "If you have applied through Workday, Greenhouse or Taleo more than twice, you have answered the same questions repeatedly: are you over 18, do you need sponsorship now, will you need it in future, have you worked here before, are you related to an employee, will you consent to a background check. The wording moves around. The substance does not.",
      },
      { kind: "heading", text: "Four questions people get wrong" },
      {
        kind: "paragraph",
        text: "Most of the form is mechanical. A handful of questions are regularly answered incorrectly, usually by people trying to be helpful rather than accurate.",
      },
      {
        kind: "list",
        items: [
          "“Are you authorised to work in <country>?” and “Will you require sponsorship?” are two different questions. A student visa holder with current work rights often answers yes to the first and yes to the second. Answering no to the second because you can work today is a misstatement that surfaces later.",
          "“Can you perform the essential functions of this role, with or without reasonable accommodation?” The second clause is the point. It is not asking whether you need no accommodation.",
          "“Have you previously applied to or worked for us?” Recruiters can see this. Saying no when a prior application exists is an unforced error, and prior applications are almost never held against you.",
          "Criminal history questions. In most jurisdictions a conviction is not a bar to most roles. An inaccurate answer is, because it is grounds for withdrawal at any later point, including after you start.",
        ],
      },
      { kind: "heading", text: "The EEO section" },
      {
        kind: "paragraph",
        text: "US employers above a certain size are required to invite self-identification on gender, race or ethnicity, veteran status and disability. You are never required to answer. The data is collected for aggregate reporting and is supposed to be kept away from the people assessing you.",
      },
      {
        kind: "paragraph",
        text: "“I decline to answer” is a complete answer and carries no penalty. If you do answer, it should be because you want to, not because a form implied it was mandatory.",
      },
      {
        kind: "callout",
        title: "How we handle it",
        text: "Skylark stores your self-identification apart from everything else. It never reaches your match scores, your ranking or any AI prompt, and the database revokes read access to it from every browser session — including your own, so your answers come to you through the server rather than sitting in a page. A specialist can only read it by naming the form that needs it, and every one of those unlocks is written to the audit log.",
      },
      { kind: "heading", text: "Why a blank beats a guess" },
      {
        kind: "paragraph",
        text: "When we built the answer vault we had a choice: default the yes/no questions to “No” so the form looks finished, or leave them visibly unanswered. We left them unanswered, and we will not submit an application until the required ones are filled in.",
      },
      {
        kind: "paragraph",
        text: "It is the less convenient option and it is the only defensible one. A pre-filled “No” on a question about sponsorship or prior employment is not a tidy form — it is a wrong answer submitted in your name.",
      },
      {
        kind: "quote",
        text: "Answer them once, carefully. Then let them be reused a few hundred times without being retyped.",
      },
    ],
  },
  {
    slug: "what-application-volume-really-looks-like",
    title: "What a realistic application volume actually looks like",
    description:
      "Ten good applications a day beats fifty bad ones, and both beat the spreadsheet you abandoned in week two. An honest look at the numbers.",
    publishedAt: "2026-10-02",
    author: "Rohan Malyadri",
    tags: ["Strategy", "Honesty"],
    blocks: [
      {
        kind: "paragraph",
        text: "Every service in this category advertises a number of applications per day, and the numbers keep going up. It is worth being precise about what that number can and cannot mean.",
      },
      { kind: "heading", text: "Where the time actually goes" },
      {
        kind: "paragraph",
        text: "A single considered application is roughly: find the role, check you are eligible, read the requirements properly, adjust your CV so the relevant work is near the top, fill in the portal, and record what you sent. Done honestly, that is fifteen to forty minutes. Six of those is a working evening, and most people sustain it for about nine days.",
      },
      {
        kind: "paragraph",
        text: "The part that scales is the mechanical middle: the portal, the repeated questions, the tracking. The part that does not scale is deciding whether a role is worth applying to at all.",
      },
      { kind: "heading", text: "What a daily quota should mean" },
      {
        kind: "list",
        items: [
          "A ceiling, not a target to be hit regardless of supply. On a quiet week in a narrow discipline there may genuinely not be 25 roles worth applying to.",
          "Applications you could defend one by one, each with a confirmation reference you can check.",
          "A number you can lower. Plenty of candidates in final-round interviews want five a day, not forty.",
        ],
      },
      {
        kind: "callout",
        title: "A short day is a short day",
        text: "If fewer roles clear your score floor than your quota allows, we report the real number and the reason. The alternative — padding the count with roles you did not want — produces a nicer chart and a worse job search.",
      },
      { kind: "heading", text: "The number that matters instead" },
      {
        kind: "paragraph",
        text: "Response rate, measured against applications actually submitted. It is the only figure that tells you whether your targeting is working, and it is the first thing to look at when a search stalls. A falling response rate with a rising application count is the clearest possible signal that volume has replaced judgement.",
      },
      {
        kind: "paragraph",
        text: "If you take one thing from this: pick a volume you can sustain for three months, hold the quality bar fixed, and change your targeting rather than your throughput when the responses do not come.",
      },
    ],
  },
  {
    slug: "reading-your-match-score",
    title: "Reading your match score: what the seven factors mean",
    description:
      "A percentage on its own is marketing. Here is what each factor in a Skylark match score measures, how they are weighted, and when to ignore the number entirely.",
    publishedAt: "2026-09-24",
    author: "Abhiram Meda",
    tags: ["Product", "Matching"],
    blocks: [
      {
        kind: "paragraph",
        text: "A match score is only useful if you can see what produced it. Ours is built from seven factors, each scored separately, each with a written reason, and each visible on the role itself.",
      },
      { kind: "heading", text: "The seven factors" },
      {
        kind: "list",
        items: [
          "Skills — how much of what the role asks for you can already evidence, including skills backed by your public repositories.",
          "Experience — seniority and years against what the posting actually requires, not against its job title.",
          "Education — relevant where a role or a visa route genuinely requires it, and weighted low where it does not.",
          "Eligibility — whether you can legally take the role. This one can cap the whole score.",
          "Location — the role's location against where you are and where you would move.",
          "Sponsorship — the employer's sponsorship history against whether you need it.",
          "Preferences — the things you told us you want, which stop a technically perfect match from being a role you would hate.",
        ],
      },
      { kind: "heading", text: "Why eligibility caps the score" },
      {
        kind: "paragraph",
        text: "A role you cannot legally take is not a 70% match with one problem. It is not a match. When eligibility is blocked the score is capped rather than averaged, because averaging it would let a strong skills fit hide a hard blocker — which is exactly the failure that wastes a month of someone's search.",
      },
      {
        kind: "callout",
        title: "Transferable versus missing",
        text: "Skills you lack are split into two lists on purpose. “Transferable” means something you already have maps onto the requirement and is worth naming in your application. “Missing” means it genuinely is not there — useful for deciding what to learn next, and more useful than a single number.",
      },
      { kind: "heading", text: "When to ignore the score" },
      {
        kind: "paragraph",
        text: "Two cases. First, when you know something the model does not: a referral, a prior conversation, a side project that is not in your profile yet. Second, when the score is high but the written reasons are thin — a score built mostly from keyword overlap on a vague posting deserves less weight than its number suggests.",
      },
      {
        kind: "paragraph",
        text: "The score is there to order your week, not to make your decisions. If the reasons do not convince you, the number should not either.",
      },
    ],
  },
];

/** ~200 words a minute, rounded up, with a one-minute floor. */
export function readingMinutes(post: Post) {
  const words = post.blocks.reduce((n, b) => {
    const text = b.kind === "list" ? b.items.join(" ") : b.kind === "callout" ? `${b.title} ${b.text}` : b.text;
    return n + text.trim().split(/\s+/).filter(Boolean).length;
  }, post.title.split(/\s+/).length);
  return Math.max(1, Math.ceil(words / 200));
}

export const allPosts = () => [...POSTS].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

export const postBySlug = (slug: string) => POSTS.find((p) => p.slug === slug) ?? null;

/** Posts sharing at least one tag, newest first, excluding the post itself. */
export function relatedPosts(post: Post, limit = 2) {
  return allPosts()
    .filter((p) => p.slug !== post.slug && p.tags.some((t) => post.tags.includes(t)))
    .slice(0, limit);
}
