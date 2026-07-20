// Realistic demo data for the enterprise dashboard.

export const revenueSeries = [
  { m: "Aug", revenue: 3.4, profit: 0.62, target: 3.2 },
  { m: "Sep", revenue: 3.8, profit: 0.71, target: 3.5 },
  { m: "Oct", revenue: 4.1, profit: 0.83, target: 3.8 },
  { m: "Nov", revenue: 4.6, profit: 0.94, target: 4.1 },
  { m: "Dec", revenue: 5.2, profit: 1.08, target: 4.5 },
  { m: "Jan", revenue: 4.9, profit: 0.98, target: 4.8 },
  { m: "Feb", revenue: 5.4, profit: 1.12, target: 5.0 },
  { m: "Mar", revenue: 5.9, profit: 1.27, target: 5.3 },
  { m: "Apr", revenue: 6.3, profit: 1.38, target: 5.7 },
  { m: "May", revenue: 6.8, profit: 1.52, target: 6.0 },
  { m: "Jun", revenue: 7.4, profit: 1.71, target: 6.4 },
  { m: "Jul", revenue: 8.1, profit: 1.94, target: 6.9 },
];

export type Commodity = {
  symbol: string;
  name: string;
  price: number;
  unit: string;
  change: number;
  spark: number[];
};

export const commodities: Commodity[] = [
  { symbol: "WHT", name: "Wheat", price: 274.5, unit: "USD/MT", change: 2.4, spark: [261, 264, 268, 262, 270, 273, 274] },
  { symbol: "CFE", name: "Arabica Coffee", price: 4920, unit: "USD/MT", change: -1.2, spark: [5010, 4990, 4970, 4980, 4960, 4940, 4920] },
  { symbol: "RCE", name: "Basmati Rice", price: 1180, unit: "USD/MT", change: 0.8, spark: [1150, 1160, 1155, 1170, 1168, 1175, 1180] },
  { symbol: "OIL", name: "Olive Oil", price: 6.4, unit: "USD/L", change: 3.6, spark: [5.9, 6.0, 6.1, 6.2, 6.3, 6.3, 6.4] },
  { symbol: "SGR", name: "Raw Sugar", price: 512, unit: "USD/MT", change: -0.4, spark: [520, 518, 516, 515, 514, 513, 512] },
  { symbol: "CTN", name: "Cotton", price: 1.82, unit: "USD/lb", change: 1.1, spark: [1.76, 1.78, 1.79, 1.8, 1.81, 1.81, 1.82] },
];

export const smartNotifications = [
  { id: "n1", severity: "critical", title: "Shipment SHP-8837 delayed", body: "Port congestion at Felixstowe. New ETA +36h.", time: "8m" },
  { id: "n2", severity: "warning", title: "Wheat volatility spike", body: "Ukraine supply data revised. Consider hedging 30d.", time: "42m" },
  { id: "n3", severity: "success", title: "Invoice INV-2026-0426 paid", body: "Tokyo Green Foods · $94,400 received.", time: "1h" },
  { id: "n4", severity: "info", title: "New RFQ from Dubai Gourmet", body: "40MT organic mangoes · closes in 3 days.", time: "2h" },
  { id: "n5", severity: "warning", title: "Wind advisory · Nile Delta", body: "Gusts 45km/h through Wednesday.", time: "3h" },
  { id: "n6", severity: "success", title: "Supplier verified", body: "Ceylon Spice Co. passed compliance review.", time: "5h" },
] as const;

export const pendingApprovals = [
  { id: "a1", type: "Quotation", title: "QT-2049 · Rotterdam Fresh", meta: "$76,800 · Navel Oranges 120MT", requestedBy: "Karim H." },
  { id: "a2", type: "Invoice", title: "INV-2026-0428", meta: "$76,800 · Due Jul 29", requestedBy: "Finance" },
  { id: "a3", type: "RFQ Response", title: "RFQ-3312 · Hamburg Trading", meta: "Milling Wheat 2,000MT", requestedBy: "Ops" },
  { id: "a4", type: "Contract", title: "MSA · Andes Coffee Coop", meta: "12-month exclusive · Arabica", requestedBy: "Legal" },
];

