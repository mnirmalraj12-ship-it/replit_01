import { Router, type IRouter } from "express";
import healthRouter from "./health";
import nutriPlanRouter from "./nutriplan";

const router: IRouter = Router();

router.use(healthRouter);
router.use(nutriPlanRouter);

export default router;
