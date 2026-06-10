import { runRevenueSimulation } from "../src/services/vluer/revenueSimulatorEngine.js";

const r = runRevenueSimulation({
  referralChannel: "promo",
  billingCycle: "monthly",
  personalMemberCount: 200,
  b2bLineCount: 20
});
console.log(JSON.stringify(r, null, 2));
