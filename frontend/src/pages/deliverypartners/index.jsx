import React, { useEffect, useMemo, useState } from "react";
import Header from "../../components/common/header.jsx";
import Sidebar from "../../components/common/sidebar.jsx";
import Footer from "../../components/common/footer.jsx";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Plus, Edit, Trash2, X, Bike, User, Mail, Lock,
  Phone, Eye, EyeOff, CheckCircle, XCircle, RefreshCw, Truck
} from "lucide-react";
import { usePopup } from "../../context/PopupContext";
import { db, firebaseConfig } from "../../firebase";
import {
  collection, getDocs, doc, deleteDoc, updateDoc, addDoc, serverTimestamp
} from "firebase/firestore";
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";

export default function DeliveryPartners() {
  const { showPopup } = usePopup();
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

  // Fetch Delivery Partners
  const fetchPartners = async () => {
    try {
      setLoading(true);
      const res = await getDocs(collection(db, "delivery_partners"));
      const list = res.docs.map((d) => ({ id: d.id, ...d.data() }));
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
  }, []);

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

      // 2. Save in Firestore delivery_partners
      await addDoc(collection(db, "delivery_partners"), {
        uid: uid,
        name: cName.trim(),
        email: cEmail.trim().toLowerCase(),
        password: cPassword.trim(),
        mobile_number: cPhone.trim(),
        phone: cPhone.trim(),
        vehicle_type: cVehicle,
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
    const nextStatus = p.status === 1 ? 0 : 1;
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
    <div className="flex h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white font-sans overflow-hidden">
      {/* Sidebar */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6 custom-scrollbar">
          {/* Top Banner */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                <Bike size={26} />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
                  Delivery Partners
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {partners.length} Total
                  </span>
                </h1>
                <p className="text-white/50 text-sm mt-0.5">
                  Create and manage delivery accounts for the mobile app
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={fetchPartners}
                className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/70 hover:text-white transition-all"
                title="Refresh Partners"
              >
                <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
              </button>
              <button
                onClick={() => setOpenCreate(true)}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-5 py-3 rounded-xl font-medium shadow-lg shadow-emerald-500/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <Plus size={18} />
                <span>Add Delivery Partner</span>
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-xl flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="relative w-full sm:max-w-md">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                placeholder="Search by name, email, phone, or vehicle..."
                value={q}
                onChange={(e) => { setQ(e.target.value); setPage(1); }}
                className="w-full bg-slate-900/60 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
            <div className="flex items-center gap-2 text-white/50 text-xs self-end sm:self-auto">
              <span>Showing {paged.length} of {total} partners</span>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5 text-white/50 text-xs uppercase tracking-wider">
                    <th className="p-4 font-semibold">Partner</th>
                    <th className="p-4 font-semibold">Contact Info</th>
                    <th className="p-4 font-semibold">Vehicle</th>
                    <th className="p-4 font-semibold">App Password</th>
                    <th className="p-4 font-semibold">Status</th>
                    <th className="p-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-white/40">
                        <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-emerald-400" />
                        Loading delivery partners...
                      </td>
                    </tr>
                  ) : paged.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-white/40">
                        <Bike size={36} className="mx-auto mb-2 opacity-30" />
                        No delivery partners found. Click "Add Delivery Partner" to create one.
                      </td>
                    </tr>
                  ) : (
                    paged.map((p) => {
                      const isRevealed = !!revealedPasswords[p.id];
                      return (
                        <tr key={p.id} className="hover:bg-white/5 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center font-bold text-white shadow">
                                {(p.name || "D").charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-semibold text-white">{p.name || "Delivery Boy"}</div>
                                <div className="text-white/40 text-xs">ID: {p.id.slice(0, 8)}...</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="space-y-1">
                              <div className="text-white/80 flex items-center gap-1.5 text-xs">
                                <Mail size={13} className="text-white/40" />
                                {p.email}
                              </div>
                              <div className="text-white/80 flex items-center gap-1.5 text-xs">
                                <Phone size={13} className="text-white/40" />
                                {p.mobile_number || p.phone || "No phone"}
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-medium">
                              <Bike size={13} />
                              {p.vehicle_type || "Bike"}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs bg-slate-950/60 px-2 py-1 rounded border border-white/10 text-white/80">
                                {isRevealed ? (p.password || "••••••••") : "••••••••"}
                              </span>
                              <button
                                onClick={() => togglePasswordReveal(p.id)}
                                className="text-white/40 hover:text-white transition-colors"
                                title={isRevealed ? "Hide Password" : "Show Password"}
                              >
                                {isRevealed ? <EyeOff size={15} /> : <Eye size={15} />}
                              </button>
                            </div>
                          </td>
                          <td className="p-4">
                            <button
                              onClick={() => handleToggleStatus(p)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                                p.status === 1
                                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30"
                                  : "bg-red-500/20 text-red-300 border-red-500/30 hover:bg-red-500/30"
                              }`}
                            >
                              {p.status === 1 ? <CheckCircle size={12} /> : <XCircle size={12} />}
                              {p.status === 1 ? "Active" : "Inactive"}
                            </button>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => openEditFor(p)}
                                className="p-2 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors"
                                title="Edit Partner"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(p)}
                                className="p-2 hover:bg-red-500/20 rounded-lg text-red-400 hover:text-red-300 transition-colors"
                                title="Delete Partner"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-white/10 flex items-center justify-between text-xs text-white/50">
                <span>Page {currentPage} of {totalPages}</span>
                <div className="flex gap-2">
                  <button
                    disabled={currentPage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 transition-colors text-white"
                  >
                    Previous
                  </button>
                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 transition-colors text-white"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>

        <Footer />
      </div>

      {/* CREATE MODAL */}
      <AnimatePresence>
        {openCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Bike className="text-emerald-400" size={20} />
                  Add Delivery Partner
                </h3>
                <button
                  onClick={() => setOpenCreate(false)}
                  className="text-white/40 hover:text-white p-1 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <label className="text-xs text-white/60 font-medium block mb-1.5">Full Name *</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                    <input
                      type="text"
                      placeholder="e.g. John Doe"
                      value={cName}
                      onChange={(e) => setCName(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-white/60 font-medium block mb-1.5">Email Address (Login ID) *</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                    <input
                      type="email"
                      placeholder="e.g. partner@crispydosa.com"
                      value={cEmail}
                      onChange={(e) => setCEmail(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-white/60 font-medium block mb-1.5">Password *</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                    <input
                      type={showCPassword ? "text" : "password"}
                      placeholder="At least 6 characters"
                      value={cPassword}
                      onChange={(e) => setCPassword(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-10 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCPassword(!showCPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                    >
                      {showCPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-white/60 font-medium block mb-1.5">Mobile Number</label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                    <input
                      type="text"
                      placeholder="e.g. +44 7123 456789"
                      value={cPhone}
                      onChange={(e) => setCPhone(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-white/60 font-medium block mb-1.5">Vehicle Type</label>
                  <select
                    value={cVehicle}
                    onChange={(e) => setCVehicle(e.target.value)}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  >
                    <option value="Bike">Motorbike / Scooter</option>
                    <option value="Bicycle">Bicycle / E-Bike</option>
                    <option value="Car">Car / Van</option>
                  </select>
                </div>
              </div>

              <div className="p-5 border-t border-white/10 flex justify-end gap-3 bg-white/5">
                <button
                  type="button"
                  onClick={() => setOpenCreate(false)}
                  className="px-4 py-2 text-sm rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!canSave || saving}
                  onClick={handleCreate}
                  className="px-5 py-2 text-sm rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white font-medium shadow-lg shadow-emerald-500/20 transition-all"
                >
                  {saving ? "Creating Account..." : "Create Partner"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT MODAL */}
      <AnimatePresence>
        {openEdit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Edit className="text-blue-400" size={20} />
                  Edit Delivery Partner
                </h3>
                <button
                  onClick={() => setOpenEdit(false)}
                  className="text-white/40 hover:text-white p-1 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <label className="text-xs text-white/60 font-medium block mb-1.5">Full Name *</label>
                  <input
                    type="text"
                    value={eName}
                    onChange={(e) => setEName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="text-xs text-white/60 font-medium block mb-1.5">Email Address *</label>
                  <input
                    type="email"
                    value={eEmail}
                    onChange={(e) => setEEmail(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="text-xs text-white/60 font-medium block mb-1.5">
                    Password (leave empty to keep unchanged)
                  </label>
                  <div className="relative">
                    <input
                      type={showEPassword ? "text" : "password"}
                      value={ePassword}
                      onChange={(e) => setEPassword(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 pr-10 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEPassword(!showEPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                    >
                      {showEPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-white/60 font-medium block mb-1.5">Mobile Number</label>
                  <input
                    type="text"
                    value={ePhone}
                    onChange={(e) => setEPhone(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-white/60 font-medium block mb-1.5">Vehicle</label>
                    <select
                      value={eVehicle}
                      onChange={(e) => setEVehicle(e.target.value)}
                      className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none"
                    >
                      <option value="Bike">Motorbike</option>
                      <option value="Bicycle">Bicycle</option>
                      <option value="Car">Car</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-white/60 font-medium block mb-1.5">Status</label>
                    <select
                      value={eStatus}
                      onChange={(e) => setEStatus(Number(e.target.value))}
                      className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none"
                    >
                      <option value={1}>Active</option>
                      <option value={0}>Inactive</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="p-5 border-t border-white/10 flex justify-end gap-3 bg-white/5">
                <button
                  type="button"
                  onClick={() => setOpenEdit(false)}
                  className="px-4 py-2 text-sm rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={updating}
                  onClick={handleUpdate}
                  className="px-5 py-2 text-sm rounded-xl bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white font-medium shadow-lg shadow-blue-500/20 transition-all"
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
