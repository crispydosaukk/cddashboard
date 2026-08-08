import React, { useEffect, useState, useRef } from "react";
import Header from "../../components/common/header.jsx";
import Sidebar from "../../components/common/sidebar.jsx";
import Footer from "../../components/common/footer.jsx";
import { v4 as uuidv4 } from "uuid";
import { db, storage } from "../../firebase";
import { collection, getDocs, doc, setDoc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  Store, MapPin, Phone, Mail, Facebook, Twitter, Instagram, Linkedin,
  ParkingCircle, Upload, X, Clock, Plus, Trash2, Save, Image as ImageIcon,
  CheckCircle2, AlertCircle, Calendar
} from "lucide-react";
import { usePopup } from "../../context/PopupContext";

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const InputField = ({ icon: Icon, label, value, onChange, placeholder, type = "text", className = "" }) => (
  <div className={`group ${className}`}>
    <label className="block text-sm font-semibold text-white/90 mb-2 flex items-center gap-2 drop-shadow">
      {Icon && <Icon size={16} className="text-emerald-300" />}
      {label}
    </label>
    <div className="relative">
      <input
        type={type}
        value={value || ""}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full px-4 py-3 bg-white/10 backdrop-blur-md border-2 border-white/20 rounded-xl text-white placeholder-white/50 
                 focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/20 
                 transition-all duration-200 hover:border-white/30 shadow-lg"
      />
    </div>
  </div>
);

