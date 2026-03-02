// src/logic/inventoryEngine.ts

import {
  RawMaterialMaster,
  StockEntry,
  MaterialStockDetail,
  RiskLevel,
} from "../types/inventoryTypes";

interface BOMRow {
  finished_material_id: string;
  raw_material_id: string;
  colour: string;
  quantity_per_unit: number;
}

/* -----------------------------
   Helpers
------------------------------ */

export const parseNumber = (val: any): number => {
  if (val === undefined || val === null) return 0;
  const cleanVal = val.toString().replace(/[^0-9.-]/g, "");
  return parseFloat(cleanVal) || 0;
};

/* -----------------------------
   Risk Engine
------------------------------ */

export const calculateRisk = (
  total: number,
  minStock: number,
  avgDailyUse: number,
): RiskLevel => {
  const days =
    avgDailyUse > 0 ? total / avgDailyUse : 999;

  if (days < 3 || total <= minStock) return RiskLevel.CRITICAL;
  if (days < 7) return RiskLevel.HIGH;
  return RiskLevel.LOW;
};

/* -----------------------------
   Stock Aggregation Engine
------------------------------ */

export const calculateMaterialStock = (
  materialMaster: RawMaterialMaster[],
  stockEntries: StockEntry[],
): MaterialStockDetail[] => {
  return materialMaster.map((m) => {
    const variantsMap: Record<string, number> = {};
    const baseColor = (m.colour || "N/A").toUpperCase().trim();

    variantsMap[baseColor] = m.opening_stock;

    stockEntries
      .filter((s) => s.material_id === m.material_id)
      .forEach((entry) => {
        const col = (entry.colour || baseColor)
          .toUpperCase()
          .trim();

        if (!variantsMap[col]) variantsMap[col] = 0;

        if (entry.type === "IN") {
          variantsMap[col] += entry.quantity;
        } else {
          variantsMap[col] -= entry.quantity;
        }
      });

    const total = Object.values(variantsMap).reduce(
      (a, b) => a + b,
      0,
    );

    const days =
      m.avg_daily_use > 0
        ? total / m.avg_daily_use
        : 999;

    return {
      id: m.material_id,
      name: m.material_name,
      category: m.category,
      unit: m.unit,
      totalStock: total,
      daysLeft: days,
      minStock: m.min_stock,
      avgDailyUse: m.avg_daily_use,
      risk: calculateRisk(total, m.min_stock, m.avg_daily_use),
      variants: Object.entries(variantsMap).map(
        ([colour, qty]) => ({
          colour,
          qty,
        }),
      ),
    };
  });
};

/* -----------------------------
   BOM Consumption Engine
------------------------------ */

export const calculateConsumptionPreview = (
  sku: string,
  yieldQty: number,
  bomData: BOMRow[],
  materialMaster: RawMaterialMaster[],
  calculatedStock: MaterialStockDetail[],
) => {
  if (!sku || yieldQty <= 0) return [];

  return bomData
    .filter((b) => b.finished_material_id === sku)
    .map((b) => {
      const material = materialMaster.find(
        (m) => m.material_id === b.raw_material_id,
      );

      const stockInfo = calculatedStock.find(
        (s) => s.id === b.raw_material_id,
      );

      const colourStock =
        b.colour === "ANY"
          ? stockInfo?.totalStock ?? 0
          : stockInfo?.variants.find(
              (v) => v.colour === b.colour,
            )?.qty ?? 0;

      const required = b.quantity_per_unit * yieldQty;

      return {
        id: b.raw_material_id,
        name: material?.material_name || b.raw_material_id,
        unit: material?.unit || "pcs",
        colour: b.colour,
        consumption: required,
        currentStock: colourStock,
        remaining: colourStock - required,
      };
    });
};