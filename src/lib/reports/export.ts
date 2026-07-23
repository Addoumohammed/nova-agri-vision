/**
 * Export utilities — CSV, Excel (SpreadsheetML XML .xls), and PDF (print window).
 * No native binaries or heavy dependencies: uses browser Blob + window.open + print.
 */
import type { ColumnDef, ReportDef, DateRange } from "./data";

function saveBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function cellValue<T>(row: T, col: ColumnDef<T>): string {
  const raw = col.format ? col.format(row) : (row as Record<string, unknown>)[col.key as string];
  if (raw == null) return "";
  return String(raw);
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function csvEscape(v: string): string {
  if (v.includes(",") || v.includes("\"") || v.includes("\n")) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

export function exportCsv<T>(report: ReportDef<T>, rows: T[]) {
  const header = report.columns.map((c) => csvEscape(c.label)).join(",");
  const body = rows
    .map((r) => report.columns.map((c) => csvEscape(cellValue(r, c))).join(","))
    .join("\n");
  const bom = "\uFEFF";
  saveBlob(`${report.id}.csv`, new Blob([bom + header + "\n" + body], { type: "text/csv;charset=utf-8" }));
}

/**
 * SpreadsheetML XML — opens natively in Microsoft Excel, Numbers and LibreOffice.
 * Provides typed numeric cells so totals aggregate correctly.
 */
export function exportExcel<T>(report: ReportDef<T>, rows: T[]) {
  const cellsHeader = report.columns
    .map((c) => `<Cell ss:StyleID="hdr"><Data ss:Type="String">${esc(c.label)}</Data></Cell>`)
    .join("");
  const bodyRows = rows
    .map((r) => {
      const cells = report.columns
        .map((c) => {
          const raw = c.format ? c.format(r) : (r as Record<string, unknown>)[c.key as string];
          const isNum = typeof raw === "number" && Number.isFinite(raw);
          const type = isNum ? "Number" : "String";
          const value = isNum ? String(raw) : esc(String(raw ?? ""));
          return `<Cell><Data ss:Type="${type}">${value}</Data></Cell>`;
        })
        .join("");
      return `<Row>${cells}</Row>`;
    })
    .join("");
  const sheetName = esc(report.name).slice(0, 31);
  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="hdr"><Font ss:Bold="1"/></Style>
 </Styles>
 <Worksheet ss:Name="${sheetName}">
  <Table>
   <Row>${cellsHeader}</Row>
   ${bodyRows}
  </Table>
 </Worksheet>
</Workbook>`;
  saveBlob(`${report.id}.xls`, new Blob([xml], { type: "application/vnd.ms-excel" }));
}

/**
 * PDF export via a print window. Users pick "Save as PDF" from the OS print dialog.
 * Works in every modern browser without extra dependencies.
 */
export function exportPdf<T>(report: ReportDef<T>, rows: T[], range?: DateRange) {
  const rangeLbl = range
    ? `${range.from.toISOString().slice(0, 10)} → ${range.to.toISOString().slice(0, 10)}`
    : "All time";
  const summary = report.summary ? report.summary(rows) : [];
  const summaryHtml = summary.length
    ? `<div class="kpis">${summary
        .map((s) => `<div class="kpi"><span>${esc(s.label)}</span><strong>${esc(s.value)}</strong></div>`)
        .join("")}</div>`
    : "";
  const thead = `<tr>${report.columns.map((c) => `<th style="text-align:${c.align ?? "left"}">${esc(c.label)}</th>`).join("")}</tr>`;
  const tbody = rows
    .map(
      (r) =>
        `<tr>${report.columns
          .map((c) => `<td style="text-align:${c.align ?? "left"}">${esc(cellValue(r, c))}</td>`)
          .join("")}</tr>`,
    )
    .join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"/>
<title>${esc(report.name)}</title>
<style>
  *{box-sizing:border-box}
  body{font:12px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#111;margin:24px}
  header{border-bottom:2px solid #059669;padding-bottom:12px;margin-bottom:18px;display:flex;justify-content:space-between;align-items:flex-end;gap:16px}
  h1{margin:0;font-size:20px;color:#065f46}
  .meta{font-size:11px;color:#555}
  .brand{font-weight:700;color:#065f46;font-size:14px}
  .kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin:0 0 16px}
  .kpi{border:1px solid #d1d5db;border-radius:8px;padding:8px 10px;display:flex;flex-direction:column;gap:2px;background:#f9fafb}
  .kpi span{font-size:10px;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280}
  .kpi strong{font-size:14px;color:#065f46}
  table{border-collapse:collapse;width:100%;font-size:11px}
  th,td{border-bottom:1px solid #e5e7eb;padding:6px 8px}
  th{background:#f0fdf4;text-transform:uppercase;font-size:10px;letter-spacing:0.03em;color:#065f46;text-align:left}
  tbody tr:nth-child(even){background:#fafafa}
  footer{margin-top:20px;font-size:10px;color:#6b7280;text-align:center;border-top:1px solid #e5e7eb;padding-top:8px}
  @media print{@page{size:A4 landscape;margin:12mm}}
</style></head><body>
<header>
  <div>
    <div class="brand">NOVA PRO · Agri-Trade Intelligence</div>
    <h1>${esc(report.name)}</h1>
    <div class="meta">${esc(report.description)}</div>
  </div>
  <div class="meta" style="text-align:right">
    <div><strong>Period:</strong> ${esc(rangeLbl)}</div>
    <div><strong>Generated:</strong> ${new Date().toLocaleString()}</div>
    <div><strong>Rows:</strong> ${rows.length.toLocaleString()}</div>
  </div>
</header>
${summaryHtml}
<table><thead>${thead}</thead><tbody>${tbody}</tbody></table>
<footer>Confidential — Nova Pro export · ${new Date().getFullYear()}</footer>
<script>window.onload=()=>{setTimeout(()=>{window.print();},300);};</script>
</body></html>`;
  const w = window.open("", "_blank", "width=1100,height=800");
  if (!w) throw new Error("Popup blocked");
  w.document.open();
  w.document.write(html);
  w.document.close();
}
