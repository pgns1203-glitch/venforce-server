import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

type ShopeeSaleRow = {
  id: string;
  product: string;
  itemId: string;
  variationId: string;
  paidRevenue: number;
  paidUnits: number;
  isVariation: boolean;
  variationStatus: string;
};

type CostRow = {
  id: string;
  cost: number;
  taxPercent: number;
};

type CalculatedShopeeItem = {
  id: string;
  product: string;
  paidRevenue: number;
  paidUnits: number;
  contributionProfit: number;
  contributionMargin: number;
  averageTicket: number;
  contributionProfitUnit: number;
  cost: number;
  taxPercent: number;
  commissionPercent: number;
  fixedFeePerUnit: number;
};

type ShopeeDetailedRow = {
  Marketplace: string;
  Produto: string;
  ID: string;
  "Vendas (Pedido pago) (BRL)": number;
  "Unidades (Pedido pago)": number;
  Ticket: number;
  Custo: number;
  Imposto: number;
  "Comissão %": number;
  "Taxa Fixa": number;
  LC: number;
  MC: number;
  "LC POR ANÚNCIO": number;
};

type ShopeeFeeRule = {
  commissionPercent: number;
  fixedFeePerUnit: number;
};

type ProcessResult = {
  summary: Record<string, number>;
  detailedRows: Record<string, string | number>[];
  excelFileName: string;
  unmatchedIds: string[];
  ignoredRowsWithoutCost: number;
  ignoredRevenue: number;
  message: string;
  excludedVariationIds?: string[];
  preparedRows?: Record<string, string | number>[];
  auditRows?: Record<string, string | number>[];
};

function normalizeText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizeKey(value: unknown) {
  return normalizeText(value).replace(/\s+/g, " ");
}

function normalizeId(value: unknown): string {
  if (value === null || value === undefined) return "";

  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "";
    return Math.trunc(value).toString();
  }

  let text = String(value).trim();
  if (!text) return "";

  const scientificLike = text.replace(",", ".");
  if (/^\d+(\.\d+)?e\+\d+$/i.test(scientificLike)) {
    const num = Number(scientificLike);
    if (Number.isFinite(num)) {
      return Math.trunc(num).toString();
    }
  }

  const cleaned = text.replace(/^MLB/i, "").replace(/\D/g, "");
  return cleaned ? `MLB${cleaned}` : "";
}

function normalizeIdNoPrefix(value: unknown): string {
  const full = normalizeId(value);
  return full.replace(/^MLB/i, "");
}

function toNumber(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  let text = String(value).trim();
  if (!text) return 0;

  text = text
    .replace(/\s+/g, "")
    .replace(/R\$/gi, "")
    .replace(/US\$/gi, "")
    .replace(/€/g, "")
    .replace(/%/g, "")
    .replace(/[^\d,.-]/g, "");

  if (!text) return 0;

  const hasComma = text.includes(",");
  const hasDot = text.includes(".");

  if (hasComma && hasDot) {
    const lastComma = text.lastIndexOf(",");
    const lastDot = text.lastIndexOf(".");

    if (lastComma > lastDot) {
      text = text.replace(/\./g, "").replace(",", ".");
    } else {
      text = text.replace(/,/g, "");
    }
  } else if (hasComma) {
    text = text.replace(/\./g, "").replace(",", ".");
  }

  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : 0;
}

function positive(value: unknown) {
  return Math.abs(toNumber(value));
}

function round2(value: number) {
  return Number((Number.isFinite(value) ? value : 0).toFixed(2));
}

function readSheetRows(fileBuffer: ArrayBuffer) {
  const workbook = XLSX.read(fileBuffer, { type: "array", cellStyles: true });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error("A planilha enviada está vazia.");
  }

  const sheet = workbook.Sheets[firstSheetName];

  const rowsAsArrays = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });

  return { workbook, sheet, rowsAsArrays };
}

function parseSpreadsheet(fileBuffer: ArrayBuffer, skipRows = 0) {
  const { sheet } = readSheetRows(fileBuffer);

  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
    range: skipRows,
  });
}

