import { Router } from "express";

import {getStates} from "../controllers/state.controller"

const router = Router();

router.get("/", getStates);

export default router;