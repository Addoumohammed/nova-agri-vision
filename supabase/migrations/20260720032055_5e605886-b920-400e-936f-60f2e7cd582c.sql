
-- 1. GRANTS
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
           WHERE n.nspname='public' AND c.relkind='r'
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t.relname);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t.relname);
  END LOOP;
END $$;

GRANT SELECT ON public.commodity_prices    TO anon;
GRANT SELECT ON public.country_regulations TO anon;
GRANT SELECT ON public.currency_rates      TO anon;
GRANT SELECT ON public.product_categories  TO anon;

-- 2. FK indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_granted_by            ON public.user_roles(granted_by);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id   ON public.role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_profiles_default_organization_id ON public.profiles(default_organization_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_by                ON public.orders(created_by);
CREATE INDEX IF NOT EXISTS idx_message_threads_created_by       ON public.message_threads(created_by);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id               ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_rfqs_buyer_company_id            ON public.rfqs(buyer_company_id);
CREATE INDEX IF NOT EXISTS idx_quotations_supplier_company_id   ON public.quotations(supplier_company_id);
CREATE INDEX IF NOT EXISTS idx_negotiation_messages_sender_id   ON public.negotiation_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_trade_documents_uploader_id      ON public.trade_documents(uploader_id);

-- 3. Query-path indexes
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_updated    ON public.ai_conversations(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conv_created         ON public.ai_messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read          ON public.notifications(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_orders_buyer_company             ON public.orders(buyer_company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_supplier_company          ON public.orders(supplier_company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rfqs_buyer_created               ON public.rfqs(buyer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotations_rfq                   ON public.quotations(rfq_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotations_supplier              ON public.quotations(supplier_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_negotiation_messages_quotation   ON public.negotiation_messages(quotation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_invoices_buyer_company           ON public.invoices(buyer_company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_supplier_company        ON public.invoices(supplier_company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shipments_order                  ON public.shipments(order_id);
CREATE INDEX IF NOT EXISTS idx_shipment_tracking_shipment       ON public.shipment_tracking(shipment_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_trade_documents_order            ON public.trade_documents(order_id);
CREATE INDEX IF NOT EXISTS idx_trade_documents_shipment         ON public.trade_documents(shipment_id);
CREATE INDEX IF NOT EXISTS idx_products_supplier                ON public.products(supplier_company_id);
CREATE INDEX IF NOT EXISTS idx_products_category                ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_inventory_warehouse              ON public.inventory(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity                ON public.audit_logs(entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_created         ON public.audit_logs(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_user_created       ON public.user_activity(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_thread_created          ON public.messages(thread_id, created_at);
CREATE INDEX IF NOT EXISTS idx_commodity_prices_commodity_date  ON public.commodity_prices(commodity, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_currency_rates_base_quote        ON public.currency_rates(base, quote);
