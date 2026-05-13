import { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import {
  Settings2,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  DollarSign,
  Zap,
  ChevronDown,
  RefreshCw,
  Info,
  ArrowDown,
  ArrowUp,
  Package,
} from "lucide-react";
import { forecastRows } from "../data/forecastData";
import { chartPalette, palette } from "../theme/palette";

const optimizerChartColors = {
  orderPointLine: "#b99a63",
  safetyStockLine: "#b98282",
};

const plants = [
  { id: "2100", name: "2100" },
  { id: "2200", name: "2200" },
];

// ─── Sawtooth data generation ────────────────────────────────────────────────
type StockProjectionPoint = {
  t: number;
  stock: number;
  demand: number;
  stockReceived: number;
  replenishment: number | null;
  reorderPoint: number;
  safetyStock: number;
  orderPointFixed: number;
  safetyStockFixed: number;
};

function generateStockProjection(
  currentInventory: number,
  forecastDemand: number[],
  safetyStock: number,
  reorderPoint: number,
  orderPointFixed: number,
  safetyStockFixed: number,
  orderQty: number,
  weeks: number = 26
) {
  const data: StockProjectionPoint[] = [];
  const reorderMarkers: { t: number; stock: number }[] = [];
  const pendingReceipts = new Set<number>();
  let stock = currentInventory;
  let lastReorderWeek: number | null = null;

  for (let week = 0; week <= weeks; week++) {
    const demand = week > 0 ? forecastDemand[week - 1] ?? forecastDemand[forecastDemand.length - 1] ?? 0 : 0;
    const stockReceived = pendingReceipts.has(week) ? orderQty : 0;
    if (week > 0) {
      stock = stock - demand + stockReceived;
    }

    const previousStock = data[data.length - 1]?.stock;
    const crossedReorderPoint = week === 0
      ? stock <= reorderPoint
      : previousStock > reorderPoint && stock <= reorderPoint;

    if (crossedReorderPoint) {
      reorderMarkers.push({ t: week, stock: Math.round(stock) });
      lastReorderWeek = week;
      pendingReceipts.add(Math.ceil(week + 6.5));
    }

    data.push({
      t: week,
      stock: Math.round(stock),
      demand: Math.round(demand),
      stockReceived,
      replenishment: stockReceived ? Math.round(stock) : null,
      reorderPoint,
      safetyStock,
      orderPointFixed,
      safetyStockFixed,
    });
  }

  return { data, reorderMarkers, lastReorderWeek };
}

// ─── Cost/Risk calculation ────────────────────────────────────────────────────
function calcMetrics(
  leadTime: number,
  reliability: number,
  avgConsumption: number,
  orderQty: number,
  holdingCostPct: number,
  itemValue: number
) {
  const reliabilityFactor = 1 + (1 - reliability / 100) * 0.5;
  const effectiveLeadTime = leadTime * reliabilityFactor;
  const ss = Math.round(avgConsumption * effectiveLeadTime * 0.35);
  const rop = Math.round(avgConsumption * effectiveLeadTime + ss);
  const annualHoldingCost = Math.round(ss * itemValue * (holdingCostPct / 100));
  const stockoutRisk = Math.round(Math.max(0, (leadTime - 6) * 4 + (100 - reliability) * 0.8));
  const ordersPerYear = Math.round((avgConsumption * 12) / orderQty);
  const totalAnnualCost = annualHoldingCost + ordersPerYear * 1200;
  return { ss, rop, annualHoldingCost, stockoutRisk, ordersPerYear, totalAnnualCost, effectiveLeadTime };
}

const materialId = "110000003707";
const CURRENT_INVENTORY_DEFAULT = 14;
const REPLENISHMENT_LEAD_TIME_WEEKS = 6.5;
const materialForecastRows = forecastRows.filter((row) => row.material === materialId);
const latestForecastRow = materialForecastRows[materialForecastRows.length - 1];
const latestActualRow = [...materialForecastRows].reverse().find((row) => row.actual !== null) ?? latestForecastRow;
const forecastOnlyRows = materialForecastRows.filter((row) => row.actual === null);
const forecastDemandSeries = forecastOnlyRows.map((row) => Math.max(0, row.central));
const averageForecastDemand = forecastOnlyRows.length
  ? Math.round(forecastOnlyRows.reduce((sum, row) => sum + row.central, 0) / forecastOnlyRows.length)
  : latestForecastRow.averageDemandRolling;

const materialOption = {
  id: materialId,
  name: latestForecastRow.description,
  value: 1,
  avgConsumption: Math.max(1, averageForecastDemand),
  orderQty: 41,
  currentInventory: CURRENT_INVENTORY_DEFAULT,
  safetyStockFixed: latestForecastRow.safetyStockFixed,
  orderPointFixed: latestForecastRow.orderPointFixed,
  safetyStock: latestForecastRow.safetyStockFixed,
  orderPoint: latestForecastRow.orderPointFixed,
};

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string | number;
}

function SawtoothTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const stock = payload.find((p) => p.name === "Stock Level" || p.name === "stock");
  const demand = payload.find((p) => p.name === "Forecast Demand" || p.name === "demand");
  const rop = payload.find((p) => p.name === "Reorder Point" || p.name === "reorderPoint");
  const ss = payload.find((p) => p.name === "Safety Stock" || p.name === "safetyStock");
  const fixedRop = payload.find((p) => p.name === "Order Point (Fixed)");
  const fixedSs = payload.find((p) => p.name === "Safety Stock (Fixed)");
  const received = payload.find((p) => p.name === "Stock Received");

  return (
    <div
      className="rounded-lg p-3"
      style={{ background: "#0d1f38", border: "1px solid #1e3a5f", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}
    >
      <div style={{ color: "#64748b", fontSize: "10px", marginBottom: "6px" }}>Week {label}</div>
      {stock && (
        <div className="flex justify-between gap-4 mb-1">
          <span style={{ color: "#64748b", fontSize: "11px" }}>Stock Level</span>
          <span style={{ color: chartPalette.primary, fontSize: "11px", fontWeight: 600 }}>{Math.round(stock.value)}</span>
        </div>
      )}
      {demand && (
        <div className="flex justify-between gap-4 mb-1">
          <span style={{ color: "#64748b", fontSize: "11px" }}>Forecast Demand</span>
          <span style={{ color: chartPalette.neutral, fontSize: "11px", fontWeight: 600 }}>{Math.round(demand.value)}</span>
        </div>
      )}
      {rop && (
        <div className="flex justify-between gap-4 mb-1">
          <span style={{ color: "#64748b", fontSize: "11px" }}>Reorder Point</span>
          <span style={{ color: chartPalette.warning, fontSize: "11px", fontWeight: 600 }}>{Math.round(rop.value)}</span>
        </div>
      )}
      {ss && (
        <div className="flex justify-between gap-4 mb-1">
          <span style={{ color: "#64748b", fontSize: "11px" }}>Safety Stock</span>
          <span style={{ color: chartPalette.danger, fontSize: "11px", fontWeight: 600 }}>{Math.round(ss.value)}</span>
        </div>
      )}
      {fixedRop && (
        <div className="flex justify-between gap-4 mb-1">
          <span style={{ color: "#64748b", fontSize: "11px" }}>Order Point (Fixed)</span>
          <span style={{ color: chartPalette.primaryAlt, fontSize: "11px", fontWeight: 600 }}>{Math.round(fixedRop.value)}</span>
        </div>
      )}
      {fixedSs && (
        <div className="flex justify-between gap-4 mb-1">
          <span style={{ color: "#64748b", fontSize: "11px" }}>Safety Stock (Fixed)</span>
          <span style={{ color: chartPalette.neutral, fontSize: "11px", fontWeight: 600 }}>{Math.round(fixedSs.value)}</span>
        </div>
      )}
      {received && received.value > 0 && (
        <div className="flex justify-between gap-4">
          <span style={{ color: "#64748b", fontSize: "11px" }}>Stock Received</span>
          <span style={{ color: chartPalette.success, fontSize: "11px", fontWeight: 600 }}>{Math.round(received.value)}</span>
        </div>
      )}
    </div>
  );
}

function InputRow({
  label,
  unit,
  value,
  onChange,
  min,
  max,
  step = 1,
  color = chartPalette.primary,
  info,
  onReset,
}: {
  label: string;
  unit: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  color?: string;
  info?: string;
  onReset?: () => void;
}) {
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span style={{ color: "#c7d2e0", fontSize: "12px" }}>{label}</span>
          {info && <Info size={11} style={{ color: "#475569" }} title={info} />}
        </div>
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="rounded text-right outline-none w-16"
            style={{
              background: "#0a1628",
              border: "1px solid #1e3a5f",
              color: color,
              fontSize: "12px",
              padding: "2px 6px",
              fontWeight: 600,
            }}
            min={min}
            max={max}
            step={step}
          />
          <span style={{ color: "#475569", fontSize: "11px" }}>{unit}</span>
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              title={`Reset ${label}`}
              className="flex items-center justify-center rounded transition-colors"
              style={{
                width: "22px",
                height: "22px",
                background: "#0a1628",
                border: "1px solid #1e3a5f",
                color,
              }}
            >
              <RefreshCw size={10} />
            </button>
          )}
        </div>
      </div>
      <div className="relative" style={{ height: "6px" }}>
        <div className="absolute inset-0 rounded-full" style={{ background: "#1e3a5f" }} />
        <div
          className="absolute left-0 top-0 h-full rounded-full"
          style={{ width: `${((value - min) / (max - min)) * 100}%`, background: color }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
          style={{ height: "6px" }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span style={{ color: "#334155", fontSize: "9px" }}>{min}</span>
        <span style={{ color: "#334155", fontSize: "9px" }}>{max}</span>
      </div>
    </div>
  );
}

// What-if scenario data - now uses all supply parameters
function buildWhatIfData(
  currentInventory: number,
  currentSafetyStock: number,
  currentOrderPoint: number,
  forecastDemand: number[],
  optimalSafetyStock: number,
  optimalOrderPoint: number,
  downtimeCost: number,
  holdingCost: number
) {
  // Simulate different scenarios
  const scenarios = [
    { label: "Current", inventoryMultiplier: 1, safetyMultiplier: 1, orderMultiplier: 1 },
    { label: "-20%", inventoryMultiplier: 0.8, safetyMultiplier: 0.8, orderMultiplier: 0.8 },
    { label: "+20%", inventoryMultiplier: 1.2, safetyMultiplier: 1.2, orderMultiplier: 1.2 },
    { label: "+40%", inventoryMultiplier: 1.4, safetyMultiplier: 1.4, orderMultiplier: 1.4 },
  ];

  return scenarios.map((s) => {
    const simInventory = Math.round(currentInventory * s.inventoryMultiplier);
    const simSafetyStock = Math.round(currentSafetyStock * s.safetyMultiplier);
    const simOrderPoint = Math.round(currentOrderPoint * s.orderMultiplier);

    const stockoutRisk = estimateStockoutRisk(simInventory, simSafetyStock, simOrderPoint, forecastDemand, optimalSafetyStock, optimalOrderPoint);

    const annualHoldingCost = Math.round(simInventory * holdingCost / 10); // Simplified calculation
    const totalRiskCost = Math.round(stockoutRisk * downtimeCost / 100);

    return {
      label: s.label,
      inventory: simInventory,
      safetyStock: simSafetyStock,
      orderPoint: simOrderPoint,
      holdingCost: annualHoldingCost,
      stockoutRisk,
      totalCost: annualHoldingCost + totalRiskCost,
    };
  });
}

