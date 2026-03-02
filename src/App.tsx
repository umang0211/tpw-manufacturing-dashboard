import React, { useState, useMemo, useEffect } from "react";
import {
  RefreshCw,
  AlertTriangle,
  Search,
  Loader2,
  ArrowUpRight,
  CheckCircle2,
  Box,
  Info,
  X,
  Save,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import DashboardHeader from "./components/DashboardHeader";
import StatCard from "./components/StatCard";
import RiskBadge from "./components/RiskBadge";

import {
  RiskLevel,
  RawMaterialMaster,
  StockEntry,
  GroupedInventory,
  LogEntry,
} from "./types/inventoryTypes";

import {
  fetchSheetData,
  sendDataToSheet,
} from "./services/GoogleSheetsService";

import {
  calculateMaterialStock,
  calculateConsumptionPreview,
  parseNumber,
} from "./logic/inventoryEngine";

interface BOMRow {
  finished_material_id: string;
  raw_material_id: string;
  colour: string;
  quantity_per_unit: number;
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [rmSearch, setRmSearch] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [config, setConfig] = useState({
    sheetId:
      localStorage.getItem("tpw_sheet_id") ||
      "1pptzDygrFHfZT_hWRi_tLCfVGPa3wzXMgbU98hJ1nnc",
    scriptUrl: localStorage.getItem("tpw_script_url") || "",
    gidRaw: "1222740841",
    gidStock: "1251341499",
    gidSku: localStorage.getItem("tpw_gid_sku") || "0",
    gidBom: localStorage.getItem("tpw_gid_bom") || "1523458632",
  });

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [materialMaster, setMaterialMaster] = useState<RawMaterialMaster[]>([]);
  const [stockEntries, setStockEntries] = useState<StockEntry[]>([]);
  const [inventory, setInventory] = useState<GroupedInventory[]>([]);
  const [bomData, setBomData] = useState<BOMRow[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  /* -----------------------------
     Logging
  ------------------------------ */

  const addLog = (
    type: LogEntry["type"],
    message: string,
    status: LogEntry["status"] = "info",
  ) => {
    const newLog: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      message,
      status,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setLogs((prev) => [newLog, ...prev].slice(0, 30));
  };

  /* -----------------------------
     Load Data
  ------------------------------ */

  const loadData = async (silent = false) => {
    if (!config.sheetId) return;

    setLoading(true);

    try {
      const [rawMaster, stockLog, skuData, rawBomData] =
        await Promise.all([
          fetchSheetData(config.sheetId, config.gidRaw),
          fetchSheetData(config.sheetId, config.gidStock),
          fetchSheetData(config.sheetId, config.gidSku),
          fetchSheetData(config.sheetId, config.gidBom),
        ]);

      setMaterialMaster(
        rawMaster.map((r: any) => ({
          material_id: r.material_id || r.id || r.sku_id || "",
          material_name: r.material_name || r.name || r.item_name || "",
          category: r.category || "",
          unit: r.unit || "pcs",
          colour: r.colour || "N/A",
          opening_stock: parseNumber(r.opening_stock || r.opening),
          min_stock: parseNumber(r.min_stock || r.threshold),
          avg_daily_use: parseNumber(r.avg_daily_use || r.daily_avg),
          status: r.status || "",
          notes: r.notes || "",
        })),
      );

      setStockEntries(
        stockLog.map((s: any) => ({
          entry_id: s.entry_id || "",
          date: s.date || "",
          material_id: s.material_id || "",
          type: (s.type || "IN").toUpperCase() as "IN" | "OUT",
          quantity: parseNumber(s.quantity || s.qty),
          colour: s.colour || "",
          reason: s.reason || "",
          notes: s.notes || "",
        })),
      );

      setInventory(
        skuData
          .filter((s: any) => {
            const type = (
              s.category ||
              s.type ||
              s.item_type ||
              s.item_category ||
              ""
            ).toLowerCase();

            if (
              type.includes("raw") ||
              type.includes("wip") ||
              type.includes("material")
            )
              return false;

            return true;
          })
          .map((s: any) => ({
            product:
              s.sku_id ||
              s.sku_name ||
              s.sku ||
              s.product ||
              s.item_name ||
              "Unnamed SKU",
            size: s.size || "",
            totalStock: parseNumber(s.stock || s.quantity || 0),
            totalCanProduce: parseNumber(s.can_produce || 0),
            mainBottleneck: s.bottleneck || "None",
            mainRisk: RiskLevel.LOW,
          })),
      );

      setBomData(
        rawBomData.map((b: any) => ({
          finished_material_id: b.sku_id?.toString().trim(),
          raw_material_id: b.raw_item_id?.toString().trim(),
          colour: (b.colour || "ANY").toUpperCase().trim(),
          quantity_per_unit: parseNumber(b.qty_per_unit),
        })),
      );

      if (!silent)
        addLog("SYSTEM", "Data Sync Successful", "success");
    } catch (err: any) {
      addLog("SYSTEM", err.message, "warning");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [config.sheetId, config.gidSku, config.gidBom]);

  /* -----------------------------
     Inventory Engine
  ------------------------------ */

  const calculatedStock = useMemo(() => {
    return calculateMaterialStock(
      materialMaster,
      stockEntries,
    );
  }, [materialMaster, stockEntries]);

  const [prodForm, setProdForm] = useState({
    sku: "",
    yield: 0,
    color: "BLACK",
  });

  const currentConsumption = useMemo(() => {
    return calculateConsumptionPreview(
      prodForm.sku,
      prodForm.yield,
      bomData,
      materialMaster,
      calculatedStock,
    );
  }, [
    prodForm.sku,
    prodForm.yield,
    bomData,
    materialMaster,
    calculatedStock,
  ]);

  const filteredMaterials = calculatedStock.filter(
    (m) =>
      m.name.toLowerCase().includes(rmSearch.toLowerCase()) ||
      m.id.toLowerCase().includes(rmSearch.toLowerCase()),
  );

  /* -----------------------------
     Production
  ------------------------------ */

  const handleProduction = async () => {
    if (!config.scriptUrl) {
      setIsSettingsOpen(true);
      return;
    }

    if (!prodForm.sku || prodForm.yield <= 0) return;

    setSubmitting(true);

    try {
      await sendDataToSheet(config.scriptUrl, {
        action: "production_output",
        date: new Date().toLocaleDateString("en-GB"),
        finished_material_id: prodForm.sku,
        quantity: prodForm.yield,
        colour: prodForm.color,
      });

      addLog(
        "PRODUCTION",
        `Processed production for ${prodForm.yield} units`,
        "success",
      );

      setTimeout(() => loadData(true), 1500);
    } catch (err: any) {
      addLog("SYSTEM", err.message, "warning");
    } finally {
      setSubmitting(false);
    }
  };

  /* -----------------------------
     UI
  ------------------------------ */

  return (
    <div className="min-h-screen bg-[#050914] text-slate-200">
      <DashboardHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <main className="p-6 max-w-[1600px] mx-auto">

        {/* Dashboard */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatCard
                label="Total Inventory"
                value={inventory.length}
                subValue="Active SKUs"
                variant="blue"
              />
              <StatCard
                label="Critical Materials"
                value={
                  calculatedStock.filter(
                    (m) => m.risk === RiskLevel.CRITICAL,
                  ).length
                }
                subValue="Immediate Action Needed"
                variant="red"
              />
              <StatCard
                label="System Status"
                value="Online"
                subValue="All syncs active"
                variant="green"
              />
            </div>

          </div>
        )}

        {/* Raw Materials */}
        {activeTab === "raw-materials" && (
          <div className="space-y-6">

            <input
              type="text"
              placeholder="Search..."
              value={rmSearch}
              onChange={(e) =>
                setRmSearch(e.target.value)
              }
              className="bg-slate-900 border border-slate-700 rounded-xl p-3 w-full"
            />

            {filteredMaterials.map((m) => (
              <div
                key={m.id}
                className="bg-slate-900 p-4 rounded-xl border border-slate-800"
              >
                <div className="flex justify-between">
                  <div>
                    <div className="font-bold">
                      {m.name}
                    </div>
                    <div className="text-sm text-slate-400">
                      {m.totalStock} {m.unit}
                    </div>
                  </div>

                  <RiskBadge level={m.risk} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Production */}
        {activeTab === "data-entry" && (
          <div className="space-y-6">

            <select
              value={prodForm.sku}
              onChange={(e) =>
                setProdForm({
                  ...prodForm,
                  sku: e.target.value,
                })
              }
              className="bg-slate-900 border border-slate-700 rounded-xl p-3 w-full"
            >
              <option value="">Select SKU</option>
              {inventory.map((sku) => (
                <option
                  key={sku.product}
                  value={sku.product}
                >
                  {sku.product}
                </option>
              ))}
            </select>

            <input
              type="number"
              placeholder="Yield"
              value={prodForm.yield || ""}
              onChange={(e) =>
                setProdForm({
                  ...prodForm,
                  yield: parseNumber(
                    e.target.value,
                  ),
                })
              }
              className="bg-slate-900 border border-slate-700 rounded-xl p-3 w-full"
            />

            {currentConsumption.map((item) => (
              <div
                key={item.id}
                className="bg-slate-900 p-3 rounded-xl"
              >
                {item.name} - {item.consumption}
              </div>
            ))}

            <button
              onClick={handleProduction}
              disabled={submitting}
              className="bg-blue-600 px-6 py-3 rounded-xl font-bold"
            >
              {submitting ? (
                <Loader2 className="animate-spin" />
              ) : (
                "Log Production"
              )}
            </button>
          </div>
        )}
      </main>

      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center">
          <div className="bg-slate-900 p-6 rounded-2xl w-[500px]">
            <h2 className="font-bold mb-4">
              Configuration
            </h2>
            <button
              onClick={() =>
                setIsSettingsOpen(false)
              }
              className="bg-blue-600 px-4 py-2 rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;