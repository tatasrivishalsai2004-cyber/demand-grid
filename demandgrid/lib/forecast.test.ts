import { recommend } from "./forecast";
const r = recommend({ stock: 40, daily: 10, leadDays: 2, safety: 10 });
if (r.qty !== 130 || Math.round(r.daysLeft) !== 4) throw new Error("Expected 130 units / 4 days, got " + JSON.stringify(r));
console.log("forecast ok", r.qty, r.daysLeft);
