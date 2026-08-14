"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Header from "@/components/Header";
import SidebarOverview from "@/components/SidebarOverview";
import BlockDetailPanel from "@/components/BlockDetailPanel";
import ObjectPopup from "@/components/ObjectPopup";
import ReadMoreDrawer from "@/components/ReadMoreDrawer";
import InterventionsDrawer from "@/components/InterventionsDrawer";
import JudgeDemoGuide from "@/components/JudgeDemoGuide";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-black text-zinc-400 text-xs font-mono">
      <span>Initializing Deck.gl & 3D Vector Engine...</span>
    </div>
  ),
});

const DEFAULT_VIEW_STATE = {
  longitude: 77.2200,
  latitude: 28.6315,
  zoom: 14.5,
  pitch: 35,
  bearing: -15,
  transitionDuration: 1000,
  minZoom: 13.0,
  maxZoom: 19.5,
};

export default function Home() {
  const [summary, setSummary] = useState<any>(null);
  const [gridGeoJson, setGridGeoJson] = useState<any>(null);
  const [allBuildings, setAllBuildings] = useState<any[]>([]);
  const [interventions, setInterventions] = useState<any[]>([]);

  // State management
  const [showHeatmapOverlay, setShowHeatmapOverlay] = useState<boolean>(true);
  const [heatmapMode, setHeatmapMode] = useState<"dynamic" | "raster">("raster");
  const [rasterOpacity, setRasterOpacity] = useState<number>(0.32);
  const [afterInterventions, setAfterInterventions] = useState<boolean>(false);
  const [activeCell, setActiveCell] = useState<any>(null);
  const [blockData, setBlockData] = useState<any>(null);
  const [selectedObject, setSelectedObject] = useState<any>(null);

  // Modals & Drawers
  const [showReadMore, setShowReadMore] = useState<boolean>(false);
  const [showInterventions, setShowInterventions] = useState<boolean>(false);
  const [showDemoGuide, setShowDemoGuide] = useState<boolean>(false);

  // Deck.gl ViewState
  const [viewState, setViewState] = useState<any>(DEFAULT_VIEW_STATE);

  // Load summary, grid geojson, all buildings, and interventions on mount
  useEffect(() => {
    fetch("/data/summary.json")
      .then((res) => res.json())
      .then((data) => setSummary(data))
      .catch((err) => console.error("Error loading summary:", err));

    fetch("/data/grid.geojson")
      .then((res) => res.json())
      .then((data) => setGridGeoJson(data))
      .catch((err) => console.error("Error loading grid:", err));

    fetch("/data/all_buildings.json")
      .then((res) => res.json())
      .then((data) => setAllBuildings(data.buildings || []))
      .catch((err) => console.error("Error loading all buildings:", err));

    fetch("/data/interventions.json")
      .then((res) => res.json())
      .then((data) => setInterventions(data))
      .catch((err) => console.error("Error loading interventions:", err));
  }, []);

  // Lazy load block data when activeCell changes
  useEffect(() => {
    if (activeCell) {
      const cellId = activeCell.cell_id;
      fetch(`/data/blocks/${cellId}.json`)
        .then((res) => res.json())
        .then((data) => setBlockData(data))
        .catch((err) => console.error(`Error loading block ${cellId}:`, err));
    }
  }, [activeCell]);

  // Handle cell selection
  const handleSelectCell = (cell: any) => {
    setActiveCell(cell);
    setSelectedObject(null);
    setShowReadMore(false);

    setViewState({
      ...viewState,
      longitude: cell.center[0],
      latitude: cell.center[1],
      zoom: 17.2,
      pitch: 58,
      bearing: -22,
      transitionDuration: 1200,
    });
  };

  // Back to overview
  const handleBackToCity = () => {
    setActiveCell(null);
    setBlockData(null);
    setSelectedObject(null);
    setShowReadMore(false);

    setViewState({
      ...DEFAULT_VIEW_STATE,
      transitionDuration: 1200,
    });
  };

  const handleSelectIntervention = (item: any) => {
    setShowInterventions(false);
    if (gridGeoJson) {
      const feature = gridGeoJson.features.find(
        (f: any) => f.properties.cell_id === item.cell_id
      );
      if (feature) {
        handleSelectCell(feature.properties);
      }
    }
  };

  const handleExecuteDemoStep = (stepNumber: number) => {
    if (stepNumber === 1) {
      handleBackToCity();
      setShowHeatmapOverlay(true);
      setAfterInterventions(false);
      setShowInterventions(false);
    } else if (stepNumber === 2) {
      if (summary && summary.top_5_hottest.length > 0) {
        handleSelectCell(summary.top_5_hottest[0]);
      }
    } else if (stepNumber === 3) {
      const bldg = (blockData?.buildings && blockData.buildings.length > 0)
        ? blockData.buildings[0]
        : allBuildings[0];
      if (bldg) {
        setSelectedObject({
          ...bldg,
          object_type: "building",
          cell_id: activeCell?.cell_id || "CELL_07_12",
          ward_name: activeCell?.ward_name || "Connaught Place",
        });
      }
    } else if (stepNumber === 4) {
      if (blockData && blockData.trees && blockData.trees.length > 0) {
        const tree = blockData.trees[0];
        setSelectedObject({
          ...tree,
          object_type: "tree",
          cell_id: blockData.cell.cell_id,
          ward_name: blockData.cell.ward_name,
        });
      }
    } else if (stepNumber === 5) {
      setAfterInterventions(true);
    } else if (stepNumber === 6) {
      setShowInterventions(true);
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black text-zinc-100 flex flex-col font-sans select-none">
      {/* Navigation Header */}
      <Header
        showHeatmapOverlay={showHeatmapOverlay}
        onToggleHeatmapOverlay={setShowHeatmapOverlay}
        heatmapMode={heatmapMode}
        onSetHeatmapMode={setHeatmapMode}
        rasterOpacity={rasterOpacity}
        onSetRasterOpacity={setRasterOpacity}
        afterInterventions={afterInterventions}
        onToggleAfterInterventions={setAfterInterventions}
        onOpenInterventions={() => setShowInterventions(true)}
        onStartDemoGuide={() => setShowDemoGuide(!showDemoGuide)}
        summary={summary}
      />

      {/* Main Map Canvas Area */}
      <main className="relative flex-1 w-full h-full pt-16">
        <MapView
          showHeatmapOverlay={showHeatmapOverlay}
          heatmapMode={heatmapMode}
          rasterOpacity={rasterOpacity}
          afterInterventions={afterInterventions}
          gridGeoJson={gridGeoJson}
          allBuildings={allBuildings}
          activeCell={activeCell}
          blockData={blockData}
          selectedObject={selectedObject}
          onSelectCell={handleSelectCell}
          onSelectObject={setSelectedObject}
          viewState={viewState}
          onViewStateChange={setViewState}
        />

        {/* Floating Sidebar Overlay */}
        <div className="absolute top-20 left-6 z-30 pointer-events-auto">
          {!activeCell ? (
            <SidebarOverview
              summary={summary}
              afterInterventions={afterInterventions}
              onSelectCell={handleSelectCell}
            />
          ) : (
            <BlockDetailPanel
              blockData={blockData}
              onBackToCity={handleBackToCity}
              selectedObject={selectedObject}
            />
          )}
        </div>

        {/* Floating Object Card Popup */}
        {selectedObject && (
          <ObjectPopup
            object={selectedObject}
            onClose={() => setSelectedObject(null)}
            onReadMore={() => setShowReadMore(true)}
          />
        )}
      </main>

      {/* Slide-In Read More Drawer */}
      {showReadMore && selectedObject && (
        <ReadMoreDrawer
          object={selectedObject}
          blockData={blockData}
          onClose={() => setShowReadMore(false)}
        />
      )}

      {/* Recommended Interventions Drawer */}
      {showInterventions && (
        <InterventionsDrawer
          interventions={interventions}
          onClose={() => setShowInterventions(false)}
          onSelectIntervention={handleSelectIntervention}
        />
      )}

      {/* Judge Demo Walkthrough Helper Guide */}
      {showDemoGuide && (
        <JudgeDemoGuide
          onClose={() => setShowDemoGuide(false)}
          onExecuteStep={handleExecuteDemoStep}
        />
      )}
    </div>
  );
}
