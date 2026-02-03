/**
 * Cron job definitions for ClawCity
 */

import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run the tick every 15 seconds
crons.interval("worldTick", { seconds: 15 }, internal.tickRunner.runTick);

// ClawCityTV daily episode trigger (12:00 PM EST = 17:00 UTC)
crons.cron(
  "clawcityTvDaily",
  "0 17 * * *",
  internal.clawcityTvCron.triggerDailyGeneration
);

export default crons;
