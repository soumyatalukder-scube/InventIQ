import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChevronDown, Info, Package, RefreshCw, TrendingUp } from "lucide-react";
import { forecastRows } from "../data/forecastData";
import { chartPalette, palette } from "../theme/palette";

const plants = [
  { id: "2100", name: "2100" },
  { id: "2200", name: "2200" },
];

const DEFAULT_MATERIAL = "110000003707";
const ACTUAL_START_DATE = "2023-04-01";
const FORECAST_START_DATE = "2026-03-24";
const SUMMARY_START_DATE = "2026-04-01";
const SUMMARY_END_DATE = "2026-06-24";

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

function fmt(value: number | null | undefined) {
  if (value == null) return "-";
  return value.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function DemandTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const actual = payload.find((p) => p.name === "actual");
  const forecast = payload.find((p) => p.name === "forecast");

  return (
    <div className="rounded-lg p-3 min-w-[210px]" style={{ background: palette.panel, border: `1px solid ${palette.border}`, boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
      <div className="mb-2 pb-2" style={{ borderBottom: "1px solid #1e3a5f" }}>
        <span style={{ color: "#94a3b8", fontSize: "11px" }}>{label}</span>
      </div>
      {actual?.value != null && (
        <div className="flex justify-between mb-1">
          <span style={{ color: "#64748b", fontSize: "11px" }}>Actual Consumption</span>
          <span style={{ color: chartPalette.primary, fontSize: "11px", fontWeight: 600 }}>{fmt(actual.value)}</span>
        </div>
      )}
      {forecast?.value != null && (
        <div className="flex justify-between">
          <span style={{ color: "#64748b", fontSize: "11px" }}>Forecasted Value</span>
          <span style={{ color: chartPalette.success, fontSize: "11px", fontWeight: 600 }}>{fmt(forecast.value)}</span>
        </div>
      )}
    </div>
  );
}

export function DemandForecasting() {
  const [selectedPlant, setSelectedPlant] = useState(plants[0]);
  const [selectedMaterial, setSelectedMaterial] = useState(DEFAULT_MATERIAL);
  const [plantOpen, setPlantOpen] = useState(false);
  const [materialOpen, setMaterialOpen] = useState(false);
  const [zoomRange, setZoomRange] = useState<{ left: string; right: string } | null>(null);
  const [selection, setSelection] = useState<{ left: string; right: string } | null>(null);

  const materialOptions = useMemo(() => {
    return Array.from(new Map(forecastRows.map((row) => [row.material, row])).values()).map((row) => ({
      material: row.material,
      description: row.description,
    }));
  }, []);

  const materialRows = useMemo(() => {
    return forecastRows.filter((row) => row.material === selectedMaterial);
  }, [selectedMaterial]);

  const sku = materialRows[0] ?? forecastRows.find((row) => row.material === DEFAULT_MATERIAL) ?? forecastRows[0];

  const demandChartData = useMemo(() => {
    return materialRows
      .filter((row) => row.date >= ACTUAL_START_DATE)
      .map((row) => ({
        ...row,
        actual: row.actual,
        forecast: row.date >= FORECAST_START_DATE ? row.central : null,
      }));
  }, [materialRows]);

  const visibleDemandData = useMemo(() => {
    if (!zoomRange) return demandChartData;
    const leftIndex = demandChartData.findIndex((row) => row.label === zoomRange.left);
    const rightIndex = demandChartData.findIndex((row) => row.label === zoomRange.right);
    if (leftIndex < 0 || rightIndex < 0) return demandChartData;
    const start = Math.min(leftIndex, rightIndex);
    const end = Math.max(leftIndex, rightIndex);
    return demandChartData.slice(start, end + 1);
  }, [demandChartData, zoomRange]);

  const xTickInterval = Math.max(0, Math.ceil(visibleDemandData.length / 14) - 1);

  const tableRows = useMemo(() => {
    return materialRows.filter((row) => row.date >= SUMMARY_START_DATE && row.date <= SUMMARY_END_DATE);
  }, [materialRows]);

  const peakRow = useMemo(() => {
    return materialRows
      .filter((row) => row.date >= ACTUAL_START_DATE && row.actual != null)
      .reduce<(typeof forecastRows)[number] | null>((peak, row) => {
        if (!peak || (row.actual ?? 0) > (peak.actual ?? 0)) return row;
        return peak;
      }, null);
  }, [materialRows]);

  const firstForecastRow = materialRows.find((row) => row.date === SUMMARY_START_DATE) ?? tableRows[0];
  const forecastSummary = selectedMaterial === "100000030874"
    ? { mape: "20%", rmse: "0.70" }
    : { mape: "13%", rmse: "0.72" };

  useEffect(() => {
    setZoomRange(null);
    setSelection(null);
  }, [selectedMaterial]);

  function finishZoom() {
    if (!selection?.left || !selection?.right || selection.left === selection.right) {
      setSelection(null);
      return;
    }
    setZoomRange(selection);
    setSelection(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 style={{ color: palette.text }}>Demand Forecasting</h1>
          <p style={{ color: "#64748b", fontSize: "12px" }}>
            Actual consumption from 01-04-2023 · Forecasted value from 24-03-2026
          </p>
        </div>

        <div className="flex items-center gap-3">
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
                    className="w-full text-left px-3 py-2 transition-colors"
                    style={{ color: selectedPlant.id === plant.id ? chartPalette.primary : palette.textMuted, fontSize: "12px" }}
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
              onClick={() => setMaterialOpen(!materialOpen)}
            >
              <span style={{ color: "#94a3b8", fontSize: "11px" }}>Material:</span>
              <span style={{ color: "#e2e8f0", fontSize: "11px", fontWeight: 700 }}>{selectedMaterial}</span>
              <ChevronDown size={12} style={{ color: "#64748b" }} />
            </button>
            {materialOpen && (
              <div className="absolute right-0 top-full mt-1 rounded z-20 min-w-[310px]" style={{ background: "#0d1f38", border: "1px solid #1e3a5f", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
                {materialOptions.map((option) => (
                  <button
                    key={option.material}
                    className="w-full text-left px-3 py-2 transition-colors"
                    style={{ color: selectedMaterial === option.material ? chartPalette.primary : palette.textMuted, fontSize: "12px" }}
                    onClick={() => { setSelectedMaterial(option.material); setMaterialOpen(false); }}
                  >
                    <div style={{ color: selectedMaterial === option.material ? chartPalette.primary : palette.text, fontSize: "11px", fontWeight: 700 }}>{option.material}</div>
                    <div style={{ color: "#64748b", fontSize: "10px", marginTop: "2px" }}>{option.description}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button className="flex items-center gap-2 px-3 py-2 rounded" style={{ background: palette.panel, border: `1px solid ${palette.border}` }}>
            <RefreshCw size={12} style={{ color: "#64748b" }} />
            <span style={{ color: "#94a3b8", fontSize: "11px" }}>Recalculate</span>
          </button>
        </div>
      </div>

      <div className="rounded-xl p-4" style={{ background: palette.panel, border: `1px solid ${palette.border}` }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div style={{ color: "#e2e8f0", fontSize: "13px", fontWeight: 600 }}>
              {sku.material} — {sku.description}
            </div>
            <div style={{ color: "#64748b", fontSize: "11px" }}>
              Forecast uses PredictedQty - Central for the selected material
            </div>
          </div>
          <div className="flex items-center gap-4">
            {zoomRange && (
              <button
                className="px-3 py-1.5 rounded"
                style={{ background: palette.surface, border: `1px solid ${palette.border}`, color: chartPalette.primary, fontSize: "11px", fontWeight: 700 }}
                onClick={() => setZoomRange(null)}
              >
                Reset Zoom
              </button>
            )}
            <div className="flex items-center gap-2">
              <div className="w-6" style={{ height: "2px", background: chartPalette.primary }} />
              <span style={{ color: "#64748b", fontSize: "10px" }}>Actual Consumption</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6" style={{ height: "2px", background: chartPalette.success, borderTop: `2px dashed ${chartPalette.success}` }} />
              <span style={{ color: "#64748b", fontSize: "10px" }}>Forecasted Value</span>
            </div>
          </div>
        </div>

        <div style={{ width: "100%", height: 390 }}>
          <ResponsiveContainer width="99%" height="100%">
            <LineChart
              data={visibleDemandData}
              margin={{ top: 5, right: 20, bottom: 34, left: 0 }}
              onMouseDown={(event: any) => event?.activeLabel && setSelection({ left: event.activeLabel, right: event.activeLabel })}
              onMouseMove={(event: any) => selection && event?.activeLabel && setSelection((current) => current ? { ...current, right: event.activeLabel } : current)}
              onMouseUp={finishZoom}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
              <XAxis
                dataKey="label"
                tick={{ fill: palette.textMuted, fontSize: 11 }}
                axisLine={{ stroke: palette.border }}
                tickLine={false}
                interval={xTickInterval}
                angle={-32}
                textAnchor="end"
                height={48}
              />
              <YAxis tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, "dataMax + 3"]} />
              <Tooltip content={<DemandTooltip />} />
              <ReferenceLine x="24 Mar 26" stroke="#1e3a5f" strokeDasharray="4 4" label={{ value: "Forecast starts", position: "insideTopRight", fill: "#475569", fontSize: 10 }} />
              {selection?.left && selection?.right && (
                <ReferenceArea x1={selection.left} x2={selection.right} stroke={chartPalette.primary} fill={chartPalette.primary} fillOpacity={0.14} />
              )}
              <Line type="monotone" dataKey="forecast" stroke={chartPalette.success} strokeWidth={2.25} strokeDasharray="6 3" dot={{ fill: chartPalette.success, strokeWidth: 0, r: 2.5 }} activeDot={{ r: 5 }} name="forecast" connectNulls={false} />
              <Line type="monotone" dataKey="actual" stroke={chartPalette.primary} strokeWidth={2.25} dot={{ fill: chartPalette.primary, strokeWidth: 0, r: 2.5 }} activeDot={{ r: 5, fill: chartPalette.primary }} name="actual" connectNulls={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: "360px 1fr" }}>
        <div className="rounded-xl p-4" style={{ background: palette.panel, border: `1px solid ${palette.border}` }}>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={14} style={{ color: chartPalette.success }} />
            <span style={{ color: "#e2e8f0", fontSize: "13px", fontWeight: 600 }}>Forecast Summary</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "MAPE", value: forecastSummary.mape, color: chartPalette.success },
              { label: "RMSE", value: forecastSummary.rmse, color: chartPalette.primary },
              { label: "Forecast Horizon", value: "01 Apr 2026 - 24 Jun 2026", color: chartPalette.warning },
              { label: "CI", value: "95%", color: chartPalette.neutral },
            ].map((metric) => (
              <div key={metric.label} className="rounded p-3" style={{ background: "#0a1628", minHeight: "68px" }}>
                <div style={{ color: metric.color, fontSize: metric.label === "Forecast Horizon" ? "12px" : "18px", fontWeight: 800, lineHeight: 1.25 }}>{metric.value}</div>
                <div style={{ color: "#64748b", fontSize: "10px", marginTop: "6px" }}>{metric.label}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 p-2.5 rounded" style={{ background: "#0a1628", border: "1px solid #1e3a5f" }}>
            <div className="flex justify-between mb-2">
              <span style={{ color: "#64748b", fontSize: "11px" }}>Peak Week</span>
              <span style={{ color: chartPalette.primary, fontSize: "11px", fontWeight: 700 }}>{peakRow?.label ?? "-"}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: "#64748b", fontSize: "11px" }}>First Forecast</span>
              <span style={{ color: chartPalette.success, fontSize: "11px", fontWeight: 700 }}>{fmt(firstForecastRow?.central)}</span>
            </div>
          </div>
        </div>

          <div className="rounded-xl overflow-hidden" style={{ background: palette.panel, border: `1px solid ${palette.border}` }}>
          <div className="flex items-center justify-between p-4" style={{ borderBottom: "1px solid #1e3a5f" }}>
            <div className="flex items-center gap-2">
              <Info size={14} style={{ color: chartPalette.warning }} />
              <span style={{ color: "#e2e8f0", fontSize: "13px", fontWeight: 600 }}>Suggested Safety Stock</span>
            </div>
            <span style={{ color: "#64748b", fontSize: "11px" }}>01 Apr 2026 - 24 Jun 2026</span>
          </div>
          <div className="grid px-4 py-2" style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "10px", borderBottom: "1px solid #1e3a5f" }}>
            {["Week", "Safety Stock", "Order Point", "Order Quantity"].map((heading) => (
              <div key={heading} style={{ color: "#475569", fontSize: "9px", letterSpacing: "0.08em" }}>{heading}</div>
            ))}
          </div>
          <div style={{ maxHeight: "360px", overflowY: "auto" }}>
            {tableRows.map((row) => (
              <div key={row.date} className="grid px-4 py-2.5" style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "10px", borderBottom: "1px solid #0f2a42" }}>
                <div style={{ color: "#94a3b8", fontSize: "11px", fontWeight: 700 }}>{row.label}</div>
                <div style={{ color: chartPalette.warning, fontSize: "11px", fontWeight: 800 }}>{fmt(row.safetyStockFixed)}</div>
                <div style={{ color: chartPalette.primary, fontSize: "11px", fontWeight: 800 }}>{fmt(row.orderPointFixed)}</div>
                <div style={{ color: chartPalette.success, fontSize: "11px", fontWeight: 800 }}>{fmt(row.orderQuantityFixed)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
