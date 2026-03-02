import React, { useState, useMemo, useEffect } from "react";
import {
  Activity,
  RefreshCw,
  TrendingUp,
  BarChart2,
  Package,
  Layout,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Settings,
  Bell,
  Search,
  Loader2,
  ArrowUpRight,
  Filter,
  History,
  CheckCircle2,
  Box,
  Info,
  Database,
  X,
  Save,
  Code,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import DashboardHeader from "./components/DashboardHeader";
import StatCard from "./components/StatCard";
import RiskBadge from "./components/RiskBadge";
import {
  RiskLevel,
  RawMaterialMaster,
  StockEntry,
  MaterialStockDetail,
  GroupedInventory,
  LogEntry,
} from "./types";
import { fetchSheetData, sendDataToSheet } from "./GoogleSheetsService";

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

  const parseNum = (val: any): number => {
    if (val === undefined || val === null) return 0;
    const cleanVal = val.toString().replace(/[^0-9.-]/g, "");
    return parseFloat(cleanVal) || 0;
  };

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

  const loadData = async (silent = false) => {
    if (!config.sheetId) return;
    setLoading(true);
    try {
      const [rawMaster, stockLog, skuData, rawBomData] = await Promise.all([
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
          opening_stock: parseNum(r.opening_stock || r.opening),
          min_stock: parseNum(r.min_stock || r.threshold),
          avg_daily_use: parseNum(r.avg_daily_use || r.daily_avg),
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
          quantity: parseNum(s.quantity || s.qty),
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
            size: s.size || s.specification || s.dimensions || "",
            totalStock: parseNum(
              s.stock || s.quantity || s.available || s.qty_on_hand,
            ),
            totalCanProduce: parseNum(
              s.can_produce || s.potential_yield || s.producible,
            ),
            mainBottleneck: s.bottleneck || s.shortage || "None",
            mainRisk: (s.risk || s.status || "").toLowerCase().includes("high")
              ? RiskLevel.HIGH
              : RiskLevel.LOW,
          })),
      );

      setBomData(
        rawBomData.map((b: any) => ({
          finished_material_id: b.sku_id.toString().trim(),
          raw_material_id: b.raw_item_id.toString().trim(), // 🔑 KEY FIX
          colour: (b.colour || "ANY").toUpperCase().trim(),
          quantity_per_unit: parseNum(b.qty_per_unit),
        })),
      );

      if (!silent) addLog("SYSTEM", "Data Sync Successful", "success");
    } catch (err: any) {
      addLog("SYSTEM", `Auth Sync Error: ${err.message}`, "warning");
      console.error("Sync failure:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [config.sheetId, config.gidSku, config.gidBom]);

  const calculatedStock = useMemo(() => {
    return materialMaster.map((m) => {
      const variantsMap: Record<string, number> = {};
      const baseColor = (m.colour || "N/A").toUpperCase().trim();
      variantsMap[baseColor] = m.opening_stock;

      stockEntries
        .filter((s) => s.material_id === m.material_id)
        .forEach((entry) => {
          const col = (entry.colour || baseColor).toUpperCase().trim();
          if (!variantsMap[col]) variantsMap[col] = 0;
          if (entry.type === "IN") variantsMap[col] += entry.quantity;
          else variantsMap[col] -= entry.quantity;
        });

      const total = Object.values(variantsMap).reduce((a, b) => a + b, 0);
      const days = m.avg_daily_use > 0 ? total / m.avg_daily_use : 999;

      return {
        id: m.material_id,
        name: m.material_name,
        category: m.category,
        unit: m.unit,
        totalStock: total,
        daysLeft: days,
        minStock: m.min_stock,
        avgDailyUse: m.avg_daily_use,
        risk:
          days < 3 || total <= m.min_stock
            ? RiskLevel.CRITICAL
            : days < 7
              ? RiskLevel.HIGH
              : RiskLevel.LOW,
        variants: Object.entries(variantsMap).map(([colour, qty]) => ({
          colour,
          qty,
        })),
      } as MaterialStockDetail;
    });
  }, [materialMaster, stockEntries]);

  const [inwardForm, setInwardForm] = useState({
    material_id: "",
    qty: 0,
    colour: "BLACK",
    reason: "Purchase",
  });
  const [prodForm, setProdForm] = useState({
    sku: "",
    yield: 0,
    color: "BLACK",
  });

  const currentConsumption = useMemo(() => {
    if (!prodForm.sku || prodForm.yield <= 0) return [];

    return bomData
      .filter((b) => b.finished_material_id === prodForm.sku)

      .map((b) => {
        const material = materialMaster.find(
          (m) => m.material_id === b.raw_material_id,
        );

        const stockInfo = calculatedStock.find(
          (s) => s.id === b.raw_material_id,
        );

        // 👇 COLOUR-AWARE STOCK
        const colourStock =
          b.colour === "ANY"
            ? (stockInfo?.totalStock ?? 0)
            : (stockInfo?.variants.find((v) => v.colour === b.colour)?.qty ??
              0);

        const required = b.quantity_per_unit * prodForm.yield;

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
  }, [prodForm.sku, prodForm.yield, bomData, materialMaster, calculatedStock]);

  const handleInward = async () => {
    if (!config.scriptUrl) {
      setIsSettingsOpen(true);
      return;
    }
    if (!inwardForm.material_id || inwardForm.qty <= 0) return;

    setSubmitting(true);
    try {
      const payload = {
        action: "append_stock",
        date: new Date().toLocaleDateString("en-GB"),
        material_id: inwardForm.material_id,
        type: "IN",
        quantity: inwardForm.qty,
        colour: inwardForm.colour,
        reason: inwardForm.reason,
      };
      await sendDataToSheet(config.scriptUrl, payload);
      addLog(
        "INWARD",
        `Successfully sent ${inwardForm.qty} units to transaction log.`,
        "success",
      );
      setTimeout(() => loadData(true), 1500);
    } catch (err: any) {
      addLog("SYSTEM", `Transmission Error: ${err.message}`, "warning");
    } finally {
      setSubmitting(false);
    }
  };

  const handleProduction = async () => {
    if (!config.scriptUrl) {
      setIsSettingsOpen(true);
      return;
    }

    if (!prodForm.sku || prodForm.yield <= 0) return;

    setSubmitting(true);
    try {
      const payload = {
        action: "production_output",
        date: new Date().toLocaleDateString("en-GB"),
        finished_material_id: prodForm.sku,
        quantity: prodForm.yield,
        colour: prodForm.color,
      };

      await sendDataToSheet(config.scriptUrl, payload);

      addLog(
        "PRODUCTION",
        `Processed production for ${prodForm.yield} units of ${prodForm.sku}.`,
        "success",
      );

      setTimeout(() => loadData(true), 1500);
    } catch (err: any) {
      addLog(
        "SYSTEM",
        `Production Transmission Error: ${err.message}`,
        "warning",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const filteredMaterials = calculatedStock.filter(
    (m) =>
      m.name.toLowerCase().includes(rmSearch.toLowerCase()) ||
      m.id.toLowerCase().includes(rmSearch.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-[#050914] text-slate-200 font-sans selection:bg-blue-500/30">
      <DashboardHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <main className="p-6 max-w-[1600px] mx-auto">
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Total Inventory"
                value={inventory.length}
                subValue="Active SKUs"
                variant="blue"
              />
              <StatCard
                label="Critical Materials"
                value={
                  calculatedStock.filter((m) => m.risk === RiskLevel.CRITICAL)
                    .length
                }
                subValue="Immediate Action Needed"
                variant="red"
              />
              <StatCard
                label="Active Orders"
                value="12"
                subValue="+2 from yesterday"
                variant="orange"
              />
              <StatCard
                label="System Status"
                value="Online"
                subValue="All syncs active"
                variant="green"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-[#0a0f1d] border border-slate-800/40 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-black tracking-tight text-white uppercase">
                    Stock Movements
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                    <span className="text-[11px] font-bold text-slate-400">
                      INWARD
                    </span>
                    <span className="w-3 h-3 bg-emerald-500 rounded-full ml-4"></span>
                    <span className="text-[11px] font-bold text-slate-400">
                      PRODUCTION
                    </span>
                  </div>
                </div>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={[]}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#1e293b"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="day"
                        stroke="#475569"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="#475569"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="usage"
                        stroke="#3b82f6"
                        fillOpacity={1}
                        fill="url(#colorUsage)"
                      />
                      <defs>
                        <linearGradient
                          id="colorUsage"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#3b82f6"
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor="#3b82f6"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-[#0a0f1d] border border-slate-800/40 rounded-2xl p-6 overflow-hidden flex flex-col">
                <h3 className="text-lg font-black tracking-tight text-white uppercase mb-4">
                  Activity Log
                </h3>
                <div className="space-y-4 overflow-y-auto flex-1 pr-2">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="flex gap-4 p-3 rounded-xl bg-slate-900/40 border border-slate-800/30"
                    >
                      <div
                        className={`mt-1 ${log.status === "success" ? "text-emerald-500" : "text-amber-500"}`}
                      >
                        {log.status === "success" ? (
                          <CheckCircle2 size={16} />
                        ) : (
                          <AlertTriangle size={16} />
                        )}
                      </div>
                      <div>
                        <div className="text-[12px] font-bold text-slate-200 leading-tight">
                          {log.message}
                        </div>
                        <div className="text-[10px] font-black text-slate-500 uppercase mt-1 tracking-wider">
                          {log.time} • {log.type}
                        </div>
                      </div>
                    </div>
                  ))}
                  {logs.length === 0 && (
                    <div className="h-full flex items-center justify-center text-slate-600 text-[12px] italic">
                      No recent activities
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "raw-materials" && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-[#0a0f1d] p-4 rounded-2xl border border-slate-800/40">
              <div className="relative w-full md:w-96">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                  size={18}
                />
                <input
                  type="text"
                  placeholder="Search materials by ID or name..."
                  className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl py-2.5 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-white"
                  value={rmSearch}
                  onChange={(e) => setRmSearch(e.target.value)}
                />
              </div>
              <button
                onClick={() => loadData()}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-500/20"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <RefreshCw size={18} />
                )}
                Refresh Inventory
              </button>
            </div>

            <div className="bg-[#0a0f1d] border border-slate-800/40 rounded-2xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900/40 border-b border-slate-800/60">
                    <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider text-slate-500">
                      Material ID
                    </th>
                    <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider text-slate-500">
                      Material Name
                    </th>
                    <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider text-slate-500">
                      Current Stock
                    </th>
                    <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider text-slate-500">
                      Days Left
                    </th>
                    <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider text-slate-500">
                      Status
                    </th>
                    <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider text-slate-500">
                      Variants (Qty)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {filteredMaterials.map((m) => (
                    <tr
                      key={m.id}
                      className="hover:bg-slate-800/20 transition-colors group"
                    >
                      <td className="px-6 py-4 font-mono text-[12px] text-blue-400">
                        {m.id}
                      </td>
                      <td className="px-6 py-4 font-bold text-white text-[13px]">
                        {m.name}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-[14px] font-black text-white">
                          {m.totalStock.toLocaleString()}{" "}
                          <span className="text-[10px] text-slate-500 font-medium uppercase">
                            {m.unit}
                          </span>
                        </div>
                        <div className="w-24 h-1 bg-slate-800 rounded-full mt-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${m.totalStock <= m.minStock ? "bg-rose-500" : "bg-blue-500"}`}
                            style={{
                              width: `${Math.min(100, (m.totalStock / (m.minStock * 3)) * 100)}%`,
                            }}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 font-black text-slate-300">
                        {m.daysLeft > 100 ? "99+" : Math.round(m.daysLeft)}{" "}
                        <span className="text-[10px] text-slate-500 font-medium lowercase">
                          days
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <RiskBadge level={m.risk} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {m.variants.map((v) => (
                            <span
                              key={v.colour}
                              className="px-2 py-0.5 bg-slate-800/50 border border-slate-700/50 rounded-md text-[10px] font-bold text-slate-400"
                            >
                              {v.colour}: {v.qty}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "data-entry" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* MATERIAL INWARD SECTION - KEPT AS IS */}
            <div className="bg-[#0a0f1d] border border-slate-800/40 rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500">
                  <ArrowUpRight size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black tracking-tight text-white uppercase">
                    Material Inward
                  </h3>
                  <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">
                    Update Raw Material Stock
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">
                    Select Material
                  </label>
                  <select
                    className="w-full bg-slate-900/80 border border-slate-700/50 rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-blue-500/50 text-white outline-none"
                    value={inwardForm.material_id}
                    onChange={(e) =>
                      setInwardForm({
                        ...inwardForm,
                        material_id: e.target.value,
                      })
                    }
                  >
                    <option value="">-- Choose Material --</option>
                    {materialMaster.map((m) => (
                      <option key={m.material_id} value={m.material_id}>
                        {m.material_id} - {m.material_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      className="w-full bg-slate-900/80 border border-slate-700/50 rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-blue-500/50 text-white outline-none"
                      placeholder="0.00"
                      value={inwardForm.qty || ""}
                      onChange={(e) =>
                        setInwardForm({
                          ...inwardForm,
                          qty: parseNum(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">
                      Colour Variant
                    </label>
                    <input
                      type="text"
                      className="w-full bg-slate-900/80 border border-slate-700/50 rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-blue-500/50 text-white outline-none"
                      placeholder="BLACK / RED / etc."
                      value={inwardForm.colour}
                      onChange={(e) =>
                        setInwardForm({
                          ...inwardForm,
                          colour: e.target.value.toUpperCase(),
                        })
                      }
                    />
                  </div>
                </div>
                <button
                  onClick={handleInward}
                  disabled={submitting}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-4 rounded-xl font-black uppercase tracking-widest text-[13px] shadow-lg shadow-blue-500/20 transition-all mt-4 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <Save size={18} />
                  )}
                  Log Entry to Sheets
                </button>
              </div>
            </div>

            {/* DAILY PRODUCTION OUTPUT SECTION - UPDATED TO MATCH REFERENCE IMAGE */}
            <div className="bg-[#111827] border border-blue-500/20 rounded-[2.5rem] p-10 shadow-2xl space-y-8">
              <h3 className="text-3xl font-black text-white flex items-center gap-3">
                Daily Production Output
              </h3>

              <div className="flex flex-col xl:flex-row gap-10">
                {/* Main Form Area */}
                <div className="flex-1 space-y-8">
                  <div className="space-y-2">
                    <label className="text-[12px] font-black text-slate-500 uppercase tracking-widest ml-1">
                      Finished Good (SKU)
                    </label>
                    <select
                      className="w-full bg-[#0d121f] border border-slate-800 rounded-xl py-4 px-5 text-lg font-bold text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all appearance-none"
                      value={prodForm.sku}
                      onChange={(e) =>
                        setProdForm({ ...prodForm, sku: e.target.value })
                      }
                    >
                      <option value="">-- Select SKU --</option>
                      {inventory.map((sku) => (
                        <option key={sku.product} value={sku.product}>
                          {sku.product} ({sku.size})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[12px] font-black text-slate-500 uppercase tracking-widest ml-1">
                      Batch Yield
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        className="w-full bg-[#0d121f] border border-slate-800 rounded-xl py-4 px-5 text-xl font-black text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                        placeholder="100"
                        value={prodForm.yield || ""}
                        onChange={(e) =>
                          setProdForm({
                            ...prodForm,
                            yield: parseNum(e.target.value),
                          })
                        }
                      />
                      <span className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 font-bold uppercase tracking-widest text-[12px]">
                        PCS
                      </span>
                    </div>
                  </div>

                  {/* Calculated Consumption Sub-Card */}
                  <div className="bg-[#0d121f] border border-slate-800/50 rounded-[1.5rem] p-6 space-y-4">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-slate-800/60 pb-2">
                      Calculated Consumption
                    </h4>
                    <div className="space-y-3">
                      {currentConsumption.length > 0 ? (
                        currentConsumption.map((item) => (
                          <div
                            key={item.id}
                            className="flex justify-between items-center group"
                          >
                            <div className="text-[14px] font-bold text-slate-300">
                              {item.name}{" "}
                              <span className="text-blue-500 font-medium ml-1">
                                {prodForm.color}
                              </span>
                            </div>
                            <div className="text-[14px] font-black text-rose-500">
                              -
                              {item.consumption.toFixed(
                                item.unit.toLowerCase() === "l" ? 1 : 0,
                              )}{" "}
                              {item.unit.toLowerCase()}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-[11px] text-slate-600 font-bold uppercase tracking-wider italic">
                          Select SKU and Yield to preview BOM requirements
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={handleProduction}
                    disabled={
                      submitting || !prodForm.sku || prodForm.yield <= 0
                    }
                    className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:opacity-50 text-white py-5 rounded-2xl font-black uppercase tracking-[0.15em] text-lg shadow-2xl shadow-blue-500/10 transition-all flex items-center justify-center gap-3"
                  >
                    {submitting ? (
                      <Loader2 className="animate-spin" size={24} />
                    ) : null}
                    Log Batch Yield
                  </button>
                </div>

                {/* Stock Check Sidebar Panel */}
                <div className="w-full xl:w-[320px] bg-[#0d121f] border border-slate-800/80 rounded-[2rem] p-8 flex flex-col space-y-10">
                  <h4 className="text-[12px] font-black text-slate-500 uppercase tracking-[0.2em]">
                    Stock Check
                  </h4>

                  <div className="space-y-8 flex-1">
                    {currentConsumption.map((item) => (
                      <div key={item.id} className="space-y-3">
                        <div className="flex justify-between items-end">
                          <div className="text-[13px] font-bold text-slate-200">
                            {item.name}
                          </div>
                          <div
                            className={`text-[11px] font-black ${item.remaining < 0 ? "text-rose-500" : "text-emerald-500"}`}
                          >
                            {Math.round(item.remaining)} Remaining
                          </div>
                        </div>
                        <div className="h-2 w-full bg-slate-800/40 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-1000 ease-out ${item.remaining < 0 ? "bg-rose-500" : "bg-emerald-500"}`}
                            style={{
                              width: `${Math.min(100, Math.max(0, (item.remaining / (item.currentStock || 1)) * 100))}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                    {currentConsumption.length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-10 py-10">
                        <Box size={64} className="text-slate-500" />
                        <p className="text-[12px] font-black text-slate-500 uppercase tracking-widest leading-relaxed">
                          No batch active for
                          <br />
                          availability scan
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0f172a] border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-lg font-black tracking-tight text-white uppercase">
                System Configuration
              </h2>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">
                  Master Sheets ID
                </label>
                <input
                  type="text"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white font-mono"
                  value={config.sheetId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setConfig((prev) => ({ ...prev, sheetId: val }));
                    localStorage.setItem("tpw_sheet_id", val);
                  }}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">
                  Google Apps Script URL (Web App)
                </label>
                <input
                  type="text"
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white font-mono"
                  value={config.scriptUrl}
                  onChange={(e) => {
                    const val = e.target.value;
                    setConfig((prev) => ({ ...prev, scriptUrl: val }));
                    localStorage.setItem("tpw_script_url", val);
                  }}
                />
              </div>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex gap-3">
                <Info className="text-blue-500 shrink-0" size={18} />
                <p className="text-[11px] text-blue-300 font-medium leading-relaxed">
                  Ensure your Apps Script is deployed as a Web App with access
                  set to "Anyone". This is required to process stock updates
                  from the dashboard.
                </p>
              </div>
            </div>
            <div className="p-6 bg-slate-900/50 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="px-8 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-black uppercase tracking-wider transition-all"
              >
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
