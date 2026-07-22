
-- 1. Extend orders with pricing detail + cancellation metadata
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS subtotal_usd numeric(14,2) NOT NULL DEFAULT 0 CHECK (subtotal_usd >= 0),
  ADD COLUMN IF NOT EXISTS discount_pct numeric(5,2) NOT NULL DEFAULT 0 CHECK (discount_pct >= 0 AND discount_pct <= 100),
  ADD COLUMN IF NOT EXISTS discount_usd numeric(14,2) NOT NULL DEFAULT 0 CHECK (discount_usd >= 0),
  ADD COLUMN IF NOT EXISTS tax_pct numeric(5,2) NOT NULL DEFAULT 0 CHECK (tax_pct >= 0 AND tax_pct <= 100),
  ADD COLUMN IF NOT EXISTS tax_usd numeric(14,2) NOT NULL DEFAULT 0 CHECK (tax_usd >= 0),
  ADD COLUMN IF NOT EXISTS cancelled_reason text,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

-- 2. Order status history
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  from_status order_status,
  to_status order_status NOT NULL,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  note text,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_status_history_order ON public.order_status_history(order_id, changed_at DESC);

GRANT SELECT ON public.order_status_history TO authenticated;
GRANT ALL ON public.order_status_history TO service_role;

ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "order_status_history read" ON public.order_status_history;
CREATE POLICY "order_status_history read" ON public.order_status_history
  FOR SELECT TO authenticated
  USING (public.can_access_order(order_id, auth.uid()));

-- 3. Trigger to auto-log status changes
CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.order_status_history(order_id, from_status, to_status, changed_by, note)
    VALUES (NEW.id, NULL, NEW.status, NEW.created_by, 'Order created');
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.order_status_history(order_id, from_status, to_status, changed_by, note)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid(),
      CASE WHEN NEW.status = 'cancelled' THEN NEW.cancelled_reason ELSE NULL END);
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_status_history ON public.orders;
CREATE TRIGGER trg_orders_status_history
  AFTER INSERT OR UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.log_order_status_change();