function estimateStockoutRisk(
  inventory: number,
  safetyStock: number,
  orderPoint: number,
  forecastDemand: number[],
  optimalSafetyStock: number,
  optimalOrderPoint: number
) {
  const safeSafetyStock = Math.max(1, safetyStock);
  const safeDemand = forecastDemand.length ? forecastDemand : [1];
  const fullWeeks = Math.floor(REPLENISHMENT_LEAD_TIME_WEEKS);
  const partialWeek = REPLENISHMENT_LEAD_TIME_WEEKS - fullWeeks;
  const demandBeforeReceipt = safeDemand.slice(0, fullWeeks).reduce((sum, value) => sum + value, 0)
    + (safeDemand[fullWeeks] ?? safeDemand[safeDemand.length - 1] ?? 0) * partialWeek;
  const averageDemand = Math.max(1, demandBeforeReceipt / REPLENISHMENT_LEAD_TIME_WEEKS);
  const projectedBeforeReceipt = inventory - demandBeforeReceipt;
  const safetyPenalty = Math.max(0, optimalSafetyStock - safetyStock) / Math.max(1, optimalSafetyStock);
  const orderPointPenalty = Math.max(0, optimalOrderPoint - orderPoint) / Math.max(1, optimalOrderPoint);
  const policyPenalty = Math.round((safetyPenalty * 16) + (orderPointPenalty * 22));

  if (projectedBeforeReceipt <= 0) {
    const shortageWeeks = Math.abs(projectedBeforeReceipt) / averageDemand;
    return Math.min(98, Math.round(78 + shortageWeeks * 8 + policyPenalty));
  }

  if (projectedBeforeReceipt < safetyStock) {
    const safetyGap = (safeSafetyStock - projectedBeforeReceipt) / safeSafetyStock;
    return Math.min(88, Math.max(38, Math.round(38 + safetyGap * 28 + policyPenalty)));
  }

  const bufferWeeks = projectedBeforeReceipt / averageDemand;
  const orderPointBuffer = Math.max(1, orderPoint - safetyStock);
  const policyBuffer = Math.max(0, projectedBeforeReceipt - safetyStock) / orderPointBuffer;
  const highPolicyCredit = Math.round(
    (Math.max(0, safetyStock - optimalSafetyStock) / Math.max(1, optimalSafetyStock)) * 8
    + (Math.max(0, orderPoint - optimalOrderPoint) / Math.max(1, optimalOrderPoint)) * 10
  );
  return Math.max(5, Math.min(95, Math.round(18 - bufferWeeks * 1.4 - policyBuffer * 6 + policyPenalty - highPolicyCredit)));
}

function findThresholdWeek(startingInventory: number, threshold: number) {
  let projectedInventory = startingInventory;
  for (let index = 0; index < forecastOnlyRows.length; index++) {
    projectedInventory -= forecastOnlyRows[index].central;
    if (projectedInventory <= threshold) {
      return {
        weeks: index + 1,
        label: forecastOnlyRows[index].label,
        remaining: Math.max(0, Math.round(projectedInventory)),
      };
    }
  }
  return {
    weeks: forecastOnlyRows.length,
    label: `After ${latestForecastRow.label}`,
    remaining: Math.max(0, Math.round(projectedInventory)),
  };
}

