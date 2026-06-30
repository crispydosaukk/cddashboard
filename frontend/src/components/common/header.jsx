import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Bell, Menu, User, LogOut, Settings, ChevronDown, X, MapPin, Navigation } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "../../firebase";
import { collection, query, where, onSnapshot, writeBatch, getDocs } from "firebase/firestore";
import ReadyInModal from "./ReadyInModal.jsx";
import { usePopup } from "../../context/PopupContext";

// Helper to load Google Maps Script dynamically
const loadGoogleMapsScript = (apiKey, callback) => {
  if (!apiKey) return;
  const existingScript = document.getElementById("google-maps-script");
  if (!existingScript) {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.id = "google-maps-script";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (callback) callback();
    };
    document.head.appendChild(script);
  } else {
    if (window.google && window.google.maps && window.google.maps.places) {
      if (callback) callback();
    } else {
      // If script exists but simple callback might not be attached to onload anymore or it's already loaded
      if (existingScript.getAttribute('data-loaded') === 'true') {
        if (callback) callback();
      } else {
        const oldOnload = existingScript.onload;
        existingScript.onload = () => {
          if (oldOnload) oldOnload();
          existingScript.setAttribute('data-loaded', 'true');
          if (callback) callback();
        };
      }
    }
  }
};

const LocationModal = ({ isOpen, onClose, onSelectLocation, onUseCurrentLocation, apiKey, currentAddress, currentLat, currentLng }) => {
  const [query, setQuery] = useState("");
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const autocompleteService = useRef(null);
  const sessionToken = useRef(null);

  // Refs for the new API classes and session
  const PlaceSuggestionClass = useRef(null);
  const SessionTokenClass = useRef(null);

  useEffect(() => {
    if (isOpen) {
      loadGoogleMapsScript(apiKey, async () => {
        if (window.google && window.google.maps) {
          try {
            // New 2026-compliant import
            const { AutocompleteSuggestion, AutocompleteSessionToken } = await window.google.maps.importLibrary("places");

            PlaceSuggestionClass.current = AutocompleteSuggestion;
            SessionTokenClass.current = AutocompleteSessionToken;

            if (!sessionToken.current) {
              sessionToken.current = new AutocompleteSessionToken();
            }
          } catch (err) {
            console.error("Google Maps Places Library Import Failed:", err);
            setError("Failed to initialize search. Please refresh.");
          }
        }
      });
    }
  }, [apiKey, isOpen]);

  useEffect(() => {
    if (!query) {
      setPredictions([]);
      setError(null);
      return;
    }

    if (query.length < 3) return;

    // Wait for library to load
    if (!PlaceSuggestionClass.current) return;

    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);

      try {
        const AutocompleteSuggestion = PlaceSuggestionClass.current;
        const request = {
          input: query,
          sessionToken: sessionToken.current
        };

        const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions(request);

        // Map new API structure to our UI format
        const formattedResults = (suggestions || [])
          .filter(s => s.placePrediction)
          .map(s => {
            const p = s.placePrediction;
            return {
              place_id: p.toPlace().id,
              description: p.text.text,
              structured_formatting: {
                main_text: p.mainText.text,
                secondary_text: p.secondaryText.text
              }
            };
          });

        setPredictions(formattedResults);

        if (formattedResults.length === 0) {
          // handled by zero length check in UI
        }

      } catch (err) {
        console.error("Places Search Error:", err);
        if (err.message && err.message.includes("ApiNotActivated")) {
          setError("API Not Activated. Enable 'Maps JavaScript API' in Google Console.");
        } else {
          setError("Unable to search locations.");
        }
        setPredictions([]);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center pt-24 px-4 font-sans">

          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-lg bg-[#1a1c23] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <MapPin size={18} className="text-emerald-400" />
                Select Location
              </h3>
              <button onClick={onClose} className="p-1 hover:bg-white/10 text-white/60 hover:text-white rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-4 space-y-4 shrink-0">
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  type="text"
                  placeholder="Search for area, street name..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all font-medium"
                  autoFocus
                />
              </div>

              {/* Use Current Location Button */}
              <div className="space-y-3">
                <button
                  onClick={() => { onUseCurrentLocation(); onClose(); }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 border border-emerald-500/20 transition-all group"
                >
                  <Navigation size={18} className="group-hover:scale-110 transition-transform" />
                  <div className="text-left">
                    <span className="block font-semibold text-sm">Use Current Location</span>
                    <span className="block text-xs opacity-70">Using GPS</span>
                  </div>
                </button>

                {/* Display Current Details if Available */}
                {(currentLat && currentLng) && (
                  <div className="p-3 bg-white/5 border border-white/10 rounded-xl animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg shrink-0">
                        <MapPin size={16} />
                      </div>
                      <div>
                        <p className="text-white text-xs font-bold uppercase tracking-wider mb-0.5">Current Detected Location</p>
                        <p className="text-white/80 text-sm font-medium leading-snug">{currentAddress}</p>
                        <div className="flex gap-2 mt-2">
                          <span className="inline-flex items-center text-[10px] font-mono text-white/50 bg-white/5 px-2 py-1 rounded border border-white/5">
                            Lat: {Number(currentLat).toFixed(6)}
                          </span>
                          <span className="inline-flex items-center text-[10px] font-mono text-white/50 bg-white/5 px-2 py-1 rounded border border-white/5">
                            Lng: {Number(currentLng).toFixed(6)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Predictions List */}
            <div className="overflow-y-auto custom-scrollbar border-t border-white/5 flex-1 min-h-[100px]">
              {loading && (
                <div className="p-4 text-center text-white/40 text-sm">Searching...</div>
              )}

              {error && !loading && (
                <div className="p-4 text-center text-red-400/80 text-sm">{error}</div>
              )}

              {!loading && !error && query.length > 2 && predictions.length === 0 && (
                <div className="p-4 text-center text-white/40 text-sm">No results found</div>
              )}

              {!loading && predictions.map((place) => (
                <button
                  key={place.place_id}
                  onClick={() => {
                    onSelectLocation(place.description);
                    onClose();
                  }}
                  className="w-full text-left p-4 hover:bg-white/5 border-b border-white/5 last:border-0 transition-colors flex items-start gap-3 group"
                >
                  <MapPin size={18} className="mt-0.5 text-white/40 group-hover:text-emerald-400 transition-colors shrink-0" />
                  <div>
                    <span className="block text-white text-sm font-medium group-hover:text-emerald-100">{place.structured_formatting.main_text}</span>
                    <span className="block text-white/40 text-xs mt-0.5">{place.structured_formatting.secondary_text}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Footer */}
            <div className="p-3 bg-white/5 border-t border-white/10 text-center shrink-0">
              <span className="text-[10px] text-white/30 uppercase tracking-widest">Powered by Google</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default function Header({ onToggleSidebar, darkMode = true }) {
  const { showPopup } = usePopup();
  const navigate = useNavigate();
  const menuRef = useRef(null);
  const notifyRef = useRef(null);
  const token = localStorage.getItem("token");

  const [openMenu, setOpenMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [orders, setOrders] = useState([]);
  const [scrolled, setScrolled] = useState(false);

  // Location States
  const [locationName, setLocationName] = useState("Locating...");
  const [coords, setCoords] = useState(null);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [newOrderToast, setNewOrderToast] = useState(null); // For toaster
  const [isReadyModalOpen, setIsReadyModalOpen] = useState(false);
  const [selectedOrderForReady, setSelectedOrderForReady] = useState(null);

  // Generate Google Maps API Key
  const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  // Logout
  const logout = () => {
    showPopup({
      title: "Confirm Logout",
      message: "Are you sure you want to log out of your session?",
      type: "confirm",
      onConfirm: () => {
        localStorage.clear();
        navigate("/login", { replace: true });
      }
    });
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenu(false);
      if (notifyRef.current && !notifyRef.current.contains(e.target)) setShowNotifications(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  // Handle Scroll Effect
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Fetch Location Logic
  const getCurrentLocation = () => {
    setLocationName("Locating...");
    setCoords(null);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setCoords({ lat: latitude, lng: longitude });
          try {
            if (!GOOGLE_MAPS_API_KEY) {
              setLocationName("No API Key");
              return;
            }
            const response = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`
            );
            const data = await response.json();

            if (data.status === "OK" && data.results.length > 0) {
              const addressComponents = data.results[0].address_components;

              const locality = addressComponents.find(c => c.types.includes("locality"))?.long_name;
              const sublocality = addressComponents.find(c => c.types.includes("sublocality"))?.long_name;
              const adminArea = addressComponents.find(c => c.types.includes("administrative_area_level_1"))?.short_name;

              let displayLoc = "Unknown Location";
              if (sublocality && locality) {
                displayLoc = `${sublocality}, ${locality}`;
              } else if (locality) {
                displayLoc = `${locality}, ${adminArea || ''}`;
              } else if (data.results[0].formatted_address) {
                displayLoc = data.results[0].formatted_address.split(',')[0];
              }

              setLocationName(displayLoc);
            } else {
              setLocationName("Location not found");
            }
          } catch (error) {
            console.error("Geocoding error:", error);
            setLocationName("Error fetching location");
          }
        },
        (error) => {
          console.error("Geolocation error:", error);
          if (error.code === 1) setLocationName("Location Denied");
          else setLocationName("Location Unavailable");
        }
      );
    } else {
      setLocationName("Geolocation not supported");
    }
  };

  // Initial Fetch (Once on mount)
  useEffect(() => {
    getCurrentLocation();
  }, []);

  // Fetch Orders via real-time Firestore listener
  useEffect(() => {
    if (!token) return;
    
    // Listen for new orders (status 0)
    const q = query(collection(db, "orders"), where("order_status", "in", [0, "0"]));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
       const newOrdersList = [];
       snapshot.forEach((docSnap) => {
          const o = docSnap.data();
          
          // Make items an array if it's stored as JSON string (depending on how we structured it)
          let parsedItems = o.items;
          if (typeof parsedItems === 'string') {
              try { parsedItems = JSON.parse(parsedItems); } catch(e) { parsedItems = []; }
          }
          if (!Array.isArray(parsedItems)) parsedItems = [];
          
          newOrdersList.push({ 
            id: docSnap.id, 
            ...o, 
            items: parsedItems.map(i => ({ name: i.product_name, quantity: i.quantity, price: i.price, instruction: i.special_instruction }))
          });
       });
       
       // Sort by date (newest first)
       newOrdersList.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
       
       setOrders((prev) => {
          if (newOrdersList.length > prev.length && newOrdersList.length > 0) {
             const latestOrder = newOrdersList[0];
             const audio = new Audio("/message.mp3");
             audio.play().catch((err) => console.log("Audio play failed:", err));
             setNewOrderToast(latestOrder);
             setTimeout(() => setNewOrderToast(null), 6000);
          }
          return newOrdersList;
       });
    });
    
    return () => unsubscribe();
  }, [token]);

  const handleAccept = (order) => {
    setSelectedOrderForReady(order);
    setIsReadyModalOpen(true);
  };

  const updateOrderStatus = async (orderNumber, status, readyInMinutes = null) => {
    try {
      const q = query(collection(db, "orders"), where("order_number", "==", orderNumber));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      
      let estTime = null;
      if (status === 1 && readyInMinutes) {
         const d = new Date();
         d.setMinutes(d.getMinutes() + readyInMinutes);
         estTime = d.toISOString();
      }

      snapshot.docs.forEach(docSnap => {
        const updateData = { order_status: status };
        if (estTime) updateData.delivery_estimate_time = estTime;
        batch.update(docSnap.ref, updateData);
      });
      await batch.commit();
    } catch (error) {
      console.error("Failed to update status", error);
      alert("Failed to update order");
    }
  };

  const confirmAccept = async (minutes) => {
    if (!selectedOrderForReady) return;
    await updateOrderStatus(selectedOrderForReady.order_number, 1, Number(minutes));
    setIsReadyModalOpen(false);
    setSelectedOrderForReady(null);
  };

  const handleReject = async (order) => {
    await updateOrderStatus(order.order_number, 2);
  };

  return (
    <>
      <LocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        apiKey={GOOGLE_MAPS_API_KEY}
        onUseCurrentLocation={getCurrentLocation}
        onSelectLocation={(loc) => setLocationName(loc)}
        currentAddress={locationName}
        currentLat={coords?.lat}
        currentLng={coords?.lng}
      />

      <ReadyInModal
        isOpen={isReadyModalOpen}
        onClose={() => setIsReadyModalOpen(false)}
        onConfirm={confirmAccept}
        orderNumber={selectedOrderForReady?.order_number}
      />

      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 flex flex-col ${scrolled
        ? "bg-white/10 backdrop-blur-xl border-b border-white/10 shadow-lg"
        : "bg-transparent"
        }`}>
        <div className={`w-full px-4 sm:px-6 flex items-center justify-between transition-all duration-300 ${scrolled ? "h-16" : "h-20"}`}>

          {/* LEFT: Branding & Toggle */}
          <div className="flex items-center gap-3 sm:gap-6">
            <button onClick={onToggleSidebar} className="p-2 rounded-xl text-white hover:bg-white/10 transition-colors">
              <Menu size={24} />
            </button>

            <div className="hidden lg:flex items-center gap-2 sm:gap-3">
              <img
                src="/Crispy-Dosalogo.png"
                alt="Crispy Dosa"
                className={`h-12 sm:h-14 w-auto transition-all duration-300 drop-shadow-md ${scrolled ? "scale-90" : "scale-100"}`}
              />
            </div>
          </div>

          {/* CENTER: Mobile Logo */}
          <div className="lg:hidden absolute left-1/2 -translate-x-1/2 flex items-center justify-center">
            <img
              src="/Crispy-Dosalogo.png"
              alt="Crispy Dosa"
              className="h-10 w-auto drop-shadow-md"
            />
          </div>

          <div className="hidden lg:flex flex-1 items-center justify-center gap-4 max-w-2xl mx-auto px-4">
            {/* Location Badge - Clickable */}
            <button
              onClick={() => setIsLocationModalOpen(true)}
              className="flex items-center gap-2 text-white/90 bg-white/10 backdrop-blur-md py-2.5 px-4 rounded-xl border border-white/10 text-sm font-medium shadow-sm min-w-[140px] max-w-[240px] transition-all hover:bg-white/20 hover:scale-[1.02] active:scale-95 cursor-pointer"
            >
              <MapPin size={16} className="text-emerald-400 shrink-0" />
              <span className="truncate">{locationName}</span>
              <ChevronDown size={14} className="text-white/40 ml-auto shrink-0" />
            </button>
          </div>

          {/* RIGHT: Actions */}
          <div className="flex items-center gap-3 sm:gap-5">

            {/* Notifications */}
            <div className="relative" ref={notifyRef}>
              <button
                onClick={() => setShowNotifications((v) => !v)}
                className={`relative p-2 sm:p-2.5 rounded-xl transition-all duration-200 ${showNotifications
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'text-white hover:bg-white/10'
                  }`}
              >
                <Bell size={20} />
                {orders.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full border-2 border-[#1a1c23] shadow-lg animate-in zoom-in">
                    {orders.length}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="fixed sm:absolute left-2 right-2 sm:left-auto sm:right-0 top-20 sm:top-auto sm:mt-4 w-auto sm:w-96 max-w-md bg-white/10 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden z-50 animate-in fade-in slide-in-from-top-4 duration-200">
                  <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                    <h3 className="font-semibold text-white text-sm sm:text-base">Notifications</h3>
                    <div className="flex items-center gap-2">
                      {orders.length > 0 && <span className="text-xs font-medium px-2 py-1 bg-rose-500/20 text-rose-300 rounded-full border border-rose-500/30">{orders.length} New</span>}
                      <button
                        onClick={() => setShowNotifications(false)}
                        className="sm:hidden p-1 hover:bg-white/10 text-white rounded-lg"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="max-h-[60vh] sm:max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {orders.length === 0 ? (
                      <div className="p-6 sm:p-8 text-center flex flex-col items-center text-white/40">
                        <Bell size={40} className="mb-3 text-white/20" strokeWidth={1} />
                        <p className="text-sm">No new orders</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-white/5">
                        {orders.map((order) => (
                          <div key={order.order_number} className="p-4 sm:p-5 hover:bg-white/5 transition-colors">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <p className="font-bold text-white text-sm sm:text-base mb-1">Order #{order.order_number}</p>
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold rounded uppercase tracking-wider">New</span>
                                  <p className="text-[10px] text-white/40 uppercase font-medium">Just now</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-emerald-400 font-bold text-sm">£{Number(order.order_total).toFixed(2)}</p>
                                <p className="text-[10px] text-white/30 uppercase tracking-tighter">Total Amount</p>
                              </div>
                            </div>

                            {/* Items List */}
                            <div className="bg-white/5 rounded-xl p-3 mb-4 space-y-2 border border-white/5">
                              {order.items.map((item, i) => (
                                <div key={i} className="flex justify-between items-start gap-3">
                                  <div className="flex-1">
                                    <p className="text-white/90 text-xs font-semibold leading-tight">
                                      <span className="text-emerald-400 mr-1">{item.quantity}x</span> {item.name}
                                    </p>
                                    {item.instruction && (
                                      <p className="text-[10px] text-amber-300/70 italic mt-0.5 ml-5">"{item.instruction}"</p>
                                    )}
                                  </div>
                                  <p className="text-white/40 text-[11px] font-mono">£{(item.price * item.quantity).toFixed(2)}</p>
                                </div>
                              ))}
                            </div>

                            {/* Payment Summary */}
                            {(order.wallet_total > 0 || order.loyalty_total > 0) && (
                              <div className="flex flex-wrap gap-2 mb-4">
                                {order.wallet_total > 0 && (
                                  <span className="text-[10px] px-2 py-1 bg-blue-500/10 text-blue-300 border border-blue-500/20 rounded-md">
                                    Wallet used: -£{Number(order.wallet_total).toFixed(2)}
                                  </span>
                                )}
                                {order.loyalty_total > 0 && (
                                  <span className="text-[10px] px-2 py-1 bg-purple-500/10 text-purple-300 border border-purple-500/20 rounded-md">
                                    Loyalty used: -£{Number(order.loyalty_total).toFixed(2)}
                                  </span>
                                )}
                              </div>
                            )}

                            <div className="grid grid-cols-2 gap-2 sm:gap-3 mt-4">
                              <button
                                onClick={() => handleAccept(order)}
                                className="flex items-center justify-center py-2.5 px-3 sm:px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-lg shadow-emerald-900/20 hover:scale-[1.02] active:scale-95"
                              >
                                Accept Order
                              </button>
                              <button
                                onClick={() => handleReject(order)}
                                className="flex items-center justify-center py-2.5 px-3 sm:px-4 bg-white/5 border border-white/10 text-white/60 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30 text-xs sm:text-sm font-medium rounded-xl transition-all"
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="h-6 sm:h-8 w-px hidden sm:block bg-white/20"></div>

            {/* Profile */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setOpenMenu((v) => !v)}
                className="flex items-center gap-2 sm:gap-3 p-1 rounded-full hover:bg-white/5 transition-all pr-2 sm:pr-4 border border-transparent hover:border-white/10"
              >
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center font-bold text-xs sm:text-sm shadow-lg shadow-emerald-500/20 border border-white/20">
                  A
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-sm font-semibold leading-none text-white">Admin</p>
                  <p className="text-[10px] mt-1 font-medium tracking-wide text-white/60">SUPER ADMIN</p>
                </div>
                <ChevronDown size={14} className="hidden sm:block text-white/60" />
              </button>

              {/* Profile Dropdown */}
              {openMenu && (
                <div className="fixed sm:absolute right-2 sm:right-0 top-20 sm:top-auto sm:mt-4 w-[calc(100vw-1rem)] sm:w-56 max-w-xs bg-white/10 backdrop-blur-2xl rounded-xl shadow-2xl border border-white/20 overflow-hidden z-50 animate-in fade-in slide-in-from-top-4 duration-200">
                  <div className="p-2">
                    <button
                      onClick={() => { navigate("/restuarent"); setOpenMenu(false); }}
                      className="w-full text-left px-3 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white rounded-lg flex items-center gap-2 transition-colors"
                    >
                      <User size={16} /> Profile
                    </button>
                    <button
                      onClick={() => { navigate("/restuarent"); setOpenMenu(false); }}
                      className="w-full text-left px-3 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white rounded-lg flex items-center gap-2 transition-colors"
                    >
                      <Settings size={16} /> Settings
                    </button>
                  </div>
                  <div className="border-t border-white/10 p-2">
                    <button
                      onClick={logout}
                      className="w-full text-left px-3 py-2 text-sm text-rose-400 hover:bg-rose-500/20 rounded-lg flex items-center gap-2 transition-colors"
                    >
                      <LogOut size={16} /> Logout
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Mobile Search - Expandable on small screens */}
        {!scrolled && (
          <div className="lg:hidden px-4 pb-3 pt-2">
            <div className="flex gap-2">
              <button
                onClick={() => setIsLocationModalOpen(true)}
                className="flex-1 flex items-center gap-2 text-white/80 bg-white/10 backdrop-blur-md py-2 px-3 rounded-xl border border-white/10 text-xs font-medium active:scale-95 transition-transform"
              >
                <MapPin size={14} className="text-emerald-400 shrink-0" />
                <span className="truncate">{locationName}</span>
                <ChevronDown size={12} className="text-white/40 ml-auto" />
              </button>
            </div>
          </div>
        )}
      </header>

      {/* 🛎️ Global Order Toaster (Swiggy/Zomato style) */}
      <AnimatePresence>
        {newOrderToast && (
          <motion.div
            initial={{ opacity: 0, x: 50, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, x: 0, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
            className="fixed bottom-6 right-6 z-[100] w-full max-w-sm sm:max-w-md"
          >
            <div className="bg-[#1a1c23]/95 backdrop-blur-2xl border-2 border-emerald-500/50 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_20px_rgba(16,185,129,0.2)] overflow-hidden">
              <div className="p-4 sm:p-5">
                <div className="flex items-start gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 border border-emerald-500/30 shadow-inner">
                      <Bell size={24} className="animate-bounce" />
                    </div>
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500 border border-white/20"></span>
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start font-sans">
                      <div>
                        <h4 className="text-white font-bold text-base tracking-tight leading-tight">Incoming Order!</h4>
                        <p className="text-emerald-400 text-xs font-bold leading-none mt-1 uppercase tracking-widest flex items-center gap-1">
                          #{newOrderToast.order_number}
                        </p>
                      </div>
                      <button
                        onClick={() => setNewOrderToast(null)}
                        className="p-1 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition-colors"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    <div className="mt-3 space-y-1 max-h-24 overflow-y-auto pr-2 custom-scrollbar">
                      {newOrderToast.items.map((item, i) => (
                        <p key={i} className="text-white/80 text-sm font-medium line-clamp-1">
                          <span className="text-emerald-400 mr-1.5">{item.quantity}x</span> {item.name}
                        </p>
                      ))}
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Amount Paid</span>
                        <span className="text-lg font-black text-white">£{Number(newOrderToast.order_total).toFixed(2)}</span>
                      </div>
                      <button
                        onClick={() => {
                          setShowNotifications(true);
                          setNewOrderToast(null);
                        }}
                        className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-500/20 transform active:scale-95 transition-all"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              {/* Progress bar for auto-close */}
              <motion.div
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: 6, ease: "linear" }}
                className="h-1 bg-emerald-500/50"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
