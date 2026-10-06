import React, { useEffect, useState, useMemo } from "react";
import Header from "../../components/common/header.jsx";
import Sidebar from "../../components/common/sidebar.jsx";
import Footer from "../../components/common/footer.jsx";
import ReadyInModal from "../../components/common/ReadyInModal.jsx";
import {
  Search, RefreshCw, Filter, Calendar, User, Truck, Bike,
  MapPin, Phone, Clock, CheckCircle, XCircle, AlertCircle, ShoppingBag,
  Eye, X, Navigation, UserCheck, Award, TrendingUp, BarChart2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePopup } from "../../context/PopupContext";
import { db } from "../../firebase";
import { collection, getDocs, query, where, doc, updateDoc, writeBatch } from "firebase/firestore";

function safeNumber(value) {
  const n = parseFloat(value);
  return isNaN(n) ? 0 : n;
}

// Robust status resolver: handles numbers, string numbers, status names, and delivery status
export const getOrderStatusInfo = (orderOrStatus, deliveryStatus = null) => {
  let order = {};
  if (typeof orderOrStatus === "object" && orderOrStatus !== null) {
    order = orderOrStatus;
  } else {
    order = { order_status: orderOrStatus, delivery_status: deliveryStatus };
  }

  // 1. Check delivery_status override for delivered state
  const dStatus = String(order.delivery_status || "").toLowerCase().trim();
  if (dStatus === "delivered" || dStatus === "completed") {
    return {
      code: 4,
      text: "Delivered",
      color: "text-emerald-300",
      bg: "bg-emerald-500/20",
      border: "border-emerald-500/30",
      icon: CheckCircle
    };
  }

  // 2. Resolve raw status value
  let raw = order.order_status !== undefined && order.order_status !== null ? order.order_status : order.status;

  let code = null;
  if (raw !== undefined && raw !== null && raw !== "" && !isNaN(Number(raw))) {
    code = Number(raw);
  } else if (typeof raw === "string") {
    const s = raw.toLowerCase().trim();
    if (s === "placed" || s === "pending" || s === "new") code = 0;
    else if (s === "accepted" || s === "confirmed" || s === "processing") code = 1;
    else if (s === "rejected") code = 2;
    else if (s === "ready" || s === "food_ready" || s === "prepared") code = 3;
    else if (s === "delivered" || s === "collected" || s === "completed") code = 4;
    else if (s === "cancelled" || s === "canceled") code = 5;
  }

  // 3. Fallback to delivery_status
  if (code === null || isNaN(code)) {
    if (dStatus === "out_for_delivery" || dStatus === "on_the_way" || dStatus === "picked_up") code = 3;
    else if (dStatus === "accepted" || dStatus === "assigned") code = 1;
    else if (dStatus === "unassigned") code = 0;
    else code = 0;
  }

  switch (code) {
    case 0:
      return { code: 0, text: "Placed", color: "text-amber-300", bg: "bg-amber-500/20", border: "border-amber-500/30", icon: AlertCircle };
    case 1:
      return { code: 1, text: "Accepted", color: "text-blue-300", bg: "bg-blue-500/20", border: "border-blue-500/30", icon: Clock };
    case 2:
      return { code: 2, text: "Rejected", color: "text-red-300", bg: "bg-red-500/20", border: "border-red-500/30", icon: XCircle };
    case 3:
      if (dStatus === "out_for_delivery") {
        return { code: 3, text: "Out for Delivery", color: "text-purple-300", bg: "bg-purple-500/20", border: "border-purple-500/30", icon: Bike };
      }
      return { code: 3, text: "Ready", color: "text-purple-300", bg: "bg-purple-500/20", border: "border-purple-500/30", icon: ShoppingBag };
    case 4:
      return { code: 4, text: "Delivered", color: "text-emerald-300", bg: "bg-emerald-500/20", border: "border-emerald-500/30", icon: CheckCircle };
    case 5:
      return { code: 5, text: "Cancelled", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", icon: XCircle };
    default:
      return { code: 0, text: "Placed", color: "text-amber-300", bg: "bg-amber-500/20", border: "border-amber-500/30", icon: AlertCircle };
  }
};

const statusConfig = (status) => getOrderStatusInfo(status);

// Helper to detect auto-generated Firestore doc IDs or Firebase Auth UIDs
export const isIdString = (str) => {
  if (!str || typeof str !== "string") return false;
  const trimmed = str.trim();
  // Firestore doc IDs are 20-char base62 (e.g. CvStr5Q95TnzfZInOaur), UIDs are 28 chars
  // No spaces, length >= 16, alphanumeric + hyphens/underscores
  return trimmed.length >= 16 && !trimmed.includes(" ") && /^[A-Za-z0-9_-]+$/.test(trimmed);
};

// Resolves delivery boy name & details from every potential field and collection match
export const resolveDriverInfo = (order, partners = []) => {
  if (!order) return { name: "", phone: "", vehicle: "", id: null };

  // 1. Gather all candidate IDs from the order
  const candidateIds = [];
  const addId = (idVal) => {
    if (idVal && typeof idVal === "string" && idVal.trim() !== "") {
      const trimmed = idVal.trim();
      if (!candidateIds.includes(trimmed)) candidateIds.push(trimmed);
    }
  };

  addId(order.assigned_driver_id);
  addId(order.assigned_delivery_boy_id);
  addId(order.delivery_boy_id);
  addId(order.driver_id);
  addId(order.rider_id);
  addId(order.delivery_partner_id);
  addId(order.delivery_boy_uid);
  addId(order.partner_id);
  addId(order.delivered_by_id);

  // If delivered_by, delivery_boy_name, etc. is an ID string, treat it as an ID!
  if (isIdString(order.delivered_by)) addId(order.delivered_by);
  if (isIdString(order.delivery_boy_name)) addId(order.delivery_boy_name);
  if (isIdString(order.driver_name)) addId(order.driver_name);
  if (isIdString(order.delivery_partner)) addId(order.delivery_partner);

  // 2. Gather genuine human name candidates (ignoring raw ID strings)
  let candidateName = "";
  const nameFields = [
    order.delivery_boy_name,
    order.driver_name,
    order.rider_name,
    order.delivery_partner_name,
    order.deliveryBoyName,
    order.deliveryPartner,
    order.partner_name,
    order.assigned_to,
    order.delivery_person,
    order.delivery_man,
    typeof order.delivery_boy === "string" ? order.delivery_boy : order.delivery_boy?.name,
    order.delivered_by_name,
    order.delivered_by,
  ];

  for (const f of nameFields) {
    if (f && typeof f === "string" && f.trim() !== "") {
      const trimmed = f.trim();
      if (!isIdString(trimmed) && trimmed !== "undefined" && trimmed !== "null") {
        if (!candidateName) candidateName = trimmed;
      }
    }
  }

  // 3. Direct phone
  let phone =
    order.delivery_boy_phone ||
    order.driver_phone ||
    order.rider_phone ||
    order.delivery_partner_phone ||
    order.deliveryBoyPhone ||
    order.delivery_boy?.phone ||
    order.delivery_boy?.mobile_number ||
    "";

  let vehicle = order.delivery_boy_vehicle || order.vehicle_type || "";
  let matchedPartner = null;

  // 4. Match against partners list (by ID, UID, name, or phone)
  if (partners && partners.length > 0) {
    // Priority 1: Match by candidate ID or UID
    for (const cid of candidateIds) {
      const found = partners.find(p => String(p.id) === cid || String(p.uid) === cid);
      if (found) {
        matchedPartner = found;
        break;
      }
    }

    // Priority 2: If still not matched, check if any field matches partner ID
    if (!matchedPartner) {
      for (const f of nameFields) {
        if (f && typeof f === "string") {
          const trimmed = f.trim();
          const found = partners.find(p => String(p.id) === trimmed || String(p.uid) === trimmed);
          if (found) {
            matchedPartner = found;
            break;
          }
        }
      }
    }

    // Priority 3: Match by human name
    if (!matchedPartner && candidateName) {
      matchedPartner = partners.find(p =>
        p.name && p.name.toLowerCase().trim() === candidateName.toLowerCase().trim()
      );
    }

    // Priority 4: Match by phone
    if (!matchedPartner && phone) {
      matchedPartner = partners.find(p =>
        (p.mobile_number && p.mobile_number === phone) || (p.phone && p.phone === phone)
      );
    }
  }

  // Determine final name and details
  let finalName = matchedPartner ? matchedPartner.name : candidateName;
  let finalPhone = phone || (matchedPartner ? (matchedPartner.mobile_number || matchedPartner.phone || "") : "");
  let finalVehicle = vehicle || (matchedPartner ? (matchedPartner.vehicle_type || "Bike") : "Bike");
  let finalId = matchedPartner ? matchedPartner.id : (candidateIds[0] || null);

  // Safeguard: if finalName is STILL an ID string, lookup in partners or display clean fallback
  if (isIdString(finalName)) {
    const directMatch = partners?.find(p => String(p.id) === finalName || String(p.uid) === finalName);
    if (directMatch) {
      finalName = directMatch.name;
      finalPhone = directMatch.mobile_number || directMatch.phone || "";
      finalVehicle = directMatch.vehicle_type || finalVehicle;
      finalId = directMatch.id;
    } else {
      finalName = "Delivery Partner";
    }
  }

  return {
    name: (finalName || "").trim(),
    phone: (finalPhone || "").trim(),
    vehicle: finalVehicle || "Bike",
    id: finalId,
  };
};

// MODAL: Delivery Partner Summary & Performance
const PartnerStatsModal = ({
  isOpen,
  onClose,
  partners,
  partnerStats,
  onSelectPartner,
  selectedPartnerId
}) => {
  const [search, setSearch] = useState("");

  if (!isOpen) return null;

  const filteredPartners = partners.filter(p => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      (p.name || "").toLowerCase().includes(q) ||
      (p.mobile_number || p.phone || "").toLowerCase().includes(q) ||
      (p.email || "").toLowerCase().includes(q)
    );
  });

  const totalDelivered = Object.values(partnerStats.byPartner).reduce((s, p) => s + (p.deliveredCount || 0), 0);
  const totalActive = Object.values(partnerStats.byPartner).reduce((s, p) => s + (p.activeCount || 0), 0);
  const totalOrdersAssigned = Object.values(partnerStats.byPartner).reduce((s, p) => s + (p.totalCount || 0), 0);
  const totalDeliveredRevenue = Object.values(partnerStats.byPartner).reduce((s, p) => s + (p.totalRevenue || 0), 0);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        onClick={e => e.stopPropagation()}
        className="bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10 bg-gradient-to-r from-emerald-950/60 via-zinc-900 to-zinc-900 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
              <Bike size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Delivery Partner Performance
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {partners.length} Partners
                </span>
              </h2>
              <p className="text-white/50 text-xs mt-0.5">
                Overview of completed deliveries and active orders per delivery partner
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Top KPI Cards inside Modal */}
        <div className="p-6 pb-4 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white/5 border-b border-white/5">
          <div className="bg-black/30 p-3 rounded-xl border border-white/5">
            <span className="text-[10px] text-white/50 uppercase font-bold tracking-wider block">Delivered by Partners</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black text-emerald-400">{totalDelivered}</span>
              <span className="text-[11px] text-white/40">orders</span>
            </div>
            <span className="text-[11px] text-emerald-300/80 font-mono">£{totalDeliveredRevenue.toFixed(2)}</span>
          </div>
          <div className="bg-black/30 p-3 rounded-xl border border-white/5">
            <span className="text-[10px] text-white/50 uppercase font-bold tracking-wider block">In-Transit / Active</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black text-purple-400">{totalActive}</span>
              <span className="text-[11px] text-white/40">orders</span>
            </div>
            <span className="text-[11px] text-purple-300/80">currently on delivery</span>
          </div>
          <div className="bg-black/30 p-3 rounded-xl border border-white/5">
            <span className="text-[10px] text-white/50 uppercase font-bold tracking-wider block">Direct / Store Fulfillment</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black text-teal-300">{partnerStats.directDeliveredCount}</span>
              <span className="text-[11px] text-white/40">orders</span>
            </div>
            <span className="text-[11px] text-teal-300/80">without assigned driver</span>
          </div>
          <div className="bg-black/30 p-3 rounded-xl border border-white/5">
            <span className="text-[10px] text-white/50 uppercase font-bold tracking-wider block">Unassigned Active</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black text-amber-400">{partnerStats.unassignedCount}</span>
              <span className="text-[11px] text-white/40">orders</span>
            </div>
            <span className="text-[11px] text-amber-300/80">needs assignment</span>
          </div>
        </div>

        {/* Search */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={16} />
            <input
              type="text"
              placeholder="Search delivery partner by name, phone, or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>
          {selectedPartnerId !== "all" && (
            <button
              onClick={() => { onSelectPartner("all"); onClose(); }}
              className="text-xs text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-2 rounded-xl border border-amber-500/20 transition-colors whitespace-nowrap cursor-pointer"
            >
              Clear Partner Filter
            </button>
          )}
        </div>

        {/* Partner Cards Grid */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {filteredPartners.length === 0 ? (
            <div className="text-center py-12">
              <Bike className="mx-auto text-white/20 mb-3" size={48} strokeWidth={1.5} />
              <p className="text-white/50 font-medium">No delivery partners found</p>
              <p className="text-white/30 text-xs mt-1">Partners registered under your restaurant will appear here</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPartners.map(p => {
                const s = partnerStats.byPartner[p.id] || { deliveredCount: 0, activeCount: 0, totalCount: 0, totalRevenue: 0 };
                const isSelected = selectedPartnerId === p.id;

                return (
                  <div
                    key={p.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isSelected
                        ? "bg-emerald-500/15 border-emerald-500/50 shadow-lg shadow-emerald-950/40"
                        : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-black text-sm shadow-md">
                          {p.name ? p.name.charAt(0).toUpperCase() : "P"}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-white text-base leading-tight">{p.name}</h4>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-white/70">
                              {p.vehicle_type || "Bike"}
                            </span>
                          </div>
                          {(p.mobile_number || p.phone) && (
                            <p className="text-xs text-white/50 font-mono flex items-center gap-1 mt-0.5">
                              <Phone size={11} /> {p.mobile_number || p.phone}
                            </p>
                          )}
                        </div>
                      </div>

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                        Number(p.status) === 1
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                          : "bg-gray-500/20 text-gray-400 border-gray-500/30"
                      }`}>
                        {Number(p.status) === 1 ? "Active" : "Inactive"}
                      </span>
                    </div>

                    {/* Stats Tiles */}
                    <div className="grid grid-cols-3 gap-2 my-3 text-center">
                      <div className="bg-black/30 p-2 rounded-lg border border-white/5">
                        <span className="text-[9px] uppercase font-bold text-emerald-400 block tracking-wider">Delivered</span>
                        <span className="text-xl font-black text-emerald-300">{s.deliveredCount}</span>
                      </div>
                      <div className="bg-black/30 p-2 rounded-lg border border-white/5">
                        <span className="text-[9px] uppercase font-bold text-purple-400 block tracking-wider">In-Transit</span>
                        <span className="text-xl font-black text-purple-300">{s.activeCount}</span>
                      </div>
                      <div className="bg-black/30 p-2 rounded-lg border border-white/5">
                        <span className="text-[9px] uppercase font-bold text-white/50 block tracking-wider">Total</span>
                        <span className="text-xl font-black text-white">{s.totalCount}</span>
                      </div>
                    </div>

                    {/* Revenue & Action */}
                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      <div className="text-xs">
                        <span className="text-white/40 block text-[10px] uppercase">Delivered Value</span>
                        <span className="text-emerald-400 font-bold text-sm">£{safeNumber(s.totalRevenue).toFixed(2)}</span>
                      </div>

                      <button
                        onClick={() => {
                          onSelectPartner(p.id);
                          onClose();
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/30"
                            : "bg-white/10 hover:bg-emerald-600 hover:text-white text-white/80"
                        }`}
                      >
                        {isSelected ? <CheckCircle size={14} /> : <Filter size={14} />}
                        {isSelected ? "Currently Filtered" : "Filter Orders"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Direct Fulfillment Card */}
          {partnerStats.directDeliveredCount > 0 && (
            <div className="mt-4 p-4 rounded-xl bg-teal-500/10 border border-teal-500/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-teal-500/20 text-teal-300 flex items-center justify-center font-bold">
                  🏠
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">Direct / In-House Fulfillment</h4>
                  <p className="text-xs text-white/50">Delivered directly by store staff without external delivery partner</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-emerald-300 font-black text-xl">{partnerStats.directDeliveredCount} Delivered</span>
                <button
                  onClick={() => {
                    onSelectPartner("direct");
                    onClose();
                  }}
                  className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  View Direct Orders
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white/5 border-t border-white/10 flex justify-between items-center text-xs text-white/50">
          <span>Click "Filter Orders" on any partner to view all deliveries assigned to them</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// MODAL: Order Details
const DeliveryOrderDetailsModal = ({ order, onClose, partners, onAssignPartner }) => {
  if (!order) return null;
  const items = order.items || [];
  const statusInfo = getOrderStatusInfo(order);
  const isDelivered = statusInfo.code === 4 || order.delivery_status === "delivered";
  const isCancelledOrRejected = statusInfo.code === 2 || statusInfo.code === 5;

  // Resolve driver details
  const driverInfo = resolveDriverInfo(order, partners);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
      >
        <div className="p-6 border-b border-white/10 bg-white/5 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <Truck className="text-blue-400" /> Order #{order.order_number}
              <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-bold">DELIVERY</span>
            </h2>
            <p className="text-white/50 text-sm mt-1">Placed on {new Date(order.created_at).toLocaleString()}</p>
          </div>
          <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors cursor-pointer"><X size={24} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/5 p-4 rounded-xl border border-white/5">
              <h3 className="text-emerald-400 font-bold uppercase text-xs tracking-wider mb-4 flex items-center gap-2"><User size={14} /> Customer</h3>
              <div className="space-y-3">
                <div className="flex justify-between border-b border-white/5 pb-2"><span className="text-white/50 text-sm">Name</span><span className="text-white font-medium">{order.customer_name || "Guest"}</span></div>
                <div className="flex justify-between border-b border-white/5 pb-2"><span className="text-white/50 text-sm">Phone</span><span className="text-white font-medium">{order.mobile_number || order.customer_phone || "-"}</span></div>
                <div className="flex justify-between"><span className="text-white/50 text-sm">Email</span><span className="text-white font-medium">{order.customer_email || "-"}</span></div>
              </div>
            </div>
            <div className="bg-white/5 p-4 rounded-xl border border-white/5">
              <h3 className="text-emerald-400 font-bold uppercase text-xs tracking-wider mb-4 flex items-center gap-2"><Truck size={14} /> Order Info</h3>
              <div className="space-y-3">
                <div className="flex justify-between border-b border-white/5 pb-2"><span className="text-white/50 text-sm">Type</span><span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-500/20 text-blue-300">DELIVERY</span></div>
                <div className="flex justify-between border-b border-white/5 pb-2"><span className="text-white/50 text-sm">Payment</span><span className="text-white font-medium">{order.payment_mode === 0 ? "COD" : "Online"}</span></div>
                <div className="flex justify-between border-b border-white/5 pb-2"><span className="text-white/50 text-sm">Status</span><span className={`font-bold ${statusInfo.color}`}>{statusInfo.text}</span></div>
                {order.delivery_fee !== undefined && order.delivery_fee !== null && (
                  <div className="flex justify-between"><span className="text-white/50 text-sm">Delivery Fee</span><span className="text-emerald-400 font-bold">{Number(order.delivery_fee) === 0 ? "FREE" : `£${safeNumber(order.delivery_fee).toFixed(2)}`}{order.delivery_distance ? ` (${order.delivery_distance} mi)` : ""}</span></div>
                )}
              </div>
            </div>
          </div>

          {/* Delivery Partner Info Block */}
          <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 p-5 rounded-xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3">
              <h3 className="text-emerald-400 font-bold uppercase text-xs tracking-wider flex items-center gap-2">
                <Bike size={16} /> {isDelivered ? "Delivered By" : "Assigned Delivery Partner"}
              </h3>
              {(order.delivery_status || isDelivered) && (
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase border ${
                  isDelivered ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" :
                  order.delivery_status === "out_for_delivery" ? "bg-purple-500/20 text-purple-300 border-purple-500/30" :
                  order.delivery_status === "accepted" ? "bg-blue-500/20 text-blue-300 border-blue-500/30" :
                  "bg-amber-500/20 text-amber-300 border-amber-500/30"
                }`}>
                  {isDelivered ? "DELIVERED" : order.delivery_status.replace(/_/g, " ")}
                </span>
              )}
            </div>

            {driverInfo.name ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/60">{isDelivered ? "Delivered By (Driver):" : "Partner Name:"}</span>
                  <span className="text-emerald-300 font-bold text-base">{driverInfo.name}</span>
                </div>
                {driverInfo.phone && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/60">Phone:</span>
                    <a href={`tel:${driverInfo.phone}`} className="text-white font-mono hover:text-emerald-300 transition-colors">
                      {driverInfo.phone}
                    </a>
                  </div>
                )}
                {order.accepted_at && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/60">Accepted At:</span>
                    <span className="text-white/80 text-xs">
                      {order.accepted_at?.toDate ? order.accepted_at.toDate().toLocaleString() : String(order.accepted_at)}
                    </span>
                  </div>
                )}
                {isDelivered && (order.delivered_at || order.created_at) && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/60">Delivered At:</span>
                    <span className="text-emerald-300 text-xs font-semibold">
                      {order.delivered_at?.toDate ? order.delivered_at.toDate().toLocaleString() : order.delivered_at || new Date(order.created_at).toLocaleString()}
                    </span>
                  </div>
                )}

                {/* Option to change partner */}
                {partners && partners.length > 0 && (
                  <div className="pt-3 mt-2 border-t border-white/10 flex items-center gap-2">
                    <span className="text-xs text-white/50">Change driver:</span>
                    <select
                      id="modalReassignSelect"
                      className="bg-slate-800 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none flex-1"
                      defaultValue=""
                    >
                      <option value="" disabled>Select new driver...</option>
                      {partners.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.mobile_number || p.phone})</option>
                      ))}
                      <option value="direct">🏠 Store / In-house</option>
                    </select>
                    <button
                      onClick={() => {
                        const sel = document.getElementById("modalReassignSelect");
                        if (sel && sel.value) onAssignPartner(order.order_number, sel.value);
                      }}
                      className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                    >
                      Update
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-amber-300/80 text-sm">
                  {isDelivered
                    ? "⚠️ Order marked as delivered without a recorded driver. Select who delivered it below:"
                    : "No delivery partner assigned yet. Select and assign a partner below:"}
                </p>
                {partners && partners.length > 0 && (
                  <div className="flex items-center gap-2">
                    <select
                      id="modalPartnerSelect"
                      className="bg-slate-800 border border-amber-500/30 rounded-xl px-3 py-2 text-sm text-white focus:outline-none flex-1"
                      defaultValue=""
                    >
                      <option value="" disabled>Select who delivered this order...</option>
                      {partners.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.mobile_number || p.phone})</option>
                      ))}
                      <option value="direct">🏠 Store Staff / In-house Fulfillment</option>
                    </select>
                    <button
                      onClick={() => {
                        const sel = document.getElementById("modalPartnerSelect");
                        if (sel && sel.value) {
                          onAssignPartner(order.order_number, sel.value);
                        }
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-lg shadow-emerald-950/30"
                    >
                      {isDelivered ? "Set Delivered By" : "Assign Driver"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {order.delivery_address && (
            <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between border-b border-blue-500/20 pb-2">
                <h3 className="text-blue-400 font-bold uppercase text-xs tracking-wider flex items-center gap-2">
                  <MapPin size={14} /> Delivery Address Details
                </h3>
                {(order.postcode || order.pincode) && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    PIN: {order.postcode || order.pincode}
                  </span>
                )}
              </div>

              {(order.house_flat_no || order.street_landmark || order.city) ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="bg-black/20 p-2.5 rounded-lg border border-white/5">
                    <span className="block text-white/40 text-[9px] uppercase font-bold tracking-wider mb-0.5">House / Flat / Floor</span>
                    <span className="text-white font-bold text-sm">{order.house_flat_no || "-"}</span>
                  </div>
                  <div className="bg-black/20 p-2.5 rounded-lg border border-white/5">
                    <span className="block text-white/40 text-[9px] uppercase font-bold tracking-wider mb-0.5">Street / Area / Landmark</span>
                    <span className="text-white font-medium">{order.street_landmark || "-"}</span>
                  </div>
                  <div className="bg-black/20 p-2.5 rounded-lg border border-white/5">
                    <span className="block text-white/40 text-[9px] uppercase font-bold tracking-wider mb-0.5">City / Town</span>
                    <span className="text-white font-medium">{order.city || "-"}</span>
                  </div>
                  <div className="bg-black/20 p-2.5 rounded-lg border border-white/5">
                    <span className="block text-white/40 text-[9px] uppercase font-bold tracking-wider mb-0.5">Postcode / Pincode</span>
                    <span className="text-emerald-400 font-bold text-sm">{order.postcode || order.pincode || "-"}</span>
                  </div>
                </div>
              ) : null}

              <div className="text-xs text-white/80 bg-white/5 p-2.5 rounded-lg leading-relaxed">
                <span className="text-white/40 font-bold uppercase text-[9px] block mb-0.5">Full Address:</span>
                {order.delivery_address}
              </div>

              {order.delivery_instructions && (
                <div className="bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg flex items-start gap-2 text-xs text-amber-300">
                  <AlertCircle size={14} className="shrink-0 mt-0.5 text-amber-400" />
                  <div>
                    <span className="font-bold uppercase text-[10px] tracking-wider block text-amber-400">Rider Delivery Note:</span>
                    <span>{order.delivery_instructions}</span>
                  </div>
                </div>
              )}

              {order.delivery_coords && (
                <p className="text-white/30 text-[10px] flex items-center gap-1">
                  <Navigation size={10} /> {order.delivery_coords.lat?.toFixed(5)}, {order.delivery_coords.lng?.toFixed(5)}
                </p>
              )}
            </div>
          )}

          <div>
            <h3 className="text-white font-bold mb-4 text-lg">Order Items</h3>
            <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
              <table className="w-full text-left">
                <thead className="bg-white/5 text-white/50 text-xs uppercase">
                  <tr>
                    <th className="p-4 font-medium">Qty</th>
                    <th className="p-4 font-medium">Item</th>
                    <th className="p-4 font-medium text-right">Price</th>
                    <th className="p-4 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {items.map((item, i) => (
                    <tr key={i} className="hover:bg-white/5">
                      <td className="p-4"><span className="text-2xl font-bold text-emerald-400">{safeNumber(item.quantity)}X</span></td>
                      <td className="p-4 text-white font-medium">{item.product_name}</td>
                      <td className="p-4 text-right text-white/60">£{safeNumber(item.price).toFixed(2)}</td>
                      <td className="p-4 text-right text-white font-bold">£{(safeNumber(item.price) * safeNumber(item.quantity)).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="p-6 bg-white/5 border-t border-white/10 flex justify-between items-center">
          <div className="text-white/50 text-sm">Items: <span className="text-white font-bold">{items.length}</span></div>
          <div className="text-3xl font-bold text-emerald-400">£{safeNumber(order.grand_total).toFixed(2)}</div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default function DeliveryOrders() {
  const { showPopup } = usePopup();
  const userObj = JSON.parse(localStorage.getItem("user") || "{}");
  const localUserId = Number(userObj.id);
  const isSuperAdmin = Number(userObj.role_id) === 1;
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [orders, setOrders] = useState([]);
  const [partners, setPartners] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isReadyModalOpen, setIsReadyModalOpen] = useState(false);
  const [orderForReady, setOrderForReady] = useState(null);
  const [isPartnerStatsModalOpen, setIsPartnerStatsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 12;
  const [searchOrder, setSearchOrder] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPartner, setFilterPartner] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(() => localStorage.getItem("deliveryAutoRefresh") === "true");

  useEffect(() => {
    localStorage.setItem("deliveryAutoRefresh", autoRefresh);
  }, [autoRefresh]);

  // Load delivery partners (all partners loaded so any driver ID resolves to human name)
  const loadPartners = async () => {
    try {
      const snap = await getDocs(collection(db, "delivery_partners"));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPartners(list);
    } catch (e) {
      console.log("Failed to load delivery partners:", e);
    }
  };

  const assignablePartners = useMemo(() => {
    if (isSuperAdmin) return partners;
    const branchPartners = partners.filter(p => !p.restaurant_id || String(p.restaurant_id) === String(localUserId));
    return branchPartners.length > 0 ? branchPartners : partners;
  }, [partners, isSuperAdmin, localUserId]);

  const loadOrders = async () => {
    try {
      let q = collection(db, "orders");
      const snap = await getDocs(q);
      const all = snap.docs.map(doc => {
        const data = doc.data();
        let createdAtDate = null;
        if (data.created_at?.toDate) {
          createdAtDate = data.created_at.toDate();
        } else if (data.created_at) {
          createdAtDate = new Date(data.created_at);
        }
        return {
          id: doc.id,
          ...data,
          created_at: createdAtDate ? createdAtDate.toISOString() : new Date().toISOString()
        };
      });

      // Filter: ONLY delivery orders
      const deliveryOrders = all.filter(o => o.order_type === "delivery" || o.delivery_address);

      // Super admin or user filter
      const accessible = isSuperAdmin
        ? deliveryOrders
        : deliveryOrders.filter(o => Number(o.user_id) === localUserId);

      accessible.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setOrders(accessible);
    } catch (err) {
      console.error("Error loading delivery orders:", err);
      showPopup({ title: "Error", message: "Failed to load delivery orders", type: "error" });
    }
  };

  useEffect(() => {
    loadOrders();
    loadPartners();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => { loadOrders(); }, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const updateOrderStatus = async (orderNumber, newStatus, readyMins = null) => {
    try {
      const q = query(collection(db, "orders"), where("order_number", "==", orderNumber));
      const snap = await getDocs(q);
      if (snap.empty) return;
      const batch = writeBatch(db);
      snap.docs.forEach(docSnap => {
        const updateData = { order_status: newStatus };
        if (readyMins !== null) updateData.ready_in_minutes = readyMins;
        if (newStatus === 4) {
          updateData.delivery_status = "delivered";
          updateData.delivered_at = new Date().toISOString();
        }
        batch.update(docSnap.ref, updateData);
      });
      await batch.commit();
      await loadOrders();
      showPopup({ title: "Updated", message: `Order status updated successfully`, type: "success" });
    } catch (e) {
      showPopup({ title: "Error", message: e.message || "Failed to update", type: "error" });
    }
  };

  // Manual assign partner or set who delivered the order
  const handleAssignPartner = async (orderNumber, partnerId) => {
    try {
      const q = query(collection(db, "orders"), where("order_number", "==", orderNumber));
      const snap = await getDocs(q);
      if (snap.empty) return;
      const batch = writeBatch(db);

      if (partnerId === "direct") {
        snap.docs.forEach(docSnap => {
          batch.update(docSnap.ref, {
            assigned_delivery_boy_id: "direct",
            delivery_boy_name: "Store Staff (Direct)",
            delivery_boy_phone: "",
            delivered_by: "Store Staff (Direct)",
          });
        });
        await batch.commit();
        await loadOrders();
        showPopup({ title: "Updated", message: `Order #${orderNumber} marked as store fulfillment`, type: "success" });
        return;
      }

      const partner = partners.find(p => p.id === partnerId);
      if (!partner) return;

      snap.docs.forEach(docSnap => {
        const docData = docSnap.data();
        const effective = getOrderStatusInfo(docData);
        const isAlreadyDelivered = effective.code === 4 || docData.delivery_status === "delivered";

        const updateData = {
          assigned_delivery_boy_id: partner.id,
          delivery_boy_id: partner.id,
          delivery_boy_uid: partner.uid || "",
          delivery_boy_name: partner.name,
          delivery_boy_phone: partner.mobile_number || partner.phone || "",
          delivery_boy_email: partner.email || "",
          delivered_by: partner.name,
          delivery_partner_name: partner.name,
        };

        if (!isAlreadyDelivered) {
          updateData.delivery_status = "accepted";
          updateData.accepted_at = new Date().toISOString();
        }

        batch.update(docSnap.ref, updateData);
      });

      await batch.commit();
      await loadOrders();

      if (selectedOrder && selectedOrder.order_number === orderNumber) {
        setSelectedOrder(prev => ({
          ...prev,
          assigned_delivery_boy_id: partner.id,
          delivery_boy_name: partner.name,
          delivery_boy_phone: partner.mobile_number || partner.phone || "",
          delivered_by: partner.name,
        }));
      }

      showPopup({
        title: "Assigned",
        message: `Delivery boy ${partner.name} assigned to order #${orderNumber}`,
        type: "success"
      });
    } catch (e) {
      showPopup({ title: "Error", message: "Failed to assign partner", type: "error" });
    }
  };

  const formatDate = (iso) => {
    if (!iso) return "-";
    const d = new Date(iso);
    return isNaN(d) ? iso : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  // Partner Delivery Stats calculation: who delivered how many orders
  const partnerStats = useMemo(() => {
    const stats = {};

    partners.forEach(p => {
      stats[p.id] = {
        partner: p,
        partnerId: p.id,
        name: p.name,
        phone: p.mobile_number || p.phone || "",
        deliveredCount: 0,
        activeCount: 0,
        totalCount: 0,
        totalRevenue: 0,
      };
    });

    let unassignedCount = 0;
    let directDeliveredCount = 0;

    orders.forEach(order => {
      const s = getOrderStatusInfo(order);
      const isDelivered = s.code === 4 || order.delivery_status === "delivered";
      const isActive = [0, 1, 3].includes(s.code) && !isDelivered && s.code !== 2 && s.code !== 5;
      const driver = resolveDriverInfo(order, partners);

      if (driver.id && stats[driver.id]) {
        stats[driver.id].totalCount += 1;
        if (isDelivered) {
          stats[driver.id].deliveredCount += 1;
          stats[driver.id].totalRevenue += safeNumber(order.grand_total);
        } else if (isActive) {
          stats[driver.id].activeCount += 1;
        }
      } else if (driver.name) {
        // Find partner by name match
        const pMatch = partners.find(p => p.name?.toLowerCase().trim() === driver.name.toLowerCase().trim());
        if (pMatch && stats[pMatch.id]) {
          stats[pMatch.id].totalCount += 1;
          if (isDelivered) {
            stats[pMatch.id].deliveredCount += 1;
            stats[pMatch.id].totalRevenue += safeNumber(order.grand_total);
          } else if (isActive) {
            stats[pMatch.id].activeCount += 1;
          }
        } else {
          if (isDelivered) directDeliveredCount += 1;
        }
      } else {
        if (isDelivered) {
          directDeliveredCount += 1;
        } else if (isActive) {
          unassignedCount += 1;
        }
      }
    });

    return {
      byPartner: stats,
      unassignedCount,
      directDeliveredCount,
    };
  }, [orders, partners]);

  const totalDeliveredByPartners = useMemo(() => {
    return Object.values(partnerStats.byPartner).reduce((acc, p) => acc + p.deliveredCount, 0);
  }, [partnerStats]);

  const groupedOrders = useMemo(() => {
    return orders.filter(order => {
      const s = getOrderStatusInfo(order);
      const isDelivered = s.code === 4 || order.delivery_status === "delivered";
      const driver = resolveDriverInfo(order, partners);

      const matchesSearch = !searchOrder || String(order.order_number || "").toLowerCase().includes(searchOrder.toLowerCase());
      const matchesStatus = filterStatus === "all" || String(s.code) === String(filterStatus);

      let matchesPartner = true;
      if (filterPartner === "unassigned") {
        matchesPartner = !driver.name && !driver.id;
      } else if (filterPartner === "direct") {
        matchesPartner = (!driver.id || driver.id === "direct") && isDelivered;
      } else if (filterPartner !== "all") {
        const selectedPartner = partners.find(p => p.id === filterPartner);
        matchesPartner =
          driver.id === filterPartner ||
          (selectedPartner && driver.name.toLowerCase().trim() === selectedPartner.name.toLowerCase().trim());
      }

      let matchesDate = true;
      if (fromDate || toDate) {
        const orderDate = new Date(order.created_at);
        if (fromDate && orderDate < new Date(fromDate)) matchesDate = false;
        if (toDate && orderDate > new Date(toDate + "T23:59:59")) matchesDate = false;
      }
      return matchesSearch && matchesStatus && matchesPartner && matchesDate;
    });
  }, [orders, searchOrder, filterStatus, filterPartner, fromDate, toDate, partners]);

  const totalPages = Math.ceil(groupedOrders.length / rowsPerPage) || 1;
  const currentOrders = groupedOrders.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const selectedPartnerObj = partners.find(p => p.id === filterPartner);

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-amber-900 via-teal-800 to-emerald-900 font-sans text-white">
      <Header onToggleSidebar={() => setSidebarOpen(s => !s)} darkMode={true} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <ReadyInModal isOpen={isReadyModalOpen} onClose={() => setIsReadyModalOpen(false)}
        onConfirm={(mins) => { if (orderForReady) { updateOrderStatus(orderForReady, 1, mins); setIsReadyModalOpen(false); setOrderForReady(null); } }}
        orderNumber={orderForReady} />
      <div className={`flex-1 flex flex-col min-h-screen pt-36 lg:pt-24 transition-all duration-300 ease-in-out ${sidebarOpen ? "lg:pl-72" : "lg:pl-0"}`}>
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white drop-shadow-md flex items-center gap-3">
                <Truck className="text-emerald-400" /> Delivery Orders
              </h1>
              <p className="text-white/70 mt-1 text-base">Live tracking of delivery orders, fulfilled status, and delivery partner performance.</p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {/* Partner Performance Modal Button */}
              <button
                onClick={() => setIsPartnerStatsModalOpen(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-3.5 py-2 rounded-xl text-sm font-semibold shadow-lg shadow-emerald-900/30 border border-emerald-400/30 transition-all active:scale-95 cursor-pointer"
                title="View Driver Delivery Performance & Counts"
              >
                <Bike size={18} className="text-emerald-200" />
                <span>Partner Deliveries</span>
                <span className="bg-black/30 text-emerald-200 px-2 py-0.5 rounded-full text-xs font-bold">
                  {totalDeliveredByPartners}
                </span>
              </button>

              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-2 rounded-xl border border-white/10">
                <label className="flex items-center gap-2 cursor-pointer px-2">
                  <div className="relative">
                    <input type="checkbox" className="sr-only" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} />
                    <div className={`w-10 h-6 rounded-full shadow-inner transition-colors ${autoRefresh ? "bg-emerald-500" : "bg-white/20"}`} />
                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform shadow ${autoRefresh ? "translate-x-full" : ""}`} />
                  </div>
                  <span className="text-sm font-medium">Auto-Refresh</span>
                </label>
                <div className="h-6 w-px bg-white/20" />
                <button onClick={loadOrders} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/80 hover:text-white cursor-pointer" title="Refresh">
                  <RefreshCw size={20} />
                </button>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Total Orders", value: groupedOrders.length, cls: "bg-emerald-500/20 border-emerald-500/30 text-emerald-300" },
              {
                label: "Unassigned",
                value: orders.filter(o => {
                  const s = getOrderStatusInfo(o);
                  const driver = resolveDriverInfo(o, partners);
                  return !driver.name && [0, 1, 3].includes(s.code);
                }).length,
                cls: "bg-amber-500/20 border-amber-500/30 text-amber-300"
              },
              {
                label: "Out for Delivery",
                value: orders.filter(o => {
                  const s = getOrderStatusInfo(o);
                  return o.delivery_status === "out_for_delivery" || s.code === 3;
                }).length,
                cls: "bg-purple-500/20 border-purple-500/30 text-purple-300"
              },
              {
                label: "Delivered",
                value: orders.filter(o => {
                  const s = getOrderStatusInfo(o);
                  return s.code === 4 || o.delivery_status === "delivered";
                }).length,
                cls: "bg-teal-500/20 border-teal-500/30 text-teal-300"
              },
            ].map(s => (
              <div key={s.label} className="rounded-2xl p-4 border backdrop-blur-xl bg-white/10 border-white/20 flex items-center justify-between">
                <div>
                  <span className="text-xs text-white/60 uppercase font-bold tracking-wider block mb-1">{s.label}</span>
                  <span className="text-2xl font-black text-white">{s.value}</span>
                </div>
                <div className={`px-2.5 py-1 rounded-lg border text-xs font-bold ${s.cls}`}>{s.label.split(" ")[0]}</div>
              </div>
            ))}
          </div>

          {/* Filters Bar */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-4 rounded-2xl mb-8 shadow-xl">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={16} />
                <input placeholder="Search Order No..." value={searchOrder} onChange={e => setSearchOrder(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={16} />
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 appearance-none cursor-pointer">
                  <option value="all" className="bg-slate-800">All Status</option>
                  <option value="0" className="bg-slate-800">Placed</option>
                  <option value="1" className="bg-slate-800">Accepted</option>
                  <option value="2" className="bg-slate-800">Rejected</option>
                  <option value="3" className="bg-slate-800">Ready / Out for Delivery</option>
                  <option value="4" className="bg-slate-800">Delivered</option>
                  <option value="5" className="bg-slate-800">Cancelled</option>
                </select>
              </div>
              {/* Delivery Partner Filter with Delivered Counts */}
              <div className="relative">
                <Bike className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={16} />
                <select value={filterPartner} onChange={e => setFilterPartner(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 appearance-none cursor-pointer">
                  <option value="all" className="bg-slate-800">All Delivery Partners ({orders.length})</option>
                  <option value="unassigned" className="bg-slate-800">⚠️ Unassigned ({partnerStats.unassignedCount})</option>
                  {partnerStats.directDeliveredCount > 0 && (
                    <option value="direct" className="bg-slate-800">🏠 Direct / In-House ({partnerStats.directDeliveredCount} delivered)</option>
                  )}
                  {partners.map(p => {
                    const s = partnerStats.byPartner[p.id];
                    const del = s ? s.deliveredCount : 0;
                    const act = s ? s.activeCount : 0;
                    return (
                      <option key={p.id} value={p.id} className="bg-slate-800">
                        {p.name} ({del} delivered{act > 0 ? ` • ${act} active` : ""})
                      </option>
                    );
                  })}
                </select>
              </div>
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
            </div>

            {/* Active Partner Filter Banner */}
            {filterPartner !== "all" && (
              <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-emerald-300">
                  <Filter size={14} />
                  <span>
                    Filtering orders for:{" "}
                    <strong className="text-white">
                      {filterPartner === "unassigned"
                        ? "⚠️ Unassigned Orders"
                        : filterPartner === "direct"
                        ? `🏠 Direct / In-House Fulfillment (${partnerStats.directDeliveredCount} delivered)`
                        : `${selectedPartnerObj?.name || "Partner"} (${partnerStats.byPartner[filterPartner]?.deliveredCount || 0} Delivered)`}
                    </strong>
                  </span>
                </div>
                <button
                  onClick={() => setFilterPartner("all")}
                  className="text-xs text-amber-300 hover:text-amber-200 underline cursor-pointer"
                >
                  Clear Filter (Show All)
                </button>
              </div>
            )}
          </div>

          {/* Orders Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-start">
            {currentOrders.length === 0 ? (
              <div className="col-span-full py-20 text-center">
                <Truck className="mx-auto text-white/20 mb-4" size={64} strokeWidth={1} />
                <h3 className="text-xl font-bold text-white/50">No delivery orders found</h3>
                <p className="text-white/30 mt-2">Adjust your search or delivery partner filters</p>
              </div>
            ) : currentOrders.map((order, index) => {
              const items = order.items || [];
              const statusInfo = getOrderStatusInfo(order);
              const StatusIcon = statusInfo.icon;
              const isDelivered = statusInfo.code === 4 || order.delivery_status === "delivered";
              const isCancelledOrRejected = statusInfo.code === 2 || statusInfo.code === 5;

              // Resolve full driver details (checking all fields and partner match)
              const driverInfo = resolveDriverInfo(order, partners);

              const paidTotal = safeNumber(order.grand_total) || items.reduce((s, i) => s + safeNumber(i.price) * safeNumber(i.quantity), 0);
              const totalQty = items.reduce((s, i) => s + safeNumber(i.quantity), 0);

              return (
                <div key={index} className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden hover:bg-white/15 transition-all shadow-xl flex flex-col">
                  {/* Card Header with Status & View Eye */}
                  <div className="p-4 border-b border-white/10 flex justify-between items-start bg-black/10">
                    <div className="flex-1 min-w-0 mr-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-xl font-bold text-white truncate">{order.order_number}</h3>
                        <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">🛵 Delivery</span>
                        {autoRefresh && statusInfo.code === 0 && <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse shrink-0" />}
                      </div>
                      <div className="text-xs text-white/60 mt-1 flex items-center gap-2"><Calendar size={12} />{formatDate(order.created_at)}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${statusInfo.bg} ${statusInfo.color} ${statusInfo.border}`}>
                        <StatusIcon size={12} />{statusInfo.text}
                      </div>
                      <button onClick={() => setSelectedOrder(order)} className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-emerald-300 transition-colors cursor-pointer" title="View Details">
                        <Eye size={20} />
                      </button>
                    </div>
                  </div>

                  {/* PROMINENT DELIVERY BOY / WHO DELIVERED THE ORDER BAR */}
                  <div className="px-4 py-2.5 bg-black/20 border-b border-white/10 flex items-center justify-between text-xs gap-2 flex-wrap">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {isDelivered ? (
                        <CheckCircle size={15} className="text-emerald-400 shrink-0" />
                      ) : (
                        <Bike size={15} className={driverInfo.name ? "text-emerald-400 shrink-0" : "text-amber-400 shrink-0"} />
                      )}

                      {driverInfo.name ? (
                        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                          <span className="text-white/70 font-medium">
                            {isDelivered ? "Delivered by:" : "Driver:"}
                          </span>
                          <span className="font-bold text-emerald-300 text-sm tracking-wide">
                            {driverInfo.name}
                          </span>
                          {driverInfo.phone && (
                            <span className="text-white/50 font-mono text-[11px]">
                              ({driverInfo.phone})
                            </span>
                          )}
                        </div>
                      ) : isDelivered ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-amber-300 font-bold text-xs">Delivered by:</span>
                          <select
                            onChange={(e) => {
                              if (e.target.value) handleAssignPartner(order.order_number, e.target.value);
                            }}
                            defaultValue=""
                            className="bg-slate-900 text-white text-[11px] rounded-lg px-2.5 py-1 border border-amber-500/40 focus:outline-none cursor-pointer"
                          >
                            <option value="" disabled>Select Delivery Boy...</option>
                            {partners.map(p => (
                              <option key={p.id} value={p.id}>{p.name} ({p.mobile_number || p.phone})</option>
                            ))}
                            <option value="direct">🏠 Store / In-house Fulfillment</option>
                          </select>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-amber-300/90 font-medium">Unassigned</span>
                          <select
                            onChange={(e) => {
                              if (e.target.value) handleAssignPartner(order.order_number, e.target.value);
                            }}
                            defaultValue=""
                            className="bg-slate-900 text-white/80 text-[11px] rounded-lg px-2 py-1 border border-white/20 focus:outline-none cursor-pointer"
                          >
                            <option value="" disabled>Assign Driver...</option>
                            {partners.map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Allow changing driver if driver is already assigned */}
                      {driverInfo.name && partners.length > 0 && (
                        <select
                          onChange={(e) => {
                            if (e.target.value) handleAssignPartner(order.order_number, e.target.value);
                          }}
                          defaultValue=""
                          className="bg-black/40 hover:bg-black/60 text-white/60 hover:text-white text-[10px] rounded px-1.5 py-0.5 border border-white/10 focus:outline-none cursor-pointer"
                          title="Change delivery partner"
                        >
                          <option value="" disabled>Change driver...</option>
                          {partners.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                          <option value="direct">🏠 Store / In-house</option>
                        </select>
                      )}

                      {/* Delivery Status Tag */}
                      {(order.delivery_status || isDelivered) && (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${
                          isDelivered ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" :
                          order.delivery_status === "out_for_delivery" ? "bg-purple-500/20 text-purple-300 border border-purple-500/30" :
                          "bg-teal-500/20 text-teal-300 border border-teal-500/30"
                        }`}>
                          {isDelivered ? "DELIVERED" : order.delivery_status.replace(/_/g, " ")}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Items Scroll Area */}
                  <div className="p-4 flex-1 max-h-40 overflow-y-auto border-b border-white/5 space-y-2 custom-scrollbar">
                    {items.length === 0 ? <p className="text-white/40 italic text-sm">No items</p> : items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm">
                        <div className="flex gap-3 items-center flex-1">
                          <span className="font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-lg min-w-[2rem] text-center border border-emerald-500/30">{safeNumber(item.quantity)}x</span>
                          <span className="text-white/90 font-medium truncate">{item.product_name || "Unknown"}</span>
                        </div>
                        <span className="text-white/60 ml-2 font-mono">£{safeNumber(item.price).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Delivery Address */}
                  {order.delivery_address && (
                    <div className="px-4 py-3 bg-white/5 border-b border-white/10 space-y-1.5">
                      <div className="flex items-start gap-2 text-xs text-white/80">
                        <MapPin size={14} className="shrink-0 mt-0.5 text-emerald-400" />
                        <div className="flex-1 min-w-0">
                          {order.house_flat_no && (
                            <span className="font-bold text-white block text-xs">
                              🏠 {order.house_flat_no}
                              {(order.postcode || order.pincode) && ` (${order.postcode || order.pincode})`}
                            </span>
                          )}
                          <span className="line-clamp-2 leading-relaxed text-white/70 text-[11px]">
                            {order.street_landmark ? `${order.street_landmark}${order.city ? `, ${order.city}` : ''}` : order.delivery_address}
                          </span>
                        </div>
                      </div>
                      {order.delivery_instructions && (
                        <div className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-md flex items-center gap-1.5">
                          <span className="font-bold uppercase text-[9px] text-amber-400">Rider Note:</span>
                          <span className="truncate">{order.delivery_instructions}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Customer details */}
                  <div className="p-4 bg-white/5 space-y-1 text-sm">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2 text-white/70"><User size={14} className="text-white/40" /><span className="truncate max-w-[140px]">{order.customer_name || "Guest"}</span></div>
                      {(order.mobile_number || order.customer_phone) && (
                        <div className="flex items-center gap-1 text-white/50 text-xs">
                          <Phone size={12} />{order.mobile_number || order.customer_phone}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Totals & Dynamic Actions */}
                  <div className="p-4 pt-2">
                    <div className="flex justify-between items-end mb-4">
                      <div className="text-xs text-white/50">{totalQty} item{totalQty !== 1 ? "s" : ""}</div>
                      <div className="text-right">
                        <div className="text-xs text-white/60 uppercase tracking-wider font-bold">Total</div>
                        <div className="text-2xl font-bold text-white">£{paidTotal.toFixed(2)}</div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="grid grid-cols-1 gap-2">
                      {statusInfo.code === 0 && (
                        <div className="grid grid-cols-2 gap-3">
                          <button onClick={() => { setOrderForReady(order.order_number); setIsReadyModalOpen(true); }} className="py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"><CheckCircle size={18} />Accept</button>
                          <button onClick={() => updateOrderStatus(order.order_number, 2)} className="py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"><XCircle size={18} />Reject</button>
                        </div>
                      )}
                      {statusInfo.code === 1 && (
                        <button onClick={() => updateOrderStatus(order.order_number, 3)} className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"><ShoppingBag size={18} />Mark Ready</button>
                      )}
                      {statusInfo.code === 3 && (
                        <button onClick={() => updateOrderStatus(order.order_number, 4)} className="w-full py-3 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"><Truck size={18} />Mark as Delivered</button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center mt-8 gap-2">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer">Previous</button>
              <div className="flex gap-1">
                {[...Array(totalPages).keys()].slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2)).map(num => (
                  <button key={num} onClick={() => setCurrentPage(num + 1)} className={`w-10 h-10 rounded-xl font-bold flex items-center justify-center transition-all cursor-pointer ${currentPage === num + 1 ? "bg-emerald-500 text-white shadow-lg scale-110" : "bg-white/5 text-white/60 hover:bg-white/10"}`}>{num + 1}</button>
                ))}
              </div>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer">Next</button>
            </div>
          )}
        </main>
        <Footer />

        {/* MODAL: Order Details */}
        <AnimatePresence>
          {selectedOrder && (
            <DeliveryOrderDetailsModal
              order={selectedOrder}
              onClose={() => setSelectedOrder(null)}
              partners={partners}
              onAssignPartner={handleAssignPartner}
            />
          )}
        </AnimatePresence>

        {/* MODAL: Delivery Partner Summary & Performance */}
        <AnimatePresence>
          {isPartnerStatsModalOpen && (
            <PartnerStatsModal
              isOpen={isPartnerStatsModalOpen}
              onClose={() => setIsPartnerStatsModalOpen(false)}
              partners={partners}
              partnerStats={partnerStats}
              onSelectPartner={(partnerId) => {
                setFilterPartner(partnerId);
                setCurrentPage(1);
              }}
              selectedPartnerId={filterPartner}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