export default function Restuarent() {
  const { showPopup } = usePopup();
  const API = import.meta.env.VITE_API_URL;
  const API_BASE = API ? API.replace(/\/api\/?$/i, "") : "";
  
  const userObj = JSON.parse(localStorage.getItem("user") || "{}");
  const localUserId = userObj.id ? String(userObj.id) : null;
  const isSuperAdmin = Number(userObj.role_id) === 1;

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [info, setInfo] = useState({
    restaurant_name: "",
    address: "",
    phone: "",
    email: "",
    facebook: "",
    twitter: "",
    instagram: "",
    linkedin: "",
    parking_info: "",
    instore: false,
    kerbside: false,
    latitude: "",
    longitude: "",
    photo: "",
    stripe_secret_key: "",
    stripe_publishable_key: ""
  });

  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [timings, setTimings] = useState([{ id: uuidv4(), day: "Monday", start: "", end: "", is_active: true }]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [restaurantDocId, setRestaurantDocId] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => { loadRestaurant(); }, []);

  // Initialize Google Places Autocomplete for the address field
  useEffect(() => {
    const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!GOOGLE_MAPS_API_KEY) return;

    const loadAutocomplete = () => {
      const input = document.getElementById("restaurant_address_autocomplete");
      if (!input || !window.google || !window.google.maps || !window.google.maps.places) return;

      const autocomplete = new window.google.maps.places.Autocomplete(input, {
        fields: ["formatted_address", "geometry"],
      });

      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (place.geometry) {
          setInfo(prev => ({
            ...prev,
            address: place.formatted_address,
            latitude: place.geometry.location.lat(),
            longitude: place.geometry.location.lng()
          }));
        }
      });
    };

    // Helper to load script if not already present
    if (!document.getElementById("google-maps-script")) {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.id = "google-maps-script";
      script.async = true;
      script.onload = loadAutocomplete;
      document.head.appendChild(script);
    } else {
      // Script already exists, but might not be fully loaded or places lib might be missing
      if (window.google && window.google.maps && window.google.maps.places) {
        loadAutocomplete();
      } else {
        const script = document.getElementById("google-maps-script");
        const oldOnload = script.onload;
        script.onload = () => {
          if (oldOnload) oldOnload();
          loadAutocomplete();
        };
      }
    }
  }, []);

  useEffect(() => {
    if (!photoFile) { setPhotoPreview(null); return; }
    const url = URL.createObjectURL(photoFile);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  const onInfoChange = (k) => (e) => setInfo((p) => ({ ...p, [k]: e.target.value }));

  function normalizeDay(raw) {
    if (!raw) return null;
    const s = String(raw).trim();
    const day = s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
    return WEEKDAYS.includes(day) ? day : null;
  }

  const isWeekdayPresent = (d) => timings.some((t) => normalizeDay(t.day) === normalizeDay(d));

  const handleAddManual = () => {
    const present = new Set(timings.map((t) => normalizeDay(t.day)));
    const missing = WEEKDAYS.find((d) => !present.has(d));
    if (!missing) return;
    setTimings((prev) =>
      [...prev, { id: uuidv4(), day: missing, start: "", end: "", is_active: true }]
        .sort((a, b) => WEEKDAYS.indexOf(a.day) - WEEKDAYS.indexOf(b.day))
    );
  };

  const changeDay = (id, newDayRaw) => {
    const newDay = normalizeDay(newDayRaw);
    if (!newDay || isWeekdayPresent(newDay)) return;
    updateTiming(id, { day: newDay });
    setTimings((prev) => prev.slice().sort((a, b) => WEEKDAYS.indexOf(a.day) - WEEKDAYS.indexOf(b.day)));
  };

  const updateTiming = (id, changes) => setTimings((prev) => prev.map((t) => (t.id === id ? { ...t, ...changes } : t)));
  const removeTiming = (id) => setTimings((prev) => prev.filter((t) => t.id !== id));

  function frontendToApiPayload() {
    const toSqlTime = (s) => (!s ? null : /^\d{1,2}:\d{2}$/.test(s) ? s + ":00" : s);

    return {
      restaurant_name: info.restaurant_name || null,
      restaurant_address: info.address || null,
      restaurant_phonenumber: info.phone || null,
      restaurant_email: info.email || null,
      restaurant_facebook: info.facebook || null,
      restaurant_twitter: info.twitter || null,
      restaurant_instagram: info.instagram || null,
      restaurant_linkedin: info.linkedin || null,
      parking_info: info.parking_info || null,
      instore: info.instore ? 1 : 0,
      kerbside: info.kerbside ? 1 : 0,
      latitude: info.latitude || null,
      longitude: info.longitude || null,
      stripe_secret_key: info.stripe_secret_key || null,
      stripe_publishable_key: info.stripe_publishable_key || null,
      timings: timings.map((t) => ({
        day: t.day,
        opening_time: toSqlTime(t.start),
        closing_time: toSqlTime(t.end),
        is_active: !!t.is_active
      }))
    };
  }

  function apiToFrontend(restaurant) {
    if (!restaurant) return;

    setInfo({
      restaurant_name: restaurant.restaurant_name ?? "",
      address: restaurant.restaurant_address ?? "",
      phone: restaurant.restaurant_phonenumber ?? "",
      email: restaurant.restaurant_email ?? "",
      facebook: restaurant.restaurant_facebook ?? "",
      twitter: restaurant.restaurant_twitter ?? "",
      instagram: restaurant.restaurant_instagram ?? "",
      linkedin: restaurant.restaurant_linkedin ?? "",
      parking_info: restaurant.parking_info ?? "",
      instore: !!restaurant.instore,
      kerbside: !!restaurant.kerbside,
      latitude: restaurant.latitude ?? "",
      longitude: restaurant.longitude ?? "",
      photo: restaurant.restaurant_photo ?? "",
      stripe_secret_key: restaurant.stripe_secret_key ?? "",
      stripe_publishable_key: restaurant.stripe_publishable_key ?? ""
    });

    if (restaurant.timings?.length) {
      setTimings(
        restaurant.timings.map((t) => ({
          id: uuidv4(),
          day: t.day,
          start: t.opening_time?.substring(0, 5) || "",
          end: t.closing_time?.substring(0, 5) || "",
          is_active: !!t.is_active
        }))
      );
    }
  }

  async function loadRestaurant() {
    if (!localUserId) return;
    setLoading(true);
    try {
      // Super Admin might need a dropdown here, but for now we load their own or the first if they are admin
      // In the old system, restaurants were linked to user IDs.
      const docRef = doc(db, "restaurant", localUserId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setRestaurantDocId(docSnap.id);
        apiToFrontend(docSnap.data());
      } else if (isSuperAdmin) {
        // Fallback for Super Admin if they don't have a direct doc
        const res = await getDocs(collection(db, "restaurant"));
        if (!res.empty) {
          const firstSnap = res.docs[0];
          setRestaurantDocId(firstSnap.id);
          apiToFrontend(firstSnap.data());
        }
      }
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  }

  async function saveAll() {
    setSaving(true);
    try {
      const payload = frontendToApiPayload();

      if (photoFile) {
        const fileRef = ref(storage, `uploads/${Date.now()}-${photoFile.name}`);
        await uploadBytes(fileRef, photoFile);
        payload.restaurant_photo = await getDownloadURL(fileRef);
      } else {
        payload.restaurant_photo = info.photo;
      }

      if (restaurantDocId) {
        await setDoc(doc(db, "restaurant", restaurantDocId), payload, { merge: true });
      } else if (localUserId) {
        // Create new
        payload.user_id = localUserId;
        await setDoc(doc(db, "restaurant", localUserId), payload);
        setRestaurantDocId(localUserId);
      } else {
        const newRef = doc(collection(db, "restaurant"));
        await setDoc(newRef, payload);
        setRestaurantDocId(newRef.id);
      }

      apiToFrontend(payload);

      setPhotoFile(null);
      setPhotoPreview(null);

      showPopup({
        title: "Success",
        message: "Restaurant profile saved successfully!",
        type: "success"
      });
    } catch (e) {
      console.error(e);
      showPopup({
        title: "Save Failed",
        message: e.message ? `Something went wrong: ${e.message}` : "Something went wrong while saving your profile.",
        type: "error"
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-900 via-teal-800 to-emerald-900">
      <Header onToggleSidebar={() => setSidebarOpen((s) => !s)} darkMode={true} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className={`pt-36 lg:pt-24 pb-12 px-4 sm:px-6 transition-all duration-300 ease-in-out ${sidebarOpen ? "lg:pl-80 lg:pr-8" : "lg:pl-8 lg:pr-8"}`}>
        <div className="max-w-7xl mx-auto">

          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-2">
              <div className="p-3 bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20">
                <Store className="text-white" size={28} />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white drop-shadow-lg">Restaurant Profile</h1>
                <p className="text-white/90 mt-1 text-base drop-shadow">Manage your restaurant information and operating hours</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Main Form - Left Side (2 columns) */}
            <div className="lg:col-span-2 space-y-6">

              {/* Basic Information Card */}
              <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
                <div className="bg-white/10 backdrop-blur-md px-6 py-4 border-b border-white/10">
                  <h2 className="text-xl font-bold text-white drop-shadow-lg flex items-center gap-2">
                    <Store size={20} />
                    Basic Information
                  </h2>
                </div>

                <div className="p-6 space-y-5 bg-white/5 backdrop-blur-sm">
                  <InputField
                    icon={Store}
                    label="Restaurant Name"
                    value={info.restaurant_name}
                    onChange={onInfoChange("restaurant_name")}
                    placeholder="Enter restaurant name"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <InputField
                      icon={Phone}
                      label="Phone Number"
                      value={info.phone}
                      onChange={onInfoChange("phone")}
                      placeholder="+44 123 456 7890"
                      type="tel"
                    />
                    <InputField
                      icon={Mail}
                      label="Email Address"
                      value={info.email}
                      onChange={onInfoChange("email")}
                      placeholder="contact@restaurant.com"
                      type="email"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-white/90 mb-2 flex items-center gap-2 drop-shadow">
                      <MapPin size={16} className="text-emerald-300" />
                      Address & Location
                    </label>
                    <div className="space-y-4">
                      <div className="relative">
                        <input
                          type="text"
                          id="restaurant_address_autocomplete"
                          value={info.address}
                          onChange={onInfoChange("address")}
                          placeholder="Search for restaurant address..."
                          className="w-full px-4 py-3 bg-white/10 backdrop-blur-md border-2 border-white/20 rounded-xl text-white placeholder-white/50 
                                   focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/20 
                                   transition-all duration-200 hover:border-white/30 shadow-lg"
                        />
                        <div className="mt-2 flex gap-4">
                          <div className="flex-1">
                            <label className="block text-[10px] uppercase tracking-wider text-white/50 mb-1 font-bold">Latitude</label>
                            <input
                              type="text"
                              value={info.latitude}
                              readOnly
                              placeholder="0.000000"
                              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white/70 text-sm font-mono focus:outline-none cursor-default"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-[10px] uppercase tracking-wider text-white/50 mb-1 font-bold">Longitude</label>
                            <input
                              type="text"
                              value={info.longitude}
                              readOnly
                              placeholder="0.000000"
                              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white/70 text-sm font-mono focus:outline-none cursor-default"
                            />
                          </div>
                        </div>
                        <p className="text-[10px] text-white/40 mt-1 italic">
                          * Start typing address to select from Google suggestions. Coordinates will update automatically.
                        </p>
                      </div>
                    </div>
                  </div>

                  <InputField
                    icon={ParkingCircle}
                    label="Parking Information"
                    value={info.parking_info}
                    onChange={onInfoChange("parking_info")}
                    placeholder="e.g., Free parking available, Valet service"
                  />
                </div>
              </div>

              {/* Social Media Links Card */}
              <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
                <div className="bg-white/10 backdrop-blur-md px-6 py-4 border-b border-white/10">
                  <h2 className="text-xl font-bold text-white drop-shadow-lg">Social Media</h2>
                </div>

                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <InputField
                    icon={Facebook}
                    label="Facebook"
                    value={info.facebook}
                    onChange={onInfoChange("facebook")}
                    placeholder="Facebook profile URL"
                  />
                  <InputField
                    icon={Instagram}
                    label="Instagram"
                    value={info.instagram}
                    onChange={onInfoChange("instagram")}
                    placeholder="Instagram profile URL"
                  />
                  <InputField
                    icon={Twitter}
                    label="Twitter"
                    value={info.twitter}
                    onChange={onInfoChange("twitter")}
                    placeholder="Twitter profile URL"
                  />
                  <InputField
                    icon={Linkedin}
                    label="LinkedIn"
                    value={info.linkedin}
                    onChange={onInfoChange("linkedin")}
                    placeholder="LinkedIn profile URL"
                  />
                </div>
              </div>

              {/* Stripe Details Card */}
              <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
                <div className="bg-white/10 backdrop-blur-md px-6 py-4 border-b border-white/10">
                  <h2 className="text-xl font-bold text-white drop-shadow-lg">Stripe Payments</h2>
                </div>

                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <InputField
                    label="Stripe Publishable Key"
                    value={info.stripe_publishable_key}
                    onChange={onInfoChange("stripe_publishable_key")}
                    placeholder="pk_test_..."
                  />
                  <InputField
                    label="Stripe Secret Key"
                    value={info.stripe_secret_key}
                    onChange={onInfoChange("stripe_secret_key")}
                    placeholder="sk_test_..."
                  />
                </div>
              </div>

              {/* Service Options Card */}
              <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
                <div className="bg-white/10 backdrop-blur-md px-6 py-4 border-b border-white/10">
                  <h2 className="text-xl font-bold text-white drop-shadow-lg">Service Options</h2>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className={`relative flex items-center p-4 rounded-xl border-2 cursor-pointer hover:shadow-lg transition-all duration-200 group ${info.instore
                      ? 'bg-emerald-500/20 border-emerald-400/50'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}>
                      <input
                        type="checkbox"
                        checked={info.instore}
                        onChange={(e) => setInfo((p) => ({ ...p, instore: e.target.checked }))}
                        className="w-5 h-5 text-emerald-500 border-white/30 rounded focus:ring-emerald-500 focus:ring-2 bg-white/10"
                      />
                      <div className="ml-3 flex-1">
                        <span className="block text-sm font-bold text-white">In-Store Pickup</span>
                        <span className="text-xs text-white/50">Customers can pick up orders inside</span>
                      </div>
                      {info.instore && <CheckCircle2 className="text-emerald-400" size={20} />}
                    </label>

                    <label className={`relative flex items-center p-4 rounded-xl border-2 cursor-pointer hover:shadow-lg transition-all duration-200 group ${info.kerbside
                      ? 'bg-emerald-500/20 border-emerald-400/50'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}>
                      <input
                        type="checkbox"
                        checked={info.kerbside}
                        onChange={(e) => setInfo((p) => ({ ...p, kerbside: e.target.checked }))}
                        className="w-5 h-5 text-emerald-500 border-white/30 rounded focus:ring-emerald-500 focus:ring-2 bg-white/10"
                      />
                      <div className="ml-3 flex-1">
                        <span className="block text-sm font-bold text-white">Kerbside Pickup</span>
                        <span className="text-xs text-white/50">Curbside delivery available</span>
                      </div>
                      {info.kerbside && <CheckCircle2 className="text-emerald-400" size={20} />}
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="space-y-6">

              {/* Photo Upload Card */}
              <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden sticky top-24">
                <div className="bg-white/10 backdrop-blur-md px-6 py-4 border-b border-white/10">
                  <h2 className="text-xl font-bold text-white drop-shadow-lg flex items-center gap-2">
                    <ImageIcon size={20} />
                    Restaurant Photo
                  </h2>
                </div>

                <div className="p-6">
                  <div className="relative group">
                    <div className="aspect-[4/3] bg-white/5 rounded-xl overflow-hidden border-2 border-dashed border-white/20 group-hover:border-emerald-400/50 transition-all duration-200">
                      {photoPreview ? (
                        <div className="relative w-full h-full">
                          <img src={photoPreview} className="w-full h-full object-cover" alt="Preview" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button
                              onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                              className="p-3 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transform hover:scale-110 transition-all"
                            >
                              <X size={20} />
                            </button>
                          </div>
                        </div>
                      ) : info.photo ? (
                        <div className="relative w-full h-full">
                          <img
                            src={info.photo.startsWith('http') ? info.photo : `${API_BASE}/uploads/${info.photo}`}
                            className="w-full h-full object-cover"
                            alt="Restaurant"
                            onError={(e) => {
                              console.error("Image load failed:", e.target.src);
                              e.target.src = "";
                            }}
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button
                              onClick={() => fileInputRef.current.click()}
                              className="p-3 bg-gradient-to-r from-[#5f6eea] to-[#7b5cf5] hover:from-[#7b5cf5] hover:to-[#ec4899] text-white rounded-full shadow-lg transform hover:scale-110 transition-all"
                            >
                              <Upload size={20} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                          <ImageIcon size={48} strokeWidth={1.5} className="mb-3" />
                          <span className="text-sm font-medium">No image uploaded</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => setPhotoFile(e.target.files[0])}
                    className="hidden"
                  />

                  <button
                    onClick={() => fileInputRef.current.click()}
                    className="mt-4 w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transform hover:scale-[1.02] transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <Upload size={18} />
                    {photoFile || info.photo ? "Change Photo" : "Upload Photo"}
                  </button>

                  {photoFile && (
                    <button
                      onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                      className="mt-2 w-full py-2 px-4 bg-red-500/10 hover:bg-red-500/20 text-red-200 font-medium rounded-xl border border-red-500/30 transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      <X size={16} />
                      Remove New Photo
                    </button>
                  )}
                </div>

                {/* Save Button */}
                <div className="p-6 pt-0">
                  <button
                    onClick={saveAll}
                    disabled={saving}
                    className="w-full py-4 px-6 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:scale-100 transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <Save size={20} />
                    {saving ? "Saving..." : "Save All Changes"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Operating Hours Section */}
          <div className="mt-8 bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
            <div className="bg-white/10 backdrop-blur-md px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/10">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Calendar size={24} />
                Operating Hours
              </h2>
              <button
                onClick={handleAddManual}
                disabled={timings.length >= 7}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 disabled:bg-white/10 text-white font-semibold rounded-lg backdrop-blur-sm transition-all duration-200 flex items-center gap-2 justify-center sm:justify-start disabled:cursor-not-allowed"
              >
                <Plus size={18} />
                Add Day
              </button>
            </div>

            <div className="p-6">
              <div className="space-y-3">
                {timings.map((t, index) => (
                  <div
                    key={t.id}
                    className={`group relative border-2 rounded-xl p-4 transition-all duration-200 ${t.is_active
                      ? 'bg-white/10 border-emerald-400/30 hover:bg-white/15 shadow-md'
                      : 'bg-white/5 border-white/10 opacity-60 hover:opacity-100'
                      }`}
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">

                      {/* Day Selector */}
                      <div className="sm:col-span-3">
                        <label className="block text-xs font-semibold text-white/70 mb-1">Day</label>
                        <select
                          value={t.day}
                          onChange={(e) => changeDay(t.id, e.target.value)}
                          className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white font-medium focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all [&>option]:text-black"
                        >
                          {WEEKDAYS.map((d) => (
                            <option key={d} value={d} disabled={isWeekdayPresent(d) && t.day !== d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Start Time */}
                      <div className="sm:col-span-3">
                        <label className="block text-xs font-semibold text-white/70 mb-1">Opening Time</label>
                        <div className="relative">
                          <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" />
                          <input
                            type="time"
                            value={t.start}
                            onChange={(e) => updateTiming(t.id, { start: e.target.value })}
                            className="w-full pl-10 pr-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white font-medium focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all [color-scheme:dark]"
                          />
                        </div>
                      </div>

                      {/* End Time */}
                      <div className="sm:col-span-3">
                        <label className="block text-xs font-semibold text-white/70 mb-1">Closing Time</label>
                        <div className="relative">
                          <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" />
                          <input
                            type="time"
                            value={t.end}
                            onChange={(e) => updateTiming(t.id, { end: e.target.value })}
                            className="w-full pl-10 pr-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white font-medium focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all [color-scheme:dark]"
                          />
                        </div>
                      </div>

                      {/* Active Toggle & Remove */}
                      <div className="sm:col-span-3 flex items-center justify-between sm:justify-end gap-3">
                        <label className="flex items-center gap-2 cursor-pointer group/toggle">
                          <input
                            type="checkbox"
                            checked={!!t.is_active}
                            onChange={(e) => updateTiming(t.id, { is_active: e.target.checked })}
                            className="w-5 h-5 text-emerald-500 border-white/30 rounded focus:ring-emerald-500 focus:ring-2 bg-white/10"
                          />
                          <span className="text-sm font-semibold text-white/90 group-hover/toggle:text-emerald-400 transition-colors">
                            {t.is_active ? 'Active' : 'Closed'}
                          </span>
                        </label>

                        <button
                          onClick={() => removeTiming(t.id)}
                          className="p-2 text-red-300 hover:bg-red-500/20 rounded-lg transition-all duration-200 hover:scale-110"
                          title="Remove this day"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>

                    {/* Active Indicator */}
                    {t.is_active && (
                      <div className="absolute top-2 right-2 w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.5)]"></div>
                    )}
                  </div>
                ))}
              </div>

              {timings.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <AlertCircle size={48} className="mx-auto mb-3 opacity-50" />
                  <p className="font-medium">No operating hours set</p>
                  <p className="text-sm mt-1">Click "Add Day" to add your first operating hour</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