function detectMeliHeaderRow(fileBuffer: ArrayBuffer): number {
  const { rowsAsArrays } = readSheetRows(fileBuffer);

  for (let i = 0; i < rowsAsArrays.length; i++) {
    const joined = (rowsAsArrays[i] || [])
      .map((cell) => normalizeText(cell))
      .join(" | ");

    if (
      joined.includes("n.º de venda") ||
      joined.includes("n.o de venda") ||
      joined.includes("nº de venda") ||
      joined.includes("# de anuncio") ||
      joined.includes("# de anúncio") ||
      joined.includes("receita por produtos") ||
      joined.includes("tarifa de venda e impostos")
    ) {
      return i;
    }
  }

  return 5;
}

function detectShopeeHeaderRow(fileBuffer: ArrayBuffer): number {
  const { rowsAsArrays } = readSheetRows(fileBuffer);

  for (let i = 0; i < rowsAsArrays.length; i++) {
    const joined = (rowsAsArrays[i] || [])
      .map((cell) => normalizeText(cell))
      .join(" | ");

    if (
      joined.includes("id do item") ||
      joined.includes("item id") ||
      joined.includes("id da variacao") ||
      joined.includes("id da variação") ||
      joined.includes("vendas (pedido pago)") ||
      joined.includes("unidades (pedido pago)")
    ) {
      return i;
    }
  }

  return 0;
}

function findField(
  row: Record<string, unknown>,
  candidates: string[]
): unknown {
  const entries = Object.entries(row);

  for (const [key, value] of entries) {
    const normalized = normalizeKey(key);

    for (const candidate of candidates) {
      if (normalized === candidate) return value;
    }
  }

  for (const [key, value] of entries) {
    const normalized = normalizeKey(key);

    for (const candidate of candidates) {
      if (normalized.includes(candidate)) return value;
    }
  }

  return "";
}

function parseCostRows(rows: Record<string, unknown>[]): CostRow[] {
  const parsed: CostRow[] = [];

  for (const row of rows) {
    const idRaw = findField(row, [
      "id",
      "id do item",
      "id do produto",
      "id da variacao",
      "id da variação",
      "product id",
      "item id",
      "variation id",
      "sku",
      "seller sku",
      "sku do vendedor",
      "codigo",
      "código",
      "codigo do produto",
      "codigo do item",
      "# do anuncio",
      "# do anúncio",
      "# de anuncio",
      "# de anúncio",
    ]);

    const id = normalizeIdNoPrefix(idRaw);

    if (!id) continue;

    const cost = toNumber(
      findField(row, [
        "preco custo",
        "preço custo",
        "custo",
        "custo produto",
        "custo do produto",
        "custo unitario",
        "custo unitário",
        "product cost",
      ])
    );

    let taxPercent = toNumber(
      findField(row, [
        "imposto",
        "imposto percentual",
        "percentual imposto",
        "aliquota",
        "alíquota",
        "taxa imposto",
        "tax percent",
        "taxa",
      ])
    );

    if (taxPercent > 0 && taxPercent <= 1) {
      taxPercent = taxPercent * 100;
    }

    parsed.push({
      id,
      cost,
      taxPercent,
    });
  }

  return parsed;
}

/* ========================= SHOPEE ========================= */

function getShopeeFeesByTicket(avgTicket: number): ShopeeFeeRule {
  if (avgTicket <= 79.99) return { commissionPercent: 20, fixedFeePerUnit: 4 };
  if (avgTicket <= 99.99) return { commissionPercent: 14, fixedFeePerUnit: 16 };
  if (avgTicket <= 199.99) return { commissionPercent: 14, fixedFeePerUnit: 20 };
  return { commissionPercent: 14, fixedFeePerUnit: 26 };
}

