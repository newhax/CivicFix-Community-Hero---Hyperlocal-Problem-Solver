import React, { useState, useEffect, useMemo, useRef } from "react";
import { APIProvider, Map, AdvancedMarker, InfoWindow, useAdvancedMarkerRef, useMap } from "@vis.gl/react-google-maps";
import { 
  Wrench, Zap, Droplet, Trash2, Building, AlertCircle, 
  MapPin, Sparkles, X, Filter, Info, ShieldAlert, CheckCircle, Flame, Compass, Layers, Navigation
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Issue, IssueCategory, SeverityLevel, IssueStatus } from "../types";

interface MapInstanceGrabberProps {
  setMapInstance: (map: google.maps.Map | null) => void;
}

function MapInstanceGrabber({ setMapInstance }: MapInstanceGrabberProps) {
  const map = useMap();
  useEffect(() => {
    setMapInstance(map);
    return () => setMapInstance(null);
  }, [map, setMapInstance]);
  return null;
}

interface IssueMapProps {
  issues: Issue[];
  selectedIssue: Issue | null;
  onIssueSelect: (issue: Issue) => void;
  tempPin: { lat: number; lng: number } | null;
  onSelectLocation: (coords: { lat: number; lng: number }) => void;
  onClearTempPin: () => void;
  userLocation?: { lat: number; lng: number } | null;
  onUpdateUserLocation?: (coords: { lat: number; lng: number }) => void;
}

// Bounding box for our Civic Heights New York sample grid
const LAT_MIN = 40.710;
const LAT_MAX = 40.740;
const LNG_MIN = -74.010;
const LNG_MAX = -73.980;

const DEFAULT_CENTER = { lat: 40.725, lng: -73.998 };