export function InventoryOptimization() {
  const [selectedPlant, setSelectedPlant] = useState(plants[0]);
  const [plantOpen, setPlantOpen] = useState(false);
  const [leadTime, setLeadTime] = useState(8);
  const [reliability, setReliability] = useState(85);
  const [holdingCostPct, setHoldingCostPct] = useState(25);
  const [currentInventory, setCurrentInventory] = useState(materialOption.currentInventory);
  const [currentSafetyStock, setCurrentSafetyStock] = useState(materialOption.safetyStock);
  const [currentOrderPoint, setCurrentOrderPoint] = useState(materialOption.orderPoint);
  const [downtimeCost, setDowntimeCost] = useState(125);
  const [whatIfLeadTime, setWhatIfLeadTime] = useState(0);
  const [outageScheduled, setOutageScheduled] = useState(false);

  const sku = materialOption;

  const isUnderstocked = currentInventory < currentOrderPoint
    || currentSafetyStock < sku.safetyStockFixed
    || currentOrderPoint < sku.orderPointFixed;
  const isOverstocked = !isUnderstocked && (
    currentInventory > currentOrderPoint * 1.8
    || currentSafetyStock > sku.safetyStockFixed
    || currentOrderPoint > sku.orderPointFixed
  );
  const policyMessage = currentSafetyStock < sku.safetyStockFixed || currentOrderPoint < sku.orderPointFixed
    ? `Policy below optimal threshold. Safety stock target ${sku.safetyStockFixed}, order point target ${sku.orderPointFixed}.`
    : currentSafetyStock > sku.safetyStockFixed || currentOrderPoint > sku.orderPointFixed
      ? `Policy above optimal threshold. This lowers stockout risk but can increase holding cost.`
      : currentInventory < currentOrderPoint
        ? `Inventory (${currentInventory}) is below reorder point (${currentOrderPoint}); replenishment should be active.`
        : `Inventory (${currentInventory}) is above the active reorder point.`;

  const metrics = useMemo(
    () => calcMetrics(leadTime, reliability, sku.avgConsumption, sku.orderQty, holdingCostPct, sku.value),
    [leadTime, reliability, holdingCostPct, sku]
  );

  const whatIfMetrics = useMemo(
    () => calcMetrics(leadTime + whatIfLeadTime, reliability, sku.avgConsumption, sku.orderQty, holdingCostPct, sku.value),
    [leadTime, whatIfLeadTime, reliability, holdingCostPct, sku]
  );

  const { data: sawtoothData, reorderMarkers } = useMemo(
    () => generateStockProjection(
      currentInventory,
      forecastDemandSeries,
      currentSafetyStock,
      currentOrderPoint,
      sku.orderPointFixed,
      sku.safetyStockFixed,
      sku.orderQty
    ),
    [currentInventory, currentOrderPoint, currentSafetyStock, sku]
  );

  const whatIfScenarios = useMemo(
    () => buildWhatIfData(currentInventory, currentSafetyStock, currentOrderPoint, forecastDemandSeries, sku.safetyStockFixed, sku.orderPointFixed, downtimeCost, holdingCostPct),
    [currentInventory, currentSafetyStock, currentOrderPoint, downtimeCost, holdingCostPct, sku.safetyStockFixed, sku.orderPointFixed]
  );

  const liveDecision = useMemo(() => {
    const avgDemand = Math.max(1, sku.avgConsumption);
    const weeksOfCover = currentInventory / avgDemand;
    const safetyBreach = findThresholdWeek(currentInventory, currentSafetyStock);
    const stockout = findThresholdWeek(currentInventory, 0);
    const shouldOrder = currentInventory <= currentOrderPoint;
    const recommendedOrderQty = sku.orderQty;
    const recommendedInventory = currentInventory + recommendedOrderQty;
    const currentRisk = estimateStockoutRisk(currentInventory, currentSafetyStock, currentOrderPoint, forecastDemandSeries, sku.safetyStockFixed, sku.orderPointFixed);
    const optimizedRisk = estimateStockoutRisk(recommendedInventory, currentSafetyStock, currentOrderPoint, forecastDemandSeries, sku.safetyStockFixed, sku.orderPointFixed);
    const currentHoldingCost = Math.round(currentInventory * holdingCostPct / 10);
    const optimizedHoldingCost = Math.round(recommendedInventory * holdingCostPct / 10);
    const currentRiskCost = Math.round(currentRisk * downtimeCost / 100);
    const optimizedRiskCost = Math.round(optimizedRisk * downtimeCost / 100);
    const currentCost = currentHoldingCost + currentRiskCost;
    const optimizedCost = optimizedHoldingCost + optimizedRiskCost;
    const recommendation = currentInventory <= currentSafetyStock
      ? `Order ${recommendedOrderQty} units now. Stock is at or below safety stock.`
      : shouldOrder
        ? `Order ${recommendedOrderQty} units now to rebuild cover above reorder point.`
        : `No order required. Recommended order quantity remains ${recommendedOrderQty} units.`;
    const urgency = currentInventory <= currentSafetyStock
      ? { label: "Immediate Order", color: chartPalette.danger, bg: palette.dangerSoft }
      : shouldOrder
        ? { label: "Order This Week", color: chartPalette.warning, bg: palette.warningSoft }
        : currentInventory >= currentOrderPoint * 1.4
          ? { label: "Healthy", color: chartPalette.success, bg: palette.successSoft }
          : { label: "Monitor", color: chartPalette.primary, bg: palette.primarySoft };

    return {
      weeksOfCover,
      safetyBreach,
      stockout,
      shouldOrder,
      recommendedOrderQty,
      recommendedInventory,
      currentCost,
      optimizedCost,
      currentRisk,
      optimizedRisk,
      recommendation,
      urgency,
      orderStatus: currentInventory <= currentSafetyStock ? "ORDER NOW" : shouldOrder ? "REORDER DUE" : "WAIT",
      orderColor: currentInventory <= currentSafetyStock ? chartPalette.danger : shouldOrder ? chartPalette.warning : chartPalette.success,
    };
  }, [currentInventory, currentOrderPoint, currentSafetyStock, downtimeCost, holdingCostPct, sku]);

  const riskLevel = metrics.stockoutRisk < 15 ? "green" : metrics.stockoutRisk < 35 ? "amber" : "red";
  const riskColors: Record<string, string> = { green: chartPalette.success, amber: chartPalette.warning, red: chartPalette.danger };

  function resetMaterialDefaults() {
    setCurrentInventory(materialOption.currentInventory);
    setCurrentSafetyStock(materialOption.safetyStock);
    setCurrentOrderPoint(materialOption.orderPoint);
    setHoldingCostPct(25);
    setDowntimeCost(125);
    setWhatIfLeadTime(0);
  }

  function applyOptimizedInventory() {
    setCurrentInventory(liveDecision.recommendedInventory);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 style={{ color: palette.text }}>Inventory Optimization & What-If Simulator</h1>
          <p style={{ color: "#64748b", fontSize: "12px" }}>
            Scenario simulator with supply parameters · Dynamic charts and overstocking/understocking alerts
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Plant Selector */}
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
              <div
                className="absolute right-0 top-full mt-1 rounded z-10 min-w-[180px]"
                style={{ background: palette.panel, border: `1px solid ${palette.border}`, boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}
              >
                {plants.map((plant) => (
                  <button
                    key={plant.id}
                    className="w-full text-left px-3 py-2 transition-colors"
                    style={{ color: selectedPlant.id === plant.id ? chartPalette.primary : palette.textMuted, fontSize: "12px" }}
                    onClick={() => { setSelectedPlant(plant); setPlantOpen(false); }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#102040"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  >
                    <div style={{ color: selectedPlant.id === plant.id ? chartPalette.primary : palette.text, fontSize: "11px" }}>{plant.name}</div>
                    <div style={{ color: "#475569", fontSize: "10px" }}>{plant.id}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 px-3 py-2 rounded" style={{ background: "#0d1f38", border: "1px solid #1e3a5f" }}>
            <span style={{ color: "#94a3b8", fontSize: "11px" }}>Material:</span>
            <span style={{ color: "#e2e8f0", fontSize: "11px", fontWeight: 700 }}>{sku.id}</span>
          </div>
          <button className="flex items-center gap-2 px-3 py-2 rounded" style={{ background: "#0d1f38", border: "1px solid #1e3a5f" }} onClick={resetMaterialDefaults}>
            <RefreshCw size={12} style={{ color: "#64748b" }} />
            <span style={{ color: "#94a3b8", fontSize: "11px" }}>Reset</span>
          </button>
        </div>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: "280px 1fr" }}>
        {/* Input Panel */}
        <div className="space-y-3">
          <div className="rounded-xl p-4" style={{ background: "#0d1f38", border: "1px solid #1e3a5f" }}>
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <Settings2 size={14} style={{ color: chartPalette.primary }} />
                <span style={{ color: "#e2e8f0", fontSize: "13px", fontWeight: 600 }}>Supply Parameters</span>
              </div>
              <button
                type="button"
                onClick={applyOptimizedInventory}
                className="flex items-center gap-1.5 rounded px-2.5 py-1.5 transition-colors"
                style={{
                  background: palette.successSoft,
                  border: `1px solid ${chartPalette.success}55`,
                  color: chartPalette.success,
                  fontSize: "10px",
                  fontWeight: 800,
                  letterSpacing: "0.03em",
                }}
                title={`Apply recommended inventory: ${liveDecision.recommendedInventory} units`}
              >
                <Zap size={11} />
                Optimize
              </button>
            </div>

            <InputRow
              label="Current Inventory"
              unit="units"
              value={currentInventory}
              onChange={setCurrentInventory}
              min={0}
              max={120}
              step={1}
              color={chartPalette.primary}
              info="Current inventory level"
              onReset={() => setCurrentInventory(materialOption.currentInventory)}
            />
            <InputRow
              label="Safety Stock"
              unit="units"
              value={currentSafetyStock}
              onChange={setCurrentSafetyStock}
              min={0}
              max={80}
              step={1}
              color={chartPalette.success}
              info="Safety Stock(Fixed) from forecast workbook"
              onReset={() => setCurrentSafetyStock(materialOption.safetyStock)}
            />
            <InputRow
              label="Reorder Point"
              unit="units"
              value={currentOrderPoint}
              onChange={setCurrentOrderPoint}
              min={0}
              max={120}
              step={1}
              color={chartPalette.warning}
              info="Order Point(Fixed) from forecast workbook"
              onReset={() => setCurrentOrderPoint(materialOption.orderPoint)}
            />
            <InputRow
              label="Downtime Cost"
              unit="₹K"
              value={downtimeCost}
              onChange={setDowntimeCost}
              min={50}
              max={300}
              step={5}
              color={chartPalette.danger}
              info="Cost per stockout incident"
              onReset={() => setDowntimeCost(125)}
            />
            <InputRow
              label="Holding Cost"
              unit="% p.a."
              value={holdingCostPct}
              onChange={setHoldingCostPct}
              min={10}
              max={50}
              step={5}
              color={chartPalette.primaryAlt}
              info="Annual inventory holding cost as % of item value"
              onReset={() => setHoldingCostPct(25)}
            />

            {/* Overstocking/Understocking Alert */}
            {(isOverstocked || isUnderstocked) && (
              <div
                className="flex items-start gap-2 mt-3 p-3 rounded"
                style={{
                  background: isOverstocked ? "rgba(245,158,11,0.08)" : "rgba(239,68,68,0.08)",
                  border: `1px solid ${isOverstocked ? "rgba(245,158,11,0.2)" : "rgba(239,68,68,0.2)"}`,
                }}
              >
                <AlertTriangle size={12} style={{ color: isOverstocked ? chartPalette.warning : chartPalette.danger, marginTop: "1px" }} />
                <div>
                  <div
                    style={{
                      color: isOverstocked ? chartPalette.warning : chartPalette.danger,
                      fontSize: "10px",
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      marginBottom: "4px",
                    }}
                  >
                    {isOverstocked ? "OVERSTOCKED" : "UNDERSTOCKED"}
                  </div>
                  <p style={{ color: "#94a3b8", fontSize: "10px", lineHeight: "1.5" }}>{policyMessage}</p>
                  <p style={{ display: "none", color: "#94a3b8", fontSize: "10px", lineHeight: "1.5" }}>
                    {isOverstocked
                      ? `Inventory (${currentInventory}) exceeds optimal level. Excess holding cost: ₹${Math.round(currentInventory * holdingCostPct * 0.5)}K/yr`
                      : `Inventory (${currentInventory}) below safety threshold. Stockout risk with ₹${downtimeCost}K downtime cost.`}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* SKU Info */}
          <div className="rounded-xl p-4" style={{ background: "#0d1f38", border: "1px solid #1e3a5f" }}>
            <div style={{ color: "#64748b", fontSize: "10px", letterSpacing: "0.08em", marginBottom: "10px" }}>
              ITEM PARAMETERS
            </div>
            {[
              { label: "Material", value: sku.id, color: chartPalette.primary },
              { label: "Description", value: sku.name, color: "#94a3b8" },
              { label: "Avg Forecast Demand", value: `${sku.avgConsumption} units/week`, color: chartPalette.success },
              { label: "Order Quantity", value: `${sku.orderQty} units`, color: chartPalette.primaryAlt },
              { label: "Forecast Horizon", value: `${forecastOnlyRows[0]?.label ?? "-"} to ${latestForecastRow.label}`, color: chartPalette.warning },
            ].map((i) => (
              <div key={i.label} className="flex justify-between mb-2">
                <span style={{ color: "#64748b", fontSize: "11px" }}>{i.label}</span>
                <span style={{ color: i.color, fontSize: "11px", fontWeight: 600, maxWidth: "145px", textAlign: "right", overflowWrap: "anywhere" }}>{i.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel */}
        <div className="space-y-3">
          {/* Output Metrics */}
          <div className="grid grid-cols-4 gap-3">
            {[
              {
                label: "Current Inventory",
                value: currentInventory,
                unit: "units",
                icon: Package,
                color: chartPalette.primary,
                bg: "rgba(59,130,246,0.1)",
                status: isOverstocked ? "OVER" : isUnderstocked ? "UNDER" : "OK",
                statusColor: isOverstocked ? chartPalette.warning : isUnderstocked ? chartPalette.danger : chartPalette.success,
              },
              {
                label: "Safety Stock",
                value: currentSafetyStock,
                unit: "units",
                icon: CheckCircle2,
                color: chartPalette.success,
                bg: "rgba(34,197,94,0.1)",
                status: null,
              },
              {
                label: "Reorder Point",
                value: currentOrderPoint,
                unit: "units",
                icon: TrendingDown,
                color: chartPalette.warning,
                bg: "rgba(245,158,11,0.1)",
                status: null,
              },
              {
                label: "Estimated Annual Cost",
                value: `₹${liveDecision.currentCost}K`,
                unit: "holding + risk",
                icon: DollarSign,
                color: chartPalette.primaryAlt,
                bg: "rgba(168,85,247,0.1)",
                status: null,
              },
            ].map((m) => {
              const Icon = m.icon;
              return (
                <div
                  key={m.label}
                  className="rounded-xl p-4"
                  style={{ background: "#0d1f38", border: "1px solid #1e3a5f" }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center justify-center rounded" style={{ width: "28px", height: "28px", background: m.bg }}>
                      <Icon size={13} style={{ color: m.color }} />
                    </div>
                    {m.status && (
                      <span
                        className="px-1.5 py-0.5 rounded"
                        style={{
                          background: m.statusColor + "15",
                          color: m.statusColor,
                          fontSize: "8px",
                          fontWeight: 700,
                        }}
                      >
                        {m.status}
                      </span>
                    )}
                  </div>
                  <div style={{ color: m.color, fontSize: "20px", fontWeight: 700 }}>{m.value}</div>
                  <div style={{ color: "#475569", fontSize: "9px" }}>{m.unit}</div>
                  <div style={{ color: "#64748b", fontSize: "10px", marginTop: "4px" }}>{m.label}</div>
                </div>
              );
            })}
          </div>

          <div className="rounded-xl p-4" style={{ background: "#0d1f38", border: `1px solid ${liveDecision.orderColor}55` }}>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center rounded-lg" style={{ width: "38px", height: "38px", background: liveDecision.orderColor + "18" }}>
                  <Zap size={17} style={{ color: liveDecision.orderColor }} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span style={{ color: liveDecision.orderColor, fontSize: "10px", letterSpacing: "0.08em", fontWeight: 800 }}>{liveDecision.orderStatus}</span>
                    <span
                      className="px-2 py-0.5 rounded"
                      style={{
                        background: liveDecision.urgency.bg,
                        color: liveDecision.urgency.color,
                        border: `1px solid ${liveDecision.urgency.color}33`,
                        fontSize: "9px",
                        fontWeight: 800,
                      }}
                    >
                      {liveDecision.urgency.label}
                    </span>
                    <span style={{ color: "#64748b", fontSize: "10px" }}>Live recommendation</span>
                  </div>
                  <div style={{ color: "#e2e8f0", fontSize: "14px", fontWeight: 700 }}>{liveDecision.recommendation}</div>
                </div>
              </div>
              <div className="text-right">
                <div style={{ color: chartPalette.success, fontSize: "22px", fontWeight: 800 }}>{liveDecision.recommendedOrderQty}</div>
                <div style={{ color: "#64748b", fontSize: "10px" }}>recommended order qty</div>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-3">
              {[
                { label: "Weeks of Cover", value: liveDecision.weeksOfCover.toFixed(1), unit: "weeks", color: chartPalette.primary },
                { label: "Reorder Trigger", value: liveDecision.orderStatus, unit: currentInventory <= currentOrderPoint ? "at threshold" : `${currentInventory - currentOrderPoint} units buffer`, color: liveDecision.orderColor },
                { label: "Safety Breach", value: liveDecision.safetyBreach.label, unit: `${liveDecision.safetyBreach.weeks} weeks`, color: chartPalette.warning },
                { label: "Projected Stockout", value: liveDecision.stockout.label, unit: `${liveDecision.stockout.weeks} weeks`, color: chartPalette.danger },
                { label: "Target Inventory", value: liveDecision.recommendedInventory.toLocaleString("en-IN"), unit: "after recommendation", color: chartPalette.success },
              ].map((item) => (
                <div key={item.label} className="rounded-lg p-3" style={{ background: "#0a1628", border: "1px solid #1e3a5f" }}>
                  <div style={{ color: item.color, fontSize: "14px", fontWeight: 800, overflowWrap: "anywhere" }}>{item.value}</div>
                  <div style={{ color: "#64748b", fontSize: "9px", marginTop: "3px" }}>{item.unit}</div>
                  <div style={{ color: "#94a3b8", fontSize: "10px", marginTop: "6px" }}>{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Sawtooth Chart */}
          <div className="rounded-xl p-4" style={{ background: "#0d1f38", border: "1px solid #1e3a5f" }}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <div style={{ color: "#e2e8f0", fontSize: "13px", fontWeight: 600 }}>
                  Consumption vs Replenishment Cycle
                </div>
                <div style={{ color: "#64748b", fontSize: "11px" }}>
                  Stock projection uses weekly PredictedQty - Central · Safety Stock = {currentSafetyStock} · Reorder Point = {currentOrderPoint} · Order Qty = {sku.orderQty} units
                </div>
              </div>
              <div className="flex items-center gap-3">
                {[
                  { color: chartPalette.primary, label: "Stock Level" },
                  { color: optimizerChartColors.orderPointLine, label: "Order Point" },
                  { color: optimizerChartColors.safetyStockLine, label: "Safety Stock" },
                  { color: chartPalette.warning, label: "Reorder Trigger" },
                ].map((l) => (
                  <div key={l.label} className="flex items-center gap-1.5">
                    <div className="rounded-full" style={{ width: "8px", height: "2px", background: l.color }} />
                    <span style={{ color: "#64748b", fontSize: "10px" }}>{l.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={sawtoothData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                <defs>
                  <linearGradient id="stockGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartPalette.primary} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={chartPalette.primary} stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                <XAxis dataKey="t" tick={{ fill: "#475569", fontSize: 9 }} axisLine={{ stroke: "#1e3a5f" }} tickLine={false} label={{ value: "Weeks", position: "insideBottom", fill: "#475569", fontSize: 10, dy: 8 }} />
                <YAxis tick={{ fill: "#475569", fontSize: 9 }} axisLine={false} tickLine={false} />
                <Tooltip content={<SawtoothTooltip />} />
                <Area
                  type="linear"
                  dataKey="stock"
                  stroke={chartPalette.primary}
                  fill="url(#stockGrad)"
                  strokeWidth={2}
                  dot={false}
                  name="Stock Level"
                />
                <Line
                  type="monotone"
                  dataKey="demand"
                  stroke="transparent"
                  dot={false}
                  activeDot={false}
                  name="Forecast Demand"
                />
                <ReferenceLine
                  y={currentOrderPoint}
                  stroke={optimizerChartColors.orderPointLine}
                  strokeOpacity={0.82}
                  strokeWidth={2}
                  strokeDasharray="7 6"
                  ifOverflow="extendDomain"
                  label={{ value: `Order Point ${currentOrderPoint}`, position: "insideTopRight", fill: optimizerChartColors.orderPointLine, fontSize: 10 }}
                />
                <ReferenceLine
                  y={currentSafetyStock}
                  stroke={optimizerChartColors.safetyStockLine}
                  strokeOpacity={0.82}
                  strokeWidth={2}
                  strokeDasharray="7 6"
                  ifOverflow="extendDomain"
                  label={{ value: `Safety Stock ${currentSafetyStock}`, position: "insideBottomRight", fill: optimizerChartColors.safetyStockLine, fontSize: 10 }}
                />
                <Line
                  type="monotone"
                  dataKey="stockReceived"
                  stroke="transparent"
                  dot={false}
                  activeDot={false}
                  name="Stock Received"
                />
                {reorderMarkers.map((marker) => (
                  <ReferenceDot
                    key={`reorder-${marker.t}-${marker.stock}`}
                    x={marker.t}
                    y={marker.stock}
                    r={5}
                    fill={chartPalette.warning}
                    stroke={palette.panel}
                    strokeWidth={2}
                    label={{ value: "Reorder", position: "top", fill: chartPalette.warning, fontSize: 10 }}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* What-If Simulator */}
          <div className="rounded-xl p-4" style={{ background: "#0d1f38", border: "1px solid #1e3a5f" }}>
            <div className="flex items-center gap-2 mb-1">
              <Zap size={14} style={{ color: chartPalette.primaryAlt }} />
              <span style={{ color: "#e2e8f0", fontSize: "13px", fontWeight: 600 }}>What-If Simulator</span>
              <span
                className="px-2 py-0.5 rounded"
                style={{ background: palette.primarySoft, color: chartPalette.primaryAlt, fontSize: "9px", fontWeight: 700 }}
              >
                LIVE SCENARIOS
              </span>
            </div>
            <p style={{ color: "#64748b", fontSize: "11px", marginBottom: "14px" }}>
              Adjust supply parameters above to see real-time impact on inventory scenarios and costs.
            </p>

            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                {
                  title: "Current Position",
                  inventory: currentInventory,
                  cost: liveDecision.currentCost,
                  risk: liveDecision.currentRisk,
                  color: chartPalette.warning,
                  borderColor: `${chartPalette.warning}66`,
                  bg: "rgba(214,169,76,0.08)",
                  badge: "LIVE",
                },
                {
                  title: "After Recommendation",
                  inventory: liveDecision.recommendedInventory,
                  cost: liveDecision.optimizedCost,
                  risk: liveDecision.optimizedRisk,
                  color: chartPalette.success,
                  borderColor: `${chartPalette.success}66`,
                  bg: "rgba(88,199,178,0.08)",
                  badge: liveDecision.recommendedOrderQty > 0 ? `+${liveDecision.recommendedOrderQty} UNITS` : "NO ORDER",
                },
              ].map((item) => {
                const riskDelta = item.risk - liveDecision.currentRisk;
                const costDelta = item.cost - liveDecision.currentCost;
                return (
                  <div key={item.title} className="rounded-lg p-3" style={{ background: item.bg, border: `1px solid ${item.borderColor}` }}>
                    <div className="flex items-center justify-between mb-3">
                      <span style={{ color: "#e2e8f0", fontSize: "12px", fontWeight: 700 }}>{item.title}</span>
                      <span className="px-2 py-0.5 rounded" style={{ background: item.color + "18", color: item.color, fontSize: "8px", fontWeight: 800 }}>{item.badge}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <div style={{ color: item.color, fontSize: "17px", fontWeight: 800 }}>{item.inventory}</div>
                        <div style={{ color: "#94a3b8", fontSize: "10px", fontWeight: 600 }}>inventory</div>
                      </div>
                      <div>
                        <div className="flex items-center gap-1" style={{ color: costDelta > 0 ? chartPalette.warning : chartPalette.success, fontSize: "17px", fontWeight: 800 }}>
                          {costDelta > 0 && item.title !== "Current Position" ? <ArrowUp size={12} /> : item.title !== "Current Position" ? <ArrowDown size={12} /> : null}
                          ₹{item.cost}K
                        </div>
                        <div style={{ color: "#94a3b8", fontSize: "10px", fontWeight: 600 }}>cost</div>
                      </div>
                      <div>
                        <div className="flex items-center gap-1" style={{ color: riskDelta < 0 ? chartPalette.success : item.risk > 35 ? chartPalette.danger : chartPalette.warning, fontSize: "17px", fontWeight: 800 }}>
                          {riskDelta < 0 ? <ArrowDown size={12} /> : riskDelta > 0 ? <ArrowUp size={12} /> : null}
                          {item.risk}%
                        </div>
                        <div style={{ color: "#94a3b8", fontSize: "10px", fontWeight: 600 }}>stockout risk</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Scenario impact chart */}
            <div className="mb-3">
              <div style={{ color: "#94a3b8", fontSize: "10px", letterSpacing: "0.08em", marginBottom: "8px" }}>
                SCENARIO COMPARISON
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={whatIfScenarios} barGap={4} margin={{ top: 0, right: 10, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "#0d1f38", border: "1px solid #1e3a5f", borderRadius: "8px", fontSize: "11px" }}
                    labelStyle={{ color: "#94a3b8" }}
                    itemStyle={{ color: "#94a3b8" }}
                  />
                  <Bar dataKey="totalCost" name="Total Cost (₹K)" radius={[2, 2, 0, 0]}>
                    {whatIfScenarios.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.label === "Current" ? chartPalette.warning : chartPalette.success}
                        fillOpacity={entry.label === "Current" ? 0.72 : 0.82}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Scenario details table */}
            <div className="space-y-2">
              {whatIfScenarios.map((scenario) => {
                const isCurrent = scenario.label === "Current";
                const riskLevel = scenario.stockoutRisk < 15 ? "low" : scenario.stockoutRisk < 35 ? "medium" : "high";
                const riskColor = riskLevel === "low" ? chartPalette.success : riskLevel === "medium" ? chartPalette.warning : chartPalette.danger;

                return (
                  <div
                    key={scenario.label}
                    className="rounded-lg p-3"
                    style={{
                      background: isCurrent ? "rgba(59,130,246,0.08)" : "#0a1628",
                      border: `1px solid ${isCurrent ? "rgba(59,130,246,0.3)" : "#1e3a5f"}`,
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span style={{ color: "#e2e8f0", fontSize: "11px", fontWeight: 600 }}>
                          {scenario.label}
                        </span>
                        {isCurrent && (
                          <span
                            className="px-2 py-0.5 rounded"
                            style={{ background: palette.primarySoft, color: chartPalette.primary, fontSize: "8px", fontWeight: 700 }}
                          >
                            BASELINE
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ background: riskColor }}
                        />
                        <span style={{ color: "#94a3b8", fontSize: "10px", fontWeight: 600 }}>
                          {scenario.stockoutRisk}% risk
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { label: "Inventory", value: scenario.inventory, unit: "u", color: chartPalette.primary },
                        { label: "Safety Stock", value: scenario.safetyStock, unit: "u", color: chartPalette.success },
                        { label: "Order Point", value: scenario.orderPoint, unit: "u", color: chartPalette.warning },
                        { label: "Total Cost", value: scenario.totalCost, unit: "K", color: chartPalette.primaryAlt },
                      ].map((metric) => (
                        <div key={metric.label} className="text-center">
                          <div style={{ color: "#94a3b8", fontSize: "9px", marginBottom: "3px", fontWeight: 600 }}>
                            {metric.label}
                          </div>
                          <div style={{ color: metric.color, fontSize: "12px", fontWeight: 700 }}>
                            {metric.value}{metric.unit}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div
              className="flex items-start gap-2 mt-3 p-2.5 rounded"
              style={{ background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.2)" }}
            >
              <Info size={12} style={{ color: chartPalette.primaryAlt, marginTop: "1px" }} />
              <p style={{ color: "#94a3b8", fontSize: "10px", lineHeight: "1.5" }}>
                Scenarios update in real-time as you adjust supply parameters. Compare total cost vs. stockout risk to find optimal balance.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
