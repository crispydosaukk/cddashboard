import React, { useEffect, useState, useMemo } from "react";
import { useLocation } from "react-router-dom";
import Header from "../../components/common/header.jsx";
import Sidebar from "../../components/common/sidebar.jsx";
import Footer from "../../components/common/footer.jsx";

import ReadyInModal from "../../components/common/ReadyInModal.jsx";
import {
  Search, RefreshCw, Filter, Calendar, PoundSterling, User, Truck,
  MapPin, Phone, Car, Clock, CheckCircle, XCircle, AlertCircle, ShoppingBag, CreditCard, Eye, X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePopup } from "../../context/PopupContext";
import { db } from "../../firebase";
import { collection, getDocs, query, where, writeBatch } from "firebase/firestore";

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
    case 4: return { text: "Collected", color: "text-emerald-300", bg: "bg-emerald-500/20", border: "border-emerald-500/30", icon: CheckCircle };
    case 5: return { text: "Cancelled", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", icon: XCircle };
    default: return { text: "Unknown", color: "text-gray-400", bg: "bg-gray-500/20", border: "border-gray-500/30", icon: AlertCircle };
  }
};

const OrderDetailsModal = ({ order, onClose }) => {
  if (!order) return null;

  const items = order.items || [];
  const statusInfo = statusConfig(order.order_status);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-white/10 bg-white/5 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <ShoppingBag className="text-emerald-400" /> Order #{order.order_number}
              {order.order_source === 'Dashboard' && (
                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500 text-white text-[10px] font-black border border-white/20 shadow-lg" title="Dashboard Order">
                  D
                </div>
              )}
            </h2>
            <p className="text-white/50 text-sm mt-1">Placed on {new Date(order.created_at).toLocaleString()}</p>
          </div>
          <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">

          {/* Customer & Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/5 p-4 rounded-xl border border-white/5">
              <h3 className="text-emerald-400 font-bold uppercase text-xs tracking-wider mb-4 flex items-center gap-2">
                <User size={14} /> Customer Details
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-white/50 text-sm">Name</span>
                  <span className="text-white font-medium">{order.customer_name || "Guest"}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-white/50 text-sm">Phone</span>
                  <span className="text-white font-medium">{order.mobile_number || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50 text-sm">Email</span>
                  <span className="text-white font-medium">{order.customer_email || "-"}</span>
                </div>
              </div>
            </div>

            <div className="bg-white/5 p-4 rounded-xl border border-white/5">
              <h3 className="text-emerald-400 font-bold uppercase text-xs tracking-wider mb-4 flex items-center gap-2">
                <Truck size={14} /> Order Type & Status
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-white/50 text-sm">Type</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${order.instore === 1 ? "bg-blue-500/20 text-blue-300" : "bg-purple-500/20 text-purple-300"}`}>
                    {order.instore === 1 ? "INSTORE" : "KERBSIDE"}
                  </span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-white/50 text-sm">Payment</span>
                  <span className="text-white font-medium">{order.payment_mode === 0 ? "COD" : "Online"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/50 text-sm">Status</span>
                  <div className="text-right">
                    <span className={`font-bold ${statusInfo.color}`}>{statusInfo.text}</span>
                    {order.delivery_estimate_time && order.order_status === 1 && (
                      <p className="text-[10px] text-emerald-400 font-bold mt-0.5">
                        EST. READY: {new Date(order.delivery_estimate_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Kerbside Specifics */}
          {order.instore !== 1 && (
            <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl">
              <h3 className="text-amber-400 font-bold uppercase text-xs tracking-wider mb-4 flex items-center gap-2">
                <Car size={14} /> Kerbside Details
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-black/20 p-3 rounded-lg text-center">
                  <span className="block text-white/40 text-xs uppercase mb-1">Reg Number</span>
                  <span className="text-white text-lg font-bold">{order.reg_number || "-"}</span>
                </div>
                <div className="bg-black/20 p-3 rounded-lg text-center">
                  <span className="block text-white/40 text-xs uppercase mb-1">Car Color</span>
                  <span className="text-white text-lg font-bold">{order.car_color || "-"}</span>
                </div>
                <div className="bg-black/20 p-3 rounded-lg text-center">
                  <span className="block text-white/40 text-xs uppercase mb-1">Owner Name</span>
                  <span className="text-white text-lg font-bold">{order.owner_name || "-"}</span>
                </div>
              </div>
            </div>
          )}

          {/* Items Table */}
          <div>
            <h3 className="text-white font-bold mb-4 text-lg">Order Items</h3>
            <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
              <table className="w-full text-left">
                <thead className="bg-white/5 text-white/50 text-xs uppercase">
                  <tr>
                    <th className="p-4 font-medium">Quantity</th>
                    <th className="p-4 font-medium">Item Name</th>
                    <th className="p-4 font-medium text-right">Price</th>
                    <th className="p-4 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {items.map((item, i) => (
                    <tr key={i} className="hover:bg-white/5">
                      <td className="p-4">
                        <span className="text-2xl font-bold text-emerald-400">{safeNumber(item.quantity)}X</span>
                      </td>
                      <td className="p-4 text-white font-medium text-lg">
                        <div>
                          {item.product_name}
                          {item.special_instruction && (
                            <div className="mt-1 text-sm font-semibold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 w-fit">
                              <span className="uppercase text-[10px] opacity-70 mr-1">Note:</span>
                              {item.special_instruction}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-right text-white/60">
                        £{safeNumber(item.price).toFixed(2)}
                      </td>
                      <td className="p-4 text-right text-white font-bold">
                        £{(safeNumber(item.price) * safeNumber(item.quantity)).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-6 bg-white/5 border-t border-white/10 flex justify-between items-center">
          <div className="text-white/50 text-sm">
            Total Items: <span className="text-white font-bold">{items.length}</span>
          </div>
          <div className="text-3xl font-bold text-emerald-400">
            £{safeNumber(order.grand_total).toFixed(2)}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default function Orders() {
  const { showPopup } = usePopup();
  
  const userObj = JSON.parse(localStorage.getItem("user") || "{}");
  const localUserId = Number(userObj.id);
  const isSuperAdmin = Number(userObj.role_id) === 1;
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isReadyModalOpen, setIsReadyModalOpen] = useState(false);
  const [orderForReady, setOrderForReady] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 12;

  // Filters
  const [searchOrder, setSearchOrder] = useState("");
  const [filterPayment, setFilterPayment] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const location = useLocation();
  const [autoRefresh, setAutoRefresh] = useState(() => {
    return localStorage.getItem("orderAutoRefresh") === "true";
  });

  useEffect(() => {
    if (location.state?.highlightOrder) {
      setSearchOrder(location.state.highlightOrder);
    }
  }, [location.state]);

  useEffect(() => {
    localStorage.setItem("orderAutoRefresh", autoRefresh);
  }, [autoRefresh]);

  const refreshInterval = 30;

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const d = new Date(dateString);
    return d.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
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
      
      loadOrders();
    } catch (error) {
      console.error("Failed to update status", error);
      showPopup({
        title: "Update Failed",
        message: "Could not update order status. Please try again.",
        type: "error"
      });
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(() => {
        loadOrders();
      }, refreshInterval * 1000);
    }
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  const loadOrders = async () => {
    try {
      let q = collection(db, "orders");
      if (!isSuperAdmin && localUserId && !isNaN(localUserId)) {
        q = query(q, where("user_id", "in", [localUserId, String(localUserId)]));
      }
      const snapshot = await getDocs(q);
      const mapped = snapshot.docs.map(docSnap => {
        const o = docSnap.data();
        return {
          id: docSnap.id,
          ...o,
          created_at: o.created_at?.toDate ? o.created_at.toDate().toISOString() : o.created_at,
          delivery_estimate_time: o.delivery_estimate_time?.toDate ? o.delivery_estimate_time.toDate().toISOString() : o.delivery_estimate_time,
          restaurant_name: o.restaurant_name || o.restaurantName || o.restaurant || "-"
        };
      });

      const sorted = mapped.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));

      setOrders(prev => {
        if (JSON.stringify(prev) === JSON.stringify(sorted)) return prev;
        return sorted;
      });
    } catch (err) {
      console.error("Order fetch error:", err);
    }
  };



  // Apply Filters
  useEffect(() => {
    let data = [...orders];

    if (searchOrder.trim() !== "") {
      data = data.filter((o) =>
        (o.order_number || "").toLowerCase().includes(searchOrder.toLowerCase())
      );
    }

    if (filterPayment !== "all") {
      data = data.filter((o) =>
        filterPayment === "cod" ? o.payment_mode === 0 : o.payment_mode === 1
      );
    }

    if (filterStatus !== "all") {
      data = data.filter((o) => o.order_status?.toString() === filterStatus);
    }

    if (fromDate) {
      data = data.filter((o) => {
        const orderDate = new Date(o.created_at).setHours(0, 0, 0, 0);
        const from = new Date(fromDate).setHours(0, 0, 0, 0);
        return orderDate >= from;
      });
    }

    if (toDate) {
      data = data.filter((o) => {
        const orderDate = new Date(o.created_at).setHours(0, 0, 0, 0);
        const to = new Date(toDate).setHours(0, 0, 0, 0);
        return orderDate <= to;
      });
    }

    setFilteredOrders(prev => {
      if (JSON.stringify(prev) === JSON.stringify(data)) return prev;
      setCurrentPage(1);
      return data;
    });
  }, [searchOrder, filterPayment, filterStatus, fromDate, toDate, orders]);

  // Group by order_number
  const groupedOrders = useMemo(() => {
    const map = {};
    filteredOrders.forEach((o, idx) => {
      const key = o.order_number || `ORDER_${idx}`;
      if (!map[key]) {
        map[key] = {
          ...o,
          items: [],
        };
      }
      map[key].items.push(o);
    });
    return Object.values(map);
  }, [filteredOrders]);

  const totalPages = Math.ceil(groupedOrders.length / rowsPerPage) || 1;
  const indexOfLast = currentPage * rowsPerPage;
  const indexOfFirst = indexOfLast - rowsPerPage;
  const currentOrders = groupedOrders.slice(indexOfFirst, indexOfLast);

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-amber-900 via-teal-800 to-emerald-900 font-sans text-white">
      <Header onToggleSidebar={() => setSidebarOpen((s) => !s)} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <ReadyInModal
        isOpen={isReadyModalOpen}
        onClose={() => setIsReadyModalOpen(false)}
        onConfirm={(mins) => {
          if (orderForReady) {
            updateOrderStatus(orderForReady, 1, mins);
            setIsReadyModalOpen(false);
            setOrderForReady(null);
          }
        }}
        orderNumber={orderForReady}
      />

      <div className={`flex-1 flex flex-col pt-36 lg:pt-24 transition-all duration-300 ease-in-out ${sidebarOpen ? "lg:pl-72" : "lg:pl-0"}`}>
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8">

          {/* Top Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white drop-shadow-md flex items-center gap-3">
                <ShoppingBag className="text-emerald-400" />
                Order Management
              </h1>
              <p className="text-white/60 mt-1">Manage, track, and fulfill customer orders in real-time.</p>
            </div>

            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-2 rounded-xl border border-white/10">
              <label className="flex items-center gap-2 cursor-pointer px-2">
                <div className="relative">
                  <input type="checkbox" className="sr-only" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
                  <div className={`w-10 h-6 rounded-full shadow-inner transition-colors ${autoRefresh ? 'bg-emerald-500' : 'bg-white/20'}`}></div>
                  <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform shadow ${autoRefresh ? 'translate-x-full' : ''}`}></div>
                </div>
                <span className="text-sm font-medium">Auto-Refresh</span>
              </label>
              <div className="h-6 w-px bg-white/20"></div>
              <button
                onClick={loadOrders}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/80 hover:text-white"
                title="Refresh Now"
              >
                <RefreshCw size={20} />
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-4 rounded-2xl mb-8 shadow-xl">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={16} />
                <input
                  placeholder="Search Order No..."
                  value={searchOrder}
                  onChange={(e) => setSearchOrder(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>
              {/* Payment */}
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={16} />
                <select
                  value={filterPayment} onChange={(e) => setFilterPayment(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 appearance-none"
                >
                  <option value="all" className="bg-slate-800">All Payments</option>
                  {/* <option value="cod" className="bg-slate-800">COD</option> */}
                  <option value="online" className="bg-slate-800">Online</option>
                </select>
              </div>
              {/* Status */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={16} />
                <select
                  value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 appearance-none"
                >
                  <option value="all" className="bg-slate-800">All Status</option>
                  <option value="0" className="bg-slate-800">Placed</option>
                  <option value="1" className="bg-slate-800">Accepted</option>
                  <option value="2" className="bg-slate-800">Rejected</option>
                  <option value="3" className="bg-slate-800">Ready</option>
                  <option value="4" className="bg-slate-800">Collected</option>
                  <option value="5" className="bg-slate-800">Cancelled</option>
                </select>
              </div>
              {/* Dates */}
              <div className="relative">
                <input
                  type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>
              <div className="relative">
                <input
                  type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>
            </div>
          </div>

          {/* ORDERS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-start">
            {currentOrders.length === 0 ? (
              <div className="col-span-full py-20 text-center">
                <ShoppingBag className="mx-auto text-white/20 mb-4" size={64} strokeWidth={1} />
                <h3 className="text-xl font-bold text-white/50">No orders found</h3>
                <p className="text-white/30 mt-2">Try adjusting your filters</p>
              </div>
            ) : (
              currentOrders.map((order, index) => {
                const items = order.items || [];
                const statusInfo = statusConfig(order.order_status);
                const StatusIcon = statusInfo.icon;

                // Calcs
                const totalQty = items.reduce((sum, item) => sum + safeNumber(item.quantity), 0);
                const totalPrice = items.reduce((sum, item) => sum + safeNumber(item.price) * safeNumber(item.quantity), 0);
                const totalDiscount = items.reduce((sum, item) => sum + safeNumber(item.discount_amount), 0);
                const totalVat = items.reduce((sum, item) => sum + safeNumber(item.vat), 0);
                const lineTotal = totalPrice - totalDiscount + totalVat;
                const grossTotal = items.reduce((sum, item) => {
                  const g = safeNumber(item.gross_total);
                  return sum + (g > 0 ? g : 0);
                }, 0) || lineTotal;
                const walletUsed = items.reduce((sum, item) => sum + safeNumber(item.wallet_amount), 0);
                const loyaltyUsed = items.reduce((sum, item) => sum + safeNumber(item.loyalty_amount), 0);
                const paidTotal = items.reduce((sum, item) => sum + safeNumber(item.grand_total), 0) || Math.max(0, lineTotal - walletUsed);

                return (
                  <div
                    key={index}
                    className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden hover:bg-white/15 transition-all shadow-xl flex flex-col"
                  >
                    {/* Card Header with Status & View Eye */}
                    <div className="p-4 border-b border-white/10 flex justify-between items-start bg-black/10">
                      <div className="flex-1 min-w-0 mr-2">
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-bold text-white truncate">{order.order_number}</h3>
                          {autoRefresh && order.order_status === 0 && (
                            <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse shrink-0"></span>
                          )}
                          {order.order_source === 'Dashboard' && (
                            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 text-white text-[10px] font-black border border-white/20 shadow-lg" title="Dashboard Order">
                              D
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-white/60 mt-1 flex items-center gap-2">
                          <Calendar size={12} />
                          {formatDate(order.created_at)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex flex-col items-end gap-1">
                          <div className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${statusInfo.bg} ${statusInfo.color} ${statusInfo.border}`}>
                            <StatusIcon size={12} />
                            {statusInfo.text}
                          </div>
                          {order.delivery_estimate_time && order.order_status === 1 && (
                            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                              READY @ {new Date(order.delivery_estimate_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                        {/* EYE ICON TRIGGER */}
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-emerald-300 transition-colors"
                          title="View Details"
                        >
                          <Eye size={24} />
                        </button>
                      </div>
                    </div>

                    {/* Items Scroll Area - Larger Quantity */}
                    <div className="p-4 flex-1 max-h-48 overflow-y-auto custom-scrollbar border-b border-white/5 space-y-3">
                      {items.length === 0 ? <p className="text-white/40 italic">No items</p> : items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-sm">
                          <div className="flex gap-3 items-center flex-1">
                            {/* Quantity Enhancement */}
                            <span className="font-bold text-emerald-300 bg-emerald-500/20 px-2 py-1 rounded-lg text-lg min-w-[2.5rem] text-center border border-emerald-500/30">
                              {safeNumber(item.quantity)}x
                            </span>
                            <div className="flex flex-col">
                              <span className="text-white/90 font-medium">{item.product_name || "Unknown Item"}</span>
                              {item.special_instruction && (
                                <span className="text-xs font-semibold text-amber-300 mt-0.5 flex items-center gap-1">
                                  <span className="bg-amber-500/20 px-1 rounded text-[9px] uppercase tracking-wider border border-amber-500/30">Note</span>
                                  {item.special_instruction}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="text-white/60 ml-2 font-mono">£{safeNumber(item.price).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Order Details & Kerbside Grid */}
                    <div className="p-4 bg-white/5 space-y-3 text-sm">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 text-white/70">
                          <User size={14} className="text-white/40" />
                          <span className="truncate max-w-[120px]" title={order.customer_name}>{order.customer_name || "Guest"}</span>
                        </div>
                        <div className="flex items-center gap-2 text-white/70">
                          <Truck size={14} className="text-white/40" />
                          <span>{order.instore === 1 ? "Instore" : "Kerbside"}</span>
                        </div>
                      </div>

                      {order.instore !== 1 && (
                        <div className="pt-2 border-t border-white/10 grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-black/20 p-2 rounded border border-white/5">
                            <span className="block text-white/40 text-[10px] uppercase font-bold tracking-wider mb-0.5">Reg No.</span>
                            <span className="text-white font-bold">{order.reg_number || "-"}</span>
                          </div>
                          <div className="bg-black/20 p-2 rounded border border-white/5">
                            <span className="block text-white/40 text-[10px] uppercase font-bold tracking-wider mb-0.5">Color</span>
                            <span className="text-white font-bold">{order.car_color || "-"}</span>
                          </div>
                          <div className="bg-black/20 p-2 rounded border border-white/5 col-span-2">
                            <span className="block text-white/40 text-[10px] uppercase font-bold tracking-wider mb-0.5">Owner</span>
                            <span className="text-white font-bold">{order.owner_name || "-"}</span>
                          </div>
                        </div>
                      )}

                      {order.allergy_note && (
                        <div className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 p-2 rounded-lg flex items-start gap-2">
                          <AlertCircle size={14} className="shrink-0 mt-0.5" />
                          {order.allergy_note}
                        </div>
                      )}
                    </div>

                    {/* Totals & Actions */}
                    <div className="p-4 pt-2">
                      <div className="flex justify-between items-end mb-4">
                        <div className="text-xs text-white/50 space-y-0.5">
                          <div className="flex justify-between w-24"><span>Subtotal:</span> <span>£{grossTotal.toFixed(2)}</span></div>
                          {walletUsed > 0 && <div className="flex justify-between w-24 text-red-300"><span>Wallet:</span> <span>-£{walletUsed.toFixed(2)}</span></div>}
                          {loyaltyUsed > 0 && <div className="flex justify-between w-24 text-purple-300"><span>Loyalty:</span> <span>-£{loyaltyUsed.toFixed(2)}</span></div>}
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-white/60 uppercase tracking-wider font-bold">Total Paid</div>
                          <div className="text-2xl font-bold text-white drop-shadow-sm">£{paidTotal.toFixed(2)}</div>
                        </div>
                      </div>

                      {/* Action Buttons - DYNAMIC */}
                      <div className="grid grid-cols-1 gap-2">
                        {order.order_status === 0 && (
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              onClick={() => {
                                setOrderForReady(order.order_number);
                                setIsReadyModalOpen(true);
                              }}
                              className="py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                              <CheckCircle size={18} /> Accept
                            </button>
                            <button
                              onClick={() => updateOrderStatus(order.order_number, 2)}
                              className="py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-lg shadow-rose-900/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                              <XCircle size={18} /> Reject
                            </button>
                          </div>
                        )}

                        {order.order_status === 1 && (
                          <button
                            onClick={() => updateOrderStatus(order.order_number, 3)}
                            className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                          >
                            <ShoppingBag size={18} /> Mark as Ready
                          </button>
                        )}

                        {order.order_status === 3 && (
                          <button
                            onClick={() => updateOrderStatus(order.order_number, 4)}
                            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                          >
                            <CheckCircle size={18} /> Mark Collected
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center mt-8 gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>

              <div className="flex gap-1">
                {[...Array(totalPages).keys()].slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2)).map((num) => (
                  <button
                    key={num}
                    onClick={() => setCurrentPage(num + 1)}
                    className={`w-10 h-10 rounded-xl font-bold flex items-center justify-center transition-all ${currentPage === num + 1
                      ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-110"
                      : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                      }`}
                  >
                    {num + 1}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          )}

        </main>
        <Footer />

        {/* DETAILS MODAL */}
        <AnimatePresence>
          {selectedOrder && (
            <OrderDetailsModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}