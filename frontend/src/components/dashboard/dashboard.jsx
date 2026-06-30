import React, { useEffect, useState } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend
} from "recharts";
import { useNavigate } from "react-router-dom";
import {
  ShoppingBag, Users, Store, UserPlus, ArrowUp, ArrowRight, CheckCircle, Clock, Eye, X,
  Calendar, PoundSterling, TrendingUp, CreditCard, ChevronDown, Package,
  RotateCcw, AlertCircle, Box, Truck, XCircle, Plus, Phone, LayoutDashboard
} from "lucide-react";
import Header from "../common/header.jsx";
import Sidebar from "../common/sidebar.jsx";
import Footer from "../common/footer.jsx";
import ReadyInModal from "../common/ReadyInModal.jsx";
import DateTimeRangeModal from "../common/DateTimeRangeModal.jsx";

import { db } from "../../firebase.js";
import { collection, query, where, getDocs, addDoc, writeBatch } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";

// --- Components ---

const ChartCard = ({ title, subtitle, children, delay, className = "" }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay, duration: 0.4 }}
    className={`rounded-2xl p-6 shadow-xl border border-white/20 bg-white/10 backdrop-blur-xl flex flex-col ${className}`}
  >
    <div className="mb-6">
      <h3 className="text-lg font-bold text-white">{title}</h3>
      <p className="text-xs mt-1 text-white/60">{subtitle}</p>
    </div>
    <div className="flex-1 w-full min-h-[250px] relative">
      {children}
    </div>
  </motion.div>
);

const StatCard = ({ title, value, subtext, icon: Icon, colorClass, delay, onEyeClick, trend }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4 }}
    className="relative overflow-hidden rounded-2xl p-5 border border-white/20 bg-white/10 backdrop-blur-xl shadow-xl group hover:bg-white/15 transition-all duration-300 flex flex-col justify-between h-full min-h-[160px]"
  >
    <div className="relative z-10 flex justify-between items-start mb-2">
      <div className={`p-2.5 rounded-xl backdrop-blur-md inline-block ${colorClass}`}>
        <Icon size={20} className="text-white" />
      </div>
      {onEyeClick && (
        <button
          onClick={onEyeClick}
          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/20 text-white/40 hover:text-white transition-all border border-transparent hover:border-white/10"
        >
          <Eye size={18} />
        </button>
      )}
      {trend && (
        <div className="flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-lg text-emerald-300 text-[10px] font-bold border border-emerald-500/20">
          <TrendingUp size={10} /> {trend}
        </div>
      )}
    </div>

    <div className="relative z-10">
      <h3 className="text-3xl font-black text-white drop-shadow-md tracking-tight">{value}</h3>
      <div className="mt-2">
        <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest leading-none">{title}</p>
        <p className="text-[11px] font-medium text-white/60 mt-1">{subtext}</p>
      </div>
    </div>

    {/* Decorative Glow */}
    <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-colors" />
  </motion.div>
);

