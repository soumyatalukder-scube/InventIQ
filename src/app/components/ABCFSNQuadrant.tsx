import { useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  ArrowUpDown,
  BarChart3,
  ChevronDown,
  ChevronRight,
  Package,
  Search,
  TrendingUp,
  X,
} from "lucide-react";
import { abcInventoryRows, type ABCInventoryRow } from "../data/abcData";
import { chartPalette, palette } from "../theme/palette";

const plants = [
  { id: "2100", name: "2100" },
  { id: "2200", name: "2200" },
];

const actionConfig = {
  optimize: {
    label: "Optimize",
    sublabel: "Critical/value items to protect with tighter controls",
    color: chartPalette.success,
    bg: palette.successSoft,
    border: `${palette.success}55`,
    hoverBg: "rgba(88,199,178,0.2)",
    badge: "OPTIMIZE",
    icon: TrendingUp,
    recommendation: "Prioritize service levels and active replenishment review.",
  },
  review: {
    label: "Review",
    sublabel: "High value or critical combinations needing planner review",
    color: chartPalette.warning,
    bg: palette.warningSoft,
    border: `${palette.warning}55`,
    hoverBg: "rgba(214,169,76,0.2)",
    badge: "REVIEW",
    icon: AlertTriangle,
    recommendation: "Validate stocking policy, lead time, and consumption trend.",
  },
  "bulk-buy": {
    label: "Bulk Buy",
    sublabel: "Lower value moving items suitable for batch procurement",
    color: chartPalette.primary,
    bg: palette.primarySoft,
    border: `${palette.primary}44`,
    hoverBg: "rgba(122,167,232,0.2)",
    badge: "BULK BUY",
    icon: Package,
    recommendation: "Consolidate orders where carrying cost impact is low.",
  },
  dispose: {
    label: "Liquidate",
    sublabel: "Slow or non-moving inventory with low operating priority",
    color: chartPalette.danger,
    bg: palette.dangerSoft,
    border: `${palette.danger}55`,
    hoverBg: "rgba(226,109,109,0.2)",
    badge: "LIQUIDATE",
    icon: Package,
    recommendation: "Review dead stock for liquidation, return, or cannibalization.",
  },
};

const fsnConfig = {
  F: { label: "Fast", color: chartPalette.success, title: "Fast Moving Materials" },
  S: { label: "Slow", color: chartPalette.warning, title: "Slow Moving Materials" },
  N: { label: "Non-Moving", color: chartPalette.danger, title: "Non-Moving Materials" },
};

type ActionKey = keyof typeof actionConfig;
type FsnKey = keyof typeof fsnConfig;
type AbcKey = "A" | "B" | "C";
type VedKey = "V" | "E" | "D";

const abcKeys: AbcKey[] = ["A", "B", "C"];
const fsnKeys: FsnKey[] = ["F", "S", "N"];
const vedKeys: VedKey[] = ["V", "E", "D"];

function formatCurrency(value: number) {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
  return `₹${value.toFixed(0)}`;
}

function formatQty(value: number) {
  return value >= 1000
    ? value.toLocaleString("en-IN", { maximumFractionDigits: 1 })
    : value.toFixed(value % 1 ? 1 : 0);
}

function inventoryValue(row: ABCInventoryRow) {
  return row.closingValue;
}

function classBadge(label: string, color: string) {
  return (
    <span
      className="inline-flex min-w-8 justify-center px-2 py-0.5 rounded"
      style={{ background: `${color}1f`, color, fontSize: "9px", fontWeight: 700 }}
    >
      {label || "-"}
    </span>
  );
}

function ParetoTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const value = payload.find((p: any) => p.dataKey === "value");
  const cumulative = payload.find((p: any) => p.dataKey === "cumulative");

  return (
    <div className="rounded-lg p-3 min-w-[210px]" style={{ background: palette.panel, border: `1px solid ${palette.border}`, boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
      <div style={{ color: palette.textMuted, fontSize: "11px", marginBottom: "8px" }}>{label}</div>
      <div className="flex justify-between mb-1">
        <span style={{ color: "#64748b", fontSize: "11px" }}>Closing Value</span>
        <span style={{ color: chartPalette.primary, fontSize: "11px", fontWeight: 700 }}>{formatCurrency(value?.value ?? 0)}</span>
      </div>
      <div className="flex justify-between">
        <span style={{ color: "#64748b", fontSize: "11px" }}>CumClosingValue%</span>
        <span style={{ color: chartPalette.warning, fontSize: "11px", fontWeight: 700 }}>{(cumulative?.value ?? 0).toFixed(1)}%</span>
      </div>
    </div>
  );
}

export function ABCFSNQuadrant() {
  const [activeAction, setActiveAction] = useState<ActionKey | null>(null);
  const [activeFsn, setActiveFsn] = useState<FsnKey | null>(null);
  const [search, setSearch] = useState("");
  const [selectedPlant, setSelectedPlant] = useState(plants[0]);
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [selectedAbcs, setSelectedAbcs] = useState<AbcKey[]>(abcKeys);
  const [selectedFsns, setSelectedFsns] = useState<FsnKey[]>(fsnKeys);
  const [selectedVeds, setSelectedVeds] = useState<VedKey[]>(vedKeys);
  const [plantOpen, setPlantOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [abcOpen, setAbcOpen] = useState(false);
  const [fsnOpen, setFsnOpen] = useState(false);
  const [vedOpen, setVedOpen] = useState(false);
  const [showPareto, setShowPareto] = useState(false);

  const actionOrder: ActionKey[] = ["optimize", "review", "bulk-buy", "dispose"];
  const categories = useMemo(() => {
    return ["All Categories", ...Array.from(new Set(abcInventoryRows.map((row) => row.itemCategory).filter(Boolean))).sort()];
  }, []);

  const baseRows = useMemo(() => {
    if (selectedCategory === "All Categories") return abcInventoryRows;
    return abcInventoryRows.filter((row) => row.itemCategory === selectedCategory);
  }, [selectedCategory]);

  const actionRows = useMemo(() => {
    return actionOrder.reduce((acc, key) => {
      acc[key] = baseRows.filter((row) => row.actionKey === key);
      return acc;
    }, {} as Record<ActionKey, ABCInventoryRow[]>);
  }, [baseRows]);

  const totalValue = useMemo(
    () => baseRows.reduce((sum, row) => sum + inventoryValue(row), 0),
    [baseRows]
  );

  const fsnSummary = useMemo(() => {
    return (["F", "S", "N"] as FsnKey[]).map((key) => {
      const rows = baseRows.filter((row) => row.fsn === key);
      return {
        key,
        rows,
        value: rows.reduce((sum, row) => sum + inventoryValue(row), 0),
        ...fsnConfig[key],
      };
    });
  }, [baseRows]);

  const paretoData = useMemo(() => {
    const sortedRows = baseRows
      .slice()
      .sort((a, b) => inventoryValue(b) - inventoryValue(a));
    const closingTotal = sortedRows.reduce((sum, row) => sum + inventoryValue(row), 0);
    let cumulativeValue = 0;
    return sortedRows.slice(0, 35).map((row) => {
      cumulativeValue += inventoryValue(row);
      return {
        material: row.material,
        value: inventoryValue(row),
        cumulative: closingTotal ? (cumulativeValue / closingTotal) * 100 : 0,
      };
    });
  }, [baseRows]);

  const selected = activeAction ? actionConfig[activeAction] : null;
  const selectedFsn = activeFsn ? fsnConfig[activeFsn] : null;
  const detailRows = activeAction ? actionRows[activeAction] : activeFsn ? baseRows : [];
  const abcOptions = useMemo(() => {
    const scopedRows = detailRows.filter((row) =>
      selectedFsns.includes(row.fsn as FsnKey) &&
      selectedVeds.includes(row.ved as VedKey)
    );
    const summary = scopedRows.reduce(
      (acc, row) => {
        const key = row.abc as AbcKey;
        if (abcKeys.includes(key)) {
          acc[key].count += 1;
          acc[key].value += inventoryValue(row);
        }
        acc.all.count += 1;
        acc.all.value += inventoryValue(row);
        return acc;
      },
      {
        all: { count: 0, value: 0 },
        A: { count: 0, value: 0 },
        B: { count: 0, value: 0 },
        C: { count: 0, value: 0 },
      }
    );
    return [
      { value: "All", label: "All", count: summary.all.count, totalValue: summary.all.value },
      { value: "A", label: "A", count: summary.A.count, totalValue: summary.A.value },
      { value: "B", label: "B", count: summary.B.count, totalValue: summary.B.value },
      { value: "C", label: "C", count: summary.C.count, totalValue: summary.C.value },
    ];
  }, [detailRows, selectedFsns, selectedVeds]);
  const fsnOptions = useMemo(() => {
    const scopedRows = detailRows.filter((row) =>
      selectedAbcs.includes(row.abc as AbcKey) &&
      selectedVeds.includes(row.ved as VedKey)
    );
    const summary = scopedRows.reduce(
      (acc, row) => {
        const key = row.fsn as FsnKey;
        if (fsnKeys.includes(key)) {
          acc[key].count += 1;
          acc[key].value += inventoryValue(row);
        }
        acc.all.count += 1;
        acc.all.value += inventoryValue(row);
        return acc;
      },
      {
        all: { count: 0, value: 0 },
        F: { count: 0, value: 0 },
        S: { count: 0, value: 0 },
        N: { count: 0, value: 0 },
      }
    );
    return [
      { value: "All", label: "All", count: summary.all.count, totalValue: summary.all.value },
      { value: "F", label: "F", count: summary.F.count, totalValue: summary.F.value },
      { value: "S", label: "S", count: summary.S.count, totalValue: summary.S.value },
      { value: "N", label: "N", count: summary.N.count, totalValue: summary.N.value },
    ];
  }, [detailRows, selectedAbcs, selectedVeds]);
  const vedOptions = useMemo(() => {
    const scopedRows = detailRows.filter((row) =>
      selectedAbcs.includes(row.abc as AbcKey) &&
      selectedFsns.includes(row.fsn as FsnKey)
    );
    const summary = scopedRows.reduce(
      (acc, row) => {
        if (row.ved === "V") {
          acc.V.count += 1;
          acc.V.value += inventoryValue(row);
        }
        if (row.ved === "E") {
          acc.E.count += 1;
          acc.E.value += inventoryValue(row);
        }
        if (row.ved === "D") {
          acc.D.count += 1;
          acc.D.value += inventoryValue(row);
        }
        acc.all.count += 1;
        acc.all.value += inventoryValue(row);
        return acc;
      },
      {
        all: { count: 0, value: 0 },
        V: { count: 0, value: 0 },
        E: { count: 0, value: 0 },
        D: { count: 0, value: 0 },
      }
    );
    return [
      { value: "All", label: "All", count: summary.all.count, totalValue: summary.all.value },
      { value: "V", label: "V", count: summary.V.count, totalValue: summary.V.value },
      { value: "E", label: "E", count: summary.E.count, totalValue: summary.E.value },
      { value: "D", label: "D", count: summary.D.count, totalValue: summary.D.value },
    ];
  }, [detailRows, selectedAbcs, selectedFsns]);
  const classFilteredRows = detailRows.filter((row) =>
    selectedAbcs.includes(row.abc as AbcKey) &&
    selectedFsns.includes(row.fsn as FsnKey) &&
    selectedVeds.includes(row.ved as VedKey)
  );
  const detailColor = selected?.color ?? selectedFsn?.color ?? chartPalette.primary;
  const detailTitle = selected ? `${selected.label} Materials` : selectedFsn?.title ?? "";
  const detailSubtitle = selected?.recommendation ?? "Filtered by FSN movement classification.";
  const selectedClassSummary = {
    count: classFilteredRows.length,
    totalValue: classFilteredRows.reduce((sum, row) => sum + inventoryValue(row), 0),
  };
  const abcButtonLabel = selectedAbcs.length === abcKeys.length
    ? "All"
    : selectedAbcs.length
      ? abcKeys.filter((key) => selectedAbcs.includes(key)).join(", ")
      : "None";
  const fsnButtonLabel = selectedFsns.length === fsnKeys.length
    ? "All"
    : selectedFsns.length
      ? fsnKeys.filter((key) => selectedFsns.includes(key)).join(", ")
      : "None";
  const vedButtonLabel = selectedVeds.length === vedKeys.length
    ? "All"
    : selectedVeds.length
      ? vedKeys.filter((key) => selectedVeds.includes(key)).join(", ")
      : "None";
  const filtered = classFilteredRows.filter((part) => {
    const q = search.toLowerCase();
    return (
      part.material.toLowerCase().includes(q) ||
      part.description.toLowerCase().includes(q) ||
      part.combined.toLowerCase().includes(q) ||
      part.finalGrouping.toLowerCase().includes(q)
    );
  });

  function openAction(key: ActionKey) {
    setActiveAction(activeAction === key ? null : key);
    setActiveFsn(null);
    setSelectedAbcs(abcKeys);
    setSelectedFsns(fsnKeys);
    setSelectedVeds(vedKeys);
    setAbcOpen(false);
    setFsnOpen(false);
    setVedOpen(false);
    setSearch("");
  }

  function openFsn(key: FsnKey) {
    setActiveFsn(activeFsn === key ? null : key);
    setActiveAction(null);
    setSelectedAbcs(abcKeys);
    setSelectedFsns([key]);
    setSelectedVeds(vedKeys);
    setAbcOpen(false);
    setFsnOpen(false);
    setVedOpen(false);
    setSearch("");
  }

  function toggleAbc(value: "All" | AbcKey) {
    if (value === "All") {
      setSelectedAbcs(selectedAbcs.length === abcKeys.length ? [] : abcKeys);
      return;
    }
    setSelectedAbcs((current) => {
      const next = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];
      return abcKeys.filter((key) => next.includes(key));
    });
  }

  function toggleFsn(value: "All" | FsnKey) {
    if (value === "All") {
      setSelectedFsns(selectedFsns.length === fsnKeys.length ? [] : fsnKeys);
      return;
    }
    setSelectedFsns((current) => {
      const next = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];
      return fsnKeys.filter((key) => next.includes(key));
    });
  }

  function toggleVed(value: "All" | VedKey) {
    if (value === "All") {
      setSelectedVeds(selectedVeds.length === vedKeys.length ? [] : vedKeys);
      return;
    }
    setSelectedVeds((current) => {
      const next = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];
      return vedKeys.filter((key) => next.includes(key));
    });
  }

  function renderClassFilter(
    label: string,
    buttonLabel: string,
    isOpen: boolean,
    setOpen: (open: boolean) => void,
    options: Array<{ value: string; label: string; count: number; totalValue: number }>,
    selectedValues: string[],
    allCount: number,
    onToggle: (value: string) => void
  ) {
    return (
      <div className="relative">
        <button
          className="flex items-center gap-2 rounded px-3 py-2"
          style={{ background: "#0a1628", border: "1px solid #1e3a5f", minWidth: "132px" }}
          onClick={() => setOpen(!isOpen)}
        >
          <span style={{ color: "#94a3b8", fontSize: "11px" }}>{label}:</span>
          <span style={{ color: "#e2e8f0", fontSize: "11px", fontWeight: 700 }}>{buttonLabel}</span>
          <ChevronDown size={12} style={{ color: "#64748b", marginLeft: "auto" }} />
        </button>
        {isOpen && (
          <div className="absolute right-0 top-full mt-1 rounded z-20 min-w-[230px]" style={{ background: "#0d1f38", border: "1px solid #1e3a5f", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
            {options.map((option) => (
              <label
                key={option.value}
                className="grid w-full px-3 py-2 text-left cursor-pointer"
                style={{
                  gridTemplateColumns: "18px 1fr auto",
                  alignItems: "center",
                  gap: "8px",
                  color: option.value === "All"
                    ? selectedValues.length === allCount ? chartPalette.primary : palette.text
                    : selectedValues.includes(option.value) ? chartPalette.primary : palette.text,
                  fontSize: "12px",
                }}
              >
                <input
                  type="checkbox"
                  checked={option.value === "All" ? selectedValues.length === allCount : selectedValues.includes(option.value)}
                  onChange={() => onToggle(option.value)}
                  style={{ accentColor: chartPalette.primary }}
                />
                <span>{option.label}</span>
                <span style={{ color: palette.textSoft, fontSize: "10px" }}>{option.count.toLocaleString("en-IN")}</span>
                <span style={{ color: "#64748b", fontSize: "10px", gridColumn: "1 / -1", marginTop: "2px" }}>
                  Closing value: {formatCurrency(option.totalValue)}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 style={{ color: palette.text }}>ABC vs FSN vs VED Analysis</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                className="flex items-center gap-2 px-3 py-2 rounded"
                style={{ background: palette.panel, border: `1px solid ${palette.border}` }}
                onClick={() => setPlantOpen(!plantOpen)}
              >
                <Package size={12} style={{ color: chartPalette.primary }} />
                <span style={{ color: "#94a3b8", fontSize: "11px" }}>Plant:</span>
                <span style={{ color: "#e2e8f0", fontSize: "11px" }}>{selectedPlant.name}</span>
                <ChevronDown size={12} style={{ color: "#64748b" }} />
              </button>
              {plantOpen && (
                <div className="absolute right-0 top-full mt-1 rounded z-20 min-w-[120px]" style={{ background: "#0d1f38", border: "1px solid #1e3a5f", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
                  {plants.map((plant) => (
                    <button
                      key={plant.id}
                      className="w-full text-left px-3 py-2"
                      style={{ color: selectedPlant.id === plant.id ? chartPalette.primary : palette.text, fontSize: "12px" }}
                      onClick={() => { setSelectedPlant(plant); setPlantOpen(false); }}
                    >
                      {plant.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <button
                className="flex items-center gap-2 px-3 py-2 rounded"
                style={{ background: palette.panel, border: `1px solid ${palette.border}` }}
                onClick={() => setCategoryOpen(!categoryOpen)}
              >
                <span style={{ color: "#94a3b8", fontSize: "11px" }}>Category:</span>
                <span style={{ color: "#e2e8f0", fontSize: "11px", maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedCategory}</span>
                <ChevronDown size={12} style={{ color: "#64748b" }} />
              </button>
              {categoryOpen && (
                <div className="absolute right-0 top-full mt-1 rounded z-20 min-w-[190px] max-h-[280px] overflow-y-auto" style={{ background: "#0d1f38", border: "1px solid #1e3a5f", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
                  {categories.map((category) => (
                    <button
                      key={category}
                      className="w-full text-left px-3 py-2"
                      style={{ color: selectedCategory === category ? chartPalette.primary : palette.text, fontSize: "12px" }}
                      onClick={() => { setSelectedCategory(category); setCategoryOpen(false); setActiveAction(null); setActiveFsn(null); setSelectedAbcs(abcKeys); setSelectedFsns(fsnKeys); setSelectedVeds(vedKeys); setAbcOpen(false); setFsnOpen(false); setVedOpen(false); }}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: palette.panel, border: `1px solid ${palette.border}` }}>
          <div style={{ color: "#94a3b8", fontSize: "10px", letterSpacing: "0.08em" }}>CLOSING VALUE BY FSN:</div>
          {fsnSummary.map((metric) => {
            const isActive = activeFsn === metric.key;
            return (
              <button
                key={metric.key}
                className="flex items-center gap-3 px-4 py-2 rounded-lg text-left transition-all"
                style={{
                  background: isActive ? `${metric.color}18` : "#1a2637",
                  border: `1px solid ${isActive ? metric.color : `${metric.color}55`}`,
                }}
                onClick={() => openFsn(metric.key)}
              >
                <div className="rounded" style={{ width: "3px", height: "28px", background: metric.color }} />
                <div>
                  <div style={{ color: "#64748b", fontSize: "9px", letterSpacing: "0.08em" }}>{metric.label.toUpperCase()}</div>
                  <div className="flex items-baseline gap-2">
                    <span style={{ color: metric.color, fontSize: "20px", fontWeight: 800 }}>
                      {totalValue ? ((metric.value / totalValue) * 100).toFixed(1) : "0.0"}%
                    </span>
                    <span style={{ color: metric.color, fontSize: "13px", fontWeight: 800 }}>{formatCurrency(metric.value)}</span>
                    <span style={{ color: "#64748b", fontSize: "10px" }}>{metric.rows.length.toLocaleString("en-IN")} items</span>
                  </div>
                </div>
              </button>
            );
          })}
          <div className="ml-auto flex items-center gap-3">
            <button
              className="flex items-center gap-2 px-3 py-2 rounded"
              style={{
                background: showPareto ? palette.primarySoft : palette.surface,
                border: `1px solid ${showPareto ? chartPalette.primary : palette.border}`,
                color: showPareto ? chartPalette.primary : palette.textMuted,
                fontSize: "11px",
                fontWeight: 700,
              }}
              onClick={() => setShowPareto(!showPareto)}
            >
              <BarChart3 size={13} />
              Pareto
            </button>
            <div>
              <div style={{ color: "#64748b", fontSize: "9px", letterSpacing: "0.08em" }}>TOTAL CLOSING VALUE</div>
              <div style={{ color: "#e2e8f0", fontSize: "22px", fontWeight: 800 }}>{formatCurrency(totalValue)}</div>
            </div>
          </div>
        </div>

        {showPareto && (
          <div className="rounded-xl p-4" style={{ background: palette.panel, border: `1px solid ${palette.border}` }}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <div style={{ color: "#e2e8f0", fontSize: "13px", fontWeight: 700 }}>Pareto Chart</div>
                <div style={{ color: "#64748b", fontSize: "11px" }}>Top materials by closing value with CumClosingValue%</div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div style={{ width: "18px", height: "8px", background: chartPalette.primary }} />
                  <span style={{ color: "#64748b", fontSize: "10px" }}>Closing Value</span>
                </div>
                <div className="flex items-center gap-2">
                  <div style={{ width: "18px", height: "2px", background: chartPalette.warning }} />
                  <span style={{ color: "#64748b", fontSize: "10px" }}>CumClosingValue%</span>
                </div>
              </div>
            </div>
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer width="99%" height="100%">
                <ComposedChart data={paretoData} margin={{ top: 5, right: 15, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                  <XAxis dataKey="material" tick={{ fill: "#475569", fontSize: 9 }} axisLine={{ stroke: "#1e3a5f" }} tickLine={false} interval={4} />
                  <YAxis yAxisId="value" tick={{ fill: "#475569", fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={(value) => formatCurrency(Number(value))} />
                  <YAxis yAxisId="cumulative" orientation="right" domain={[0, 100]} tick={{ fill: "#475569", fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={(value) => `${value}%`} />
                  <Tooltip content={<ParetoTooltip />} />
                  <Bar yAxisId="value" dataKey="value" fill={chartPalette.primary} fillOpacity={0.65} radius={[2, 2, 0, 0]} />
                  <Line yAxisId="cumulative" type="monotone" dataKey="cumulative" stroke={chartPalette.warning} strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: activeAction || activeFsn ? "210px minmax(0, 1fr)" : "1fr" }}>
        <div>
          {!(activeAction || activeFsn) && (
            <div className="mb-2" style={{ paddingLeft: "54px" }}>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center" style={{ color: "#7fa2d6", fontSize: "12px", letterSpacing: "0.14em", textTransform: "uppercase" }}>
                  ← Fast Moving
                </div>
                <div className="text-center" style={{ color: "#7fa2d6", fontSize: "12px", letterSpacing: "0.14em", textTransform: "uppercase" }}>
                  Slow / Non-Moving →
                </div>
              </div>
            </div>
          )}
          <div
            className={activeAction || activeFsn ? "" : "grid gap-3"}
            style={activeAction || activeFsn ? undefined : { gridTemplateColumns: "42px minmax(0, 1fr)" }}
          >
            {!(activeAction || activeFsn) && (
              <div className="flex flex-col items-center justify-between py-2">
                <div
                  className="text-center"
                  style={{
                    color: "#7fa2d6",
                    fontSize: "11px",
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    writingMode: "vertical-rl",
                    transform: "rotate(180deg)",
                  }}
                >
                  ← High Value
                </div>
                <div style={{ width: "2px", flex: 1, minHeight: "130px", background: "#1e3a5f", margin: "12px 0" }} />
                <div
                  className="text-center"
                  style={{
                    color: "#7fa2d6",
                    fontSize: "11px",
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    writingMode: "vertical-rl",
                    transform: "rotate(180deg)",
                  }}
                >
                  ↓ Low Value
                </div>
              </div>
            )}
            <div className={`grid gap-3 ${activeAction || activeFsn ? "grid-cols-1" : "grid-cols-2"}`}>
          {actionOrder.map((key) => {
            const cfg = actionConfig[key];
            const rows = actionRows[key];
            const count = rows.length;
            const value = rows.reduce((sum, row) => sum + inventoryValue(row), 0);
            const vitalCount = rows.filter((row) => row.ved === "V").length;
            const nonMovingCount = rows.filter((row) => row.fsn === "N").length;
            const Icon = cfg.icon;
            const isActive = activeAction === key;

            return (
              <button
                key={key}
                onClick={() => openAction(key)}
                className="rounded-xl p-5 text-left transition-all duration-200 relative overflow-hidden"
                style={{
                  background: isActive ? cfg.hoverBg : cfg.bg,
                  border: `2px solid ${isActive ? cfg.color : cfg.border}`,
                  minHeight: activeAction || activeFsn ? "190px" : "220px",
                  cursor: "pointer",
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2 py-0.5 rounded text-center" style={{ background: cfg.color + "20", color: cfg.color, fontSize: "9px", fontWeight: 700, letterSpacing: "0.08em" }}>
                    {cfg.badge}
                  </span>
                  <div className="flex items-center justify-center rounded" style={{ width: "28px", height: "28px", background: cfg.color + "20" }}>
                    <Icon size={14} style={{ color: cfg.color }} />
                  </div>
                </div>
                <div style={{ color: cfg.color, fontSize: "36px", fontWeight: 700, lineHeight: 1 }}>{count.toLocaleString("en-IN")}</div>
                <div style={{ color: "#94a3b8", fontSize: "11px", marginTop: "4px" }}>Materials</div>
                <div style={{ color: "#e2e8f0", fontSize: "13px", fontWeight: 600, marginTop: "12px" }}>{cfg.label}</div>
                <div style={{ color: "#64748b", fontSize: "10px", marginTop: "2px" }}>{cfg.sublabel}</div>
                <div className="mt-4 pt-3 space-y-2" style={{ borderTop: `1px solid ${cfg.color}20` }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div style={{ color: "#94a3b8", fontSize: "9px" }}>CLOSING VALUE</div>
                      <div style={{ color: cfg.color, fontSize: "15px", fontWeight: 800 }}>{formatCurrency(value)}</div>
                    </div>
                    <div className="flex items-center gap-1" style={{ color: cfg.color, fontSize: "10px" }}>
                      View Details <ChevronRight size={12} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 rounded" style={{ background: "#0a1628" }}>
                      <div style={{ color: chartPalette.success, fontSize: "12px", fontWeight: 700 }}>{vitalCount}</div>
                      <div style={{ color: "#64748b", fontSize: "9px" }}>Vital</div>
                    </div>
                    <div className="p-2 rounded" style={{ background: "#0a1628" }}>
                      <div style={{ color: chartPalette.danger, fontSize: "12px", fontWeight: 700 }}>{nonMovingCount}</div>
                      <div style={{ color: "#64748b", fontSize: "9px" }}>Non-moving</div>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
            </div>
        </div>
        </div>

        {(activeAction || activeFsn) && (
          <div className="rounded-xl overflow-hidden flex flex-col min-w-0" style={{ background: "#0d1f38", border: `1px solid ${detailColor}55` }}>
            <div className="p-4 flex items-start justify-between" style={{ borderBottom: `1px solid ${detailColor}20` }}>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full" style={{ background: detailColor }} />
                  <span style={{ color: detailColor, fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em" }}>{activeAction ? selected?.badge : activeFsn}</span>
                </div>
                <div style={{ color: "#e2e8f0", fontSize: "13px", fontWeight: 600 }}>{detailTitle}</div>
                <div className="mt-2 p-2 rounded text-left" style={{ background: detailColor + "10", border: `1px solid ${detailColor}20` }}>
                  <p style={{ color: "#94a3b8", fontSize: "10px" }}>{detailSubtitle}</p>
                </div>
              </div>
              <button onClick={() => { setActiveAction(null); setActiveFsn(null); setSelectedAbcs(abcKeys); setSelectedFsns(fsnKeys); setSelectedVeds(vedKeys); setAbcOpen(false); setFsnOpen(false); setVedOpen(false); }}>
                <X size={16} style={{ color: "#64748b" }} />
              </button>
            </div>

            <div className="p-3" style={{ borderBottom: "1px solid #1e3a5f" }}>
              <div className="flex items-center gap-2">
                <div className="flex flex-1 items-center gap-2 rounded px-3 py-2" style={{ background: "#0a1628", border: "1px solid #1e3a5f" }}>
                  <Search size={13} style={{ color: "#475569" }} />
                  <input
                    type="text"
                    placeholder="Search material, description, grouping..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="flex-1 outline-none bg-transparent"
                    style={{ color: "#e2e8f0", fontSize: "12px" }}
                  />
                </div>
                {(activeAction || activeFsn) && (
                  <>
                    {renderClassFilter(
                      "ABC",
                      abcButtonLabel,
                      abcOpen,
                      setAbcOpen,
                      abcOptions,
                      selectedAbcs,
                      abcKeys.length,
                      (value) => toggleAbc(value as "All" | AbcKey)
                    )}
                    {renderClassFilter(
                      "FSN",
                      fsnButtonLabel,
                      fsnOpen,
                      setFsnOpen,
                      fsnOptions,
                      selectedFsns,
                      fsnKeys.length,
                      (value) => toggleFsn(value as "All" | FsnKey)
                    )}
                    <div className="relative">
                      <button
                        className="flex items-center gap-2 rounded px-3 py-2"
                        style={{ background: "#0a1628", border: "1px solid #1e3a5f", minWidth: "150px" }}
                        onClick={() => setVedOpen(!vedOpen)}
                      >
                        <span style={{ color: "#94a3b8", fontSize: "11px" }}>VED:</span>
                        <span style={{ color: "#e2e8f0", fontSize: "11px", fontWeight: 700 }}>{vedButtonLabel}</span>
                        <ChevronDown size={12} style={{ color: "#64748b", marginLeft: "auto" }} />
                      </button>
                      {vedOpen && (
                        <div className="absolute right-0 top-full mt-1 rounded z-20 min-w-[230px]" style={{ background: "#0d1f38", border: "1px solid #1e3a5f", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
                          {vedOptions.map((option) => (
                            <label
                              key={option.value}
                              className="grid w-full px-3 py-2 text-left cursor-pointer"
                              style={{
                                gridTemplateColumns: "18px 1fr auto",
                                alignItems: "center",
                                gap: "8px",
                                color: option.value === "All"
                                  ? selectedVeds.length === vedKeys.length ? chartPalette.primary : palette.text
                                  : selectedVeds.includes(option.value as VedKey) ? chartPalette.primary : palette.text,
                                fontSize: "12px",
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={option.value === "All" ? selectedVeds.length === vedKeys.length : selectedVeds.includes(option.value as VedKey)}
                                onChange={() => toggleVed(option.value as "All" | VedKey)}
                                style={{ accentColor: chartPalette.primary }}
                              />
                              <span>{option.label}</span>
                              <span style={{ color: palette.textSoft, fontSize: "10px" }}>{option.count.toLocaleString("en-IN")}</span>
                              <span style={{ color: "#64748b", fontSize: "10px", gridColumn: "1 / -1", marginTop: "2px" }}>
                                Closing value: {formatCurrency(option.totalValue)}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                    <div
                      className="rounded px-3 py-2"
                      style={{ background: `${detailColor}12`, border: `1px solid ${detailColor}33`, minWidth: "150px" }}
                    >
                      <div style={{ color: "#64748b", fontSize: "9px", letterSpacing: "0.08em" }}>FILTERED CLOSING VALUE</div>
                      <div style={{ color: detailColor, fontSize: "12px", fontWeight: 800 }}>{formatCurrency(selectedClassSummary.totalValue)}</div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="grid px-4 py-2" style={{ gridTemplateColumns: "96px minmax(180px, 1.5fr) 62px 42px 42px 42px 74px 78px", gap: "8px", borderBottom: "1px solid #1e3a5f" }}>
              {["Material", "Description", "Category", "ABC", "FSN", "VED", "Final", "Value"].map((heading) => (
                <div key={heading} className="flex items-center gap-1" style={{ color: "#475569", fontSize: "9px", letterSpacing: "0.08em" }}>
                  {heading} <ArrowUpDown size={9} />
                </div>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto" style={{ maxHeight: "620px" }}>
              {filtered.slice(0, 350).map((part) => (
                <div
                  key={`${part.material}-${part.combined}-${part.finalGrouping}`}
                  className="grid px-4 py-2.5 transition-colors"
                  style={{
                    gridTemplateColumns: "96px minmax(180px, 1.5fr) 62px 42px 42px 42px 74px 78px",
                    gap: "8px",
                    alignItems: "start",
                    borderBottom: "1px solid #0f2a42",
                    borderLeft: `3px solid ${part.fsn === "N" ? chartPalette.danger : detailColor}`,
                  }}
                >
                  <div style={{ color: chartPalette.primary, fontSize: "11px", fontWeight: 600, wordBreak: "break-word" }}>{part.material}</div>
                  <div className="min-w-0">
                    <div style={{ color: "#c7d2e0", fontSize: "11px", lineHeight: 1.35, whiteSpace: "normal", overflowWrap: "anywhere" }}>{part.description}</div>
                    <div style={{ color: "#475569", fontSize: "9px", marginTop: "3px" }}>
                      {part.combined} · Qty {formatQty(part.consumptionQty)}
                    </div>
                  </div>
                  <div style={{ color: "#94a3b8", fontSize: "10px", overflowWrap: "anywhere" }}>{part.itemCategory}</div>
                  <div>{classBadge(part.abc, chartPalette.primary)}</div>
                  <div>{classBadge(part.fsn, part.fsn === "F" ? chartPalette.success : part.fsn === "S" ? chartPalette.warning : chartPalette.danger)}</div>
                  <div>{classBadge(part.ved, part.ved === "V" ? chartPalette.success : part.ved === "E" ? chartPalette.warning : chartPalette.neutral)}</div>
                  <div style={{ color: detailColor, fontSize: "10px", fontWeight: 700, overflowWrap: "anywhere" }}>{part.finalGrouping}</div>
                  <div style={{ color: detailColor, fontSize: "11px", fontWeight: 800 }}>{formatCurrency(inventoryValue(part))}</div>
                </div>
              ))}
            </div>

            <div className="p-3 grid grid-cols-4 gap-2" style={{ borderTop: "1px solid #1e3a5f" }}>
              {[
                { label: "Shown", value: Math.min(filtered.length, 350).toLocaleString("en-IN"), color: detailColor },
                { label: "Matched", value: filtered.length.toLocaleString("en-IN"), color: chartPalette.primary },
                { label: "Total Rows", value: selectedClassSummary.count.toLocaleString("en-IN"), color: detailColor },
                { label: "Closing Value", value: formatCurrency(selectedClassSummary.totalValue), color: detailColor },
              ].map((summary) => (
                <div key={summary.label} className="rounded p-2 text-center" style={{ background: "#0a1628" }}>
                  <div style={{ color: summary.color, fontSize: "14px", fontWeight: 800 }}>{summary.value}</div>
                  <div style={{ color: "#475569", fontSize: "9px" }}>{summary.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
