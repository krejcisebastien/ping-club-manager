// Rappels quotidiens (séance du lendemain, présences à encoder, stage dans deux
// jours, licence bientôt échue) : voir src/lib/reminders.js.
// Usage : npm run reminders        Planifié dans cron.json (Scalingo, heure UTC).
import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";
import { runReminders } from "../src/lib/reminders.js";

const counts = await runReminders();
console.log(
  `Rappels envoyés : ${counts.sessions} séance(s) de demain, ${counts.attendance} présence(s) à encoder, ${counts.camps} stage(s), ${counts.license} licence(s).`,
);
await prisma.$disconnect();