function parseShopeeSalesRows(rows: Record<string, unknown>[]): ShopeeSaleRow[] {
  const groups = new Map<string, Record<string, unknown>[]>();

  for (const row of rows) {
    const itemId = normalizeIdNoPrefix(
      findField(row, ["id do item", "item id", "id do produto", "product id"])
    );

    if (!itemId) continue;

    if (!groups.has(itemId)) groups.set(itemId, []);
    groups.get(itemId)!.push(row);
  }

  const parsed: ShopeeSaleRow[] = [];

  for (const [itemId, groupRows] of groups.entries()) {
    const variationRows = groupRows.filter((row) => {
      const variationId = normalizeIdNoPrefix(
        findField(row, ["id da variacao", "id da variação", "variation id"])
      );

      const revenue = toNumber(
        findField(row, [
          "vendas (pedido pago) (brl)",
          "vendas (pedido pago)",
          "pedido pago (brl)",
        ])
      );

      const paidUnits = toNumber(
        findField(row, [
          "unidades (pedido pago)",
          "unidades pagas",
          "paid units",
        ])
      );

      const impressions = toNumber(
        findField(row, [
          "impressao do produto",
          "impressão do produto",
          "impressoes do produto",
          "impressões do produto",
        ])
      );

      return !!variationId && revenue > 0 && paidUnits > 0 && impressions === 0;
    });

    const rowsToUse = variationRows.length > 0 ? variationRows : groupRows;

    for (const row of rowsToUse) {
      const variationId = normalizeIdNoPrefix(
        findField(row, ["id da variacao", "id da variação", "variation id"])
      );

      const paidRevenue = toNumber(
        findField(row, [
          "vendas (pedido pago) (brl)",
          "vendas (pedido pago)",
          "pedido pago (brl)",
        ])
      );

      const paidUnits = toNumber(
        findField(row, [
          "unidades (pedido pago)",
          "unidades pagas",
          "paid units",
        ])
      );

      const variationStatus = normalizeText(
        findField(row, ["status atual da variacao", "status atual da variação"])
      );

      const product = String(
        findField(row, ["produto", "nome do produto", "product name"]) || ""
      ).trim();

      if (paidRevenue <= 0 || paidUnits <= 0) continue;

      const isVariation = variationRows.length > 0;

      parsed.push({
        id: isVariation ? variationId : itemId,
        product,
        itemId,
        variationId,
        paidRevenue,
        paidUnits,
        isVariation,
        variationStatus,
      });
    }
  }

  return parsed;
}

function calculateShopeeItem(
  sale: ShopeeSaleRow,
  costRow: CostRow
): CalculatedShopeeItem {
  const averageTicket =
    sale.paidUnits > 0 ? sale.paidRevenue / sale.paidUnits : 0;

  if (averageTicket <= 0) {
    return {
      id: sale.id,
      product: sale.product,
      paidRevenue: sale.paidRevenue,
      paidUnits: sale.paidUnits,
      contributionProfit: 0,
      contributionMargin: 0,
      averageTicket: 0,
      contributionProfitUnit: 0,
      cost: costRow.cost,
      taxPercent: costRow.taxPercent,
      commissionPercent: 0,
      fixedFeePerUnit: 0,
    };
  }

  const shopeeFees = getShopeeFeesByTicket(averageTicket);

  const commissionValueUnit =
    averageTicket * (shopeeFees.commissionPercent / 100);

  const fixedFeeUnit = shopeeFees.fixedFeePerUnit;
  const taxUnit = averageTicket * (costRow.taxPercent / 100);
  const costUnit = costRow.cost;

  const contributionProfitUnit =
    averageTicket - commissionValueUnit - fixedFeeUnit - costUnit - taxUnit;

  const contributionMargin =
    averageTicket > 0 ? contributionProfitUnit / averageTicket : 0;

  const contributionProfit = contributionProfitUnit * sale.paidUnits;

  return {
    id: sale.id,
    product: sale.product,
    paidRevenue: sale.paidRevenue,
    paidUnits: sale.paidUnits,
    contributionProfit,
    contributionMargin,
    averageTicket,
    contributionProfitUnit,
    cost: costRow.cost,
    taxPercent: costRow.taxPercent,
    commissionPercent: shopeeFees.commissionPercent,
    fixedFeePerUnit: shopeeFees.fixedFeePerUnit,
  };
}

