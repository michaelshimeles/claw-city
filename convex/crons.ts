/**
 * Cron job definitions for ClawCity
 */

import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run the tick every 15 seconds
crons.interval("worldTick", { seconds: 15 }, internal.tickRunner.runTick);

export default crons;
