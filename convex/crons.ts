/**
 * Cron job definitions for ClawCity
 */

import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run the tick every minute
crons.interval("worldTick", { minutes: 1 }, internal.tickRunner.runTick);

export default crons;