function processShopee(
  salesRowsRaw: Record<string, unknown>[],
  costRowsRaw: Record<string, unknown>[],
  ads: number,
  venforce: number,
  affiliates: number
): ProcessResult {
  const salesRows = parseShopeeSalesRows(salesRowsRaw);
  const costRows = parseCostRows(costRowsRaw);

  if (!salesRows.length) {
    const detectedColumns =
      salesRowsRaw.length > 0 ? Object.keys(salesRowsRaw[0]) : [];

    throw new Error(
      `Não consegui identificar linhas válidas na planilha Shopee. Colunas detectadas: ${detectedColumns.join(", ")}`
    );
  }

  if (!costRows.length) {
    throw new Error("Não consegui identificar linhas válidas na planilha de custos.");
  }

  const costMap = new Map<string, CostRow>();
  for (const row of costRows) {
    if (!row.id) continue;
    costMap.set(row.id, row);
  }

  const unmatchedIdsSet = new Set<string>();
  const excludedVariationIdsSet = new Set<string>();
  const validItems: CalculatedShopeeItem[] = [];
  const detailedRows: ShopeeDetailedRow[] = [];

  let ignoredRevenue = 0;

  for (const sale of salesRows) {
    if (sale.isVariation && sale.variationStatus === "excluido") {
      excludedVariationIdsSet.add(sale.id);
    }

    const costRow = costMap.get(sale.id);

    if (!costRow || costRow.cost <= 0) {
      unmatchedIdsSet.add(sale.id);
      ignoredRevenue += sale.paidRevenue;
      continue;
    }

    const calculated = calculateShopeeItem(sale, costRow);
    validItems.push(calculated);

    detailedRows.push({
      Marketplace: "Shopee",
      Produto: calculated.product,
      ID: calculated.id,
      "Vendas (Pedido pago) (BRL)": Number(calculated.paidRevenue.toFixed(2)),
      "Unidades (Pedido pago)": Number(calculated.paidUnits.toFixed(0)),
      Ticket: Number(calculated.averageTicket.toFixed(2)),
      Custo: Number(calculated.cost.toFixed(2)),
      Imposto: Number(calculated.taxPercent.toFixed(2)),
      "Comissão %": Number(calculated.commissionPercent.toFixed(2)),
      "Taxa Fixa": Number(calculated.fixedFeePerUnit.toFixed(2)),
      LC: Number(calculated.contributionProfitUnit.toFixed(2)),
      MC: Number((calculated.contributionMargin * 100).toFixed(2)),
      "LC POR ANÚNCIO": Number(calculated.contributionProfit.toFixed(2)),
    });
  }

  const paidRevenueTotal = validItems.reduce((acc, item) => acc + item.paidRevenue, 0);
  const contributionProfitTotal = validItems.reduce(
    (acc, item) => acc + item.contributionProfit,
    0
  );

  const averageContributionMargin =
    paidRevenueTotal > 0 ? contributionProfitTotal / paidRevenueTotal : 0;

  const tacos = paidRevenueTotal > 0 ? ads / paidRevenueTotal : 0;
  const tacox = paidRevenueTotal > 0 ? (ads + venforce) / paidRevenueTotal : 0;
  const finalResult = contributionProfitTotal - ads - venforce - affiliates;

  return {
    summary: {
      grossRevenueTotal: paidRevenueTotal,
      refundsTotal: 0,
      cancelledRevenue: 0,
      paidRevenueTotal,
      contributionProfitTotal,
      averageContributionMargin,
      finalResult,
      tacos,
      tacox,
    },
    detailedRows,
    excelFileName: "fechamento-shopee.xlsx",
    unmatchedIds: Array.from(unmatchedIdsSet),
    excludedVariationIds: Array.from(excludedVariationIdsSet),
    ignoredRowsWithoutCost: unmatchedIdsSet.size,
    ignoredRevenue,
    message:
      unmatchedIdsSet.size > 0
        ? "Alguns IDs não possuem custo cadastrado e foram removidos do cálculo."
        : "Processamento concluído com sucesso.",
  };
}

