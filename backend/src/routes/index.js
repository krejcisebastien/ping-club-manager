import { Router } from "express";
import authRoutes from "./auth.routes.js";
import clubsRoutes from "./clubs.routes.js";
import billingRoutes from "./billing.routes.js";
import platformRoutes from "./platform.routes.js";
import seasonsRoutes from "./seasons.routes.js";
import playersRoutes from "./players.routes.js";
import coachesRoutes from "./coaches.routes.js";
import sparringsRoutes from "./sparrings.routes.js";
import groupsRoutes from "./groups.routes.js";
import trainingsRoutes from "./trainings.routes.js";
import occurrencesRoutes from "./occurrences.routes.js";
import campsRoutes from "./camps.routes.js";
import campPeriodGroupsRoutes from "./campPeriodGroups.routes.js";
import exercisesRoutes from "./exercises.routes.js";
import trainingPlansRoutes from "./trainingPlans.routes.js";
import dashboardRoutes from "./dashboard.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/clubs", clubsRoutes);
router.use("/billing", billingRoutes);
router.use("/platform", platformRoutes);
router.use("/seasons", seasonsRoutes);
router.use("/players", playersRoutes);
router.use("/coaches", coachesRoutes);
router.use("/sparrings", sparringsRoutes);
router.use("/groups", groupsRoutes);
router.use("/trainings", trainingsRoutes);
router.use("/occurrences", occurrencesRoutes);
router.use("/camps", campsRoutes);
router.use("/camp-period-groups", campPeriodGroupsRoutes);
router.use("/exercises", exercisesRoutes);
router.use("/training-plans", trainingPlansRoutes);
router.use("/dashboard", dashboardRoutes);

export default router;