const MetricDetailsModal = ({ isOpen, onClose, title, items = [], type, onUpdateStatus, onReadyClick }) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleRowClick = (item) => {
    if (type === 'orders' || type === 'pending' || type === 'completed' || type === 'payments' || type === 'rejected' || type === 'complaints' || type === 'cancelled') {
      navigate('/orders', { state: { highlightOrder: item.order_number } });
    } else if (type === 'products' || type === 'stock' || type === 'deactive') {
      navigate('/product');
    } else if (type === 'customers') {
      navigate('/customerinfo');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#1a1c23] border border-white/10 rounded-3xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[85vh]"
      >
        <div className="bg-gradient-to-r from-emerald-900 to-teal-900 px-8 py-5 flex justify-between items-center border-b border-white/10">
          <div>
            <h3 className="text-xl font-black text-white flex items-center gap-3 uppercase tracking-wider">
              <Eye size={24} className="text-emerald-400" /> {title}
            </h3>
            <p className="text-xs text-white/50 mt-1 uppercase tracking-widest">{items.length} records found</p>
          </div>
          <button onClick={onClose} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-2xl text-white/70 hover:text-white transition-all border border-white/5">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-white/10 text-white/40 text-[10px] uppercase font-black tracking-widest border-b border-white/10">
                <tr>
                  {type === 'products' || type === 'stock' || type === 'deactive' ? (
                    <>
                      <th className="px-6 py-4">Product</th>
                      <th className="px-6 py-4">Price</th>
                      <th className="px-6 py-4 text-center">Status</th>
                    </>
                  ) : type === 'customers' ? (
                    <>
                      <th className="px-6 py-4">Customer</th>
                      <th className="px-6 py-4">Email/Phone</th>
                    </>
                  ) : (
                    <>
                      <th className="px-6 py-4">Order Info</th>
                      <th className="px-6 py-4">Customer</th>
                      <th className="px-6 py-4">Amount</th>
                      <th className="px-6 py-4 text-center">Status</th>
                      <th className="px-6 py-4 text-center">Actions</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {items.length > 0 ? items.map((item, idx) => (
                  <tr
                    key={idx}
                    onClick={() => handleRowClick(item)}
                    className="hover:bg-white/[0.07] transition-all cursor-pointer group"
                  >
                    {type === 'products' || type === 'stock' || type === 'deactive' ? (
                      <>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-white/10 overflow-hidden shrink-0 border border-white/10">
                              {item.image ? (
                                <img
                                  src={`${(import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/api\/?$/, '')}/uploads/${item.image.replace(/^uploads\//, '')}`}
                                  alt=""
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                />
                              ) : (
                                <ShoppingBag size={16} className="m-auto text-white/20 h-full" />
                              )}
                            </div>
                            <span className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">{item.name || item.product_name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-emerald-400 font-black text-sm">£{Number(item.price || item.product_price || 0).toFixed(2)}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${Number(item.status || item.product_status) === 1 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                            {Number(item.status || item.product_status) === 1 ? 'In Stock' : 'Out of Stock'}
                          </span>
                        </td>
                      </>
                    ) : type === 'customers' ? (
                      <>
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">{item.full_name || item.customer_name || 'Guest'}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-white/70">{item.email || item.customer_email || 'No email'}</p>
                          <p className="text-[10px] text-white/40 mt-0.5">{item.mobile_number || item.customer_phone || 'No phone'}</p>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4 font-bold text-white">
                          <div className="flex items-center gap-2">
                            <span className="text-sm group-hover:text-emerald-400 transition-colors">#{item.order_number}</span>
                            {item.order_source === 'Dashboard' && (
                              <div className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 text-white text-[9px] font-black border border-white/10" title="Dashboard Order">
                                D
                              </div>
                            )}
                          </div>
                          <span className="block text-[10px] font-medium text-white/40 mt-1">
                            {new Date(item.created_at).toLocaleDateString()} at {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-white/70 text-sm font-medium">{item.customer_name || 'Guest'}</td>
                        <td className="px-6 py-4 text-emerald-400 font-black text-sm">£{Number(item.grand_total).toFixed(2)}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${Number(item.order_status) === 4 ? "bg-emerald-500/20 text-emerald-400" :
                            Number(item.order_status) === 0 ? "bg-blue-500/20 text-blue-400" :
                              Number(item.order_status) === 2 ? "bg-red-500/20 text-red-400" :
                                "bg-amber-500/20 text-amber-400"
                            }`}>
                            {Number(item.order_status) === 0 ? 'Placed' :
                              Number(item.order_status) === 1 ? 'Accepted' :
                                Number(item.order_status) === 2 ? 'Rejected' :
                                  Number(item.order_status) === 3 ? 'Ready' :
                                    Number(item.order_status) === 4 ? 'Collected' : 'Cancelled'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                            {Number(item.order_status) === 0 && (
                              <>
                                <button
                                  onClick={() => onReadyClick(item.order_number)}
                                  className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-400 rounded-lg transition-all flex items-center gap-1.5 border border-emerald-500/20"
                                  title="Accept"
                                >
                                  <CheckCircle size={14} />
                                  <span className="text-[10px] font-black uppercase tracking-wider">Accept</span>
                                </button>
                                <button
                                  onClick={() => onUpdateStatus(item.order_number, 2)}
                                  className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/40 text-rose-400 rounded-lg transition-all flex items-center gap-1.5 border border-rose-500/20"
                                  title="Reject"
                                >
                                  <XCircle size={14} />
                                  <span className="text-[10px] font-black uppercase tracking-wider">Reject</span>
                                </button>
                              </>
                            )}
                            {Number(item.order_status) === 1 && (
                              <button
                                onClick={() => onUpdateStatus(item.order_number, 3)}
                                className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/40 text-purple-400 rounded-lg transition-all flex items-center gap-1.5 border border-purple-500/20"
                                title="Mark as Ready"
                              >
                                <ShoppingBag size={14} />
                                <span className="text-[10px] font-black uppercase tracking-wider">Ready</span>
                              </button>
                            )}
                            {Number(item.order_status) === 3 && (
                              <button
                                onClick={() => onUpdateStatus(item.order_number, 4)}
                                className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-400 rounded-lg transition-all flex items-center gap-1.5 border border-emerald-500/20"
                                title="Mark Collected"
                              >
                                <CheckCircle size={14} />
                                <span className="text-[10px] font-black uppercase tracking-wider">Collected</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center opacity-20">
                        <ShoppingBag size={48} className="mb-4" />
                        <p className="text-lg font-black uppercase tracking-widest">No Records Found</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white/5 p-6 border-t border-white/10 flex justify-between items-center sm:px-8">
          <p className="text-[10px] text-white/30 uppercase font-black tracking-widest">Click any row to manage</p>
          <button onClick={onClose} className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl transition-all font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-900/40 active:scale-95">
            Close Details
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const OrderDetailsModal = ({ order, onClose, onUpdateStatus, onReadyClick }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (order?.order_number) {
      const fetchOrderItems = async () => {
         try {
           const q = query(collection(db, "orders"), where("order_number", "==", order.order_number));
           const snap = await getDocs(q);
           const fetchedItems = snap.docs.map(doc => doc.data());
           
           // Handle case where items are an array inside one doc
           let allItems = [];
           for (const item of fetchedItems) {
               if (item.items && Array.isArray(item.items)) {
                   allItems.push(...item.items);
               } else if (item.items && typeof item.items === 'string') {
                   try { allItems.push(...JSON.parse(item.items)); } catch(e){}
               } else {
                   // Or items are the document itself if it's 1-row-per-item
                   allItems.push(item);
               }
           }
           setItems(allItems);
         } catch (err) { 
           console.error("Failed to load items", err); 
         } finally { 
           setLoading(false); 
         }
      };
      fetchOrderItems();
    }
  }, [order]);

  if (!order) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#1a1c23] border border-white/10 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="bg-gradient-to-r from-emerald-900 to-teal-900 px-6 py-4 flex justify-between items-center border-b border-white/10 shrink-0">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <ShoppingBag size={20} /> Order #{order.order_number}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Customer Info */}
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <h4 className="text-emerald-400 text-sm font-bold uppercase mb-3 flex items-center gap-2">
                <Users size={14} /> Customer Details
              </h4>
              <div className="space-y-2">
                <p className="text-white font-medium text-lg">{order.customer_name || "Guest"}</p>
                <div className="flex items-center gap-2 text-white/60 text-sm">
                  <Clock size={14} />
                  <span>{order.customer_email || "No Email"}</span>
                </div>
                <div className="flex items-center gap-2 text-white/60 text-sm">
                  <Clock size={14} />
                  <span>{order.customer_phone || "No Phone"}</span>
                </div>
              </div>
            </div>

            {/* Order Info */}
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <h4 className="text-emerald-400 text-sm font-bold uppercase mb-3 flex items-center gap-2">
                <CreditCard size={14} /> Payment & Status
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-white/60 text-sm">Amount</span>
                  <span className="text-white font-bold text-lg">{order.grand_total ? `£${Number(order.grand_total).toFixed(2)}` : '£0.00'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/60 text-sm">Status</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${Number(order.order_status) === 4 ? "bg-emerald-500/20 text-emerald-400" :
                    Number(order.order_status) === 0 ? "bg-blue-500/20 text-blue-400" :
                      Number(order.order_status) === 2 ? "bg-red-500/20 text-red-400" :
                        "bg-amber-500/20 text-amber-400"
                    }`}>
                    {Number(order.order_status) === 0 ? 'Placed' :
                      Number(order.order_status) === 1 ? 'Accepted' :
                        Number(order.order_status) === 2 ? 'Rejected' :
                          Number(order.order_status) === 3 ? 'Ready' :
                            Number(order.order_status) === 4 ? 'Collected' : 'Cancelled'}
                  </span>
                </div>
                <div className="text-xs text-white/40 mt-2">
                  Placed on {new Date(order.created_at).toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Product List */}
          <div>
            <h4 className="text-white font-bold mb-3 flex items-center gap-2">
              <ShoppingBag size={16} className="text-emerald-400" /> Order Items
            </h4>
            <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
              {loading ? (
                <div className="p-8 text-center text-white/40">Loading items...</div>
              ) : items.length === 0 ? (
                <div className="p-8 text-center text-white/40">No items found</div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/5 text-white/50 border-b border-white/10">
                    <tr>
                      <th className="px-4 py-3 font-medium">Product</th>
                      <th className="px-4 py-3 font-medium text-center">Qty</th>
                      <th className="px-4 py-3 font-medium text-right">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-3 text-white flex items-center gap-3">
                          {/* Optional Image */}
                          <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center text-xs overflow-hidden">
                            {item.product_image ? (
                              <img
                                src={`${(import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/api\/?$/, '')}/uploads/${item.product_image}`}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <ShoppingBag size={12} className="opacity-50" />
                            )}
                          </div>
                          <div>
                            <span className="block font-medium">{item.product_name}</span>
                            {item.special_instruction && (
                              <div className="mt-1 text-xs font-semibold text-amber-300 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20 inline-flex items-center gap-1">
                                <span className="uppercase text-[10px] tracking-wider opacity-70">Note:</span>
                                {item.special_instruction}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-white/70 text-center">x{item.quantity}</td>
                        <td className="px-4 py-3 text-emerald-300 font-medium text-right">£{Number(item.price).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-white/5 border-t border-white/10">
                    <tr>
                      <td colSpan="2" className="px-4 py-3 text-right font-bold text-white">Total</td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-400">£{Number(order.grand_total).toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white/5 p-4 border-t border-white/10 flex justify-between items-center shrink-0">
          <div className="flex gap-2">
            {Number(order.order_status) === 0 && (
              <>
                <button
                  onClick={() => onReadyClick(order.order_number)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors font-bold text-sm flex items-center gap-2 shadow-lg shadow-emerald-900/30"
                >
                  <CheckCircle size={16} /> Accept
                </button>
                <button
                  onClick={() => onUpdateStatus(order.order_number, 2)}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors font-bold text-sm flex items-center gap-2 shadow-lg shadow-rose-900/30"
                >
                  <XCircle size={16} /> Reject
                </button>
              </>
            )}
            {Number(order.order_status) === 1 && (
              <button
                onClick={() => onUpdateStatus(order.order_number, 3)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors font-bold text-sm flex items-center gap-2"
              >
                <ShoppingBag size={16} /> Mark as Ready
              </button>
            )}
            {Number(order.order_status) === 3 && (
              <button
                onClick={() => onUpdateStatus(order.order_number, 4)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors font-bold text-sm flex items-center gap-2"
              >
                <CheckCircle size={16} /> Mark Collected
              </button>
            )}
          </div>
          <button onClick={onClose} className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors font-medium">
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const ProductDetailsModal = ({ product, onClose }) => {
  if (!product) return null;

  const getImageUrl = (image) => {
    if (!image) return null;
    const cleanImage = image.replace(/^uploads\//, '');
    const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/api\/?$/, '');
    return `${baseUrl}/uploads/${cleanImage}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#1a1c23] border border-white/10 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col"
      >
        <div className="relative h-56 w-full bg-white/5">
          {product.image ? (
            <img
              src={getImageUrl(product.image)}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/20">
              <ShoppingBag size={48} />
            </div>
          )}
          <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors">
            <X size={20} />
          </button>
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 pt-12">
            <h3 className="text-2xl font-bold text-white shadow-sm">{product.name}</h3>
            <p className="text-emerald-300 font-medium text-sm mt-1">{product.category_name || "Uncategorized"}</p>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between bg-white/5 rounded-xl p-4 border border-white/10">
            <div>
              <span className="text-white/60 text-xs block mb-1">Price</span>
              <span className="text-2xl font-bold text-white">£{Number(product.price).toFixed(2)}</span>
            </div>
            <div className="text-right">
              <span className="text-white/60 text-xs block mb-1">Total Sales</span>
              <span className="text-xl font-bold text-emerald-400">{product.count} <span className="text-sm font-normal text-white/60">units</span></span>
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <h4 className="text-white/60 text-xs font-bold uppercase mb-2 flex items-center gap-2">
              <Clock size={12} /> Description
            </h4>
            <p className="text-white/80 text-sm leading-relaxed">
              {product.description || "No description available for this product."}
            </p>
          </div>
        </div>

        <div className="bg-white/5 p-4 border-t border-white/10 flex justify-end">
          <button onClick={onClose} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors font-bold shadow-lg shadow-emerald-500/20">
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};


const NewOrderModal = ({ isOpen, onClose, onOrderPlaced, initialUserId, restaurants, isSuperAdmin }) => {
  const [step, setStep] = useState(1); // 1: Customer/Restaurant, 2: Items
  const [localUserId, setLocalUserId] = useState(initialUserId || "");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successOrderNumber, setSuccessOrderNumber] = useState("");
  const [isLoyaltyApplied, setIsLoyaltyApplied] = useState(false);
  const [loyaltyValue, setLoyaltyValue] = useState(0);

  useEffect(() => {
    if (isOpen) {
      resetModal();
      if (initialUserId) {
        setLocalUserId(initialUserId);
      }
    }
  }, [isOpen, initialUserId]);

  useEffect(() => {
    if (isLoyaltyApplied && customer) {
      const points = Number(customer.loyalty_points || 0);
      const redeemPoints = Number(customer.loyalty_redeem_points || 10);
      const redeemValue = Number(customer.loyalty_redeem_value || 1);

      const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
      const maxPointsValue = Math.floor(points / redeemPoints) * redeemValue;

      const applyValue = Math.min(maxPointsValue, cartTotal);
      setLoyaltyValue(applyValue);
    } else {
      setLoyaltyValue(0);
    }
  }, [cart, isLoyaltyApplied, customer]);

  useEffect(() => {
    if (localUserId) {
      fetchCategories();
    } else {
      setCategories([]);
    }
  }, [localUserId]);

  const resetModal = () => {
    setStep(1);
    setIsSuccess(false);
    setPhoneNumber("");
    setCustomer(null);
    setCart([]);
    setError("");
    setSelectedCategory("");
    setSearchTerm("");
    setSuccessOrderNumber("");
    setIsLoyaltyApplied(false);
    setLoyaltyValue(0);
  };

  const fetchCategories = async () => {
    try {
      if (!localUserId) return;
      setLoadingItems(true);
      
      const q = query(collection(db, "categories"), where("user_id", "==", Number(localUserId)));
      const querySnapshot = await getDocs(q);
      const cats = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      setCategories(cats);
      if (cats.length > 0 && !selectedCategory) {
        setSelectedCategory(cats[0].id);
        fetchProductsForCategory(cats[0].id);
      }
    } catch (err) {
      console.error("Failed to fetch categories from Firebase", err);
    } finally {
      setLoadingItems(false);
    }
  };

  const fetchProductsForCategory = async (catId) => {
    try {
      if (!localUserId) return;
      setLoadingItems(true);
      
      const q = query(
        collection(db, "menu_items"), 
        where("category_id", "==", Number(catId)),
        where("user_id", "==", Number(localUserId))
      );
      const querySnapshot = await getDocs(q);
      const prods = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      setProducts(prods);
    } catch (err) {
      console.error("Failed to fetch products from Firebase", err);
    } finally {
      setLoadingItems(false);
    }
  };

  const searchCustomer = async () => {
    if (isSuperAdmin && !localUserId) {
      setError("Please select a restaurant first.");
      return;
    }
    if (!phoneNumber) return;
    setLoading(true);
    setError("");
    try {
      const q = query(collection(db, "customers"), where("mobile_number", "==", phoneNumber));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setCustomer({ id: snap.docs[0].id, ...snap.docs[0].data() });
        setStep(2);
      } else {
        setError("Customer not found with this phone number.");
      }
    } catch (err) {
      setError("Failed to search customer.");
    } finally {
      setLoading(false);
    }
  };

  const toggleLoyalty = () => {
    setIsLoyaltyApplied(!isLoyaltyApplied);
  };

  const addToCart = (prod, qty = 1) => {
    const existing = cart.find(item => item.product_id === prod.id);
    if (existing) {
      setCart(cart.map(item =>
        item.product_id === prod.id
          ? { ...item, quantity: item.quantity + qty }
          : item
      ));
    } else {
      setCart([...cart, {
        product_id: prod.id,
        product_name: prod.name,
        price: prod.price,
        quantity: qty,
        discount_amount: 0,
        vat: 0
      }]);
    }
  };

  const updateQuantity = (productId, delta) => {
    setCart(cart.map(item => {
      if (item.product_id === productId) {
        const newQty = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (pid) => {
    setCart(cart.filter(item => item.product_id !== pid));
  };

  const placeOrder = async () => {
    if (cart.length === 0) return;
    setLoading(true);
    try {
      const orderNumber = "ORD" + Date.now().toString().slice(-6);
      
      const orderDoc = {
        order_number: orderNumber,
        customer_id: customer.id,
        payment_mode: 0, // COD
        instore: 1, // Default to Instore for Dashboard orders
        items: cart,
        order_source: 'Dashboard',
        user_id: localUserId, // Ensure order is linked to correct restaurant
        loyalty_used: loyaltyValue,
        order_status: 0,
        created_at: new Date().toISOString(),
        grand_total: cart.reduce((acc, c) => acc + (c.price * c.quantity), 0) - loyaltyValue,
        customer_name: customer.full_name || customer.customer_name || ""
      };
      
      await addDoc(collection(db, "orders"), orderDoc);

      setIsSuccess(true);
      setSuccessOrderNumber(orderNumber);
      onOrderPlaced();
    } catch (err) {
      setError("Error placing order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-md z-[110] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#1a1c23] border border-white/10 rounded-3xl shadow-2xl max-w-5xl w-full overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="bg-gradient-to-r from-emerald-900 to-teal-900 px-8 py-5 flex justify-between items-center border-b border-white/10">
          <h3 className="text-xl font-black text-white flex items-center gap-3 uppercase tracking-wider">
            <Plus size={24} className="text-emerald-400" /> New Order
          </h3>
          <button onClick={onClose} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-2xl text-white/70 hover:text-white transition-all">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 overflow-y-auto custom-scrollbar flex-1 min-h-0">
          {isSuccess ? (
            <div className="flex flex-col items-center justify-center py-12 text-center h-full">
              <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6 border border-emerald-500/30 text-emerald-400">
                <CheckCircle size={64} />
              </div>
              <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-wider">Order Placed!</h2>
              <p className="text-white/50 mb-8 max-w-sm">
                Order <span className="text-emerald-400 font-bold">#{successOrderNumber}</span> has been successfully created and sent to the kitchen.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={resetModal}
                  className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold transition-all border border-white/10"
                >
                  Create Another
                </button>
                <button
                  onClick={onClose}
                  className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold transition-all shadow-xl shadow-emerald-900/40"
                >
                  Close Manager
                </button>
              </div>
            </div>
          ) : step === 1 ? (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-500/30 text-emerald-400">
                  <UserPlus size={32} />
                </div>
                <h4 className="text-white font-bold text-xl">Order Initialization</h4>
                <p className="text-white/50 text-sm mt-1">Select restaurant and customer</p>
              </div>

              {isSuperAdmin && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Select Restaurant</label>
                  <div className="relative">
                    <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                    <select
                      value={localUserId}
                      onChange={(e) => {
                        setLocalUserId(e.target.value);
                        if (error) setError("");
                      }}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-10 py-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 appearance-none text-lg font-medium"
                    >
                      <option value="" className="bg-slate-900">Choose Restaurant...</option>
                      {restaurants.map(r => (
                        <option key={r.user_id} value={r.user_id} className="bg-slate-900">{r.restaurant_name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" size={20} />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Customer Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={20} />
                  <input
                    type="text"
                    placeholder="Enter Mobile Number..."
                    value={phoneNumber}
                    onChange={(e) => {
                      setPhoneNumber(e.target.value);
                      if (error) setError("");
                    }}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-lg font-medium"
                  />
                </div>
              </div>

              {error && <p className="text-rose-400 text-sm font-medium bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">{error}</p>}

              <button
                onClick={searchCustomer}
                disabled={loading || !phoneNumber}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-900/40"
              >
                {loading ? "Searching..." : "Find Customer"}
              </button>
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row gap-6 h-full">
              {/* Menu Column */}
              <div className="flex-1 flex flex-col min-h-0 min-w-0">
                {/* Search & Header */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="relative flex-1">
                    <ShoppingBag className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                    <input
                      type="text"
                      placeholder="Search items..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                  <div className="flex items-center gap-3 px-4 py-2 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                    <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center font-bold text-white shadow-lg">
                      {customer?.full_name?.charAt(0) || "G"}
                    </div>
                    <div>
                      <h5 className="text-white text-xs font-bold truncate max-w-[100px]">{customer?.full_name || "Guest"}</h5>
                      <button onClick={() => setStep(1)} className="text-[10px] text-emerald-400 font-bold hover:underline uppercase tracking-widest">Change</button>
                    </div>
                  </div>
                </div>

                {/* Categories Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar mb-4">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setSelectedCategory(cat.id);
                        fetchProductsForCategory(cat.id);
                      }}
                      className={`px-5 py-2.5 rounded-xl whitespace-nowrap font-bold text-xs uppercase tracking-widest transition-all border ${selectedCategory === cat.id
                        ? "bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-900/40"
                        : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:text-white"
                        }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>

                {/* Products Grid */}
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-[300px]">
                  {loadingItems ? (
                    <div className="flex flex-col items-center justify-center py-20 text-white/20">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500 mb-4" />
                      <p className="font-bold uppercase tracking-widest text-xs">Loading items...</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                      {products
                        .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
                        .map((p) => {
                          const inCart = cart.find(c => c.product_id === p.id);
                          return (
                            <motion.div
                              layout
                              key={p.id}
                              className={`group relative bg-white/5 border rounded-2xl p-4 transition-all cursor-pointer hover:bg-white/10 ${inCart ? "border-emerald-500/50 bg-emerald-500/5 shadow-lg shadow-emerald-900/20" : "border-white/10"
                                }`}
                              onClick={() => addToCart(p)}
                            >
                              <div className="flex gap-3">
                                <div className="w-16 h-16 rounded-xl bg-white/5 overflow-hidden flex-shrink-0 border border-white/10 group-hover:border-white/20 transition-all">
                                  {p.image ? (
                                    <img src={p.image} alt={p.name} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                  ) : (
                                    <ShoppingBag size={24} className="m-auto mt-4 text-white/10" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h6 className="text-white font-bold text-sm truncate group-hover:text-emerald-400 transition-colors">{p.name}</h6>
                                  <p className="text-emerald-400 font-black text-sm mt-1">£{Number(p.price).toFixed(2)}</p>
                                  {inCart && (
                                    <div className="mt-2 flex items-center justify-between">
                                      <div className="flex items-center gap-2 bg-emerald-500/20 px-2 py-1 rounded-lg">
                                        <button
                                          onClick={(e) => { e.stopPropagation(); updateQuantity(p.id, -1); }}
                                          className="text-emerald-400 hover:text-white"
                                        >-</button>
                                        <span className="text-white text-xs font-bold">{inCart.quantity}</span>
                                        <button
                                          onClick={(e) => { e.stopPropagation(); updateQuantity(p.id, 1); }}
                                          className="text-emerald-400 hover:text-white"
                                        >+</button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                    </div>
                  )}
                  {!loadingItems && products.length === 0 && (
                    <div className="text-center py-20 text-white/20">
                      <ShoppingBag size={48} className="mx-auto mb-4" />
                      <p className="font-bold uppercase tracking-widest text-xs">No products in this category</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Cart Column */}
              <div className="w-full lg:w-80 flex flex-col bg-white/5 rounded-3xl border border-white/10 overflow-hidden shrink-0">
                <div className="p-5 border-b border-white/10 bg-white/5">
                  <h6 className="text-white font-black text-xs uppercase tracking-widest flex items-center gap-2">
                    <ShoppingBag size={14} className="text-emerald-400" /> Cart Summary
                  </h6>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3 min-h-[200px] max-h-[300px] lg:max-h-none">
                  {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-white/20">
                      <ShoppingBag size={32} className="mb-2" />
                      <p className="text-[10px] font-bold uppercase tracking-widest">Cart is empty</p>
                    </div>
                  ) : (
                    cart.map((item) => (
                      <div key={item.product_id} className="flex justify-between items-center group">
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-xs font-bold truncate pr-2">{item.product_name}</p>
                          <p className="text-white/40 text-[10px]">£{Number(item.price).toFixed(2)} x {item.quantity}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-emerald-400 font-bold text-xs">£{(item.price * item.quantity).toFixed(2)}</span>
                          <button onClick={() => updateQuantity(item.product_id, -100)} className="text-white/20 hover:text-rose-400 transition-colors">
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-5 bg-white/5 border-t border-white/10 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Subtotal</span>
                    <span className="text-white text-sm font-bold">
                      £{cart.reduce((s, i) => s + i.price * i.quantity, 0).toFixed(2)}
                    </span>
                  </div>

                  {customer && (
                    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 space-y-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest leading-none">Loyalty Credits</p>
                          <p className="text-[9px] text-white/40 mt-1">{customer.loyalty_points || 0} points available</p>
                        </div>
                        {Number(customer.loyalty_points) >= (Number(customer.loyalty_redeem_points) || 10) ? (
                          <button
                            onClick={toggleLoyalty}
                            className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${isLoyaltyApplied
                              ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                              : "bg-emerald-500 text-white shadow-lg shadow-emerald-900/40"
                              }`}
                          >
                            {isLoyaltyApplied ? "Remove" : "Claim"}
                          </button>
                        ) : (
                          <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest border border-white/5 px-2 py-1 rounded-lg">Insufficient</span>
                        )}
                      </div>
                      {isLoyaltyApplied && (
                        <div className="flex justify-between items-center pt-2 border-t border-white/5">
                          <span className="text-rose-400 text-[10px] font-bold uppercase">Discount</span>
                          <span className="text-rose-400 text-xs font-black">-£{Number(loyaltyValue).toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2">
                    <span className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Total Amount</span>
                    <span className="text-emerald-400 text-xl font-black">
                      £{(cart.reduce((s, i) => s + i.price * i.quantity, 0) - loyaltyValue).toFixed(2)}
                    </span>
                  </div>
                  {error && <p className="text-rose-400 text-[10px] font-bold bg-rose-500/10 p-2 rounded-lg border border-rose-500/20 text-center">{error}</p>}
                  <button
                    onClick={placeOrder}
                    disabled={cart.length === 0 || loading}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-900/40 active:scale-95"
                  >
                    {loading ? "Placing..." : "Confirm Order"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div >
  );
};


// --- Main Dashboard ---

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [stats, setStats] = useState({
    total_bookings: 0,
    total_revenue: 0,
    today_users: 0,
    followers: 0,
    sales_comparison: [],
    avg_order_cost: [],
    weekly_orders: [],
    top_selling_products: [],
    recent_orders: [],
    restaurant_name: "",
    is_super_admin: false,
    pending_orders: 0,
    complaint_requests: 0,
    cancelled_orders: 0,
    yet_to_receive_payments: 0,
    deactive_products: 0,
    total_products: 0,
    completed_orders: 0,
    restaurant_performance: [],
  });
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [detailModal, setDetailModal] = useState({ isOpen: false, title: "", items: [], type: "" });
  const [isReadyModalOpen, setIsReadyModalOpen] = useState(false);
  const [orderForReady, setOrderForReady] = useState(null);
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [isDateTimeFilterModalOpen, setIsDateTimeFilterModalOpen] = useState(false);

  // Restaurant Filter State (Super Admin)
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(""); // "" means All
  const [showRestaurantMenu, setShowRestaurantMenu] = useState(false);

  // Date Range State
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
    label: 'Today'
  });
  const [showRangeMenu, setShowRangeMenu] = useState(false);
  const [customRange, setCustomRange] = useState({ start: "", end: "" });
  const [isCustomMode, setIsCustomMode] = useState(false);

  const ordersPerPage = 10;

  useEffect(() => {
    fetchStats();
  }, [dateRange, selectedRestaurant]); // Refetch when range or restaurant changes

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const snap = await getDocs(collection(db, "restaurant"));
        if (!snap.empty) {
           setRestaurants(snap.docs.map(docSnap => ({
              user_id: docSnap.id, 
              restaurant_name: docSnap.data().name || docSnap.data().restaurant_name || "Restaurant"
           })));
        }
      } catch (err) {
        console.error("Failed to fetch restaurants:", err);
      }
    };
    fetchRestaurants();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);

      const startDateStr = dateRange.start;
      const endDateStr = dateRange.end;
      
      let ordersQuery = collection(db, "orders");
      if (selectedRestaurant && selectedRestaurant !== "all") {
        ordersQuery = query(collection(db, "orders"), where("user_id", "==", selectedRestaurant));
      }
      
      const [ordersSnap, productsSnap] = await Promise.all([
         getDocs(ordersQuery),
         getDocs(collection(db, "products"))
      ]);
      
      const rawOrders = ordersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const products = productsSnap.docs.map(doc => doc.data());

      const grouped = {};
      for (const o of rawOrders) {
         if (!grouped[o.order_number]) {
           grouped[o.order_number] = {
             order_number: o.order_number,
             customer_id: o.customer_id,
             grand_total: 0,
             order_status: o.order_status,
             created_at: o.created_at?.toDate ? o.created_at.toDate().toISOString() : o.created_at,
             payment_mode: o.payment_mode
           };
         }
         grouped[o.order_number].grand_total += Number(o.grand_total || 0);
         grouped[o.order_number].order_status = Math.max(grouped[o.order_number].order_status, Number(o.order_status));
      }
      
      const allUniqueOrders = Object.values(grouped).sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
      const rangeOrders = allUniqueOrders.filter(o => {
        if (!o.created_at) return false;
        const d = new Date(o.created_at).toISOString().split('T')[0];
        return d >= startDateStr && d <= endDateStr;
      });

      const daily_revenue = rangeOrders.filter(o => Number(o.order_status) === 4).reduce((sum, o) => sum + o.grand_total, 0);
      const today_users = rangeOrders.length;
      const total_bookings = allUniqueOrders.length;
      
      const total_products = products.length;
      const deactive_products = products.filter(p => Number(p.status) === 0).length;
      
      const pending_orders = rangeOrders.filter(o => [0, 1, 3].includes(Number(o.order_status))).length;
      const completed_orders = rangeOrders.filter(o => Number(o.order_status) === 4).length;
      const cancelled_orders = rangeOrders.filter(o => [2, 5].includes(Number(o.order_status))).length;
      
      const yet_to_receive_payments = rangeOrders.filter(o => Number(o.payment_mode) === 0 && Number(o.order_status) < 4).reduce((sum, o) => sum + o.grand_total, 0);

      setStats({
        daily_revenue,
        revenue_growth: 0,
        today_users,
        users_growth: 0,
        total_bookings,
        total_products,
        deactive_products,
        pending_orders,
        completed_orders,
        cancelled_orders,
        orders: rangeOrders.length,
        yet_to_receive_payments,
        recent_orders: allUniqueOrders.slice(0, 10),
        is_super_admin: true,
        restaurant_name: selectedRestaurant ? (restaurants.find(r => r.user_id === selectedRestaurant)?.restaurant_name || "Restaurant") : "All Restaurants"
      });
    } catch (error) {
      console.error("Stats fetch failed", error);
    } finally {
      setLoading(false);
    }
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
      fetchStats();
      // Also update modal items if open
      if (detailModal.isOpen) {
        setDetailModal(prev => ({
          ...prev,
          items: prev.items.map(o => o.order_number === orderNumber ? { ...o, order_status: status } : o)
        }));
      }
      // If selectedOrder (OrderDetailsModal) is open, update it too
      if (selectedOrder && selectedOrder.order_number === orderNumber) {
        setSelectedOrder(prev => ({ ...prev, order_status: status }));
      }
    } catch (error) {
      console.error("Failed to update status", error);
    }
  };

  const openDetailModal = async (type, title) => {
    let items = [];
    const includeDates = (type !== 'total_bookings' && type !== 'products' && type !== 'deactive' && type !== 'stock');

    let filterParams = `?restaurantId=${selectedRestaurant}`;
    if (includeDates) {
      filterParams += `&startDate=${dateRange.start}&endDate=${dateRange.end}`;
    }

    if (type === 'pending' || type === 'completed' || type === 'cancelled' || type === 'rejected' || type === 'orders' || type === 'total_bookings' || type === 'payments') {
      try {
        let q = collection(db, "orders");
        if (selectedRestaurant !== "all" && selectedRestaurant) {
          q = query(collection(db, "orders"), where("user_id", "==", Number(selectedRestaurant)));
        }
        
        const snapshot = await getDocs(q);
        const rawOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Group by order_number since Firestore orders table matches MySQL (1 row per item)
        const grouped = {};
        for (const o of rawOrders) {
           if (!grouped[o.order_number]) {
             grouped[o.order_number] = {
               order_number: o.order_number,
               customer_id: o.customer_id,
               grand_total: 0,
               order_status: o.order_status,
               created_at: o.created_at?.toDate ? o.created_at.toDate().toISOString() : o.created_at,
               order_source: o.order_source,
               payment_mode: o.payment_mode
             };
           }
           // Avoid duplicating grand_total if it was calculated per item properly
           grouped[o.order_number].grand_total += Number(o.grand_total || 0);
           grouped[o.order_number].order_status = Math.max(grouped[o.order_number].order_status, Number(o.order_status));
        }
        
        let allOrders = Object.values(grouped).sort((a,b) => new Date(b.created_at) - new Date(a.created_at));

        if (type === 'pending') {
          items = allOrders.filter(o => [0, 1, 3].includes(Number(o.order_status)));
        } else if (type === 'completed') {
          items = allOrders.filter(o => Number(o.order_status) === 4);
        } else if (type === 'cancelled') {
          items = allOrders.filter(o => Number(o.order_status) === 5);
        } else if (type === 'rejected') {
          items = allOrders.filter(o => Number(o.order_status) === 2);
        } else if (type === 'payments') {
          items = allOrders.filter(o => Number(o.payment_mode) === 0 && Number(o.order_status) < 4);
        } else {
          items = allOrders;
        }

        if (includeDates) {
          const startDateStr = dateRange.start;
          const endDateStr = dateRange.end;
          items = items.filter(o => {
            if (!o.created_at) return false;
            const oDate = new Date(o.created_at).toISOString().split('T')[0];
            return oDate >= startDateStr && oDate <= endDateStr;
          });
        }

      } catch (err) { console.error(err); }
    } else if (type === 'products' || type === 'deactive' || type === 'stock') {
      try {
        let q = collection(db, "products");
        if (selectedRestaurant !== "all" && selectedRestaurant) {
          q = query(collection(db, "products"), where("user_id", "==", Number(selectedRestaurant)));
        }
        const snapshot = await getDocs(q);
        const allProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        if (type === 'deactive') {
          items = allProducts.filter(p => Number(p.status) === 0);
        } else if (type === 'stock') {
          items = allProducts.filter(p => Number(p.status) === 1);
        } else {
          items = allProducts;
        }
      } catch (err) { console.error(err); }
    } else if (type === 'customers') {
      try {
        const snapshot = await getDocs(collection(db, "customers"));
        items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (err) { console.error(err); }
    }
    setDetailModal({ isOpen: true, title, items, type });
  };

  const handleRangeSelect = (option) => {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    if (option === 'Today') {
      // already set
    } else if (option === 'This Week') {
      const day = today.getDay() || 7;
      if (day !== 1) start.setHours(-24 * (day - 1));
    } else if (option === 'This Month') {
      start.setDate(1);
    } else if (option === 'This Quarter') {
      const q = Math.floor(today.getMonth() / 3);
      start.setMonth(q * 3);
      start.setDate(1);
    } else if (option === 'This Year') {
      start.setMonth(0);
      start.setDate(1);
    } else if (option === 'Previous Week') {
      start.setDate(today.getDate() - today.getDay() - 6);
      end.setDate(today.getDate() - today.getDay());
    } else if (option === 'Previous Month') {
      start.setMonth(today.getMonth() - 1);
      start.setDate(1);
      end.setDate(0);
    } else if (option === 'Previous Quarter') {
      const q = Math.floor(today.getMonth() / 3);
      start.setMonth((q - 1) * 3);
      start.setDate(1);
      end.setMonth(q * 3);
      end.setDate(0);
    } else if (option === 'Previous Year') {
      start.setFullYear(today.getFullYear() - 1);
      start.setMonth(0);
      start.setDate(1);
      end.setFullYear(today.getFullYear() - 1);
      end.setMonth(11);
      end.setDate(31);
    } else if (option === 'Custom Range') {
      setIsCustomMode(true);
      return; // Wait for inputs
    }

    const sStr = start.toISOString().split('T')[0];
    const eStr = end.toISOString().split('T')[0];
    setDateRange({ start: sStr, end: eStr, label: option });
    setShowRangeMenu(false);
    setIsCustomMode(false);
  };

  const applyCustomRange = () => {
    if (customRange.start && customRange.end) {
      setDateRange({ start: customRange.start, end: customRange.end, label: 'Custom Range' });
      setShowRangeMenu(false);
    }
  };

  const handleApplyDateTimeFilters = (filters) => {
    const startDate = filters.startDate;
    const endDate = filters.endDate;
    const label = filters.label || (startDate === endDate ? startDate : `${startDate} to ${endDate}`);
    setDateRange({ start: startDate, end: endDate, label });
  };

  const calculateTrend = (current, previous) => {
    if (!previous || Number(previous) === 0) return Number(current) > 0 ? "+100%" : "0%";
    const diff = ((Number(current) - Number(previous)) / Number(previous)) * 100;
    return `${diff > 0 ? '+' : ''}${diff.toFixed(1)}%`;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(Number(amount) || 0);
  };

  // derived stats
  const todayRevenueTotal = stats.daily_revenue || 0;
  const todayOrdersCount = stats.today_users || 0;

  // Pagination Logic
  const indexOfLastOrder = currentPage * ordersPerPage;
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
  const currentOrders = stats.recent_orders?.slice(indexOfFirstOrder, indexOfLastOrder) || [];
  const totalPages = Math.ceil((stats.recent_orders?.length || 0) / ordersPerPage);

  const getStatusBadge = (status) => {
    const s = Number(status);
    if (s === 0) return <span className="px-2 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">Placed</span>;
    if (s === 1) return <span className="px-2 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">Accepted</span>;
    if (s === 2) return <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-300 border border-red-500/30">Rejected</span>;
    if (s === 3) return <span className="px-2 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">Ready</span>;
    if (s === 4) return <span className="px-2 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Collected</span>;
    return <span className="px-2 py-1 rounded-full text-xs font-bold bg-gray-500/20 text-gray-300">Cancelled</span>;
  };

  const OrderActions = ({ order }) => {
    const status = Number(order.order_status);
    return (
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => setSelectedOrder(order)}
          className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-emerald-300 hover:text-emerald-200 transition-all shadow-md active:scale-95"
          title="View Details"
        >
          <Eye size={18} />
        </button>
        {status === 0 && (
          <>
            <button
              onClick={() => {
                setOrderForReady(order.order_number);
                setIsReadyModalOpen(true);
              }}
              className="p-2 bg-emerald-500/20 hover:bg-emerald-500/40 rounded-lg text-emerald-400 transition-all shadow-md active:scale-95"
              title="Accept"
            >
              <CheckCircle size={18} />
            </button>
            <button
              onClick={() => updateOrderStatus(order.order_number, 2)}
              className="p-2 bg-rose-500/20 hover:bg-rose-500/40 rounded-lg text-rose-400 transition-all shadow-md active:scale-95"
              title="Reject"
            >
              <XCircle size={18} />
            </button>
          </>
        )}
        {status === 1 && (
          <button
            onClick={() => updateOrderStatus(order.order_number, 3)}
            className="p-2 bg-purple-500/20 hover:bg-purple-500/40 rounded-lg text-purple-400 transition-all shadow-md active:scale-95"
            title="Mark as Ready"
          >
            <ShoppingBag size={18} />
          </button>
        )}
        {status === 3 && (
          <button
            onClick={() => updateOrderStatus(order.order_number, 4)}
            className="p-2 bg-emerald-500/20 hover:bg-emerald-500/40 rounded-lg text-emerald-400 transition-all shadow-md active:scale-95"
            title="Mark Collected"
          >
            <CheckCircle size={18} />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-900 via-teal-800 to-emerald-900 text-white font-sans selection:bg-emerald-500/30">
      <style dangerouslySetInnerHTML={{
        __html: `
            .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
            height: 6px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.2);
            }
        `}} />
      <Header onToggleSidebar={() => setSidebarOpen((s) => !s)} darkMode={true} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className={`pt-36 lg:pt-24 pb-12 px-4 sm:px-6 transition-all duration-300 ease-in-out ${sidebarOpen ? "lg:pl-80 lg:pr-8" : "lg:pl-8 lg:pr-8"}`}>
        <div className="max-w-7xl mx-auto">

          {/* Header Section */}
          <div className="flex flex-col items-center text-center mb-10 gap-8">
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-white drop-shadow-lg tracking-tight whitespace-nowrap">
                {stats.restaurant_name ? `Welcome to ${stats.restaurant_name}` : "Dashboard"}
              </h1>
              <p className="text-white/60 mt-2 text-sm uppercase tracking-[0.2em] font-medium">Real-time overview of your restaurant's performance</p>
            </div>

            <div className="flex flex-wrap justify-center items-center gap-4">
              {/* Restaurant Filter (Super Admin) */}
              {stats.is_super_admin && (
                <div className="relative">
                  <button
                    onClick={() => setShowRestaurantMenu(!showRestaurantMenu)}
                    className="flex items-center gap-2 px-6 py-2 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 text-white font-bold hover:bg-white/20 transition-all text-sm uppercase tracking-wider h-full whitespace-nowrap"
                  >
                    <LayoutDashboard size={18} />
                    {selectedRestaurant ? (restaurants.find(r => String(r.user_id) === String(selectedRestaurant))?.restaurant_name || "Restaurant") : "All Restaurants"}
                    <ChevronDown size={14} className={`transition-transform ${showRestaurantMenu ? 'rotate-180' : ''}`} />
                  </button>

                  {showRestaurantMenu && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-[100] py-2 overflow-hidden text-left">
                      <div className="max-h-60 overflow-y-auto custom-scrollbar">
                        <button
                          onClick={() => {
                            setSelectedRestaurant("");
                            setShowRestaurantMenu(false);
                          }}
                          className={`w-full px-4 py-2 text-left hover:bg-white/10 transition-colors text-sm ${selectedRestaurant === "" ? 'text-emerald-400 bg-white/5' : 'text-white/80'}`}
                        >
                          All Restaurants
                        </button>
                        {restaurants.map((r) => (
                          <button
                            key={r.user_id}
                            onClick={() => {
                              setSelectedRestaurant(String(r.user_id));
                              setShowRestaurantMenu(false);
                            }}
                            className={`w-full px-4 py-2 text-left hover:bg-white/10 transition-colors text-sm ${String(selectedRestaurant) === String(r.user_id) ? 'text-emerald-400 bg-white/5' : 'text-white/80'}`}
                          >
                            {r.restaurant_name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Super Admin Buttons (Matches reference image style) */}
              <button
                onClick={() => setIsDateTimeFilterModalOpen(true)}
                className="flex items-center gap-2 px-6 py-2 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 text-white font-bold hover:bg-white/20 transition-all text-sm uppercase tracking-wider whitespace-nowrap"
              >
                <Calendar size={18} /> {dateRange.label} <ChevronDown size={14} />
              </button>
              <button className="flex items-center gap-2 px-6 py-2 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 text-white font-bold hover:bg-white/20 transition-all text-sm uppercase tracking-wider whitespace-nowrap">
                <ArrowRight className="rotate-90" size={18} /> Export
              </button>
              <button
                onClick={() => setIsNewOrderModalOpen(true)}
                className="flex items-center gap-2 px-6 py-2 bg-emerald-600 rounded-xl text-white font-bold hover:bg-emerald-500 transition-all text-sm uppercase tracking-wider shadow-lg shadow-emerald-900/40 whitespace-nowrap"
              >
                <Plus size={18} /> New Order
              </button>
            </div>
          </div>

          {/* Stats Grid - Row 1 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <StatCard
              title="Pending Orders"
              value={stats.pending_orders}
              subtext="To Be Confirmed"
              icon={Clock}
              colorClass="bg-amber-500/20 border border-amber-400/30"
              delay={0}
              onEyeClick={() => openDetailModal('pending', 'Pending Orders')}
            />
            <StatCard
              title="Total Bookings"
              value={stats.total_bookings}
              subtext="Lifetime Orders"
              icon={ShoppingBag}
              colorClass="bg-indigo-500/20 border border-indigo-400/30"
              delay={0.1}
              onEyeClick={() => openDetailModal('total_bookings', 'Total Bookings')}
            />
            <StatCard
              title="Rejected Orders"
              value={stats.rejected_orders || stats.complaint_requests}
              subtext="To Be Reviewed"
              icon={RotateCcw}
              colorClass="bg-rose-500/20 border border-rose-400/30"
              delay={0.2}
              onEyeClick={() => openDetailModal('rejected', 'Rejected Orders')}
            />
            <StatCard
              title="Yet to Receive Payments"
              value={stats.yet_to_receive_payments}
              subtext="To Be Received"
              icon={CreditCard}
              colorClass="bg-blue-500/20 border border-blue-400/30"
              delay={0.3}
              onEyeClick={() => openDetailModal('payments', 'Payment Requests')}
            />
            <StatCard
              title="Deactive Products"
              value={stats.deactive_products}
              subtext="In-active items"
              icon={Package}
              colorClass="bg-emerald-500/20 border border-emerald-400/30"
              delay={0.4}
              onEyeClick={() => openDetailModal('deactive', 'Deactive Products')}
            />
          </div>

          {/* Stats Grid - Row 2 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <StatCard
              title="Total Products"
              value={stats.total_products}
              subtext="Total Inventory"
              icon={Box}
              colorClass="bg-indigo-500/20 border border-indigo-400/30"
              delay={0.5}
              trend="0%"
              onEyeClick={() => openDetailModal('products', 'Total Products')}
            />
            <StatCard
              title="Orders"
              value={todayOrdersCount}
              subtext={dateRange.label}
              icon={ShoppingBag}
              colorClass="bg-rose-500/20 border border-rose-400/30"
              delay={0.6}
              trend={calculateTrend(stats.today_users, stats.prev_today_users)}
              onEyeClick={() => openDetailModal('orders', 'Orders Overview')}
            />
            <StatCard
              title="Revenue"
              value={formatCurrency(todayRevenueTotal)}
              subtext={dateRange.label}
              icon={PoundSterling}
              colorClass="bg-emerald-500/20 border border-emerald-400/30"
              delay={0.7}
              trend={calculateTrend(stats.daily_revenue, stats.prev_daily_revenue)}
              onEyeClick={() => openDetailModal('orders', 'Revenue Details')}
            />
            <StatCard
              title="Customers"
              value={stats.followers}
              subtext="Total Reach"
              icon={Users}
              colorClass="bg-purple-500/20 border border-purple-400/30"
              delay={0.8}
              trend="0%"
              onEyeClick={() => openDetailModal('customers', 'Customers List')}
            />
            <StatCard
              title="Completed Orders"
              value={stats.completed_orders}
              subtext="Successfully Delivered"
              icon={CheckCircle}
              colorClass="bg-emerald-500/20 border border-emerald-400/30"
              delay={0.9}
              onEyeClick={() => openDetailModal('completed', 'Completed Orders')}
            />
          </div>

          {/* Charts Section 1: Comparisons & Trends */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

            <ChartCard title="Sales Comparison" subtitle="Current vs Previous Period" delay={0.4} className="h-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.sales_comparison || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#fff', fontSize: 11 }}
                    interval="preserveStartEnd"
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#fff', fontSize: 11 }}
                    tickFormatter={(v) => `£${v}`}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ borderRadius: '12px', background: '#1f2937', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                    formatter={(value) => [`£${value}`, "Revenue"]}
                  />
                  <Bar dataKey="previous" name="Previous Period" fill="#9ca3af" radius={[4, 4, 0, 0]} barSize={8} fillOpacity={0.5} />
                  <Bar dataKey="current" name="Selected Period" fill="#34d399" radius={[4, 4, 0, 0]} barSize={8} />
                  <Legend wrapperStyle={{ paddingTop: '10px' }} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Average Order Value" subtitle="Trend over time" delay={0.5} className="h-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.avg_order_cost || []}>
                  <defs>
                    <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#fff', fontSize: 11 }}
                    interval="preserveStartEnd"
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#fff', fontSize: 11 }}
                    tickFormatter={(v) => `£${Math.round(v)}`}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', background: '#1f2937', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                    formatter={(value) => [`£${Number(value).toFixed(2)}`, "Avg Value"]}
                  />
                  <Area type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorAvg)" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Orders Trend" subtitle="Selected Range Distribution" delay={0.6} className="h-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.weekly_orders || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#fff', fontSize: 11 }}
                    tickFormatter={(str) => new Date(str).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    interval="preserveStartEnd"
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#fff', fontSize: 11 }}
                  />
                  <Tooltip contentStyle={{ borderRadius: '12px', background: '#1f2937', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
                  <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

          </div>

          {/* Charts Section 2: Top Products & Table */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

            {/* Top Selling Products (Replaced Pie Chart) */}
            <div className="xl:col-span-1">
              <ChartCard title="Top Selling Items" subtitle="Most popular products" delay={0.7} className="h-fit">
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {stats.top_selling_products && stats.top_selling_products.length > 0 ? (
                    stats.top_selling_products.map((product, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors group">

                        {/* Rank & Image */}
                        <div className="relative w-12 h-12 shrink-0">
                          <div className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center z-10 border border-[#1a1c23] shadow-md">
                            {idx + 1}
                          </div>
                          <div className="w-12 h-12 rounded-lg bg-white/10 overflow-hidden ring-1 ring-white/10">
                            {product.image ? (
                              <img
                                src={`${(import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/api\/?$/, '')}/uploads/${product.image.replace(/^uploads\//, '')}`}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <ShoppingBag size={20} className="m-auto text-white/30 h-full" />
                            )}
                          </div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <h5 className="font-medium text-white text-sm truncate">{product.name}</h5>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-emerald-400 text-xs font-bold">£{Number(product.price || 0).toFixed(2)}</span>
                            <span className="text-white/30 text-[10px]">•</span>
                            <span className="text-white/50 text-xs text-xs">{product.count} sales</span>
                          </div>
                        </div>

                        {/* Action */}
                        <button
                          onClick={() => setSelectedProduct(product)}
                          className="p-2 rounded-lg bg-white/5 hover:bg-emerald-500/20 text-white/40 hover:text-emerald-400 transition-colors border border-transparent hover:border-emerald-500/30"
                        >
                          <Eye size={18} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-white/40 py-10">No sales data available</div>
                  )}
                </div>
              </ChartCard>
            </div>

            {/* Recent Orders Table */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.4 }}
              className="xl:col-span-2 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-xl overflow-hidden flex flex-col"
            >
              <div className="px-6 py-5 border-b border-white/10 flex justify-between items-center bg-white/5">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <ShoppingBag size={20} className="text-emerald-400" /> Recent Orders
                </h2>
              </div>

              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left">
                  <thead className="bg-white/5 text-white/60 text-xs uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="px-6 py-4">Order No</th>
                      <th className="px-6 py-4">Customer</th>
                      <th className="px-6 py-4">Amount</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10 text-sm">
                    {loading ? (
                      <tr><td colSpan="6" className="px-6 py-12 text-center text-white/40">Loading orders...</td></tr>
                    ) : currentOrders.length > 0 ? (
                      currentOrders.map((order, i) => (
                        <tr key={i} className="hover:bg-white/5 transition-colors group">
                          <td className="px-6 py-4 font-medium">
                            <div className="flex items-center gap-2">
                              #{order.order_number}
                              {order.order_source === 'Dashboard' && (
                                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 text-white text-[9px] font-black border border-white/10 shadow-sm" title="Dashboard Order">
                                  D
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-white/80">{order.customer_name || "Guest"}</td>
                          <td className="px-6 py-4 font-semibold text-emerald-300">{formatCurrency(order.grand_total)}</td>
                          <td className="px-6 py-4">{getStatusBadge(order.order_status)}</td>
                          <td className="px-6 py-4 text-white/60">
                            {new Date(order.created_at).toLocaleDateString()}
                            <br />
                            <span className="text-xs text-white/40">{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <OrderActions order={order} />
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="px-6 py-12 text-center text-white/40">No orders found for this date</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {stats.recent_orders?.length > ordersPerPage && (
                <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between bg-white/5">
                  <div className="text-sm text-white/60">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>

          {/* Restaurant Wise Data (Super Admin) */}
          {stats.is_super_admin && stats.restaurant_performance?.length > 0 && (
            <div className="mt-8 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-xl overflow-hidden">
              <div className="px-6 py-5 border-b border-white/10 flex justify-between items-center bg-white/5">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Store size={20} className="text-emerald-400" /> Restaurant Performance
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/5 text-white/60 uppercase text-xs font-semibold">
                    <tr>
                      <th className="px-6 py-4">Restaurant</th>
                      <th className="px-6 py-4 text-center">Orders</th>
                      <th className="px-6 py-4 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {stats.restaurant_performance.map((perf, idx) => (
                      <tr key={idx} className="hover:bg-white/5">
                        <td className="px-6 py-4 font-medium text-white">{perf.restaurant_name}</td>
                        <td className="px-6 py-4 text-center text-white/70">{perf.order_count}</td>
                        <td className="px-6 py-4 text-right text-emerald-300 font-bold">{formatCurrency(perf.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </main>

      <Footer />

      <AnimatePresence>
        {selectedOrder && (
          <OrderDetailsModal
            order={selectedOrder}
            onUpdateStatus={updateOrderStatus}
            onReadyClick={(num) => {
              setOrderForReady(num);
              setIsReadyModalOpen(true);
            }}
            onClose={() => setSelectedOrder(null)}
          />
        )}
        {selectedProduct && (
          <ProductDetailsModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
        )}
        {detailModal.isOpen && (
          <MetricDetailsModal
            isOpen={detailModal.isOpen}
            title={detailModal.title}
            items={detailModal.items}
            type={detailModal.type}
            onUpdateStatus={updateOrderStatus}
            onReadyClick={(num) => {
              setOrderForReady(num);
              setIsReadyModalOpen(true);
            }}
            onClose={() => setDetailModal({ ...detailModal, isOpen: false })}
          />
        )}
        <NewOrderModal
          isOpen={isNewOrderModalOpen}
          onClose={() => setIsNewOrderModalOpen(false)}
          onOrderPlaced={fetchStats}
          restaurants={restaurants}
          isSuperAdmin={stats?.is_super_admin}
          initialUserId={(() => {
            if (stats?.is_super_admin) {
              return (selectedRestaurant && selectedRestaurant !== 'all') ? selectedRestaurant : "";
            }
            const userStr = localStorage.getItem("user");
            if (userStr) {
              try {
                const u = JSON.parse(userStr);
                return u.id;
              } catch (e) { }
            }
            return "";
          })()}
        />
      </AnimatePresence>

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

      {/* Date Time Range Filter Modal */}
      <DateTimeRangeModal
        isOpen={isDateTimeFilterModalOpen}
        onClose={() => setIsDateTimeFilterModalOpen(false)}
        onApplyFilters={handleApplyDateTimeFilters}
      />

    </div>
  );
}