/* ========================= MELI ========================= */

type MeliPreparedRow = {
  "# de anúncio": string;
  "Título do anúncio": string;
  Unidades: number;
  "Preço unitário de venda do anúncio (BRL)": number;
  "Venda Total": number;
  "Total (BRL)": number;
  Imposto: number;
  "Preço de custo": number;
  "Preço de custo total": number;
  LC: number;
  MC: number;
};

type ParsedMeliRowLite = {
  rowIndex: number;
  saleNumber: string;
  saleDate: string;
  units: number;
  total: number;
  productRevenue: number;
  cancelRefund: number;
  adIdRaw: string;
  adId: string;
  title: string;
  unitSalePrice: number;
};

type MeliCostRow = {
  id: string;
  cost: number;
  taxPercent: number;
};

function parseMeliRows(rows: Record<string, unknown>[]): ParsedMeliRowLite[] {
  return rows.map((row, index) => {
    const saleNumber = String(
      findField(row, [
        "n.º de venda",
        "n.o de venda",
        "nª de venda",
        "nº de venda",
        "n° de venda",
        "numero de venda",
        "no de venda",
      ]) ?? ""
    ).trim();

    const saleDate = String(
      findField(row, ["data da venda"]) ?? ""
    ).trim();

    const adIdRaw = String(
      findField(row, [
        "# de anúncio",
        "# de anuncio",
        "# do anúncio",
        "# do anuncio",
      ]) ?? ""
    ).trim();

    return {
      rowIndex: index,
      saleNumber,
      saleDate,
      units: toNumber(findField(row, ["unidades"])),
      total: toNumber(findField(row, ["total (brl)", "total"])),
      productRevenue: toNumber(
        findField(row, [
          "receita por produtos (brl)",
          "receita por produtos",
        ])
      ),
      cancelRefund: toNumber(
        findField(row, [
          "cancelamentos e reembolsos (brl)",
          "cancelamentos e reembolsos",
        ])
      ),
      adIdRaw,
      adId: normalizeId(adIdRaw),
      title: String(
        findField(row, [
          "título do anúncio",
          "titulo do anuncio",
          "título",
          "titulo",
        ]) ?? ""
      ).trim(),
      unitSalePrice: toNumber(
        findField(row, [
          "preço unitário de venda do anúncio (brl)",
          "preco unitario de venda do anuncio (brl)",
          "preço unitário de venda do anúncio",
          "preco unitario de venda do anuncio",
        ])
      ),
    };
  });
}

function parseMeliCostRows(rows: Record<string, unknown>[]): MeliCostRow[] {
  const parsed: MeliCostRow[] = [];

  for (const row of rows) {
    const idRaw = findField(row, [
      "# de anúncio",
      "# de anuncio",
      "# do anúncio",
      "# do anuncio",
      "id do anúncio",
      "id do anuncio",
      "anúncio",
      "anuncio",
      "mlb",
      "id",
    ]);

    const normalizedId = normalizeId(idRaw);
    if (!normalizedId) continue;

    const cost = toNumber(
      findField(row, [
        "preço de custo",
        "preco de custo",
        "preço custo",
        "preco custo",
        "custo",
        "custo do produto",
        "custo produto",
        "custo unitário",
        "custo unitario",
      ])
    );

    let taxPercent = toNumber(
      findField(row, [
        "imposto",
        "imposto %",
        "imposto percentual",
        "percentual imposto",
        "aliquota",
        "alíquota",
      ])
    );

    if (taxPercent > 0 && taxPercent <= 1) {
      taxPercent = taxPercent * 100;
    }

    parsed.push({
      id: normalizedId,
      cost: round2(cost),
      taxPercent: round2(taxPercent),
    });
  }

  return parsed;
}

function buildMeliCostMap(rows: Record<string, unknown>[]) {
  const parsed = parseMeliCostRows(rows);
  const map = new Map<string, MeliCostRow>();

  for (const row of parsed) {
    if (!row.id) continue;

    if (!map.has(row.id)) {
      map.set(row.id, row);
    }

    const noPrefix = row.id.replace(/^MLB/i, "");
    if (noPrefix && !map.has(noPrefix)) {
      map.set(noPrefix, row);
    }
  }

  return map;
}

