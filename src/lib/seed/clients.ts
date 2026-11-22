import type { Client, ClientMessage, ClientNote } from "@/lib/domain/types";

/*
 * Starting CRM records. The three clients, their amounts and payment statuses were supplied
 * by the business. Their conversations are illustrations written for the demo: every message
 * is flagged `sample` so the UI labels it, and nothing here invents a payment date, method,
 * receipt or transaction reference.
 */

const TEAM = "Skylark team";

interface SeedMessage {
  /** Hours before the seed time. */
  ago: number;
  from: "client" | "team";
  body: string;
  /** Inbound messages the team hasn't opened yet. */
  unread?: boolean;
}

interface SeedClient {
  id: string;
  client: Omit<Client, "id" | "createdAt" | "updatedAt" | "lastInteractionAt" | "currency">;
  createdDaysAgo: number;
  messages: SeedMessage[];
  notes: { ago: number; body: string }[];
}

export const SEED_CLIENTS: SeedClient[] = [
  {
    id: "c1a2b3c4-0001-4000-8000-000000000001",
    createdDaysAgo: 12,
    client: {
      name: "Pasupuleti Rithvik",
      email: "",
      phone: "",
      company: "",
      city: "",
      status: "active",
      amount: 4572,
      paymentStatus: "paid",
      paymentSource: "manual",
      paidAt: null,
      paymentMethod: null,
      paymentReference: null,
      userId: null,
    },
    messages: [
      { ago: 262, from: "client", body: "Hi, I came across Skylark through a friend. I'm a final-year CSE student looking for backend developer roles. How exactly does your service work?" },
      { ago: 260, from: "team", body: "Hi Rithvik, thanks for reaching out! You build your profile with us once, we match it against live openings, and a specialist reviews every application before it goes out. Nothing is sent without a human checking it first." },
      { ago: 259, from: "client", body: "That sounds useful. I've been applying on my own for two months and barely hearing back. Would you also help with my resume?" },
      { ago: 258, from: "team", body: "Yes. We tailor the resume and cover letter to each role you approve, and the specialist flags anything that weakens it, like missing project links or vague bullet points. For where you are, the starter plan covers it well. It comes to ₹4,572." },
      { ago: 236, from: "client", body: "Okay, I discussed it at home and I'd like to go ahead with it." },
      { ago: 235, from: "team", body: "Great to hear. I'll share the payment details here. Once it's done, just drop a message and we'll get your onboarding started." },
      { ago: 214, from: "client", body: "Done, I've paid the ₹4,572. Please check and confirm." },
      { ago: 212, from: "team", body: "Got it, thank you! We've marked your payment as received. Next step: please finish the profile in the app (education, projects and skills). That's what the matching runs on." },
      { ago: 190, from: "client", body: "Profile is complete. I added my GitHub and the two internship projects." },
      { ago: 187, from: "team", body: "Looks good. Your specialist has started reviewing it and will send your first shortlist of roles within two working days. You'll see each match with the reasons it scored the way it did." },
      { ago: 30, from: "client", body: "Got the shortlist, thanks! A couple of these companies I hadn't even heard of but they look like a good fit.", unread: true },
    ],
    notes: [
      { ago: 211, body: "Payment marked as received after the client said he'd paid. Entered by staff, not confirmed by a payment gateway." },
      { ago: 186, body: "Strong Java/Spring projects. Prioritise backend roles in Hyderabad and Bengaluru, open to remote." },
    ],
  },
  {
    id: "c1a2b3c4-0002-4000-8000-000000000002",
    createdDaysAgo: 18,
    client: {
      name: "Harsha Gottipati",
      email: "",
      phone: "",
      company: "",
      city: "",
      status: "active",
      amount: 13902,
      paymentStatus: "paid",
      paymentSource: "manual",
      paidAt: null,
      paymentMethod: null,
      paymentReference: null,
      userId: null,
    },
    messages: [
      { ago: 410, from: "client", body: "Hello, I have about 4 years of experience as a data analyst and I'm trying to move into data engineering. I don't have much time to apply during the week. Can your team handle the applications for me?" },
      { ago: 408, from: "team", body: "Hi Harsha, yes, that's exactly what our managed plan is for. We shortlist roles that fit, tailor your documents for each one, and a specialist submits them after you approve the list. You keep full control over where your name goes." },
      { ago: 404, from: "client", body: "What would you need from me to get started? And roughly how many applications per week are we talking about?" },
      { ago: 402, from: "team", body: "From you: an updated resume, your target cities, expected CTC and notice period, and any companies you'd rather avoid. On volume, we aim for quality over quantity, typically 15 to 20 well-matched applications a week once your profile is approved." },
      { ago: 380, from: "client", body: "Makes sense. My main ask is that the resume shows the pipeline work I've done in Airflow and dbt, since my title still says analyst." },
      { ago: 378, from: "team", body: "Noted, that's a common gap and very fixable. We'll lead with the engineering work and the results it produced. For the managed plan with tailoring on every application, the total is ₹13,902." },
      { ago: 350, from: "client", body: "Okay, let's do it. I've just made the payment of ₹13,902." },
      { ago: 347, from: "team", body: "Thank you, Harsha. We've marked the payment as received and your account is upgraded. Your specialist will reach out within one working day to go through the profile." },
      { ago: 300, from: "team", body: "Hi Harsha, I've gone through your profile. Two things before we start: could you add the scale of the pipelines (rows per day or number of sources) and confirm your notice period is 60 days?" },
      { ago: 296, from: "client", body: "Yes, 60 days, negotiable to 45. The main pipeline pulls from 14 sources, roughly 30 million rows a day. Updated the profile with both." },
      { ago: 290, from: "team", body: "Perfect, that makes a real difference. Here's what to expect: first tailored resume for your review by Thursday, then the first batch of applications goes out after you approve it. You'll get a summary every evening of what was sent." },
      { ago: 120, from: "client", body: "Reviewed the resume, it reads much better. Approved. Happy for you to start sending." },
      { ago: 118, from: "team", body: "Thanks for the quick turnaround! The first batch goes out tomorrow. We'll keep you posted here and on the daily summary." },
    ],
    notes: [
      { ago: 346, body: "Payment marked as received on the client's word. Entered by staff, not confirmed by a payment gateway." },
      { ago: 289, body: "Transitioning analyst → data engineer. Lead with Airflow/dbt pipeline work (14 sources, ~30M rows/day). Notice period 60 days, negotiable to 45." },
    ],
  },
  {
    id: "c1a2b3c4-0003-4000-8000-000000000003",
    createdDaysAgo: 5,
    client: {
      name: "Shashank Gorra",
      email: "",
      phone: "",
      company: "",
      city: "",
      status: "in_discussion",
      amount: null,
      paymentStatus: "unpaid",
      paymentSource: "manual",
      paidAt: null,
      paymentMethod: null,
      paymentReference: null,
      userId: null,
    },
    messages: [
      { ago: 118, from: "client", body: "Hi, I'm a frontend developer with 2 years at a service company. I want to move to a product company. Is this something you help with, or is it only for freshers?" },
      { ago: 116, from: "team", body: "Hi Shashank! Definitely not only freshers. Moving from services to product is one of the most common goals we work on. What does your current stack look like?" },
      { ago: 113, from: "client", body: "Mostly React and TypeScript, some Next.js. I've also done a bit of Node on the side but nothing in production." },
      { ago: 111, from: "team", body: "That's a good stack for product roles. Would you want us to handle applications end to end, or would you prefer we match and tailor while you submit yourself?" },
      { ago: 95, from: "client", body: "I'm not sure yet. What's the price difference between the two? And is there a refund if I get a job in the first couple of weeks?" },
      { ago: 93, from: "team", body: "Fair questions. The self-apply plan with matching and tailoring is the lower tier, and the managed plan where our specialists submit for you costs more because of the hands-on time. I'll send you the exact figures for both so you can compare. On refunds, our payments are one-time and non-refundable, so we'd rather you pick the plan that fits from the start." },
      { ago: 70, from: "client", body: "Okay. Can I talk to someone on a call before deciding? I want to understand how the review step works.", unread: false },
      { ago: 68, from: "team", body: "Of course. Would tomorrow or Friday evening work for a 20-minute call?" },
      { ago: 20, from: "client", body: "Friday evening works, around 7 pm?", unread: true },
      { ago: 19, from: "client", body: "Also, could you share a sample of a tailored resume? I want to see what changes you actually make.", unread: true },
    ],
    notes: [
      { ago: 92, body: "Comparing self-apply vs managed. Price-sensitive and asked about refunds. Told him payments are one-time and non-refundable per the Terms." },
      { ago: 67, body: "Wants a call before deciding. No amount agreed yet, so leave the amount empty until he picks a plan." },
    ],
  },
];