// Custom Dark Premium Google Maps Style to match the app's dark purple theme
const DARK_MAP_STYLE = [
  { "elementType": "geometry", "stylers": [{ "color": "#08070e" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#08070e" }, { "weight": 2 }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#a39eb5" }] },
  {
    "featureType": "administrative",
    "elementType": "geometry.stroke",
    "stylers": [{ "color": "#252137" }]
  },
  {
    "featureType": "administrative.land_parcel",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#a39eb5" }]
  },
  {
    "featureType": "landscape.natural",
    "elementType": "geometry",
    "stylers": [{ "color": "#12101a" }]
  },
  {
    "featureType": "poi",
    "elementType": "geometry",
    "stylers": [{ "color": "#12101a" }]
  },
  {
    "featureType": "poi",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#cbc4dd" }]
  },
  {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [{ "color": "#1a1727" }]
  },
  {
    "featureType": "road.arterial",
    "elementType": "geometry",
    "stylers": [{ "color": "#252137" }]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry",
    "stylers": [{ "color": "#3a3454" }]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry.stroke",
    "stylers": [{ "color": "#252137" }]
  },
  {
    "featureType": "road.local",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#cbc4dd" }]
  },
  {
    "featureType": "transit",
    "elementType": "geometry",
    "stylers": [{ "color": "#12101a" }]
  },
  {
    "featureType": "transit.station",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#cbc4dd" }]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [{ "color": "#0e0c16" }]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#cbc4dd" }]
  }
];

// Map categories to Lucide Icons, colors, and labels
export const categoryConfig: Record<IssueCategory, {
  icon: React.ComponentType<any>;
  color: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
  label: string;
}> = {
  POTHOLES: {
    icon: Wrench,
    color: "#eab308", // amber-500
    bgClass: "bg-amber-500",
    borderClass: "border-amber-400",
    textClass: "text-amber-500",
    label: "Road Damage"
  },
  STREETLIGHTS: {
    icon: Zap,
    color: "#eab308", // yellow-500
    bgClass: "bg-yellow-500",
    borderClass: "border-yellow-400",
    textClass: "text-yellow-500",
    label: "Streetlights"
  },
  WATER_LEAKAGE: {
    icon: Droplet,
    color: "#3b82f6", // blue-500
    bgClass: "bg-blue-500",
    borderClass: "border-blue-400",
    textClass: "text-blue-500",
    label: "Water Leaks"
  },
  WASTE_MANAGEMENT: {
    icon: Trash2,
    color: "#10b981", // emerald-500
    bgClass: "bg-emerald-500",
    borderClass: "border-emerald-400",
    textClass: "text-emerald-500",
    label: "Sanitation"
  },
  PUBLIC_INFRASTRUCTURE: {
    icon: Building,
    color: "#6366f1", // indigo-500
    bgClass: "bg-indigo-500",
    borderClass: "border-indigo-400",
    textClass: "text-indigo-500",
    label: "Infrastructure"
  },
  OTHER: {
    icon: AlertCircle,
    color: "#64748b", // slate-500
    bgClass: "bg-slate-500",
    borderClass: "border-slate-400",
    textClass: "text-slate-500",
    label: "Other Hazards"
  }
};

// Check if a real Google Maps Key is configured
const GOOGLE_MAPS_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  "";

const hasValidKey = Boolean(GOOGLE_MAPS_KEY) && GOOGLE_MAPS_KEY !== "YOUR_API_KEY" && GOOGLE_MAPS_KEY !== "";

export default function IssueMap({
  issues,
  selectedIssue,
  onIssueSelect,
  tempPin,
  onSelectLocation,
  onClearTempPin,
  userLocation,
  onUpdateUserLocation
}: IssueMapProps) {
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>("ALL");
  const [hoveredIssue, setHoveredIssue] = useState<Issue | null>(null);
  const [mapClickedIssue, setMapClickedIssue] = useState<Issue | null>(null);
  const [showKeyInstructions, setShowKeyInstructions] = useState(false);
  const [useGoogleMaps, setUseGoogleMaps] = useState(hasValidKey);
  const [mapTypeId, setMapTypeId] = useState<string>("roadmap");
  const containerRef = useRef<HTMLDivElement>(null);
  const [locating, setLocating] = useState(false);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);

  const lastMapCenteredRef = useRef<string | null>(null);

  // Auto-pan Google Map only when user's location is initially synced or when map first loads
  useEffect(() => {
    if (userLocation && useGoogleMaps && hasValidKey && mapInstance) {
      const centerKey = `${userLocation.lat.toFixed(5)},${userLocation.lng.toFixed(5)}`;
      if (lastMapCenteredRef.current !== centerKey && !lastMapCenteredRef.current) {
        mapInstance.panTo({ lat: userLocation.lat, lng: userLocation.lng });
        mapInstance.setZoom(15);
        lastMapCenteredRef.current = centerKey;
      }
    }
  }, [userLocation, useGoogleMaps, hasValidKey, mapInstance]);

  const handleLocate = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    // Snappiness: If we already have a watched location, center immediately
    if (userLocation) {
      onSelectLocation({ lat: userLocation.lat, lng: userLocation.lng });
      if (useGoogleMaps && hasValidKey && mapInstance) {
        mapInstance.panTo({ lat: userLocation.lat, lng: userLocation.lng });
        mapInstance.setZoom(16);
      }
    }

    setLocating(true);

    const tryGetPosition = (highAccuracy: boolean) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocating(false);
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          onSelectLocation({ lat, lng });
          if (onUpdateUserLocation) {
            onUpdateUserLocation({ lat, lng });
          }
          if (useGoogleMaps && hasValidKey && mapInstance) {
            mapInstance.panTo({ lat, lng });
            mapInstance.setZoom(16);
          } else {
            if (lat < LAT_MIN || lat > LAT_MAX || lng < LNG_MIN || lng > LNG_MAX) {
              alert("Located! Your physical location is outside the mock NYC precinct area boundaries, but we still placed a temporary draft pin at your coordinates (" + lat.toFixed(4) + ", " + lng.toFixed(4) + ").");
            }
          }
        },
        (error) => {
          console.warn(`Error obtaining location (highAccuracy=${highAccuracy}):`, error);
          if (highAccuracy && (error.code === error.TIMEOUT || error.code === error.POSITION_UNAVAILABLE)) {
            console.info("Retrying current position with standard accuracy...");
            tryGetPosition(false);
          } else {
            setLocating(false);
            if (!userLocation) {
              alert("Could not retrieve your location. Please ensure location services are enabled and you have allowed access.");
            }
          }
        },
        { enableHighAccuracy: highAccuracy, timeout: highAccuracy ? 5000 : 15000, maximumAge: highAccuracy ? 0 : 300000 }
      );
    };

    tryGetPosition(true);
  };

  // Sync state with selected issue from parent
  useEffect(() => {
    if (selectedIssue) {
      setMapClickedIssue(selectedIssue);
    }
  }, [selectedIssue]);

  // Filter issues based on active category
  const filteredIssues = useMemo(() => {
    if (activeCategoryFilter === "ALL") return issues;
    return issues.filter(issue => issue.category === activeCategoryFilter);
  }, [issues, activeCategoryFilter]);

  // Dynamic boundaries for the schematic 2D grid relative to user location
  const latMin = userLocation ? userLocation.lat - 0.015 : LAT_MIN;
  const latMax = userLocation ? userLocation.lat + 0.015 : LAT_MAX;
  const lngMin = userLocation ? userLocation.lng - 0.015 : LNG_MIN;
  const lngMax = userLocation ? userLocation.lng + 0.015 : LNG_MAX;

  // Translate lat/lng to percentage coordinates on our simulated 2D neighborhood grid
  const getSimulatedXY = (lat: number, lng: number) => {
    const latPercent = ((lat - latMin) / (latMax - latMin)) * 100;
    const lngPercent = ((lng - lngMin) / (lngMax - lngMin)) * 100;
    
    // Invert Y axis for screen space coords (Y grows downwards)
    return {
      x: Math.min(Math.max(lngPercent, 5), 95),
      y: Math.min(Math.max(100 - latPercent, 5), 95)
    };
  };

  // Convert click coordinates on simulated map to latitude/longitude
  const handleSimulatedMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    
    // Check if clicking a marker or tooltip directly (stop propagation helper)
    const target = e.target as HTMLElement;
    if (target.closest("[data-marker]") || target.closest("[data-tooltip]")) {
      return;
    }

    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const xPercent = (clickX / rect.width) * 100;
    const yPercent = (clickY / rect.height) * 100;

    // Convert screen coordinates back to geographical values
    const lng = lngMin + (xPercent / 100) * (lngMax - lngMin);
    const lat = latMax - (yPercent / 100) * (latMax - latMin);

    // Keep values strictly in bounding box
    const clampedLat = Math.min(Math.max(lat, latMin), latMax);
    const clampedLng = Math.min(Math.max(lng, lngMin), lngMax);

    onSelectLocation({ lat: clampedLat, lng: clampedLng });
    setMapClickedIssue(null); // Deselect when clicking empty space
  };

  // Determine if a report is urgent or newly created
  const isUrgentReport = (issue: Issue) => {
    const isUrgentSeverity = issue.severity === "CRITICAL" || issue.severity === "HIGH";
    const isNew = issue.status === "REPORTED";
    return isUrgentSeverity || isNew;
  };

  return (
    <div className="bg-white border border-slate-200/60 rounded-2xl shadow-md overflow-hidden flex flex-col h-[580px] w-full relative">
      
      {/* MAP DASHBOARD HEADER */}
      <div className="bg-slate-50 text-white p-4 border-b border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
          <div>
            <h3 className="text-xs font-bold font-display tracking-wide uppercase text-slate-900 flex items-center flex-wrap gap-1.5">
              Civic Watch Radar Grid
              {hasValidKey && useGoogleMaps ? (
                <span className="text-[8px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded-md font-mono">
                  Google Maps Engine Active
                </span>
              ) : (
                <span className="text-[8px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded-md font-mono">
                  Civic Schematic Mode
                </span>
              )}
              {userLocation && (
                <span className="text-[8px] bg-sky-500/15 text-sky-400 border border-sky-500/30 px-1.5 py-0.5 rounded-md font-mono flex items-center gap-1 animate-pulse">
                  <span className="w-1 h-1 rounded-full bg-sky-400" />
                  Live GPS Active
                </span>
              )}
            </h3>
            <p className="text-[9px] text-slate-400 mt-0.5">Township boundaries: Oakwood Boulevard & Broadway Precincts</p>
          </div>
        </div>

        {/* Legend / API key info indicator and manual toggles */}
        {hasValidKey ? (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleLocate}
              type="button"
              className="text-[10px] font-bold bg-blue-500 hover:bg-blue-600 text-white px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all duration-200 cursor-pointer shadow-md active:scale-95 hover:scale-[1.03]"
              title="Locate Me"
            >
              <Navigation className={`w-3.5 h-3.5 text-white ${locating ? 'animate-spin' : ''}`} />
              <span>Locate Me</span>
            </button>
            <button 
              onClick={() => setShowKeyInstructions(!showKeyInstructions)}
              className="text-[9px] text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 cursor-pointer transition-colors mr-1"
            >
              <Info className="w-3.5 h-3.5 text-amber-400" />
              <span>Billing / Error Guide</span>
            </button>
            <button
              onClick={() => setUseGoogleMaps(!useGoogleMaps)}
              className="text-[10px] font-bold bg-slate-150 hover:bg-slate-200 border border-slate-200 text-slate-400 hover:text-slate-900 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-xs mr-1"
            >
              <Compass className={`w-3.5 h-3.5 text-blue-500 ${useGoogleMaps ? 'animate-spin' : ''}`} style={{ animationDuration: "12s" }} />
              <span>Engine: {useGoogleMaps ? "Google Maps" : "Schematic"}</span>
            </button>

            {useGoogleMaps && (
              <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest font-mono px-1.5 flex items-center gap-1 border-r border-slate-200">
                  <Layers className="w-3 h-3 text-blue-500" />
                  Style:
                </span>
                <button
                  onClick={() => setMapTypeId("roadmap")}
                  className={`text-[9px] font-bold px-2 py-1 rounded-md transition-all cursor-pointer ${
                    mapTypeId === "roadmap"
                      ? "bg-blue-500 text-white shadow-xs"
                      : "text-slate-400 hover:text-slate-900 hover:bg-slate-150"
                  }`}
                >
                  Roadmap
                </button>
                <button
                  onClick={() => setMapTypeId("satellite")}
                  className={`text-[9px] font-bold px-2 py-1 rounded-md transition-all cursor-pointer ${
                    mapTypeId === "satellite"
                      ? "bg-blue-500 text-white shadow-xs"
                      : "text-slate-400 hover:text-slate-900 hover:bg-slate-150"
                  }`}
                >
                  Satellite
                </button>
                <button
                  onClick={() => setMapTypeId("hybrid")}
                  className={`text-[9px] font-bold px-2 py-1 rounded-md transition-all cursor-pointer ${
                    mapTypeId === "hybrid"
                      ? "bg-blue-500 text-white shadow-xs"
                      : "text-slate-400 hover:text-slate-900 hover:bg-slate-150"
                  }`}
                >
                  Hybrid
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowKeyInstructions(!showKeyInstructions)}
              className="text-[9px] text-blue-500 hover:text-blue-400 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Info className="w-3 h-3" />
              <span>How to unlock Satellite/Street Map</span>
            </button>
            <button
              onClick={handleLocate}
              type="button"
              className="text-[10px] font-bold bg-blue-500 hover:bg-blue-600 text-white px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all duration-200 cursor-pointer shadow-md active:scale-95 hover:scale-[1.03]"
              title="Locate Me"
            >
              <Navigation className={`w-3.5 h-3.5 text-white ${locating ? 'animate-spin' : ''}`} />
              <span>Locate Me</span>
            </button>
          </div>
        )}
      </div>

      {/* CATEGORY FILTER BAR */}
      <div className="bg-slate-100 border-b border-slate-200/60 p-2.5 flex items-center justify-between gap-2 overflow-x-auto flex-shrink-0 z-10 select-none scrollbar-none">
        <div className="flex items-center gap-1.5 shrink-0">
          <Filter className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono mr-1">Filter:</span>
        </div>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveCategoryFilter("ALL")}
            className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap border ${
              activeCategoryFilter === "ALL"
                ? "bg-blue-500 border-transparent text-white shadow-xs"
                : "bg-slate-150 border-slate-200 text-slate-400 hover:text-slate-900 hover:bg-slate-200"
            }`}
          >
            All Reports ({issues.length})
          </button>
          {Object.entries(categoryConfig).map(([key, cfg]) => {
            const count = issues.filter(i => i.category === key).length;
            const Icon = cfg.icon;
            const isActive = activeCategoryFilter === key;
            return (
              <button
                key={key}
                onClick={() => setActiveCategoryFilter(key)}
                className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap border ${
                  isActive
                    ? `${cfg.bgClass} border-transparent text-white shadow-xs`
                    : "bg-slate-150 border-slate-200 text-slate-400 hover:text-slate-900 hover:bg-slate-200"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-white" : cfg.textClass}`} />
                <span>{cfg.label} ({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* API KEY INSTRUCTION OVERLAY */}
      <AnimatePresence>
        {showKeyInstructions && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-24 left-4 right-4 bg-slate-100 border border-slate-200 p-4 rounded-xl shadow-2xl z-20 text-slate-400 text-xs text-left"
          >
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-bold text-blue-500 font-display flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-500" />
                {hasValidKey ? "Google Maps Billing & Troubleshooting" : "Unlocking High-Fidelity Google Maps"}
              </h4>
              <button 
                onClick={() => setShowKeyInstructions(false)}
                className="text-slate-400 hover:text-white p-0.5 rounded-md hover:bg-slate-150"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            {hasValidKey ? (
              <div className="space-y-2.5">
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  You have configured an active API Key! If you see a blank map screen or a 
                  <strong className="text-amber-400"> BillingNotEnabledMapError</strong> overlay on the map, it means billing has not been enabled on this Google Cloud Console project.
                </p>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1.5 text-[10px] text-slate-400 font-mono">
                  <p className="font-bold text-rose-400">💡 Instant Solution & Safe Fallback:</p>
                  <p>1. <strong>Switch Map Engine</strong>: Click the <strong className="text-blue-500">Engine: Schematic Mode</strong> toggle at the top-right to run the app using our beautiful, high-performance custom 2D vector neighborhood map.</p>
                  <p>2. <strong>Enable GCP Billing</strong>: To unlock Google Satellite/Terrain views, open the <a href="https://console.cloud.google.com/project/_/billing/enable" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Google Cloud Billing Console</a>, select your project, and link an active payment card.</p>
                </div>
              </div>
            ) : (
              <>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Our schematic vector map is 100% active and works with local databases immediately! To upgrade to a real satellite or terrain map:
                </p>
                <ol className="list-decimal pl-4 mt-2 space-y-1.5 text-[10px] text-slate-300 font-mono">
                  <li>
                    <a href="https://console.cloud.google.com/google/maps-apis/start?utm_campaign=gmp-code-assist-ais" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline inline-flex items-center gap-0.5">
                      Generate a GMP API Key
                    </a>
                  </li>
                  <li>
                    Open <strong>Settings</strong> (⚙️ gear, top right) &rarr; <strong>Secrets</strong>
                  </li>
                  <li>
                    Type name <code>GOOGLE_MAPS_PLATFORM_KEY</code> &rarr; Paste your API key &rarr; Press <strong>Enter</strong>
                  </li>
                </ol>
                <div className="mt-3 text-[10px] text-slate-400 bg-slate-50 p-2 rounded-lg leading-relaxed">
                  We have already declared the environment definition inside <code>vite.config.ts</code> so the system will automatically hot-swap this schematic grid for Google Maps as soon as your secret key is saved!
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAP RENDER AREA */}
      <div className="flex-1 relative bg-slate-50 select-none">
        
        {useGoogleMaps && hasValidKey ? (
          /* ==========================================
             ENGINE 1: REAL GOOGLE MAPS IMPLEMENTATION
             ========================================== */
          <APIProvider apiKey={GOOGLE_MAPS_KEY} version="weekly" libraries={["places"]}>
            <Map
              defaultCenter={DEFAULT_CENTER}
              defaultZoom={14}
              mapId="DEMO_MAP_ID"
              mapTypeId={mapTypeId}
              styles={DARK_MAP_STYLE}
              options={{ styles: DARK_MAP_STYLE }}
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              style={{ width: '100%', height: '100%' }}
              onClick={(e) => {
                setMapClickedIssue(null);
                if (e.detail.latLng) {
                  onSelectLocation({ lat: e.detail.latLng.lat, lng: e.detail.latLng.lng });
                }
              }}
            >
              <MapInstanceGrabber setMapInstance={setMapInstance} />
              {/* Plot reported issues */}
              {filteredIssues.map((issue) => {
                const cfg = categoryConfig[issue.category] || categoryConfig.OTHER;
                const Icon = cfg.icon;
                const urgent = isUrgentReport(issue);
                
                return (
                  <AdvancedMarker
                    key={issue.id}
                    position={{ lat: issue.latitude, lng: issue.longitude }}
                    onClick={() => {
                      onIssueSelect(issue);
                      setMapClickedIssue(issue);
                    }}
                    title={issue.title}
                  >
                    <div 
                      className="relative flex items-center justify-center w-10 h-10 cursor-pointer"
                      style={{ width: "40px", height: "40px" }} // Explicit sizing for custom markers (CF3)
                    >
                      {/* Pulsing radar circle */}
                      {urgent && (
                        <span className="absolute inline-flex h-8 w-8 rounded-full bg-rose-500/40 opacity-75 animate-ping" />
                      )}
                      
                      {/* Marker Base Pin */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white border-2 border-white shadow-lg ${cfg.bgClass} hover:scale-110 active:scale-95 transition-transform duration-200 relative z-10`}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  </AdvancedMarker>
                );
              })}

              {/* Show user live location on map */}
              {userLocation && (
                <AdvancedMarker
                  position={userLocation}
                  title="Your Current Location"
                >
                  <div className="relative flex flex-col items-center justify-center pointer-events-none" style={{ width: "40px", height: "40px" }}>
                    <span className="absolute inline-flex h-8 w-8 rounded-full bg-blue-500/35 opacity-90 animate-ping border border-blue-500/20" style={{ animationDuration: "2s" }} />
                    <div className="w-7 h-7 rounded-full bg-blue-500 border-2 border-white shadow-xl flex items-center justify-center text-white relative z-10">
                      <Compass className="w-4 h-4 text-white animate-pulse" />
                    </div>
                    <div className="absolute top-8 bg-blue-950/90 border border-blue-500/30 text-blue-200 font-extrabold text-[8px] font-mono px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap z-20">
                      YOU ARE HERE
                    </div>
                  </div>
                </AdvancedMarker>
              )}

              {/* Show temp draft pin on map */}
              {tempPin && (
                <AdvancedMarker
                  position={tempPin}
                  title="New Report Target"
                >
                  <div 
                    className="relative flex flex-col items-center justify-center cursor-move"
                    style={{ width: "44px", height: "44px" }}
                  >
                    <span className="absolute inline-flex h-10 w-10 rounded-full bg-emerald-400/40 opacity-80 animate-ping" />
                    <div className="w-9 h-9 rounded-full bg-emerald-500 border-2 border-white shadow-xl flex items-center justify-center text-white relative z-10">
                      <MapPin className="w-4 h-4 animate-bounce" />
                    </div>
                    <div className="absolute top-10 bg-emerald-950 text-emerald-300 font-bold border border-emerald-500/30 text-[8px] font-mono px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap z-20">
                      Draft Pin Placed
                    </div>
                  </div>
                </AdvancedMarker>
              )}
            </Map>
          </APIProvider>
        ) : (
          /* ==========================================
             ENGINE 2: STYLIZED 2D VECTOR SCHEMATIC
             ========================================== */
          <div 
            ref={containerRef}
            onClick={handleSimulatedMapClick}
            className="w-full h-full relative overflow-hidden bg-slate-50 cursor-crosshair border border-slate-200/60 rounded-b-2xl shadow-inner flex flex-col justify-between"
          >
            {/* INSTRUCTIONS MINI BANNER */}
            <div className="absolute top-3 left-3 bg-slate-100/90 border border-slate-200 rounded-xl shadow-xl z-10 max-w-xs pointer-events-none text-left backdrop-blur-md p-2.5">
              <span className="text-[8px] font-bold text-blue-500 uppercase tracking-widest font-mono flex items-center gap-1">
                <Compass className="w-3 h-3 text-blue-500 animate-spin" style={{ animationDuration: "12s" }} />
                Schematic Navigation Grid
              </span>
              <p className="text-[10px] text-slate-300 mt-1 leading-normal">
                Click anywhere to set coordinates and place a <strong>Draft Pin</strong> for your new report.
              </p>
            </div>

            {/* SECTOR LABELS */}
            <div className="absolute top-4 right-32 text-slate-400 font-mono text-[9px] tracking-wider font-semibold pointer-events-none select-none">
              GRID SECTOR: NY-382C
            </div>

            {/* VECTOR MAP GRAPHICS (STREETS & LANDMARKS) */}
            <svg className="absolute inset-0 w-full h-full opacity-35 pointer-events-none">
              {/* Greenview Park (Greenery landmark) */}
              <rect x="75%" y="5%" width="20%" height="25%" fill="#10b981" fillOpacity="0.04" rx="8" />
              <text x="85%" y="15%" fill="#10b981" fillOpacity="0.6" fontSize="9" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                GREENVIEW PARK
              </text>

              {/* Water Canal Boundary (Blue/Violet landmark) */}
              <path d="M 0 540 Q 300 520 600 550 T 1200 530" fill="none" stroke="var(--color-blue-300)" strokeWidth="24" strokeOpacity="0.15" />
              <text x="40%" y="96%" fill="var(--color-blue-400)" fontSize="9" fontWeight="bold" fontFamily="monospace">
                PIER 3 WATER CANAL
              </text>

              {/* MUNICIPAL ROADS GRID */}
              {/* horizontal line - Oakwood Blvd */}
              <line x1="0" y1="47%" x2="100%" y2="47%" stroke="#1f1a2e" strokeWidth="3" />
              <text x="45%" y="45%" fill="#7a709d" fontSize="8" fontWeight="bold" fontFamily="monospace">
                OAKWOOD BOULEVARD
              </text>

              {/* horizontal line - Main Street */}
              <line x1="0" y1="73%" x2="100%" y2="73%" stroke="#1f1a2e" strokeWidth="2" />
              <text x="15%" y="71%" fill="#7a709d" fontSize="8" fontWeight="bold" fontFamily="monospace">
                MAIN STREET
              </text>

              {/* horizontal line - Parkside Ave */}
              <line x1="0" y1="12%" x2="100%" y2="12%" stroke="#1f1a2e" strokeWidth="2" />
              <text x="50%" y="10%" fill="#7a709d" fontSize="8" fontWeight="bold" fontFamily="monospace">
                PARKSIDE AVENUE
              </text>

              {/* vertical line - Pine Street */}
              <line x1="6%" y1="0" x2="6%" y2="100%" stroke="#1f1a2e" strokeWidth="2.5" />
              <text x="8%" y="90%" fill="#7a709d" fontSize="8" fontWeight="bold" fontFamily="monospace" transform="rotate(90, 8, 90)">
                PINE STREET
              </text>

              {/* vertical line - Broadway */}
              <line x1="60%" y1="0" x2="60%" y2="100%" stroke="#3b255e" strokeWidth="3" strokeDasharray="5,4" />
              <text x="62%" y="30%" fill="#a855f7" fontSize="8" fontWeight="bold" fontFamily="monospace" transform="rotate(90, 62, 30)">
                BROADWAY CORRIDOR
              </text>

              {/* vertical line - Commerce Rd */}
              <line x1="30%" y1="0" x2="30%" y2="100%" stroke="#1f1a2e" strokeWidth="2" />
              <text x="32%" y="60%" fill="#7a709d" fontSize="8" fontWeight="bold" fontFamily="monospace" transform="rotate(90, 32, 60)">
                COMMERCE ROAD
              </text>
            </svg>

            {/* SIMULATED ISSUE MARKERS */}
            <div className="absolute inset-0 w-full h-full z-10">
              {filteredIssues.map((issue) => {
                const { x, y } = getSimulatedXY(issue.latitude, issue.longitude);
                const cfg = categoryConfig[issue.category] || categoryConfig.OTHER;
                const IconComponent = cfg.icon;
                const urgent = isUrgentReport(issue);
                const isSelected = mapClickedIssue?.id === issue.id;

                return (
                  <div
                    key={issue.id}
                    data-marker
                    className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
                    style={{ left: `${x}%`, top: `${y}%` }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setMapClickedIssue(issue);
                      onIssueSelect(issue);
                    }}
                    onMouseEnter={() => setHoveredIssue(issue)}
                    onMouseLeave={() => setHoveredIssue(null)}
                  >
                    {/* Ring animation */}
                    {urgent && (
                      <span className="absolute -inset-2.5 rounded-full bg-rose-500/20 opacity-85 animate-ping border border-rose-500/35" style={{ animationDuration: "1.8s" }} />
                    )}

                    {/* Marker Base */}
                    <motion.div
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.9 }}
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 flex items-center justify-center text-white relative shadow-lg ${
                        isSelected 
                          ? "bg-blue-500 border-white ring-4 ring-blue-500/30" 
                          : `${cfg.bgClass} ${cfg.borderClass}`
                      }`}
                    >
                      <IconComponent className="w-3.5 h-3.5" />

                      {/* Micro status pill */}
                      {issue.status === "RESOLVED" && (
                        <div className="absolute -bottom-1 -right-1 bg-emerald-500 border border-white rounded-full p-0.5 shadow-xs">
                          <CheckCircle className="w-2 h-2 text-white" />
                        </div>
                      )}
                      {issue.status === "IN_PROGRESS" && (
                        <div className="absolute -bottom-1 -right-1 bg-amber-500 border border-white rounded-full p-0.5 shadow-xs animate-pulse">
                          <div className="w-2 h-2 rounded-full bg-white" />
                        </div>
                      )}
                    </motion.div>

                    {/* Small category popup tag on hover */}
                    {hoveredIssue?.id === issue.id && !isSelected && (
                      <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-slate-100 border border-slate-200 px-2 py-1 rounded-md text-[9px] text-white whitespace-nowrap shadow-xl z-20 font-mono pointer-events-none">
                        {issue.title}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* CURRENT USER POSITION PIN ON SCHEMATIC MAP */}
              {userLocation && (() => {
                const { x, y } = getSimulatedXY(userLocation.lat, userLocation.lng);
                return (
                  <div
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none"
                    style={{ left: `${x}%`, top: `${y}%` }}
                  >
                    <span className="absolute -inset-3.5 rounded-full bg-blue-500/25 animate-ping border border-blue-500/35" style={{ animationDuration: "2s" }} />
                    <div className="w-6 h-6 rounded-full bg-blue-500 border-2 border-white shadow-xl flex items-center justify-center text-white relative z-10">
                      <Compass className="w-3.5 h-3.5 animate-pulse text-white" />
                    </div>
                    <div className="bg-slate-100 border border-blue-500 text-blue-400 font-bold text-[8px] font-mono px-2 py-0.5 rounded shadow-lg whitespace-nowrap mt-1 flex items-center gap-1 pointer-events-auto">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                      YOU ARE HERE
                    </div>
                  </div>
                );
              })()}

              {/* CURRENT NEW REPORT PLACED PIN */}
              {tempPin && (
                <div
                  className="absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-move"
                  style={{ 
                    left: `${getSimulatedXY(tempPin.lat, tempPin.lng).x}%`, 
                    top: `${getSimulatedXY(tempPin.lat, tempPin.lng).y}%` 
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="absolute -inset-3.5 rounded-full bg-emerald-400/35 animate-ping" />
                  
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="flex flex-col items-center"
                  >
                    <div className="w-9 h-9 rounded-full bg-emerald-500 border-2 border-white shadow-2xl flex items-center justify-center text-white relative z-10">
                      <MapPin className="w-4 h-4 animate-bounce" />
                    </div>
                    
                    {/* Floating draft label */}
                    <div className="bg-slate-100 border border-emerald-500 text-emerald-400 font-bold text-[8px] font-mono px-2 py-0.5 rounded shadow-lg whitespace-nowrap mt-1 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Draft Marker Placed
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onClearTempPin();
                        }}
                        className="hover:text-rose-400 ml-1 cursor-pointer"
                        title="Clear Pin"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </div>



            {/* SECTOR DATA STATS FOOTER */}
            <div className="bg-slate-100 border-t border-slate-200/60 p-2.5 flex items-center justify-between z-10 text-[9px] font-mono text-slate-400 font-bold uppercase tracking-wider">
              <div className="flex items-center gap-2.5">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
                  STREETLIGHT: {issues.filter(i => i.category === "STREETLIGHTS" && i.status !== "RESOLVED").length} OUT
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  POTHOLES: {issues.filter(i => i.category === "POTHOLES" && i.status !== "RESOLVED").length} OPEN
                </span>
                <span className="flex items-center gap-1 text-blue-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                  WATER: {issues.filter(i => i.category === "WATER_LEAKAGE" && i.status !== "RESOLVED").length} CORROSIONS
                </span>
              </div>
              <div className="text-slate-500">
                ZOOM: 14X &bull; NY SCALE REGION
              </div>
            </div>
          </div>
        )}

        {/* SHARED PREMIUM DETAIL CARD OVERLAY */}
        <AnimatePresence>
          {mapClickedIssue && (
            <motion.div
              data-tooltip
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="absolute bottom-14 right-4 left-4 sm:left-auto sm:w-85 bg-slate-100/95 border border-slate-200 rounded-2xl shadow-2xl p-4.5 z-40 text-left text-xs backdrop-blur-md"
            >
              <div className="flex justify-between items-start mb-2.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`text-[8px] font-black tracking-wider uppercase font-mono border px-2 py-0.5 rounded-md ${
                    mapClickedIssue.severity === "CRITICAL" ? "bg-rose-500/10 border-rose-500/20 text-rose-400" :
                    mapClickedIssue.severity === "HIGH" ? "bg-amber-500/10 border-amber-500/20 text-amber-400" :
                    "bg-slate-300/10 border-slate-200/20 text-slate-400"
                  }`}>
                    {mapClickedIssue.severity} Severity
                  </span>
                  {isUrgentReport(mapClickedIssue) && (
                    <span className="text-[8px] bg-red-500/10 text-red-400 border border-red-500/20 font-extrabold px-2 py-0.5 rounded-md flex items-center gap-0.5">
                      <Flame className="w-2.5 h-2.5 text-red-400 animate-pulse" />
                      URGENT
                    </span>
                  )}
                  <span className={`text-[8px] font-black tracking-wider uppercase font-mono border px-2 py-0.5 rounded-md ${
                    mapClickedIssue.status === "RESOLVED" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                    mapClickedIssue.status === "IN_PROGRESS" ? "bg-blue-500/10 border-blue-500/20 text-blue-400" :
                    "bg-amber-500/10 border-amber-500/20 text-amber-400"
                  }`}>
                    {mapClickedIssue.status}
                  </span>
                </div>
                <button 
                  onClick={() => setMapClickedIssue(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-150 cursor-pointer transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <h4 className="font-bold text-white text-sm font-sans tracking-wide">{mapClickedIssue.title}</h4>
              <p className="text-[11px] text-slate-300 mt-1.5 leading-relaxed line-clamp-3">{mapClickedIssue.description}</p>
              
              <div className="mt-3.5 grid grid-cols-2 gap-2 border-t border-b border-slate-200/60 py-2.5 text-[10px] font-mono">
                <div>
                  <span className="text-slate-400 block uppercase tracking-wider text-[8px] mb-0.5">Category</span>
                  <span className="font-bold text-slate-200">
                    {categoryConfig[mapClickedIssue.category]?.label || "Hazards"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase tracking-wider text-[8px] mb-0.5">Community Rank</span>
                  <span className="font-bold text-emerald-400 flex items-center gap-1">
                    &uarr; {mapClickedIssue.upvotes || 0} Upvotes
                  </span>
                </div>
              </div>

              <div className="mt-3.5 text-[10px] text-slate-300 flex items-center gap-1.5 bg-slate-50/40 border border-slate-200 p-2 rounded-xl">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate font-sans font-semibold text-slate-300">{mapClickedIssue.address}</span>
              </div>

              <button
                onClick={() => {
                  onIssueSelect(mapClickedIssue);
                  setMapClickedIssue(null);
                }}
                className="w-full mt-3.5 bg-blue-500 hover:bg-blue-600 text-white font-black py-2.5 px-3 rounded-xl text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/10 active:scale-[0.98]"
              >
                <span>View Full Civic Audit &rarr;</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