function allocateByUnits(
  totalValue: number,
  componentRows: ParsedMeliRowLite[]
): number[] {
  const totalUnits = componentRows.reduce((acc, row) => acc + row.units, 0);

  if (totalUnits <= 0 || componentRows.length === 0) {
    return componentRows.map(() => 0);
  }

  const allocations: number[] = [];
  let accumulated = 0;

  for (let i = 0; i < componentRows.length; i++) {
    const row = componentRows[i];

    if (i === componentRows.length - 1) {
      allocations.push(round2(totalValue - accumulated));
      continue;
    }

    const value = round2((totalValue / totalUnits) * row.units);
    allocations.push(value);
    accumulated += value;
  }

  return allocations;
}

function buildMeliBaseSheetRows(finalRows: MeliPreparedRow[]) {
  const aoa: (string | number)[][] = [];

  aoa.push([
    "# de anúncio",
    "Título do anúncio",
    "Unidades",
    "Preço unitário de venda do anúncio (BRL)",
    "Venda Total",
    "Total (BRL)",
    "Imposto",
    "Preço de custo",
    "Preço de custo total",
    "LC",
    "MC",
  ]);

  for (const row of finalRows) {
    aoa.push([
      row["# de anúncio"],
      row["Título do anúncio"],
      row.Unidades,
      row["Preço unitário de venda do anúncio (BRL)"],
      row["Venda Total"],
      row["Total (BRL)"],
      row["Imposto"] / 100,
      row["Preço de custo"],
      row["Preço de custo total"],
      row.LC,
      row.MC / 100,
    ]);
  }

  const sheet = XLSX.utils.aoa_to_sheet(aoa);

  for (let rowIndex = 2; rowIndex <= finalRows.length + 1; rowIndex++) {
    const d = `D${rowIndex}`;
    const e = `E${rowIndex}`;
    const f = `F${rowIndex}`;
    const g = `G${rowIndex}`;
    const h = `H${rowIndex}`;
    const i = `I${rowIndex}`;
    const j = `J${rowIndex}`;
    const k = `K${rowIndex}`;

    if (sheet[d]) sheet[d].z = "R$ #,##0.00";
    if (sheet[e]) sheet[e].z = "R$ #,##0.00";
    if (sheet[f]) sheet[f].z = "R$ #,##0.00";
    if (sheet[g]) sheet[g].z = "0.00%";
    if (sheet[h]) sheet[h].z = "R$ #,##0.00";
    if (sheet[i]) sheet[i].z = "R$ #,##0.00";
    if (sheet[j]) sheet[j].z = "R$ #,##0.00";
    if (sheet[k]) sheet[k].z = "0.00%";
  }

  sheet["!cols"] = [
    { wch: 16 },
    { wch: 55 },
    { wch: 10 },
    { wch: 24 },
    { wch: 16 },
    { wch: 16 },
    { wch: 10 },
    { wch: 14 },
    { wch: 18 },
    { wch: 14 },
    { wch: 10 },
  ];

  sheet["!autofilter"] = { ref: "A1:K1" };

  return sheet;
}

