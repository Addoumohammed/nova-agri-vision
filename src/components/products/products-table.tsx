/**
 * Products table — responsive: table on ≥md, stacked cards on mobile.
 * Each row has an image thumbnail, inline status toggle, and dropdown actions.
 */
import { EyeOff, ImageOff, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToggleProductActive } from "@/hooks/use-product-mutations";
import { formatMoney, formatStock, stockLevel } from "@/lib/products/format";
import { useI18n } from "@/lib/i18n";
import type { ProductRecord } from "@/lib/products/types";
import { cn } from "@/lib/utils";

interface Props {
  products: ProductRecord[];
  onEdit: (p: ProductRecord) => void;
  onDelete: (p: ProductRecord) => void;
}

export function ProductsTable({ products, onEdit, onDelete }: Props) {
  const { t } = useI18n();
  return (
    <>
      {/* Desktop / tablet */}
      <div className="hidden md:block rounded-2xl border border-border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("products.name")}</TableHead>
              <TableHead>{t("products.category")}</TableHead>
              <TableHead className="text-end">{t("products.price")}</TableHead>
              <TableHead className="text-end">{t("products.stock")}</TableHead>
              <TableHead>{t("products.status")}</TableHead>
              <TableHead className="w-14 text-end sr-only">{t("products.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p) => (
              <ProductRowDesktop key={p.id} product={p} onEdit={onEdit} onDelete={onDelete} />
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile */}
      <ul className="md:hidden space-y-3">
        {products.map((p) => (
          <li key={p.id}>
            <ProductRowMobile product={p} onEdit={onEdit} onDelete={onDelete} />
          </li>
        ))}
      </ul>
    </>
  );
}

// ---------------------------------------------------------------------------

function Thumb({ src, alt }: { src?: string; alt: string }) {
  if (!src) {
    return (
      <div className="h-12 w-12 rounded-lg bg-muted grid place-items-center text-muted-foreground">
        <ImageOff className="h-5 w-5" aria-hidden />
        <span className="sr-only">{alt}</span>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className="h-12 w-12 rounded-lg object-cover bg-muted"
      onError={(e) => {
        e.currentTarget.style.display = "none";
      }}
    />
  );
}

function StockCell({ product }: { product: ProductRecord }) {
  const { t } = useI18n();
  const level = stockLevel(product.stock, product.moq);
  return (
    <div className="flex flex-col items-end">
      <span className="tabular-nums">{formatStock(product.stock, product.unit)}</span>
      {level !== "ok" && (
        <span className={cn(
          "text-xs font-medium",
          level === "out" ? "text-destructive" : "text-amber-500",
        )}>
          {level === "out" ? t("products.stockOut") : t("products.stockLow")}
        </span>
      )}
    </div>
  );
}

function StatusToggle({ product }: { product: ProductRecord }) {
  const { t } = useI18n();
  const toggle = useToggleProductActive();
  return (
    <div className="flex items-center gap-2">
      <Switch
        checked={product.active}
        disabled={toggle.isPending}
        onCheckedChange={(v) => toggle.mutate({ id: product.id, active: Boolean(v) })}
        aria-label={product.active ? t("products.hidden") : t("products.published")}
      />
      <Badge variant={product.active ? "default" : "secondary"} className="whitespace-nowrap">
        {product.active ? t("products.status.active") : t("products.status.inactive")}
      </Badge>
    </div>
  );
}

function RowActions({ product, onEdit, onDelete }: {
  product: ProductRecord;
  onEdit: (p: ProductRecord) => void;
  onDelete: (p: ProductRecord) => void;
}) {
  const { t } = useI18n();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("products.actions")}>
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onEdit(product)}>
          <Pencil className="me-2 h-4 w-4" />
          {t("products.edit")}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => onDelete(product)}
        >
          <Trash2 className="me-2 h-4 w-4" />
          {t("products.delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ProductRowDesktop({ product, onEdit, onDelete }: {
  product: ProductRecord;
  onEdit: (p: ProductRecord) => void;
  onDelete: (p: ProductRecord) => void;
}) {
  const { t } = useI18n();
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3 min-w-0">
          <Thumb src={product.images[0]} alt={product.name} />
          <div className="min-w-0">
            <p className="font-medium truncate">{product.name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {product.sku ?? "—"}
              {product.originCountry ? ` · ${product.originCountry}` : ""}
              {!product.active && (
                <span className="ms-2 inline-flex items-center gap-1 text-amber-500">
                  <EyeOff className="h-3 w-3" /> {t("products.hidden")}
                </span>
              )}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {product.categoryName ?? t("products.uncategorised")}
      </TableCell>
      <TableCell className="text-end tabular-nums">
        {formatMoney(product.priceUsd)}
        <div className="text-xs text-muted-foreground">/ {product.unit}</div>
      </TableCell>
      <TableCell className="text-end">
        <StockCell product={product} />
      </TableCell>
      <TableCell><StatusToggle product={product} /></TableCell>
      <TableCell className="text-end">
        <RowActions product={product} onEdit={onEdit} onDelete={onDelete} />
      </TableCell>
    </TableRow>
  );
}

function ProductRowMobile({ product, onEdit, onDelete }: {
  product: ProductRecord;
  onEdit: (p: ProductRecord) => void;
  onDelete: (p: ProductRecord) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3 shadow-elegant">
      <div className="flex items-start gap-3">
        <Thumb src={product.images[0]} alt={product.name} />
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{product.name}</p>
          <p className="text-xs text-muted-foreground truncate">
            {product.sku ?? "—"}
            {product.categoryName ? ` · ${product.categoryName}` : ""}
          </p>
        </div>
        <RowActions product={product} onEdit={onEdit} onDelete={onDelete} />
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <p className="text-muted-foreground">{t("products.price")}</p>
          <p className="font-medium tabular-nums">{formatMoney(product.priceUsd)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">{t("products.stock")}</p>
          <StockCell product={product} />
        </div>
        <div>
          <p className="text-muted-foreground">{t("products.status")}</p>
          <StatusToggle product={product} />
        </div>
      </div>
    </div>
  );
}
