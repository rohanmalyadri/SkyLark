import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { mailerConfigured, serverEnv } from "@/lib/env";
import { AppError } from "./errors";
import { logger } from "./logger";

export interface OutgoingMail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

let transport: Transporter | null = null;

function getTransport(): Transporter {
  if (transport) return transport;
  const env = serverEnv();
  transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
    // A slow mail server must not hang the request.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
  return transport;
}

/** Sends one email over SMTP (Gmail by default). Throws an AppError the person can read if it fails. */
export async function sendMail(mail: OutgoingMail): Promise<void> {
  if (!mailerConfigured()) throw new AppError("internal", "Email sending isn't set up on this server yet.");
  const env = serverEnv();
  try {
    await getTransport().sendMail({ from: env.EMAIL_FROM || `Skylark <${env.SMTP_USER}>`, ...mail });
  } catch (err) {
    logger.error("mail.send_failed", { error: err, host: env.SMTP_HOST });
    throw new AppError("internal", "We couldn't send the email just now. Please try again in a minute.");
  }
}