function processMeli(
  salesRowsRaw: Record<string, unknown>[],
  costRowsRaw: Record<string, unknown>[],
  ads: number,
  venforce: number,
  affiliates: number
): ProcessResult {
  const salesRows = parseMeliRows(salesRowsRaw);
  const costMap = buildMeliCostMap(costRowsRaw);

  const finalRows: MeliPreparedRow[] = [];
  const unmatchedIds = new Set<string>();
  const consumedIndexes = new Set<number>();
  let ignoredRevenue = 0;

  const refundsTotal = round2(
    salesRows.reduce((sum, row) => sum + row.cancelRefund, 0)
  );

  function isMainRow(row: ParsedMeliRowLite) {
    return !row.adId && Math.abs(row.productRevenue) > 0;
  }

  function isItemRow(row: ParsedMeliRowLite) {
    return !!row.adId && row.units > 0;
  }

  function getCostForAd(adId: string) {
    const normalized = normalizeId(adId);
    const noPrefix = normalized.replace(/^MLB/i, "");

    return (
      costMap.get(normalized) ||
      costMap.get(noPrefix) ||
      costMap.get(`MLB${noPrefix}`) ||
      null
    );
  }

  function pushCalculatedRow(item: ParsedMeliRowLite, totalRateado: number) {
    const id = normalizeId(item.adId || item.adIdRaw);
    const cost = getCostForAd(id);

    if (!cost || cost.cost <= 0) {
      unmatchedIds.add(id || item.adIdRaw || "SEM_ID");
      ignoredRevenue += round2(totalRateado);
      return;
    }

    const units = round2(item.units);
    const price = round2(item.unitSalePrice);
    const vendaTotal = round2(units * price);

    const impostoPercent = round2(cost.taxPercent || 0);
    const impostoDec = impostoPercent > 1 ? impostoPercent / 100 : impostoPercent;

    const precoCusto = round2(cost.cost || 0);
    const precoCustoTotal = round2(units * precoCusto);

    const totalFormatado = round2(totalRateado);

    let lc = 0;
    let mc = 0;
    
    if (totalFormatado < 0) {
      lc = round2(totalFormatado);
      mc = vendaTotal > 0 ? round2((lc / vendaTotal) * 100) : 0;
    } else if (totalFormatado > 0) {
      lc = round2(
        vendaTotal -
          (vendaTotal * impostoDec) -
          (vendaTotal - totalFormatado) -
          precoCustoTotal
      );
    
      mc = vendaTotal > 0 ? round2((lc / vendaTotal) * 100) : 0;
    } else {
      lc = 0;
      mc = 0;
    }

    finalRows.push({
      "# de anúncio": id,
      "Título do anúncio": item.title,
      Unidades: units,
      "Preço unitário de venda do anúncio (BRL)": price,
      "Venda Total": vendaTotal,
      "Total (BRL)": totalFormatado,
      Imposto: impostoPercent,
      "Preço de custo": precoCusto,
      "Preço de custo total": precoCustoTotal,
      LC: lc,
      MC: mc,
    });
  }

  for (let i = 0; i < salesRows.length; i++) {
    if (consumedIndexes.has(i)) continue;

    const current = salesRows[i];

    if (isMainRow(current)) {
      const children: ParsedMeliRowLite[] = [];
      const childrenIndexes: number[] = [];
      let j = i + 1;

      while (j < salesRows.length) {
        const next = salesRows[j];

        if (isMainRow(next)) break;
        if (next.saleDate !== current.saleDate) break;
        if (!isItemRow(next)) break;

        children.push(next);
        childrenIndexes.push(j);
        j++;
      }

      if (children.length > 0) {
        const totalRateado = allocateByUnits(current.total, children);

        for (let k = 0; k < children.length; k++) {
          pushCalculatedRow(children[k], totalRateado[k]);
          consumedIndexes.add(childrenIndexes[k]);
        }

        consumedIndexes.add(i);
        continue;
      }

      consumedIndexes.add(i);
      continue;
    }

    if (isItemRow(current)) {
      pushCalculatedRow(current, current.total);
      consumedIndexes.add(i);
    }
  }

  const grossRevenueTotal = round2(
    finalRows.reduce((sum, row) => sum + Number(row["Venda Total"] || 0), 0)
  );

  const paidRevenueTotal = round2(
    finalRows.reduce((sum, row) => sum + Number(row["Total (BRL)"] || 0), 0)
  );

  const contributionProfitTotal = round2(
    finalRows.reduce((sum, row) => sum + Number(row["LC"] || 0), 0)
  );

  const averageContributionMargin =
    grossRevenueTotal > 0 ? contributionProfitTotal / grossRevenueTotal : 0;

  const finalResult = contributionProfitTotal - ads - venforce - affiliates;
  const tacos = grossRevenueTotal > 0 ? ads / grossRevenueTotal : 0;
  const tacox =
    grossRevenueTotal > 0 ? (ads + venforce + affiliates) / grossRevenueTotal : 0;

  return {
    summary: {
      grossRevenueTotal,
      refundsTotal,
      cancelledRevenue: refundsTotal,
      paidRevenueTotal,
      contributionProfitTotal,
      averageContributionMargin,
      finalResult,
      tacos,
      tacox,
    },
    preparedRows: finalRows,
    detailedRows: finalRows,
    auditRows: [],
    excelFileName: "fechamento-meli.xlsx",
    unmatchedIds: Array.from(unmatchedIds),
    ignoredRowsWithoutCost: unmatchedIds.size,
    ignoredRevenue: round2(ignoredRevenue),
    message:
      unmatchedIds.size > 0
        ? "Alguns anúncios do MELI não possuem custo cadastrado e foram ignorados."
        : "OK",
  };
}