export const initialTasks = [
  { id: "t1", title: "Review Rotterdam customs docs", due: "Today", priority: "high", done: false },
  { id: "t2", title: "Call Hamburg Trading on wheat spec", due: "Today", priority: "high", done: false },
  { id: "t3", title: "Approve Q3 marketing budget", due: "Tomorrow", priority: "med", done: false },
  { id: "t4", title: "Sign Andes Coffee MSA", due: "Jul 22", priority: "med", done: false },
  { id: "t5", title: "Weekly market brief to board", due: "Jul 23", priority: "low", done: true },
  { id: "t6", title: "Onboard Ceylon Spice Co.", due: "Jul 24", priority: "low", done: false },
];

export const weatherCities = [
  { city: "Cairo", region: "Nile Delta", temp: 34, cond: "Sunny", hi: 36, lo: 24, icon: "sun" as const, forecast: [35, 36, 34, 33] },
  { city: "Casablanca", region: "Atlantic Coast", temp: 26, cond: "Partly cloudy", hi: 28, lo: 19, icon: "cloud" as const, forecast: [27, 28, 26, 25] },
  { city: "Rotterdam", region: "North Sea", temp: 19, cond: "Light rain", hi: 21, lo: 14, icon: "rain" as const, forecast: [18, 20, 22, 19] },
];

export const marketTrendSeries = [
  { w: "W1", wheat: 245, coffee: 480, rice: 112 },
  { w: "W2", wheat: 252, coffee: 486, rice: 114 },
  { w: "W3", wheat: 248, coffee: 492, rice: 116 },
  { w: "W4", wheat: 261, coffee: 488, rice: 115 },
  { w: "W5", wheat: 268, coffee: 494, rice: 117 },
  { w: "W6", wheat: 274, coffee: 490, rice: 118 },
  { w: "W7", wheat: 271, coffee: 496, rice: 118 },
  { w: "W8", wheat: 275, coffee: 492, rice: 119 },
];

export const inventoryByCategory = [
  { name: "Grains", value: 82, fill: "oklch(0.62 0.16 155)" },
  { name: "Fruits", value: 64, fill: "oklch(0.78 0.15 75)" },
  { name: "Beverages", value: 48, fill: "oklch(0.65 0.18 250)" },
  { name: "Oils", value: 71, fill: "oklch(0.72 0.16 40)" },
  { name: "Spices", value: 38, fill: "oklch(0.68 0.2 320)" },
];

export const activityTimeline = [
  { id: "e1", icon: "ship", text: "Shipment SHP-8842 departed Alexandria", time: "2m", tone: "primary" },
  { id: "e2", icon: "quote", text: "Quotation QT-2049 received from Rotterdam Fresh", time: "18m", tone: "info" },
  { id: "e3", icon: "check", text: "Invoice INV-2026-0426 marked paid ($94,400)", time: "1h", tone: "success" },
  { id: "e4", icon: "rfq", text: "RFQ-3312 posted to 42 verified suppliers", time: "2h", tone: "info" },
  { id: "e5", icon: "shield", text: "Ceylon Spice Co. verified by compliance", time: "3h", tone: "success" },
  { id: "e6", icon: "alert", text: "Price alert triggered: Wheat +2.4%", time: "4h", tone: "warning" },
  { id: "e7", icon: "cloud", text: "Weather warning: Wind advisory · Nile Delta", time: "5h", tone: "warning" },
  { id: "e8", icon: "contract", text: "MSA signed with Punjab Rice Traders", time: "8h", tone: "success" },
];

export const aiPrompts = [
  "Forecast wheat prices for the next 30 days",
  "Draft an RFQ for 120MT of Navel oranges to Rotterdam",
  "Explain HS code 0805 tariffs for the EU",
  "Weather risk summary for shipments this week",
];
