
-- Barcode on products (unique per supplier when present)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS barcode text;
CREATE UNIQUE INDEX IF NOT EXISTS products_supplier_barcode_key
  ON public.products (supplier_company_id, barcode)
  WHERE barcode IS NOT NULL AND barcode <> '';

-- Low-stock threshold on inventory rows
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS low_stock_threshold numeric NOT NULL DEFAULT 0;

-- One inventory row per (warehouse, product)
CREATE UNIQUE INDEX IF NOT EXISTS inventory_warehouse_product_key
  ON public.inventory (warehouse_id, product_id);

-- Movement type enum
DO $$ BEGIN
  CREATE TYPE public.stock_movement_type AS ENUM ('in','out','adjust','transfer_in','transfer_out');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Stock movements ledger
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id uuid REFERENCES public.inventory(id) ON DELETE SET NULL,
  warehouse_id uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  movement_type public.stock_movement_type NOT NULL,
  quantity numeric NOT NULL,
  previous_qty numeric NOT NULL DEFAULT 0,
  new_qty numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'MT',
  reason text,
  reference text,
  related_movement_id uuid REFERENCES public.stock_movements(id) ON DELETE SET NULL,
  performed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_movements TO authenticated;
GRANT ALL ON public.stock_movements TO service_role;

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stock_movements read owner" ON public.stock_movements;
CREATE POLICY "stock_movements read owner" ON public.stock_movements
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.warehouses w
    WHERE w.id = stock_movements.warehouse_id
      AND (public.owns_company(w.company_id, auth.uid()) OR public.is_admin(auth.uid()))
  ));

DROP POLICY IF EXISTS "stock_movements write owner" ON public.stock_movements;
CREATE POLICY "stock_movements write owner" ON public.stock_movements
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.warehouses w
    WHERE w.id = stock_movements.warehouse_id
      AND (public.owns_company(w.company_id, auth.uid()) OR public.is_admin(auth.uid()))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.warehouses w
    WHERE w.id = stock_movements.warehouse_id
      AND (public.owns_company(w.company_id, auth.uid()) OR public.is_admin(auth.uid()))
  ));

CREATE INDEX IF NOT EXISTS stock_movements_warehouse_created_idx
  ON public.stock_movements (warehouse_id, created_at DESC);
CREATE INDEX IF NOT EXISTS stock_movements_product_created_idx
  ON public.stock_movements (product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS stock_movements_inventory_created_idx
  ON public.stock_movements (inventory_id, created_at DESC);

-- updated_at trigger on inventory (touches updated_at on write)
DROP TRIGGER IF EXISTS inventory_set_updated_at ON public.inventory;
CREATE TRIGGER inventory_set_updated_at
  BEFORE UPDATE ON public.inventory
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS warehouses_set_updated_at ON public.warehouses;
CREATE TRIGGER warehouses_set_updated_at
  BEFORE UPDATE ON public.warehouses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