/** Materialises the seed relative to `now`, so the sample conversations always look recent. */
export function buildClientSeed(now = Date.now()) {
  const at = (hoursAgo: number) => new Date(now - hoursAgo * 3_600_000).toISOString();
  const clients: Client[] = [];
  const messages: ClientMessage[] = [];
  const notes: ClientNote[] = [];

  for (const seed of SEED_CLIENTS) {
    const created = new Date(now - seed.createdDaysAgo * 86_400_000).toISOString();
    seed.messages.forEach((m, i) => {
      const sent = at(m.ago);
      messages.push({
        id: `${seed.id.slice(0, 24)}${String(i + 1).padStart(12, "0")}`,
        clientId: seed.id,
        direction: m.from === "client" ? "inbound" : "outbound",
        authorName: m.from === "client" ? seed.client.name : TEAM,
        authorId: null,
        body: m.body,
        sample: true,
        readAt: m.from === "client" && !m.unread ? sent : null,
        createdAt: sent,
      });
    });
    seed.notes.forEach((n, i) => {
      notes.push({ id: `${seed.id.slice(0, 24)}${String(900 + i).padStart(12, "0")}`, clientId: seed.id, authorId: null, authorName: TEAM, body: n.body, createdAt: at(n.ago) });
    });
    const last = Math.min(...seed.messages.map((m) => m.ago));
    clients.push({ ...seed.client, id: seed.id, currency: "INR", lastInteractionAt: at(last), createdAt: created, updatedAt: at(last) });
  }
  return { clients, messages, notes };
}