/* ========================= MAIN ========================= */

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const salesFile = formData.get("sales") as File;
    const costsFile = formData.get("costs") as File;

    const marketplace = String(formData.get("marketplace") || "")
      .trim()
      .toLowerCase();

    const ads = toNumber(formData.get("ads"));
    const venforce = toNumber(formData.get("venforce"));
    const affiliates = toNumber(formData.get("affiliates"));

    if (!salesFile || typeof salesFile.arrayBuffer !== "function") {
      return NextResponse.json(
        { error: "Arquivo de vendas não enviado." },
        { status: 400 }
      );
    }

    if (!costsFile || typeof costsFile.arrayBuffer !== "function") {
      return NextResponse.json(
        { error: "Arquivo de custos não enviado." },
        { status: 400 }
      );
    }

    if (marketplace !== "meli" && marketplace !== "shopee") {
      return NextResponse.json(
        { error: "Marketplace inválido. Envie exatamente 'meli' ou 'shopee'." },
        { status: 400 }
      );
    }

    const salesBuffer = await salesFile.arrayBuffer();
    const costsBuffer = await costsFile.arrayBuffer();

    const salesRowsRaw =
      marketplace === "meli"
        ? parseSpreadsheet(salesBuffer, detectMeliHeaderRow(salesBuffer))
        : parseSpreadsheet(salesBuffer, detectShopeeHeaderRow(salesBuffer));

    const costRowsRaw = parseSpreadsheet(costsBuffer);

    const result =
      marketplace === "meli"
        ? processMeli(salesRowsRaw, costRowsRaw, ads, venforce, affiliates)
        : processShopee(salesRowsRaw, costRowsRaw, ads, venforce, affiliates);

    const workbook = XLSX.utils.book_new();

    if (marketplace === "meli" && result.preparedRows && result.preparedRows.length > 0) {
      const baseSheet = buildMeliBaseSheetRows(
        result.preparedRows as MeliPreparedRow[]
      );
      XLSX.utils.book_append_sheet(workbook, baseSheet, "Base_MeLi");
    } else {
      const summaryRows = Object.entries(result.summary).map(([key, value]) => ({
        Métrica: key,
        Valor:
          typeof value === "number" ? Number(value.toFixed(6)) : String(value),
      }));

      const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
      const detailSheet = XLSX.utils.json_to_sheet(result.detailedRows);

      XLSX.utils.book_append_sheet(workbook, summarySheet, "Painel");
      XLSX.utils.book_append_sheet(workbook, detailSheet, "Detalhamento");
    }

    if (result.auditRows && result.auditRows.length > 0) {
      const auditSheet = XLSX.utils.json_to_sheet(result.auditRows);
      XLSX.utils.book_append_sheet(workbook, auditSheet, "Auditoria");
    }

    const excelBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    return NextResponse.json({
      ...result,
      excelBase64: Buffer.from(excelBuffer).toString("base64"),
    });
  } catch (error) {
    console.error("Erro em /api/process:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao processar os arquivos enviados.",
      },
      { status: 500 }
    );
  }
}