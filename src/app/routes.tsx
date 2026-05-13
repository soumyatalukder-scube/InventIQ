import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { ABCFSNQuadrant } from "./components/ABCFSNQuadrant";
import { DemandForecasting } from "./components/DemandForecasting";
import { InventoryOptimization } from "./components/InventoryOptimization";
import { Overview } from "./components/Overview";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Overview },
      { path: "abc-fsn", Component: ABCFSNQuadrant },
      { path: "demand-forecast", Component: DemandForecasting },
      { path: "inventory-optimization", Component: InventoryOptimization },
    ],
  },
]);