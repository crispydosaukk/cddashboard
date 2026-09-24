import React, { useEffect, useMemo, useState } from "react";
import Header from "../../components/common/header.jsx";
import Sidebar from "../../components/common/sidebar.jsx";
import Footer from "../../components/common/footer.jsx";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Plus, Edit, Trash2, X, Bike, User, Mail, Lock,
  Phone, Eye, EyeOff, CheckCircle, XCircle, RefreshCw, Shield
} from "lucide-react";
import { usePopup } from "../../context/PopupContext";
import { db, firebaseConfig } from "../../firebase";
import {
  collection, getDocs, doc, deleteDoc, updateDoc, addDoc
} from "firebase/firestore";
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { getUser } from "../../utils/perm.js";

export default function DeliveryPartners() {
  const { showPopup } = usePopup();
  const user = getUser();
  const currentRestaurantId = user?.id ? String(user.id) : null;
  const currentRestaurantName = user?.name || "My Restaurant";

  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Table state
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  // Create modal state
  const [openCreate, setOpenCreate] = useState(false);
  const [cName, setCName] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cPassword, setCPassword] = useState("");
  const [cPhone, setCPhone] = useState("");
  const [cVehicle, setCVehicle] = useState("Bike");
  const [showCPassword, setShowCPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit modal state
  const [openEdit, setOpenEdit] = useState(false);
  const [eId, setEId] = useState(null);
  const [eName, setEName] = useState("");
  const [eEmail, setEEmail] = useState("");
  const [ePassword, setEPassword] = useState("");
  const [ePhone, setEPhone] = useState("");
  const [eVehicle, setEVehicle] = useState("Bike");
  const [eStatus, setEStatus] = useState(1);
  const [showEPassword, setShowEPassword] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Password visibility in table
  const [revealedPasswords, setRevealedPasswords] = useState({});

  const togglePasswordReveal = (id) => {
    setRevealedPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Fetch Delivery Partners (Only for this specific restaurant)
  const fetchPartners = async () => {
    try {
      setLoading(true);
      const res = await getDocs(collection(db, "delivery_partners"));
      let list = res.docs.map((d) => ({ id: d.id, ...d.data() }));

      // Strictly isolate: only show delivery partners created for this restaurant
      if (currentRestaurantId) {
        list = list.filter((p) => String(p.restaurant_id) === String(currentRestaurantId));
      }

      setPartners(list);
      setError("");
    } catch (e) {
      setError(e?.message || "Failed to load delivery partners");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPartners();
  }, [currentRestaurantId]);

  // Stats
  const activeCount = useMemo(() => partners.filter((p) => Number(p.status) === 1).length, [partners]);
  const inactiveCount = useMemo(() => partners.filter((p) => Number(p.status) === 0).length, [partners]);

  // Filtered partners
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return partners;
    return partners.filter((p) => {
      const name = (p.name || "").toLowerCase();
      const email = (p.email || "").toLowerCase();
      const phone = (p.mobile_number || p.phone || "").toLowerCase();
      const vehicle = (p.vehicle_type || "").toLowerCase();
      return (
        name.includes(needle) ||
        email.includes(needle) ||
        phone.includes(needle) ||
        vehicle.includes(needle)
      );
    });
  }, [partners, q]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  // Create Partner
  const canSave = cName.trim() && cEmail.trim() && cPassword.trim();

  const handleCreate = async () => {
    if (!canSave) return;
    try {
      setSaving(true);
      // 1. Create account in Firebase Auth using secondary app so admin isn't logged out
      const secondaryApp = initializeApp(firebaseConfig, "SecondaryAppDelivery" + Date.now());
      const secondaryAuth = getAuth(secondaryApp);
      const userCred = await createUserWithEmailAndPassword(secondaryAuth, cEmail.trim(), cPassword.trim());
      const uid = userCred.user.uid;
      await secondaryAuth.signOut();

      // 2. Save in Firestore delivery_partners under this restaurant
      await addDoc(collection(db, "delivery_partners"), {
        uid: uid,
        name: cName.trim(),
        email: cEmail.trim().toLowerCase(),
        password: cPassword.trim(),
        mobile_number: cPhone.trim(),
        phone: cPhone.trim(),
        vehicle_type: cVehicle,
        restaurant_id: currentRestaurantId,
        restaurant_name: currentRestaurantName,
        status: 1, // 1 = Active, 0 = Inactive
        created_at: new Date().toISOString(),
      });

      setCName("");
      setCEmail("");
      setCPassword("");
      setCPhone("");
      setCVehicle("Bike");
      setOpenCreate(false);
      await fetchPartners();
      showPopup({
        title: "Partner Created",
        message: `Successfully created delivery account for ${cName}.`,
        type: "success",
      });
    } catch (e) {
      showPopup({
        title: "Creation Error",
        message: e?.message || "Failed to create delivery partner",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  // Open Edit modal
  const openEditFor = (p) => {
    setEId(p.id);
    setEName(p.name || "");
    setEEmail(p.email || "");
    setEPassword(p.password || "");
    setEPhone(p.mobile_number || p.phone || "");
    setEVehicle(p.vehicle_type || "Bike");
    setEStatus(p.status ?? 1);
    setOpenEdit(true);
  };

  // Update Partner
  const handleUpdate = async () => {
    if (!eId || !eName.trim() || !eEmail.trim()) return;
    try {
      setUpdating(true);
      const payload = {
        name: eName.trim(),
        email: eEmail.trim().toLowerCase(),
        mobile_number: ePhone.trim(),
        phone: ePhone.trim(),
        vehicle_type: eVehicle,
        status: Number(eStatus),
      };
      if (ePassword.trim()) {
        payload.password = ePassword.trim();
      }
      await updateDoc(doc(db, "delivery_partners", String(eId)), payload);
      setOpenEdit(false);
      await fetchPartners();
      showPopup({
        title: "Updated",
        message: "Delivery partner updated successfully.",
        type: "success",
      });
    } catch (e) {
      showPopup({
        title: "Update Error",
        message: e?.message || "Failed to update delivery partner",
        type: "error",
      });
    } finally {
      setUpdating(false);
    }
  };

  // Delete Partner
  const handleDelete = (p) => {
    showPopup({
      title: "Delete Partner?",
      message: `Are you sure you want to remove ${p.name || "this partner"}? They will no longer be able to log in to the delivery app.`,
      type: "warning",
      confirmText: "Yes, Delete",
      cancelText: "Cancel",
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "delivery_partners", String(p.id)));
          await fetchPartners();
          showPopup({ title: "Deleted", message: "Delivery partner removed.", type: "success" });
        } catch (e) {
          showPopup({ title: "Error", message: e?.message || "Failed to delete partner", type: "error" });
        }
      },
    });
  };

  // Toggle Status
  const handleToggleStatus = async (p) => {
    const nextStatus = Number(p.status) === 1 ? 0 : 1;
    try {
      await updateDoc(doc(db, "delivery_partners", String(p.id)), { status: nextStatus });
      await fetchPartners();
      showPopup({
        title: "Status Changed",
        message: `${p.name || "Partner"} is now ${nextStatus === 1 ? "Active" : "Inactive"}.`,
        type: "success",
      });
    } catch (e) {
      showPopup({ title: "Error", message: e?.message || "Failed to toggle status", type: "error" });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-900 via-teal-800 to-emerald-900 font-sans text-white">
      <Header onToggleSidebar={() => setSidebarOpen((s) => !s)} darkMode={true} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className={`flex-1 flex flex-col min-h-screen pt-36 lg:pt-24 transition-all duration-300 ease-in-out ${sidebarOpen ? "lg:pl-72" : "lg:pl-0"}`}>
        <main className="flex-1 px-4 sm:px-6 lg:px-10 py-8">
          <div className="max-w-7xl mx-auto space-y-6">

            {/* Top Banner */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-2"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20">
                  <Bike className="text-white" size={30} />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white drop-shadow-lg flex items-center gap-3">
                    Delivery Partners
                    <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                      {partners.length} Total
                    </span>
                  </h1>
                  <p className="text-white/80 mt-1 text-base drop-shadow">
                    Create, manage, and dispatch delivery accounts for the mobile app
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <button
                  onClick={fetchPartners}
                  disabled={loading}
                  className="px-4 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-xl text-white font-semibold rounded-xl border border-white/20 shadow-xl transition-all duration-200 flex items-center gap-2 disabled:opacity-50 text-base"
                  title="Refresh Partners"
                >
                  <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                  Refresh
                </button>
                <button
                  onClick={() => setOpenCreate(true)}
                  className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600/80 hover:bg-emerald-600 backdrop-blur-md text-white rounded-xl font-bold shadow-lg border border-white/20 transition-all hover:-translate-y-0.5 text-base"
                >
                  <Plus size={20} />
                  Add Delivery Partner
                </button>
              </div>
            </motion.div>

            {/* Stats Cards - Glassmorphism */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-5 border border-white/20 shadow-2xl hover:bg-white/15 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white/80">Total Partners</p>
                    <p className="text-3xl font-bold text-white mt-1 drop-shadow-lg">{partners.length}</p>
                  </div>
                  <div className="p-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
                    <Bike className="text-emerald-300" size={24} />
                  </div>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-5 border border-white/20 shadow-2xl hover:bg-white/15 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white/80">Active Partners</p>
                    <p className="text-3xl font-bold text-white mt-1 drop-shadow-lg">{activeCount}</p>
                  </div>
                  <div className="p-3 bg-emerald-500/20 backdrop-blur-md rounded-xl border border-emerald-500/30">
                    <CheckCircle className="text-emerald-400" size={24} />
                  </div>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-5 border border-white/20 shadow-2xl hover:bg-white/15 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white/80">Inactive Partners</p>
                    <p className="text-3xl font-bold text-white mt-1 drop-shadow-lg">{inactiveCount}</p>
                  </div>
                  <div className="p-3 bg-red-500/20 backdrop-blur-md rounded-xl border border-red-500/30">
                    <XCircle className="text-red-400" size={24} />
                  </div>
                </div>
              </div>
            </div>

            {/* Table Container */}
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
              {/* Search Toolbar */}
              <div className="p-4 border-b border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white/5">
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                  <input
                    type="text"
                    placeholder="Search by name, email, phone..."
                    value={q}
                    onChange={(e) => { setQ(e.target.value); setPage(1); }}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-sm"
                  />
                </div>
                <div className="text-white/60 text-sm font-medium self-end sm:self-auto whitespace-nowrap">
                  Showing {paged.length} of {total} partners
                </div>
              </div>

              {/* Partners Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/10 text-white/70 text-xs uppercase tracking-wider">
                      <th className="px-6 py-4 font-bold">Partner</th>
                      <th className="px-6 py-4 font-bold">Contact Info</th>
                      <th className="px-6 py-4 font-bold">Vehicle</th>
                      <th className="px-6 py-4 font-bold">App Password</th>
                      <th className="px-6 py-4 font-bold">Status</th>
                      <th className="px-6 py-4 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-white/90 text-sm">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-white/50">
                          <RefreshCw size={28} className="animate-spin mx-auto mb-3 text-emerald-400" />
                          Loading delivery partners...
                        </td>
                      </tr>
                    ) : paged.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-white/50">
                          <Bike size={42} className="mx-auto mb-3 text-white/30" />
                          No delivery partners found. Click "Add Delivery Partner" to create one.
                        </td>
                      </tr>
                    ) : (
                      paged.map((p, idx) => {
                        const isRevealed = !!revealedPasswords[p.id];
                        const isActive = Number(p.status) === 1;
                        return (
                          <motion.tr
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: idx * 0.04 }}
                            key={p.id}
                            className="hover:bg-white/5 transition-colors"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center font-bold text-white shadow-lg border border-white/20">
                                  {(p.name || "D").charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-semibold text-white">{p.name || "Delivery Partner"}</div>
                                  <div className="text-white/40 text-xs font-mono">ID: {p.id.slice(0, 8)}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="space-y-1">
                                <div className="text-white/90 flex items-center gap-2 text-xs">
                                  <Mail size={13} className="text-emerald-300" />
                                  <span>{p.email}</span>
                                </div>
                                <div className="text-white/70 flex items-center gap-2 text-xs">
                                  <Phone size={13} className="text-teal-300" />
                                  <span>{p.mobile_number || p.phone || "-"}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                                <Bike size={13} />
                                {p.vehicle_type || "Bike"}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs bg-black/30 px-3 py-1 rounded-lg border border-white/10 text-white/90">
                                  {isRevealed ? (p.password || "••••••••") : "••••••••"}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => togglePasswordReveal(p.id)}
                                  className="p-1.5 hover:bg-white/10 rounded-lg text-white/50 hover:text-white transition-colors"
                                  title={isRevealed ? "Hide Password" : "Show Password"}
                                >
                                  {isRevealed ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(p)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                                  isActive
                                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30"
                                    : "bg-red-500/20 text-red-300 border-red-500/40 hover:bg-red-500/30"
                                }`}
                                title="Click to toggle status"
                              >
                                {isActive ? <CheckCircle size={13} /> : <XCircle size={13} />}
                                <span>{isActive ? "Active" : "Inactive"}</span>
                              </button>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => openEditFor(p)}
                                  className="p-2 bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 rounded-lg transition-colors border border-blue-500/30"
                                  title="Edit Partner"
                                >
                                  <Edit size={16} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(p)}
                                  className="p-2 bg-red-500/20 text-red-300 hover:bg-red-500/30 rounded-lg transition-colors border border-red-500/30"
                                  title="Delete Partner"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Footer / Pagination */}
              <div className="p-4 border-t border-white/10 bg-white/5 text-white/60 text-sm flex justify-between items-center">
                <span>Showing {paged.length} of {total} entries</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-white"
                  >
                    &laquo; Prev
                  </button>
                  {[...Array(totalPages).keys()].slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2)).map((num) => (
                    <button
                      type="button"
                      key={num}
                      onClick={() => setPage(num + 1)}
                      className={`w-8 h-8 rounded-lg font-bold flex items-center justify-center transition-all ${
                        currentPage === num + 1
                          ? "bg-emerald-500/30 text-emerald-300 border border-emerald-500/40"
                          : "bg-white/5 text-white/60 hover:bg-white/10"
                      }`}
                    >
                      {num + 1}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-white"
                  >
                    Next &raquo;
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="mt-4 p-4 bg-red-500/20 border border-red-500/40 rounded-xl text-red-200 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-400" />
                {error}
              </div>
            )}

          </div>
        </main>

        <Footer />
      </div>

      {/* CREATE MODAL */}
      <AnimatePresence>
        {openCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setOpenCreate(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden p-6 max-h-[90vh] flex flex-col"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Bike className="text-emerald-400" /> New Delivery Partner
                </h3>
                <button
                  type="button"
                  onClick={() => setOpenCreate(false)}
                  className="text-white/50 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4 flex-1 overflow-y-auto pr-1">


                <div>
                  <label className="text-xs text-white/80 font-medium block mb-1.5">Partner Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    value={cName}
                    onChange={(e) => setCName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="text-xs text-white/80 font-medium block mb-1.5">Email Address (Login ID)</label>
                  <input
                    type="email"
                    required
                    placeholder="delivery@crispydosa.com"
                    value={cEmail}
                    onChange={(e) => setCEmail(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="text-xs text-white/80 font-medium block mb-1.5">Mobile Number</label>
                  <input
                    type="tel"
                    placeholder="e.g. +44 7123 456789"
                    value={cPhone}
                    onChange={(e) => setCPhone(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="text-xs text-white/80 font-medium block mb-1.5">Vehicle Type</label>
                  <select
                    value={cVehicle}
                    onChange={(e) => setCVehicle(e.target.value)}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  >
                    <option value="Bike">Motorbike</option>
                    <option value="Bicycle">Bicycle</option>
                    <option value="Car">Car</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-white/80 font-medium block mb-1.5">App Password</label>
                  <div className="relative">
                    <input
                      type={showCPassword ? "text" : "password"}
                      required
                      placeholder="Enter mobile app login password"
                      value={cPassword}
                      onChange={(e) => setCPassword(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 pr-10 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCPassword(!showCPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                    >
                      {showCPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setOpenCreate(false)}
                  className="px-5 py-2.5 rounded-xl border border-white/10 text-white/70 hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={saving || !canSave}
                  onClick={handleCreate}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-lg border border-white/10 transition-all hover:-translate-y-0.5 disabled:opacity-60"
                >
                  {saving ? "Creating Partner..." : "Create Partner"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT MODAL */}
      <AnimatePresence>
        {openEdit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setOpenEdit(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden p-6 max-h-[90vh] flex flex-col"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Edit className="text-emerald-400" /> Edit Delivery Partner
                </h3>
                <button
                  type="button"
                  onClick={() => setOpenEdit(false)}
                  className="text-white/50 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4 flex-1 overflow-y-auto pr-1">

                <div>
                  <label className="text-xs text-white/80 font-medium block mb-1.5">Partner Name</label>
                  <input
                    type="text"
                    required
                    value={eName}
                    onChange={(e) => setEName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="text-xs text-white/80 font-medium block mb-1.5">Email Address</label>
                  <input
                    type="email"
                    required
                    value={eEmail}
                    onChange={(e) => setEEmail(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="text-xs text-white/80 font-medium block mb-1.5">Mobile Number</label>
                  <input
                    type="tel"
                    value={ePhone}
                    onChange={(e) => setEPhone(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-white/80 font-medium block mb-1.5">Vehicle</label>
                    <select
                      value={eVehicle}
                      onChange={(e) => setEVehicle(e.target.value)}
                      className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    >
                      <option value="Bike">Motorbike</option>
                      <option value="Bicycle">Bicycle</option>
                      <option value="Car">Car</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-white/80 font-medium block mb-1.5">Status</label>
                    <select
                      value={eStatus}
                      onChange={(e) => setEStatus(Number(e.target.value))}
                      className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    >
                      <option value={1}>Active</option>
                      <option value={0}>Inactive</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-white/80 font-medium block mb-1.5">Reset App Password (optional)</label>
                  <div className="relative">
                    <input
                      type={showEPassword ? "text" : "password"}
                      placeholder="Leave blank to keep unchanged"
                      value={ePassword}
                      onChange={(e) => setEPassword(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 pr-10 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEPassword(!showEPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                    >
                      {showEPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setOpenEdit(false)}
                  className="px-5 py-2.5 rounded-xl border border-white/10 text-white/70 hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={updating}
                  onClick={handleUpdate}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-lg border border-white/10 transition-all hover:-translate-y-0.5 disabled:opacity-60"
                >
                  {updating ? "Saving Changes..." : "Save Changes"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
