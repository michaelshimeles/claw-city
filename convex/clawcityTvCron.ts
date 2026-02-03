import { internalAction } from "./_generated/server";

export const triggerDailyGeneration = internalAction({
  args: {},
  handler: async () => {
    const url = process.env.CLAWCITYTV_TRIGGER_URL;
    const secret = process.env.CLAWCITYTV_TRIGGER_SECRET;

    if (!url || !secret) {
      throw new Error("Missing CLAWCITYTV_TRIGGER_URL or CLAWCITYTV_TRIGGER_SECRET");
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "x-clawcitytv-secret": secret,
      },
    });

    const body = await response.text();

    if (!response.ok) {
      throw new Error(`ClawCityTV trigger failed: ${response.status} ${body}`);
    }

    return {
      ok: true,
      status: response.status,
      body: body.slice(0, 2000),
    };
  },
});
