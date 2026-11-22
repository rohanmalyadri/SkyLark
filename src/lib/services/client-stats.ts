import { CLIENT_PAYMENT_STATUSES, CLIENT_STATUSES, type Client, type ClientMessage, type ClientPaymentStatus, type ClientStatus } from "@/lib/domain/types";

/*
 * Every number on the client dashboard is derived here from the records themselves, so the
 * totals can never drift from what the client list and payments table show.
 */

export interface ThreadSummary {
  client: Client;
  lastMessage: ClientMessage | null;
  unread: number;
  total: number;
}

export interface ClientSummary {
  totalClients: number;
  paidClients: number;
  /** Clients still being talked to: new leads and open discussions. */
  pendingDiscussions: number;
  /** Sum of amounts on paid records, in rupees. */
  revenue: number;
  /** Of `revenue`, how much a payment gateway confirmed. The rest is staff-entered. */
  verifiedRevenue: number;
  /** Agreed amounts that haven't been paid yet. */
  outstanding: number;
  averageDeal: number;
  unread: number;
  byStatus: Record<ClientStatus, number>;
  byPayment: Record<ClientPaymentStatus, { count: number; amount: number }>;
  revenueByClient: { id: string; name: string; amount: number }[];
  messagesPerDay: { date: string; count: number }[];
}

const isUnread = (m: ClientMessage) => m.direction === "inbound" && !m.readAt;

export function threadSummaries(clients: Client[], messages: ClientMessage[]): ThreadSummary[] {
  const byClient = new Map<string, ClientMessage[]>();
  for (const m of messages) {
    const list = byClient.get(m.clientId) ?? [];
    list.push(m);
    byClient.set(m.clientId, list);
  }
  return clients
    .map((client) => {
      const list = (byClient.get(client.id) ?? []).toSorted((a, b) => a.createdAt.localeCompare(b.createdAt));
      return { client, lastMessage: list.at(-1) ?? null, unread: list.filter(isUnread).length, total: list.length };
    })
    .sort((a, b) => (b.lastMessage?.createdAt ?? b.client.createdAt).localeCompare(a.lastMessage?.createdAt ?? a.client.createdAt));
}

export function summarizeClients(clients: Client[], messages: ClientMessage[], now: string, days = 14): ClientSummary {
  const byStatus = Object.fromEntries(CLIENT_STATUSES.map((s) => [s, 0])) as Record<ClientStatus, number>;
  const byPayment = Object.fromEntries(CLIENT_PAYMENT_STATUSES.map((s) => [s, { count: 0, amount: 0 }])) as ClientSummary["byPayment"];
  let revenue = 0;
  let verifiedRevenue = 0;
  let outstanding = 0;

  for (const c of clients) {
    byStatus[c.status]++;
    byPayment[c.paymentStatus].count++;
    byPayment[c.paymentStatus].amount += c.amount ?? 0;
    if (c.paymentStatus === "paid") {
      revenue += c.amount ?? 0;
      if (c.paymentSource === "gateway") verifiedRevenue += c.amount ?? 0;
    } else if ((c.paymentStatus === "pending" || c.paymentStatus === "unpaid") && c.amount) {
      outstanding += c.amount;
    }
  }

  const paidClients = byPayment.paid.count;
  const end = new Date(now).getTime();
  const dates = Array.from({ length: days }, (_, i) => new Date(end - (days - 1 - i) * 86_400_000).toISOString().slice(0, 10));
  const counts = new Map(dates.map((d) => [d, 0]));
  for (const m of messages) {
    const d = m.createdAt.slice(0, 10);
    if (counts.has(d)) counts.set(d, counts.get(d)! + 1);
  }

  return {
    totalClients: clients.length,
    paidClients,
    pendingDiscussions: byStatus.in_discussion + byStatus.lead,
    revenue,
    verifiedRevenue,
    outstanding,
    averageDeal: paidClients ? Math.round(revenue / paidClients) : 0,
    unread: messages.filter(isUnread).length,
    byStatus,
    byPayment,
    revenueByClient: clients
      .filter((c) => c.paymentStatus === "paid" && c.amount)
      .map((c) => ({ id: c.id, name: c.name, amount: c.amount! }))
      .sort((a, b) => b.amount - a.amount),
    messagesPerDay: dates.map((date) => ({ date, count: counts.get(date)! })),
  };
}
