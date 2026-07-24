
-- Sprint 16: Database & Data Integrity — safe cleanups and hot-path indexes.

-- 1) Drop redundant duplicate indexes (kept the more descriptive/composite variant).
DROP INDEX IF EXISTS public.idx_audit_actor_time;
DROP INDEX IF EXISTS public.idx_audit_entity;
DROP INDEX IF EXISTS public.idx_prices_commodity_time;
DROP INDEX IF EXISTS public.idx_activity_user_time;
DROP INDEX IF EXISTS public.idx_currency_rates_base_quote;   -- fully covered by PK
DROP INDEX IF EXISTS public.idx_track_shipment;
DROP INDEX IF EXISTS public.inventory_warehouse_product_key; -- duplicate of UNIQUE constraint index
DROP INDEX IF EXISTS public.trade_docs_order_idx;
DROP INDEX IF EXISTS public.trade_docs_shipment_idx;
DROP INDEX IF EXISTS public.idx_ai_msg_conv;
DROP INDEX IF EXISTS public.idx_ai_conv_user;
DROP INDEX IF EXISTS public.idx_messages_thread;

-- 2) Drop single-column indexes made redundant by leading-column composite indexes.
DROP INDEX IF EXISTS public.quotations_rfq_idx;              -- covered by idx_quotations_rfq(rfq_id, created_at)
DROP INDEX IF EXISTS public.quotations_supplier_idx;         -- covered by idx_quotations_supplier(supplier_id, created_at)
DROP INDEX IF EXISTS public.rfqs_buyer_idx;                  -- covered by idx_rfqs_buyer_created(buyer_id, created_at)
DROP INDEX IF EXISTS public.idx_notifications_user_read;     -- superseded by partial idx_notifications_unread

-- 3) Add strategic composite indexes for common list/filter query paths.
-- Marketplace listing: active products ordered by newest.
CREATE INDEX IF NOT EXISTS idx_products_active_created
  ON public.products (created_at DESC) WHERE active = true;

-- Orders filtered by status per company.
CREATE INDEX IF NOT EXISTS idx_orders_buyer_company_status_created
  ON public.orders (buyer_company_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_supplier_company_status_created
  ON public.orders (supplier_company_id, status, created_at DESC);

-- RFQs filtered by status per buyer company.
CREATE INDEX IF NOT EXISTS idx_rfqs_buyer_company_status_created
  ON public.rfqs (buyer_company_id, status, created_at DESC);

-- Quotations filtered by status per RFQ.
CREATE INDEX IF NOT EXISTS idx_quotations_rfq_status
  ON public.quotations (rfq_id, status);

-- Inventory lookup by product across warehouses.
CREATE INDEX IF NOT EXISTS idx_inventory_product
  ON public.inventory (product_id);

-- 4) Refresh planner statistics on the touched relations.
ANALYZE public.products;
ANALYZE public.orders;
ANALYZE public.rfqs;
ANALYZE public.quotations;
ANALYZE public.notifications;
ANALYZE public.inventory;
ANALYZE public.messages;
ANALYZE public.ai_messages;
ANALYZE public.ai_conversations;
ANALYZE public.audit_logs;
ANALYZE public.user_activity;
ANALYZE public.commodity_prices;
ANALYZE public.trade_documents;
ANALYZE public.shipment_tracking;
