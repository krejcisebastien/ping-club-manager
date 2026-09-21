import { Router } from "express";
import Stripe from "stripe";
import { prisma } from "../lib/prisma.js";
import { getLicense, invalidateLicense } from "../lib/license.js";
import { requireAuthAnyLicense, requireRole } from "../middleware/auth.js";

const router = Router();

const FRONTEND_URL = (process.env.CORS_ORIGIN || "http://localhost:5173").split(",")[0].trim();
const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

// Paiement en ligne optionnel : sans clé Stripe, seule l'activation manuelle
// (npm run club -- license) fonctionne.
const stripeClient = () => (process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null);
const onlinePaymentEnabled = () => !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID);

const latest = (a, b) => (a && a > b ? a : b);

// Ces routes restent accessibles sans licence valide : c'est justement là que
// le club vient en obtenir une.
router.use(requireAuthAnyLicense);

router.get("/status", async (req, res) => {
  const license = await getLicense(req.user.clubId);
  res.json({
    status: license.status,
    active: license.active,
    endsAt: license.endsAt,
    graceEndsAt: license.graceEndsAt,
    daysLeft: license.daysLeft,
    onlinePaymentEnabled: onlinePaymentEnabled(),
    hasSubscription: license.hasCustomer,
  });
});

router.post("/checkout", requireRole("ADMIN"), async (req, res) => {
  const stripe = stripeClient();
  if (!stripe || !onlinePaymentEnabled()) {
    return res.status(503).json({ error: "Le paiement en ligne n'est pas disponible pour le moment." });
  }
  const club = await prisma.club.findUnique({ where: { id: req.user.clubId } });
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
    client_reference_id: club.id,
    ...(club.stripeCustomerId ? { customer: club.stripeCustomerId } : { customer_email: req.user.email }),
    allow_promotion_codes: true,
    success_url: `${FRONTEND_URL}/license?checkout=success`,
    cancel_url: `${FRONTEND_URL}/license?checkout=cancelled`,
  });
  res.json({ url: session.url });
});

// Portail Stripe : changer de carte, télécharger les factures, résilier.
router.post("/portal", requireRole("ADMIN"), async (req, res) => {
  const stripe = stripeClient();
  const club = await prisma.club.findUnique({ where: { id: req.user.clubId } });
  if (!stripe || !club.stripeCustomerId) {
    return res.status(400).json({ error: "Aucun abonnement en ligne pour ce club." });
  }
  const session = await stripe.billingPortal.sessions.create({
    customer: club.stripeCustomerId,
    return_url: `${FRONTEND_URL}/license`,
  });
  res.json({ url: session.url });
});

export default router;

// Webhook Stripe (monté dans app.js avec le corps brut, avant express.json :
// la signature se vérifie sur les octets exacts reçus).
export async function stripeWebhook(req, res) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return res.status(503).json({ error: "Webhook Stripe non configuré." });

  let event;
  try {
    event = Stripe.webhooks.constructEvent(req.body, req.headers["stripe-signature"], secret);
  } catch {
    return res.status(400).json({ error: "Signature invalide." });
  }

  const object = event.data.object;

  if (event.type === "checkout.session.completed" && object.payment_status === "paid" && object.client_reference_id) {
    // Activation immédiate d'un an ; invoice.paid ajuste ensuite à la fin de
    // période exacte facturée par Stripe.
    const club = await prisma.club.findUnique({ where: { id: object.client_reference_id } });
    if (club) {
      await prisma.club.update({
        where: { id: club.id },
        data: {
          stripeCustomerId: object.customer,
          stripeSubscriptionId: object.subscription ?? null,
          licenseEndsAt: latest(club.licenseEndsAt, new Date(Date.now() + YEAR_MS)),
        },
      });
      invalidateLicense(club.id);
    }
  } else if (event.type === "invoice.paid") {
    const club = await prisma.club.findUnique({ where: { stripeCustomerId: object.customer } });
    const periodEnds = (object.lines?.data ?? []).map((line) => line.period?.end).filter(Boolean);
    if (club && periodEnds.length) {
      await prisma.club.update({
        where: { id: club.id },
        data: { licenseEndsAt: latest(club.licenseEndsAt, new Date(Math.max(...periodEnds) * 1000)) },
      });
      invalidateLicense(club.id);
    }
  }

  res.json({ received: true });
}
