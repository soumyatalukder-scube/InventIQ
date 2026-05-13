import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  ArrowRight,
  BarChart2,
  ChevronDown,
  CheckCircle2,
  DollarSign,
  LayoutGrid,
  Package,
  Search,
  Settings2,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import { abcInventoryRows, type ABCInventoryRow } from "../data/abcData";
import { chartPalette, palette } from "../theme/palette";

const plants = [
  { id: "2100", name: "2100" },
  { id: "2200", name: "2200" },
];

const modules = [
  {
    path: "/abc-fsn",
    icon: LayoutGrid,
    title: "ABC vs FSN vs VED Analysis",
    desc: "Classify inventory by value, movement velocity, and criticality. Track recommendations by category.",
    tags: ["ABC", "FSN", "VED"],
    color: chartPalette.primary,
    status: "Workbook data loaded",
    statusColor: palette.success,
  },
  {
    path: "/demand-forecast",
    icon: TrendingUp,
    title: "Demand Forecasting",
    desc: "Historical consumption and central forecast with rolling safety stock.",
    tags: ["Forecast", "Safety Stock", "Order Point"],
    color: chartPalette.primary,
    status: "Central forecast active",
    statusColor: palette.success,
  },
  {
    path: "/inventory-optimization",
    icon: Settings2,
    title: "Inventory Optimizer",
    desc: "Scenario simulator with supply parameters and what-if comparisons.",
    tags: ["What-If", "Supply Params", "Cost"],
    color: chartPalette.primary,
    status: "Simulator ready",
    statusColor: palette.warning,
  },
];

type ValueMode = "consumption" | "closing";
type DrillDownState = {
  type: "category" | "ved" | "action" | "kpi" | "abc" | "fsn";
  key: string;
  title: string;
};

function formatCurrency(value: number) {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
  return `₹${value.toFixed(0)}`;
}

function formatNumber(value: number) {
  return value.toLocaleString("en-IN", { maximumFractionDigits: 1 });
}

function chartValue(row: ABCInventoryRow, mode: ValueMode) {
  return mode === "consumption" ? row.consumptionValue : row.closingValue;
}

function DistributionTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const item = payload[0]?.payload;
  return (
    <div className="rounded-lg p-3 min-w-[210px]" style={{ background: palette.panel, border: `1px solid ${palette.border}`, boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
      <div style={{ color: palette.text, fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>{label}</div>
      <div className="flex justify-between mb-1">
        <span style={{ color: "#64748b", fontSize: "11px" }}>Materials</span>
        <span style={{ color: chartPalette.primary, fontSize: "11px", fontWeight: 700 }}>{item.count.toLocaleString("en-IN")}</span>
      </div>
      <div className="flex justify-between mb-1">
        <span style={{ color: "#64748b", fontSize: "11px" }}>Consumption</span>
        <span style={{ color: chartPalette.primary, fontSize: "11px", fontWeight: 700 }}>{formatCurrency(item.consumptionValue)}</span>
      </div>
      <div className="flex justify-between">
        <span style={{ color: "#64748b", fontSize: "11px" }}>Closing</span>
        <span style={{ color: chartPalette.primaryAlt, fontSize: "11px", fontWeight: 700 }}>{formatCurrency(item.closingValue)}</span>
      </div>
    </div>
  );
}

export function Overview() {
  const navigate = useNavigate();
  const [selectedPlant, setSelectedPlant] = useState(plants[0]);
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [plantOpen, setPlantOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [valueMode, setValueMode] = useState<ValueMode>("consumption");
  const [drillDown, setDrillDown] = useState<DrillDownState | null>(null);
  const [search, setSearch] = useState("");

  const categories = useMemo(() => {
    return ["All Categories", ...Array.from(new Set(abcInventoryRows.map((row) => row.itemCategory).filter(Boolean))).sort()];
  }, []);

  const baseRows = useMemo(() => {
    if (selectedCategory === "All Categories") return abcInventoryRows;
    return abcInventoryRows.filter((row) => row.itemCategory === selectedCategory);
  }, [selectedCategory]);

  const totals = useMemo(() => {
    const slowNonMoving = baseRows.filter((row) => row.fsn === "S" || row.fsn === "N");
    const nonMoving = baseRows.filter((row) => row.fsn === "N");
    const deadStock = baseRows.filter((row) => row.fsn === "N" && row.ved === "D");
    const vedCounts = {
      V: baseRows.filter((row) => row.ved === "V").length,
      E: baseRows.filter((row) => row.ved === "E").length,
      D: baseRows.filter((row) => row.ved === "D").length,
    };
    const abcCounts = {
      A: baseRows.filter((row) => row.abc === "A").length,
      B: baseRows.filter((row) => row.abc === "B").length,
      C: baseRows.filter((row) => row.abc === "C").length,
    };
    const fsnCounts = {
      F: baseRows.filter((row) => row.fsn === "F").length,
      S: baseRows.filter((row) => row.fsn === "S").length,
      N: baseRows.filter((row) => row.fsn === "N").length,
    };
    return {
      count: baseRows.length,
      consumptionValue: baseRows.reduce((sum, row) => sum + row.consumptionValue, 0),
      closingValue: baseRows.reduce((sum, row) => sum + row.closingValue, 0),
      slowNonMovingValue: slowNonMoving.reduce((sum, row) => sum + row.closingValue, 0),
      slowNonMovingCount: slowNonMoving.length,
      deadStockValue: deadStock.reduce((sum, row) => sum + row.closingValue, 0),
      deadStockCount: deadStock.length,
      vedCounts,
      abcCounts,
      fsnCounts,
      optimize: baseRows.filter((row) => row.actionKey === "optimize"),
      review: baseRows.filter((row) => row.actionKey === "review"),
      dispose: baseRows.filter((row) => row.actionKey === "dispose"),
    };
  }, [baseRows]);

  const categoryDistribution = useMemo(() => {
    const byCategory = new Map<string, { name: string; count: number; consumptionValue: number; closingValue: number; rows: ABCInventoryRow[] }>();
    for (const row of baseRows) {
      const name = row.itemCategory || "Uncategorized";
      const current = byCategory.get(name) ?? { name, count: 0, consumptionValue: 0, closingValue: 0, rows: [] };
      current.count += 1;
      current.consumptionValue += row.consumptionValue;
      current.closingValue += row.closingValue;
      current.rows.push(row);
      byCategory.set(name, current);
    }
    return Array.from(byCategory.values()).sort((a, b) => b[valueMode === "consumption" ? "consumptionValue" : "closingValue"] - a[valueMode === "consumption" ? "consumptionValue" : "closingValue"]);
  }, [baseRows, valueMode]);

  const vedDistribution = useMemo(() => {
    const labels: Record<string, { name: string; color: string }> = {
      V: { name: "Vital", color: chartPalette.success },
      E: { name: "Essential", color: chartPalette.warning },
      D: { name: "Desirable", color: "#9ca3af" },
    };
    return ["V", "E", "D"].map((key) => {
      const rows = baseRows.filter((row) => row.ved === key);
      return {
        key,
        name: labels[key].name,
        color: labels[key].color,
        count: rows.length,
        consumptionValue: rows.reduce((sum, row) => sum + row.consumptionValue, 0),
        closingValue: rows.reduce((sum, row) => sum + row.closingValue, 0),
        rows,
      };
    });
  }, [baseRows]);

  const kpis = [
    {
      label: "Total Materials",
      value: totals.count.toLocaleString("en-IN"),
      change: selectedCategory,
      icon: Package,
      color: chartPalette.primary,
      drill: { type: "kpi" as const, key: "all", title: "All Materials" },
    },
    {
      label: "Consumption Value",
      value: formatCurrency(totals.consumptionValue),
      change: selectedCategory,
      icon: DollarSign,
      color: chartPalette.primary,
      drill: { type: "kpi" as const, key: "all", title: "Materials by Consumption Value" },
    },
    {
      label: "Closing Value",
      value: formatCurrency(totals.closingValue),
      change: selectedCategory,
      icon: BarChart2,
      color: chartPalette.primaryAlt,
      drill: { type: "kpi" as const, key: "all", title: "Materials by Closing Value" },
    },
    {
      label: "Review + Liquidate",
      value: (totals.review.length + totals.dispose.length).toLocaleString("en-IN"),
      change: `${totals.review.length.toLocaleString("en-IN")} review · ${totals.dispose.length.toLocaleString("en-IN")} liquidate`,
      icon: AlertTriangle,
      color: chartPalette.warning,
      drill: { type: "kpi" as const, key: "review-liquidate", title: "Review + Liquidate Materials" },
    },
    {
      label: "Slow/Non-Moving Inventory",
      value: formatCurrency(totals.slowNonMovingValue),
      change: `${totals.slowNonMovingCount.toLocaleString("en-IN")} S/N materials`,
      icon: Package,
      color: chartPalette.warning,
      drill: { type: "kpi" as const, key: "slow-non-moving", title: "Slow/Non-Moving Materials" },
    },
    {
      label: "ABC Mix",
      value: "",
      change: "Material count by value class",
      icon: LayoutGrid,
      color: chartPalette.primary,
      mix: [
        { key: "A", label: "A Class", value: totals.abcCounts.A, color: chartPalette.primary, drill: { type: "abc" as const, key: "A", title: "ABC Class A Materials" } },
        { key: "B", label: "B Class", value: totals.abcCounts.B, color: chartPalette.primaryAlt, drill: { type: "abc" as const, key: "B", title: "ABC Class B Materials" } },
        { key: "C", label: "C Class", value: totals.abcCounts.C, color: chartPalette.neutral, drill: { type: "abc" as const, key: "C", title: "ABC Class C Materials" } },
      ],
    },
    {
      label: "FSN Mix",
      value: "",
      change: "Material count by movement",
      icon: Zap,
      color: chartPalette.primary,
      mix: [
        { key: "F", label: "Fast", value: totals.fsnCounts.F, color: chartPalette.success, drill: { type: "fsn" as const, key: "F", title: "Fast Moving Materials" } },
        { key: "S", label: "Slow", value: totals.fsnCounts.S, color: chartPalette.warning, drill: { type: "fsn" as const, key: "S", title: "Slow Moving Materials" } },
        { key: "N", label: "Non", value: totals.fsnCounts.N, color: chartPalette.danger, drill: { type: "fsn" as const, key: "N", title: "Non-Moving Materials" } },
      ],
    },
    {
      label: "Dead Stock Value",
      value: formatCurrency(totals.deadStockValue),
      change: `${totals.deadStockCount.toLocaleString("en-IN")} non-moving desirable materials`,
      icon: AlertTriangle,
      color: chartPalette.danger,
      drill: { type: "kpi" as const, key: "dead-stock", title: "Dead Stock Materials" },
    },
  ];

  const drillRows = useMemo(() => {
    if (!drillDown) return [];
    if (drillDown.type === "category") return baseRows.filter((row) => (row.itemCategory || "Uncategorized") === drillDown.key);
    if (drillDown.type === "ved") return baseRows.filter((row) => row.ved === drillDown.key);
    if (drillDown.type === "abc") return baseRows.filter((row) => row.abc === drillDown.key);
    if (drillDown.type === "fsn") return baseRows.filter((row) => row.fsn === drillDown.key);
    if (drillDown.type === "kpi") {
      if (drillDown.key === "review-liquidate") return baseRows.filter((row) => row.actionKey === "review" || row.actionKey === "dispose");
      if (drillDown.key === "slow-non-moving") return baseRows.filter((row) => row.fsn === "S" || row.fsn === "N");
      if (drillDown.key === "dead-stock") return baseRows.filter((row) => row.fsn === "N" && row.ved === "D");
      return baseRows;
    }
    return baseRows.filter((row) => row.actionKey === drillDown.key);
  }, [baseRows, drillDown]);

  const filteredDrillRows = drillRows.filter((row) => {
    const q = search.toLowerCase();
    return row.material.toLowerCase().includes(q) || row.description.toLowerCase().includes(q) || row.finalGrouping.toLowerCase().includes(q);
  });
  const drillConsumptionValue = drillRows.reduce((sum, row) => sum + row.consumptionValue, 0);
  const drillClosingValue = drillRows.reduce((sum, row) => sum + row.closingValue, 0);

  function openDrill(type: DrillDownState["type"], key: string, title: string) {
    setDrillDown({ type, key, title });
    setSearch("");
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 style={{ color: palette.text }}>Dashboard</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg" style={{ background: palette.panel, border: `1px solid ${palette.border}` }} onClick={() => setPlantOpen(!plantOpen)}>
              <Package size={14} style={{ color: chartPalette.primary }} />
              <div className="text-left">
                <div style={{ color: "#64748b", fontSize: "9px", letterSpacing: "0.08em" }}>PLANT</div>
                <div style={{ color: palette.text, fontSize: "12px", fontWeight: 600 }}>{selectedPlant.name}</div>
              </div>
              <ChevronDown size={12} style={{ color: "#64748b" }} />
            </button>
            {plantOpen && (
              <div className="absolute right-0 top-full mt-1 rounded-lg z-20 min-w-[120px]" style={{ background: palette.panel, border: `1px solid ${palette.border}`, boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
                {plants.map((plant) => (
                  <button key={plant.id} className="w-full text-left px-4 py-2.5" style={{ color: selectedPlant.id === plant.id ? chartPalette.primary : palette.text, fontSize: "12px" }} onClick={() => { setSelectedPlant(plant); setPlantOpen(false); }}>
                    {plant.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="relative">
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg" style={{ background: palette.panel, border: `1px solid ${palette.border}` }} onClick={() => setCategoryOpen(!categoryOpen)}>
              <div className="text-left">
                <div style={{ color: "#64748b", fontSize: "9px", letterSpacing: "0.08em" }}>CATEGORY</div>
                <div style={{ color: palette.text, fontSize: "12px", fontWeight: 600, maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedCategory}</div>
              </div>
              <ChevronDown size={12} style={{ color: "#64748b" }} />
            </button>
            {categoryOpen && (
              <div className="absolute right-0 top-full mt-1 rounded-lg z-20 min-w-[210px] max-h-[300px] overflow-y-auto" style={{ background: palette.panel, border: `1px solid ${palette.border}`, boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
                {categories.map((category) => (
                  <button key={category} className="w-full text-left px-4 py-2.5" style={{ color: selectedCategory === category ? chartPalette.primary : palette.text, fontSize: "12px" }} onClick={() => { setSelectedCategory(category); setCategoryOpen(false); setDrillDown(null); }}>
                    {category}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          const mixTotal = kpi.mix?.reduce((sum, item) => sum + item.value, 0) ?? 0;
          return (
            <div
              key={kpi.label}
              className="rounded-lg p-4 transition-colors cursor-pointer"
              role="button"
              tabIndex={0}
              style={{ background: palette.panel, border: `1px solid ${palette.border}` }}
              onClick={() => kpi.drill && openDrill(kpi.drill.type, kpi.drill.key, kpi.drill.title)}
              onKeyDown={(event) => {
                if ((event.key === "Enter" || event.key === " ") && kpi.drill) {
                  event.preventDefault();
                  openDrill(kpi.drill.type, kpi.drill.key, kpi.drill.title);
                }
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center justify-center rounded" style={{ width: "34px", height: "34px", background: `${kpi.color}18` }}>
                  <Icon size={16} style={{ color: kpi.color }} />
                </div>
                <div className="text-right" style={{ color: "#94a3b8", fontSize: "11px", fontWeight: 700, maxWidth: "150px", lineHeight: 1.25 }}>
                  {kpi.label}
                </div>
              </div>
              {kpi.mix ? (
                <div className="space-y-2">
                  <div className="flex overflow-hidden rounded-full" style={{ height: "8px", background: "#102040" }}>
                    {kpi.mix.map((item) => (
                      <div
                        key={item.key}
                        title={`${item.label}: ${item.value.toLocaleString("en-IN")}`}
                        style={{
                          width: `${mixTotal ? (item.value / mixTotal) * 100 : 0}%`,
                          background: item.color,
                          minWidth: item.value > 0 ? "4px" : 0,
                        }}
                      />
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {kpi.mix.map((item) => (
                      <button
                        key={item.key}
                        className="rounded px-2 py-1 text-left"
                        style={{ background: `${item.color}12`, border: `1px solid ${item.color}33` }}
                        onClick={(event) => {
                          event.stopPropagation();
                          openDrill(item.drill.type, item.drill.key, item.drill.title);
                        }}
                      >
                        <div style={{ color: item.color, fontSize: "14px", fontWeight: 800, lineHeight: 1 }}>{item.value.toLocaleString("en-IN")}</div>
                        <div style={{ color: "#94a3b8", fontSize: "9px", marginTop: "3px" }}>{item.key}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ color: kpi.color, fontSize: "22px", fontWeight: 800 }}>{kpi.value}</div>
              )}
              <div style={{ color: "#94a3b8", fontSize: "10px", marginTop: "4px" }}>{kpi.change}</div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: drillDown ? "minmax(0, 0.6fr) minmax(720px, 1fr)" : "1fr" }}>
        <div className="space-y-4">
          <div className="rounded-xl p-4" style={{ background: palette.panel, border: `1px solid ${palette.border}` }}>
            <div className="flex items-center justify-between mb-4">
              <div className="min-w-0 flex-1">
                <div style={{ color: "#e2e8f0", fontSize: "13px", fontWeight: 700 }}>Distribution Across Categories</div>
                <div style={{ color: "#64748b", fontSize: "11px" }}>Bars show value, line shows count of materials. Click a category bar to drill down.</div>
              </div>
              <div className="flex rounded overflow-hidden" style={{ border: "1px solid #1e3a5f" }}>
                {[
                  { key: "consumption" as const, label: "Consumption Value" },
                  { key: "closing" as const, label: "Closing Value" },
                ].map((mode) => (
                  <button key={mode.key} className="px-3 py-1.5" style={{ background: valueMode === mode.key ? palette.panelSoft : palette.surface, color: valueMode === mode.key ? chartPalette.primary : palette.textSoft, fontSize: "11px", fontWeight: 700 }} onClick={() => setValueMode(mode.key)}>
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3 mb-4">
              {categoryDistribution.slice(0, 4).map((category, index) => (
                <button
                  key={category.name}
                  className="rounded-lg p-3 text-left"
                  style={{ background: palette.surface, border: `1px solid ${palette.border}` }}
                  onClick={() => openDrill("category", category.name, `${category.name} Materials`)}
                >
                  <div style={{ color: index === 0 ? chartPalette.primary : chartPalette.primaryAlt, fontSize: "18px", fontWeight: 800 }}>
                    {category.count.toLocaleString("en-IN")}
                  </div>
                  <div style={{ color: "#e2e8f0", fontSize: "11px", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {category.name}
                  </div>
                  <div style={{ color: "#64748b", fontSize: "9px", marginTop: "2px" }}>Materials</div>
                  <div style={{ color: chartPalette.primary, fontSize: "11px", fontWeight: 800, marginTop: "6px" }}>
                    {formatCurrency(valueMode === "consumption" ? category.consumptionValue : category.closingValue)}
                  </div>
                </button>
              ))}
            </div>
            <div style={{ width: "100%", height: 310 }}>
              <ResponsiveContainer width="99%" height="100%">
                <ComposedChart data={categoryDistribution.slice(0, 12)} margin={{ top: 5, right: 15, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                  <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={{ stroke: "#1e3a5f" }} tickLine={false} />
                  <YAxis yAxisId="value" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(value) => formatCurrency(Number(value))} />
                  <YAxis yAxisId="count" orientation="right" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(value) => Number(value).toLocaleString("en-IN")} />
                  <Tooltip content={<DistributionTooltip />} />
                  <Bar yAxisId="value" dataKey={valueMode === "consumption" ? "consumptionValue" : "closingValue"} radius={[3, 3, 0, 0]} onClick={(data) => openDrill("category", data.name, `${data.name} Materials`)}>
                    {categoryDistribution.slice(0, 12).map((entry, index) => (
                      <Cell key={entry.name} fill={index % 2 === 0 ? chartPalette.primary : chartPalette.primaryAlt} fillOpacity={0.78} cursor="pointer" />
                    ))}
                  </Bar>
                  <Line yAxisId="count" type="monotone" dataKey="count" stroke={chartPalette.neutral} strokeWidth={2.5} dot={{ r: 3, fill: chartPalette.neutral, strokeWidth: 0 }} name="Material Count" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 rounded-xl p-4" style={{ background: palette.panel, border: `1px solid ${palette.border}` }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div style={{ color: "#e2e8f0", fontSize: "13px", fontWeight: 700 }}>VED Distribution</div>
                  <div style={{ color: "#64748b", fontSize: "11px" }}>Click a segment card to view V, E, or D materials</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {vedDistribution.map((item) => (
                  <button key={item.key} className="rounded-lg p-4 text-left" style={{ background: `${item.color}12`, border: `1px solid ${item.color}44` }} onClick={() => openDrill("ved", item.key, `${item.name} Materials`)}>
                    <div style={{ color: item.color, fontSize: "24px", fontWeight: 800 }}>{item.count.toLocaleString("en-IN")}</div>
                    <div style={{ color: "#e2e8f0", fontSize: "12px", fontWeight: 700 }}>{item.name}</div>
                    <div style={{ color: item.color, fontSize: "12px", fontWeight: 800, marginTop: "8px" }}>{formatCurrency(item.consumptionValue)}</div>
                    <div style={{ color: "#64748b", fontSize: "10px" }}>Consumption</div>
                    <div style={{ color: "#94a3b8", fontSize: "11px", marginTop: "6px" }}>Closing {formatCurrency(item.closingValue)}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl p-4" style={{ background: palette.panel, border: `1px solid ${palette.border}` }}>
              <div style={{ color: "#e2e8f0", fontSize: "13px", fontWeight: 700, marginBottom: "10px" }}>VED Share</div>
              <div style={{ width: "100%", height: 190 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={vedDistribution} dataKey={valueMode === "consumption" ? "consumptionValue" : "closingValue"} nameKey="name" innerRadius={48} outerRadius={78} paddingAngle={2}>
                      {vedDistribution.map((entry) => <Cell key={entry.key} fill={entry.color} />)}
                    </Pie>
                    <Tooltip content={<DistributionTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {modules.map((module) => {
              const Icon = module.icon;
              return (
                <button key={module.path} onClick={() => navigate(module.path)} className="w-full text-left rounded-lg p-4 transition-all duration-150 group" style={{ background: palette.panel, border: `1px solid ${palette.border}` }}>
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center rounded-lg flex-shrink-0" style={{ width: "40px", height: "40px", background: module.color + "15", border: `1px solid ${module.color}30` }}>
                      <Icon size={18} style={{ color: module.color }} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span style={{ color: "#e2e8f0", fontSize: "13px", fontWeight: 700 }}>{module.title}</span>
                        <ArrowRight size={14} style={{ color: "#475569" }} className="group-hover:translate-x-1 transition-transform" />
                      </div>
                      <p style={{ color: "#64748b", fontSize: "11px", lineHeight: "1.45" }}>{module.desc}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        {module.tags.map((tag) => (
                          <span key={tag} className="px-2 py-0.5 rounded" style={{ background: "#1e3a5f", color: "#94a3b8", fontSize: "9px" }}>{tag}</span>
                        ))}
                        <span className="ml-auto" style={{ color: module.statusColor, fontSize: "10px" }}>● {module.status}</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {drillDown && (
          <div className="rounded-xl overflow-hidden flex flex-col" style={{ background: palette.panel, border: `1px solid ${palette.border}` }}>
            <div className="flex items-start justify-between p-4" style={{ borderBottom: "1px solid #1e3a5f" }}>
              <div className="min-w-0 flex-1">
                <div style={{ color: "#e2e8f0", fontSize: "14px", fontWeight: 800 }}>{drillDown.title}</div>
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {[
                    { label: "Materials", value: drillRows.length.toLocaleString("en-IN"), color: chartPalette.primary },
                    { label: "Consumption", value: formatCurrency(drillConsumptionValue), color: chartPalette.success },
                    { label: "Closing Value", value: formatCurrency(drillClosingValue), color: chartPalette.primaryAlt },
                  ].map((item) => (
                    <div key={item.label} className="rounded px-3 py-2" style={{ background: `${item.color}12`, border: `1px solid ${item.color}33` }}>
                      <div style={{ color: item.color, fontSize: "14px", fontWeight: 800, lineHeight: 1.1 }}>{item.value}</div>
                      <div style={{ color: "#94a3b8", fontSize: "9px", marginTop: "4px" }}>{item.label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "none", color: "#64748b", fontSize: "11px", marginTop: "4px" }}>
                  {drillRows.length.toLocaleString("en-IN")} materials · {formatCurrency(drillRows.reduce((sum, row) => sum + row.consumptionValue, 0))} consumption
                </div>
              </div>
              <button onClick={() => setDrillDown(null)}><X size={16} style={{ color: "#64748b" }} /></button>
            </div>
            <div className="p-3" style={{ borderBottom: "1px solid #1e3a5f" }}>
              <div className="flex items-center gap-2 rounded px-3 py-2" style={{ background: "#0a1628", border: "1px solid #1e3a5f" }}>
                <Search size={13} style={{ color: "#475569" }} />
                <input className="flex-1 bg-transparent outline-none" placeholder="Search material, description, grouping..." value={search} onChange={(event) => setSearch(event.target.value)} style={{ color: "#e2e8f0", fontSize: "12px" }} />
              </div>
            </div>
            <div className="grid px-4 py-2" style={{ gridTemplateColumns: "110px minmax(230px,1.6fr) 90px 48px 48px 108px 92px", gap: "10px", borderBottom: "1px solid #1e3a5f" }}>
              {["Material", "Description", "Category", "ABC", "VED", "Final", "Value"].map((heading) => (
                <div key={heading} style={{ color: "#475569", fontSize: "9px", letterSpacing: "0.08em" }}>{heading}</div>
              ))}
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: "640px" }}>
              {filteredDrillRows.slice(0, 250).map((row) => (
                <div key={`${row.material}-${row.combined}`} className="grid px-4 py-2.5" style={{ gridTemplateColumns: "110px minmax(230px,1.6fr) 90px 48px 48px 108px 92px", gap: "10px", borderBottom: "1px solid #0f2a42" }}>
                  <div style={{ color: chartPalette.primary, fontSize: "11px", fontWeight: 700, wordBreak: "break-word" }}>{row.material}</div>
                  <div>
                    <div style={{ color: "#c7d2e0", fontSize: "11px", lineHeight: 1.35, overflowWrap: "anywhere" }}>{row.description}</div>
                    <div style={{ color: "#475569", fontSize: "9px", marginTop: "3px" }}>{row.combined} · Closing {formatCurrency(row.closingValue)}</div>
                  </div>
                  <div style={{ color: "#94a3b8", fontSize: "10px", overflowWrap: "anywhere" }}>{row.itemCategory}</div>
                  <div style={{ color: chartPalette.primary, fontSize: "10px", fontWeight: 800 }}>{row.abc}</div>
                  <div style={{ color: row.ved === "V" ? chartPalette.success : row.ved === "E" ? chartPalette.warning : chartPalette.neutral, fontSize: "10px", fontWeight: 800 }}>{row.ved}</div>
                  <div style={{ color: chartPalette.warning, fontSize: "10px", fontWeight: 700 }}>{row.finalGrouping}</div>
                  <div style={{ color: chartPalette.primary, fontSize: "11px", fontWeight: 800 }}>{formatCurrency(row.consumptionValue)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
