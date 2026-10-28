import nodemailer from "nodemailer";

// Envoi par SMTP (boîte mail OVH du domaine, hébergée en France). Expéditeur
// sur le domaine de l'app : avec SPF et DKIM du domaine, les mails évitent les spams.
const SMTP_HOST = process.env.SMTP_HOST || "ssl0.ovh.net";
const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
const SMTP_USER = process.env.SMTP_USER;
const MAIL_FROM = process.env.MAIL_FROM || SMTP_USER;

let transporter = null;
function getTransporter() {
  if (!SMTP_USER || !process.env.SMTP_PASSWORD) {
    throw new Error("Envoi d'email indisponible : SMTP_USER et SMTP_PASSWORD ne sont pas configurées.");
  }
  transporter ??= nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: process.env.SMTP_PASSWORD },
  });
  return transporter;
}

// Version texte jointe au HTML : un mail sans alternative texte est plus
// souvent classé en spam. Les liens restent lisibles (« texte (url) »).
function htmlToText(html) {
  return html
    .replace(/<a\s[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "$2 ($1)")
    .replace(/<\/p>|<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

export async function sendEmail({ to, subject, html }) {
  try {
    await getTransporter().sendMail({ from: MAIL_FROM, to, subject, html, text: htmlToText(html) });
  } catch (err) {
    throw new Error(`Échec de l'envoi de l'email : ${err.message}`);
  }
}
