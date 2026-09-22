import React, { useEffect, useState, useMemo } from "react";
import Header from "../../components/common/header.jsx";
import Sidebar from "../../components/common/sidebar.jsx";
import Footer from "../../components/common/footer.jsx";
import ReadyInModal from "../../components/common/ReadyInModal.jsx";
import {
  Search, RefreshCw, Filter, Calendar, User, Truck, Bike,
  MapPin, Phone, Clock, CheckCircle, XCircle, AlertCircle, ShoppingBag,
  Eye, X, Navigation, UserCheck
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePopup } from "../../context/PopupContext";
import { db } from "../../firebase";
import { collection, getDocs, query, where, doc, updateDoc, writeBatch } from "firebase/firestore";

function safeNumber(value) {
  const n = parseFloat(value);
  return isNaN(n) ? 0 : n;
}

const statusConfig = (status) => {
  switch (status) {
    case 0: return { text: "Placed", color: "text-amber-300", bg: "bg-amber-500/20", border: "border-amber-500/30", icon: AlertCircle };
    case 1: return { text: "Accepted", color: "text-blue-300", bg: "bg-blue-500/20", border: "border-blue-500/30", icon: Clock };
    case 2: return { text: "Rejected", color: "text-red-300", bg: "bg-red-500/20", border: "border-red-500/30", icon: XCircle };
    case 3: return { text: "Ready", color: "text-purple-300", bg: "bg-purple-500/20", border: "border-purple-500/30", icon: ShoppingBag };
    case 4: return { text: "Delivered", color: "text-emerald-300", bg: "bg-emerald-500/20", border: "border-emerald-500/30", icon: CheckCircle };
    case 5: return { text: "Cancelled", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", icon: XCircle };
    default: return { text: "Unknown", color: "text-gray-400", bg: "bg-gray-500/20", border: "border-gray-500/30", icon: AlertCircle };
  }
};

const DeliveryOrderDetailsModal = ({ order, onClose, partners, onAssignPartner }) => {
  if (!order) return null;
  const items = order.items || [];
  const statusInfo = statusConfig(order.order_status);

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
          <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"><X size={24} /></button>
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
                <div className="flex justify-between items-center"><span className="text-white/50 text-sm">Status</span><span className={`font-bold ${statusInfo.color}`}>{statusInfo.text}</span></div>
              </div>
            </div>
          </div>

          {/* Delivery Partner Info Block */}
          <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 p-5 rounded-xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3">
              <h3 className="text-emerald-400 font-bold uppercase text-xs tracking-wider flex items-center gap-2">
                <Bike size={16} /> Assigned Delivery Partner
              </h3>
              {order.delivery_status && (
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase border ${
                  order.delivery_status === "delivered" ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" :
                  order.delivery_status === "out_for_delivery" ? "bg-purple-500/20 text-purple-300 border-purple-500/30" :
                  order.delivery_status === "accepted" ? "bg-blue-500/20 text-blue-300 border-blue-500/30" :
                  "bg-amber-500/20 text-amber-300 border-amber-500/30"
                }`}>
                  {order.delivery_status.replace(/_/g, " ")}
                </span>
              )}
            </div>

            {order.delivery_boy_name ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/60">Partner Name:</span>
                  <span className="text-white font-bold">{order.delivery_boy_name}</span>
                </div>
                {order.delivery_boy_phone && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/60">Phone:</span>
                    <span className="text-white font-mono">{order.delivery_boy_phone}</span>
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
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-amber-300/80 text-sm">No delivery partner assigned yet. Will appear when accepted on the app, or assign manually below:</p>
                {partners && partners.length > 0 && (
                  <div className="flex items-center gap-2">
                    <select
                      id="modalPartnerSelect"
                      className="bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none flex-1"
                      defaultValue=""
                    >
                      <option value="" disabled>Select delivery partner...</option>
                      {partners.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.mobile_number || p.email})</option>
                      ))}
                    </select>
                    <button
                      onClick={() => {
                        const sel = document.getElementById("modalPartnerSelect");
                        if (sel && sel.value) {
                          onAssignPartner(order.order_number, sel.value);
                        }
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors"
                    >
                      Assign
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {order.delivery_address && (
            <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl">
              <h3 className="text-blue-400 font-bold uppercase text-xs tracking-wider mb-3 flex items-center gap-2"><MapPin size={14} /> Delivery Address</h3>
              <p className="text-white text-sm leading-relaxed">{order.delivery_address}</p>
              {order.delivery_coords && (
                <p className="text-white/30 text-[10px] mt-2 flex items-center gap-1">
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

  // Load active delivery partners
  const loadPartners = async () => {
    try {
      const snap = await getDocs(collection(db, "delivery_partners"));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPartners(list.filter(p => p.status === 1));
    } catch (e) {
      console.log("Failed to load delivery partners:", e);
    }
  };

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

  // Manual assign partner from dashboard
  const handleAssignPartner = async (orderNumber, partnerId) => {
    const partner = partners.find(p => p.id === partnerId);
    if (!partner) return;
    try {
      const q = query(collection(db, "orders"), where("order_number", "==", orderNumber));
      const snap = await getDocs(q);
      if (snap.empty) return;
      const batch = writeBatch(db);
      snap.docs.forEach(docSnap => {
        batch.update(docSnap.ref, {
          assigned_delivery_boy_id: partner.id,
          delivery_boy_name: partner.name,
          delivery_boy_phone: partner.mobile_number || partner.phone || "",
          delivery_boy_email: partner.email || "",
          delivery_status: "accepted",
          accepted_at: new Date().toISOString()
        });
      });
      await batch.commit();
      await loadOrders();
      if (selectedOrder && selectedOrder.order_number === orderNumber) {
        setSelectedOrder(prev => ({
          ...prev,
          assigned_delivery_boy_id: partner.id,
          delivery_boy_name: partner.name,
          delivery_boy_phone: partner.mobile_number || partner.phone || "",
          delivery_status: "accepted"
        }));
      }
      showPopup({ title: "Assigned", message: `Order assigned to ${partner.name}`, type: "success" });
    } catch (e) {
      showPopup({ title: "Error", message: "Failed to assign partner", type: "error" });
    }
  };

  const formatDate = (iso) => {
    if (!iso) return "-";
    const d = new Date(iso);
    return isNaN(d) ? iso : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const groupedOrders = useMemo(() => {
    return orders.filter(order => {
      const matchesSearch = !searchOrder || String(order.order_number || "").toLowerCase().includes(searchOrder.toLowerCase());
      const matchesStatus = filterStatus === "all" || String(order.order_status) === String(filterStatus);
      const matchesPartner = filterPartner === "all"
        ? true
        : filterPartner === "unassigned"
        ? !order.assigned_delivery_boy_id
        : order.assigned_delivery_boy_id === filterPartner;

      let matchesDate = true;
      if (fromDate || toDate) {
        const orderDate = new Date(order.created_at);
        if (fromDate && orderDate < new Date(fromDate)) matchesDate = false;
        if (toDate && orderDate > new Date(toDate + "T23:59:59")) matchesDate = false;
      }
      return matchesSearch && matchesStatus && matchesPartner && matchesDate;
    });
  }, [orders, searchOrder, filterStatus, filterPartner, fromDate, toDate]);

  const totalPages = Math.ceil(groupedOrders.length / rowsPerPage) || 1;
  const currentOrders = groupedOrders.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

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
              <p className="text-white/70 mt-1 text-base">Live tracking of delivery orders and assigned delivery partners.</p>
            </div>
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
              <button onClick={loadOrders} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/80 hover:text-white" title="Refresh">
                <RefreshCw size={20} />
              </button>
            </div>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Total", value: groupedOrders.length, cls: "bg-emerald-500/20 border-emerald-500/30 text-emerald-300" },
              { label: "Unassigned", value: groupedOrders.filter(o => !o.assigned_delivery_boy_id && [0,1,3].includes(Number(o.order_status))).length, cls: "bg-amber-500/20 border-amber-500/30 text-amber-300" },
              { label: "Out for Delivery", value: groupedOrders.filter(o => o.delivery_status === "out_for_delivery" || Number(o.order_status) === 3).length, cls: "bg-purple-500/20 border-purple-500/30 text-purple-300" },
              { label: "Delivered", value: groupedOrders.filter(o => Number(o.order_status) === 4 || o.delivery_status === "delivered").length, cls: "bg-teal-500/20 border-teal-500/30 text-teal-300" },
            ].map(s => (
              <div key={s.label} className="rounded-2xl p-4 border backdrop-blur-xl bg-white/10 border-white/20 flex items-center gap-4">
                <div className={`px-3 py-1 rounded-lg border text-xs font-bold ${s.cls}`}>{s.label}</div>
                <span className="text-2xl font-black text-white">{s.value}</span>
              </div>
            ))}
          </div>

          {/* Filters */}
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
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 appearance-none">
                  <option value="all" className="bg-slate-800">All Status</option>
                  <option value="0" className="bg-slate-800">Placed</option>
                  <option value="1" className="bg-slate-800">Accepted</option>
                  <option value="2" className="bg-slate-800">Rejected</option>
                  <option value="3" className="bg-slate-800">Ready</option>
                  <option value="4" className="bg-slate-800">Delivered</option>
                  <option value="5" className="bg-slate-800">Cancelled</option>
                </select>
              </div>
              <div className="relative">
                <Bike className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={16} />
                <select value={filterPartner} onChange={e => setFilterPartner(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 appearance-none">
                  <option value="all" className="bg-slate-800">All Delivery Partners</option>
                  <option value="unassigned" className="bg-slate-800">⚠️ Unassigned Only</option>
                  {partners.map(p => (
                    <option key={p.id} value={p.id} className="bg-slate-800">{p.name}</option>
                  ))}
                </select>
              </div>
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
            </div>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-start">
            {currentOrders.length === 0 ? (
              <div className="col-span-full py-20 text-center">
                <Truck className="mx-auto text-white/20 mb-4" size={64} strokeWidth={1} />
                <h3 className="text-xl font-bold text-white/50">No delivery orders found</h3>
                <p className="text-white/30 mt-2">Delivery orders placed via the app will appear here</p>
              </div>
            ) : currentOrders.map((order, index) => {
              const items = order.items || [];
              const statusInfo = statusConfig(order.order_status);
              const StatusIcon = statusInfo.icon;
              const paidTotal = safeNumber(order.grand_total) || items.reduce((s, i) => s + safeNumber(i.price) * safeNumber(i.quantity), 0);
              const totalQty = items.reduce((s, i) => s + safeNumber(i.quantity), 0);
              return (
                <div key={index} className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden hover:bg-white/15 transition-all shadow-xl flex flex-col">
                  <div className="p-4 border-b border-white/10 flex justify-between items-start bg-black/10">
                    <div className="flex-1 min-w-0 mr-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-xl font-bold text-white truncate">{order.order_number}</h3>
                        <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">🛵 Delivery</span>
                        {autoRefresh && order.order_status === 0 && <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse shrink-0" />}
                      </div>
                      <div className="text-xs text-white/60 mt-1 flex items-center gap-2"><Calendar size={12} />{formatDate(order.created_at)}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${statusInfo.bg} ${statusInfo.color} ${statusInfo.border}`}>
                        <StatusIcon size={12} />{statusInfo.text}
                      </div>
                      <button onClick={() => setSelectedOrder(order)} className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-emerald-300 transition-colors" title="View Details">
                        <Eye size={20} />
                      </button>
                    </div>
                  </div>

                  {/* Delivery Partner Assigned Bar */}
                  <div className="px-4 py-2.5 bg-white/5 border-b border-white/10 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Bike size={14} className={order.delivery_boy_name ? "text-emerald-400" : "text-amber-400"} />
                      {order.delivery_boy_name ? (
                        <div>
                          <span className="font-semibold text-emerald-300">{order.delivery_boy_name}</span>
                          {order.delivery_boy_phone && <span className="text-white/40 ml-1.5 font-mono">({order.delivery_boy_phone})</span>}
                        </div>
                      ) : (
                        <span className="text-amber-300/90 font-medium">Unassigned</span>
                      )}
                    </div>

                    {!order.delivery_boy_name && partners.length > 0 && order.order_status !== 4 && order.order_status !== 2 && (
                      <select
                        onChange={(e) => {
                          if (e.target.value) handleAssignPartner(order.order_number, e.target.value);
                        }}
                        defaultValue=""
                        className="bg-slate-900 text-white/80 text-[11px] rounded-lg px-2 py-1 border border-white/20 focus:outline-none"
                      >
                        <option value="" disabled>Assign...</option>
                        {partners.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    )}

                    {order.delivery_status && (
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        order.delivery_status === "delivered" ? "bg-emerald-500/20 text-emerald-300" :
                        order.delivery_status === "out_for_delivery" ? "bg-purple-500/20 text-purple-300" :
                        "bg-teal-500/20 text-teal-300"
                      }`}>
                        {order.delivery_status.replace(/_/g, " ")}
                      </span>
                    )}
                  </div>

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

                  {order.delivery_address && (
                    <div className="px-4 py-3 bg-white/5 border-b border-white/10">
                      <div className="flex items-start gap-2 text-xs text-white/80">
                        <MapPin size={12} className="shrink-0 mt-0.5 text-emerald-400" />
                        <span className="line-clamp-2 leading-relaxed">{order.delivery_address}</span>
                      </div>
                    </div>
                  )}

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

                  <div className="p-4 pt-2">
                    <div className="flex justify-between items-end mb-4">
                      <div className="text-xs text-white/50">{totalQty} item{totalQty !== 1 ? "s" : ""}</div>
                      <div className="text-right">
                        <div className="text-xs text-white/60 uppercase tracking-wider font-bold">Total</div>
                        <div className="text-2xl font-bold text-white">£{paidTotal.toFixed(2)}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {order.order_status === 0 && (
                        <div className="grid grid-cols-2 gap-3">
                          <button onClick={() => { setOrderForReady(order.order_number); setIsReadyModalOpen(true); }} className="py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"><CheckCircle size={18} />Accept</button>
                          <button onClick={() => updateOrderStatus(order.order_number, 2)} className="py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"><XCircle size={18} />Reject</button>
                        </div>
                      )}
                      {order.order_status === 1 && (
                        <button onClick={() => updateOrderStatus(order.order_number, 3)} className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"><ShoppingBag size={18} />Mark Ready</button>
                      )}
                      {order.order_status === 3 && (
                        <button onClick={() => updateOrderStatus(order.order_number, 4)} className="w-full py-3 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"><Truck size={18} />Mark as Delivered</button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center items-center mt-8 gap-2">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">Previous</button>
              <div className="flex gap-1">
                {[...Array(totalPages).keys()].slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2)).map(num => (
                  <button key={num} onClick={() => setCurrentPage(num + 1)} className={`w-10 h-10 rounded-xl font-bold flex items-center justify-center transition-all ${currentPage === num + 1 ? "bg-emerald-500 text-white shadow-lg scale-110" : "bg-white/5 text-white/60 hover:bg-white/10"}`}>{num + 1}</button>
                ))}
              </div>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">Next</button>
            </div>
          )}
        </main>
        <Footer />
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
      </div>
    </div>
  );
}
