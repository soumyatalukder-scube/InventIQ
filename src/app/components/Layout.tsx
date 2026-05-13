import { useState } from "react";
import { Outlet, NavLink, useLocation } from "react-router";
import {
  LayoutGrid,
  TrendingUp,
  Settings2,
  Activity,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Bell,
  Cpu,
  BarChart3,
} from "lucide-react";
import logoImg from "../../imports/scube-powered-transparent.png";
import { palette } from "../theme/palette";

const navItems = [
  {
    label: "Overview",
    path: "/",
    icon: Activity,
    exact: true,
  },
  {
    label: "ABC vs FSN vs VED",
    path: "/abc-fsn",
    icon: LayoutGrid,
    exact: false,
  },
  {
    label: "Demand Forecast",
    path: "/demand-forecast",
    icon: TrendingUp,
    exact: false,
  },
  {
    label: "Inventory Optimizer",
    path: "/inventory-optimization",
    icon: Settings2,
    exact: false,
  },
];

const alerts = [
  { type: "red", label: "3 Critical Parts Low Stock" },
  { type: "amber", label: "7 Items Reorder Due" },
  { type: "green", label: "12 SKUs Optimized" },
];

export function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <div
      className="flex h-screen w-full overflow-hidden"
      style={{ background: palette.page, color: palette.text }}
    >
      {/* Sidebar */}
      <aside
        className="flex flex-col relative transition-all duration-300 ease-in-out flex-shrink-0"
        style={{
          width: collapsed ? "64px" : "240px",
          background: palette.panel,
          borderRight: `1px solid ${palette.border}`,
        }}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-3 px-4 py-4 overflow-hidden"
          style={{ borderBottom: `1px solid ${palette.border}`, minHeight: "64px" }}
        >
          <div
            className="flex-shrink-0 flex items-center justify-center rounded"
            style={{
              width: "32px",
              height: "32px",
              background: `linear-gradient(135deg, ${palette.primaryStrong}, ${palette.primary})`,
            }}
          >
            <Cpu size={18} style={{ color: "#fff" }} />
          </div>
          {!collapsed && (
            <div>
              <div
                className="whitespace-nowrap"
                style={{ color: palette.text, fontSize: "13px", fontWeight: 700, letterSpacing: "0.05em" }}
              >
                INVENTIQ
              </div>
              <div style={{ color: palette.textSoft, fontSize: "10px", letterSpacing: "0.1em" }}>
                OPERATIONS SUITE
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-hidden">
          <div style={{ color: palette.textSoft, fontSize: "10px", letterSpacing: "0.12em", padding: "0 16px", marginBottom: "8px" }}>
            {!collapsed && "MODULES"}
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.exact
              ? location.pathname === item.path
              : location.pathname === item.path || location.pathname.startsWith(item.path + "/");
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className="flex items-center gap-3 mx-2 mb-1 rounded transition-all duration-150"
                style={{
                  padding: collapsed ? "10px 14px" : "10px 12px",
                  background: isActive ? palette.primarySoft : "transparent",
                  borderLeft: isActive ? `2px solid ${palette.primary}` : "2px solid transparent",
                  color: isActive ? palette.primary : palette.textMuted,
                }}
              >
                <Icon size={18} className="flex-shrink-0" />
                {!collapsed && (
                  <span style={{ fontSize: "13px", whiteSpace: "nowrap" }}>{item.label}</span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* System Status */}
        {!collapsed && (
          <div className="mx-3 mb-4 p-3 rounded" style={{ background: palette.surface, border: `1px solid ${palette.border}` }}>
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 size={12} style={{ color: palette.textSoft }} />
              <span style={{ color: palette.textSoft, fontSize: "10px", letterSpacing: "0.1em" }}>SYSTEM STATUS</span>
            </div>
            {alerts.map((a, i) => (
              <div key={i} className="flex items-center gap-2 mb-1">
                <div
                  className="rounded-full flex-shrink-0"
                  style={{
                    width: "6px",
                    height: "6px",
                    background: a.type === "red" ? palette.danger : a.type === "amber" ? palette.warning : palette.success,
                  }}
                />
                <span style={{ color: palette.textMuted, fontSize: "10px" }}>{a.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Powered By Logo */}
        {!collapsed && (
          <div
            className="mx-3 mb-4 rounded flex flex-col items-center"
            style={{
              background: "rgba(10, 22, 40, 0.56)",
              border: `1px solid ${palette.border}`,
              padding: "8px 10px 10px",
            }}
          >
            <span style={{ color: palette.textSoft, fontSize: "8px", letterSpacing: "0.16em", marginBottom: "3px" }}>POWERED BY</span>
            <img
              src={logoImg}
              alt="S3 Solutions"
              style={{
                width: "104px",
                maxWidth: "100%",
                height: "auto",
                objectFit: "contain",
                opacity: 0.9,
                filter: "drop-shadow(0 4px 10px rgba(37, 199, 218, 0.08))",
              }}
            />
          </div>
        )}
        {collapsed && (
          <div className="mx-2 mb-4 flex justify-center">
            <img
              src={logoImg}
              alt="S3 Solutions"
              style={{ width: "32px", height: "32px", objectFit: "contain", opacity: 0.9, filter: "drop-shadow(0 4px 10px rgba(37, 199, 218, 0.08))" }}
            />
          </div>
        )}

        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-8 flex items-center justify-center rounded-full transition-colors"
          style={{
            width: "24px",
            height: "24px",
            background: palette.panelSoft,
            border: `1px solid ${palette.border}`,
            color: palette.textSoft,
          }}
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </aside>

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top Bar */}
        <header
          className="flex items-center justify-between px-6 flex-shrink-0"
          style={{
            height: "64px",
            background: palette.panel,
            borderBottom: `1px solid ${palette.border}`,
          }}
        >
          <div>
            <div style={{ color: palette.text, fontSize: "14px", fontWeight: 600 }}>
              {navItems.find((n) => {
                if (n.exact) return location.pathname === n.path;
                return location.pathname.startsWith(n.path);
              })?.label ?? "Dashboard"}
            </div>
            <div style={{ color: palette.textSoft, fontSize: "11px" }}>
              Plant: 2100 · Shift: Morning · {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded" style={{ background: palette.successSoft, border: `1px solid ${palette.success}33` }}>
              <CheckCircle2 size={12} style={{ color: palette.success }} />
              <span style={{ color: palette.success, fontSize: "11px" }}>Systems Online</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded" style={{ background: palette.warningSoft, border: `1px solid ${palette.warning}33` }}>
              <AlertTriangle size={12} style={{ color: palette.warning }} />
              <span style={{ color: palette.warning, fontSize: "11px" }}>7 Alerts</span>
            </div>
            <button
              className="flex items-center justify-center rounded-full relative"
              style={{ width: "36px", height: "36px", background: palette.panelSoft, border: `1px solid ${palette.border}` }}
            >
              <Bell size={15} style={{ color: palette.textMuted }} />
              <span
                className="absolute top-0.5 right-0.5 rounded-full"
                style={{ width: "8px", height: "8px", background: palette.danger, border: `2px solid ${palette.panel}` }}
              />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-5" style={{ background: palette.page }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

