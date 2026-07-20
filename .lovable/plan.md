# Dashboard Enterprise Upgrade

Rebuild `src/routes/_app.dashboard.tsx` into a Bloomberg/SAP-grade command center. Keep all existing branding, i18n, theme, routing, and other pages untouched. Use existing demo data (`src/lib/demo-data.ts`) plus new locally-defined realistic datasets for widgets that don't yet have seed data. Every widget uses existing primitives (StatCard, DataTable, StatusBadge, Progress, Card, recharts) and links/navigates to the corresponding workspace route so it's fully interactive.

## Layout (responsive grid)

```text
┌────────────────────────────────────────────────────────────┐
│ Command Bar: Global Search · Notifications · Quick Actions │
├────────────────────────────────────────────────────────────┤
│ 4 KPI cards: Revenue · Profit · Active Shipments · Orders  │
├──────────────────────────────┬─────────────────────────────┤
│ Revenue & Profit Chart       │ AI Copilot Quick Panel      │
│ (Composed area+line, 12mo)   │ (prompt + suggestions)      │
├──────────────────────────────┼─────────────────────────────┤
│ Export vs Import Performance │ Live Commodity Prices       │
│ (dual bar chart)             │ (ticker, sparklines)        │
├──────────────────────────────┼─────────────────────────────┤
│ Active Shipments summary     │ Weather Summary widget      │
│ Recent Orders table          │ Calendar (upcoming ships)   │
├──────────────────────────────┼─────────────────────────────┤
│ Pending Approvals            │ Tasks & Reminders           │
├──────────────────────────────┼─────────────────────────────┤
│ Top Suppliers · Top Buyers · Country Statistics (3 cols)   │
├──────────────────────────────┬─────────────────────────────┤
│ Market Trends (multi-line)   │ Inventory Overview (radial) │
├──────────────────────────────┴─────────────────────────────┤
│ Recent Activities Timeline (full width)                    │
└────────────────────────────────────────────────────────────┘
```

Grid: `grid-cols-1 md:grid-cols-2 xl:grid-cols-3` with `col-span` overrides for full-width rows. Mobile: single column with priority ordering (KPIs → Copilot → Shipments → Orders → rest).

## Widgets

1. **Command Bar** — sticky top: global search (Command palette via `cmdk`, already installed via shadcn), NotificationsPopover (bell + badge, list of 6 smart alerts with severity chips), Quick Actions dropdown (New RFQ, New Order, New Shipment, Invite Supplier, Ask Nova AI) — each routes to matching page.
2. **KPI Cards (4)** — Revenue MTD, Net Profit, Active Shipments count, Open Orders. Use `StatCard` with delta %, animated count-up via simple `useEffect` + rAF.
3. **Revenue & Profit Chart** — recharts `ComposedChart`: revenue area + profit line, 12-month, tooltip with currency formatting, range toggle (3M/6M/12M) via `FilterChips`.
4. **AI Copilot Quick Panel** — textarea + 4 preset chips ("Forecast wheat prices", "Draft RFQ for oranges", "Explain HS code 0805", "Weather risk this week"). Submit navigates to `/nova-ai` with prefilled prompt in URL search param.
5. **Live Commodity Prices** — 6 tickers (Wheat, Coffee, Rice, Olive Oil, Sugar, Cotton) with current price, % change, mini sparkline (recharts `LineChart`). Auto-refresh every 5s with small deterministic jitter for "live" feel.
6. **Export vs Import Performance** — grouped bar chart, 6 months, values from `monthlyTrade`.
7. **Active Shipments Summary** — top 4 from `shipments`, each with mode icon, route, progress bar, ETA. Row click → `/shipments`.
8. **Recent Orders** — compact table (5 rows) using existing `DataTable` styling or inline; StatusBadge; row click → `/orders`.
9. **Weather Summary** — 3-city cards (Cairo, Casablanca, Rotterdam) with icon, temp, condition, next-3-day mini forecast. Link to `/weather`.
10. **Calendar / Upcoming Shipments** — mini month grid (current month) with dots on shipment ETA dates; list below shows next 5 upcoming.
11. **Pending Approvals** — 4 items (quotation, invoice, RFQ response, contract) with Approve/Reject inline buttons (toast on click).
12. **Tasks & Reminders** — 6 checklist items with checkboxes (local state), priority chips, due dates.
13. **Top Suppliers / Top Buyers** — two ranked lists (top 5 each), avatar initial, volume, rating stars, click → respective pages.
14. **Country Statistics** — reuse `topCountries` data as a card list with flag, share bar, volume.
15. **Market Trends** — multi-line chart (3 commodities over 8 weeks) with legend toggle.
16. **Inventory Overview** — recharts `RadialBarChart` showing stock levels per category (Fruits, Grains, Beverages, Spices, Oils).
17. **Recent Activities Timeline** — vertical timeline, 8 events (order shipped, quotation received, invoice paid, RFQ posted, supplier verified, price alert triggered, weather warning, contract signed) with icon + time-ago.

## Interactivity rules

- All row/card clicks navigate via `<Link>` from `@tanstack/react-router`.
- All buttons produce a `toast()` via existing `sonner` when there's no target route.
- Notifications popover uses `Popover` (shadcn). Command palette opens on `⌘K` / `Ctrl+K` and on search-bar click.
- Range toggles use `FilterChips`; local `useState` only, no URL params (to avoid disrupting existing route params).
- Live commodity refresh via `setInterval` cleaned in `useEffect` return.

## Files

- **Edit**: `src/routes/_app.dashboard.tsx` (full rewrite of dashboard body only).
- **Add**: `src/lib/dashboard-data.ts` (commodity prices seed, revenue/profit series, tasks, approvals, activities, market trends).
- **Add** (small extracted components to keep the route readable, all in `src/components/dashboard/`):
  - `command-bar.tsx`, `notifications-popover.tsx`, `revenue-chart.tsx`, `commodity-ticker.tsx`, `ai-quick-panel.tsx`, `weather-summary.tsx`, `mini-calendar.tsx`, `approvals-list.tsx`, `tasks-list.tsx`, `top-partners.tsx`, `market-trends.tsx`, `inventory-radial.tsx`, `activity-timeline.tsx`, `trade-performance.tsx`.

## i18n

Add new keys to `src/lib/i18n.tsx` (EN + AR) for every visible label (widget titles, chip labels, button text, empty states). RTL respected via existing wrappers — verify with `dir="rtl"` toggle.

## Performance

- Lazy-load heavy chart widgets below the fold via `React.lazy` + `Suspense` with skeleton fallbacks (recharts is heavy).
- Memoize computed series with `useMemo`.
- Avoid layout shift with fixed-height chart containers.

## Out of scope

No new backend calls, no schema changes, no changes to other pages, no auth/routing changes, no branding/color/typography edits.
