import React, { useState, useEffect } from "react";
import Header from "../../components/common/header.jsx";
import Sidebar from "../../components/common/sidebar.jsx";
import Footer from "../../components/common/footer.jsx";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Search, Phone, Mail, Gift, Wallet, Award, TrendingUp, Download, X, Eye, ShoppingBag, Calendar, MapPin
} from "lucide-react";
import { db } from "../../firebase";
import { collection, getDocs } from "firebase/firestore";

export default function CustomerInfo() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const snap = await getDocs(collection(db, "customers"));
        const data = snap.docs.map(docSnap => {
           const c = docSnap.data();
           return {
             id: docSnap.id,
             ...c,
             created_at: c.created_at?.toDate ? c.created_at.toDate().toISOString() : c.created_at,
             date_of_birth: c.date_of_birth?.toDate ? c.date_of_birth.toDate().toISOString() : c.date_of_birth,
           }
        });
        setCustomers(data);
      } catch (err) {
        console.error("Error fetching customers:", err);
      }
    };
    fetchCustomers();
  }, []);

  const getDisplayName = (customer) => {
    if (customer.full_name && customer.full_name.trim()) return customer.full_name;
    if (customer.name && customer.name.trim()) return customer.name; // Fallback for old schema
    if (customer.email && customer.email.trim()) {
      return customer.email.split("@")[0];
    }
    if (customer.mobile_number && customer.mobile_number.trim()) {
      return `User ${customer.mobile_number.slice(-4)}`;
    }
    return "Unknown Customer";
  };

  const filteredCustomers = customers.filter((c) => {
    const q = search.toLowerCase();
    const displayName = getDisplayName(c).toLowerCase();
    return (
      displayName.includes(q) ||
      (c.mobile_number && c.mobile_number.includes(search)) ||
      (c.email && c.email.toLowerCase().includes(q))
    );
  });

  const formatWallet = (value) => {
    const num = Number(value || 0);
    return `£${num.toFixed(2)}`;
  };

  const formatPhoneNumber = (countryCode, number) => {
    if (!number) return "—";
    const code = countryCode || "+44";
    return `${code} ${number}`;
  };

  const calculateRedeemable = (c) => {
    const pts = Number(c.loyalty_points || 0);
    const redeemPts = Number(c.loyalty_redeem_points || 10);
    const redeemVal = Number(c.loyalty_redeem_value || 1);
    const units = Math.floor(pts / redeemPts);
    const val = (units * redeemVal).toFixed(2);
    return `£${val}`;
  };

  const getInitials = (name) => {
    if (!name || name === "Unknown Customer") return "?";
    const parts = name.split(" ");
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const stats = {
    total: customers.length,
    totalWallet: customers.reduce((sum, c) => sum + Number(c.wallet_balance || 0), 0),
    totalLoyalty: customers.reduce((sum, c) => sum + Number(c.loyalty_points || 0), 0),
  };

  const openCustomerDetails = (customer) => {
    setSelectedCustomer(customer);
    setShowModal(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-900 via-teal-800 to-emerald-900">
      <Header onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className={`flex-1 flex flex-col pt-36 lg:pt-24 transition-all duration-300 ease-in-out ${sidebarOpen ? "lg:pl-72" : "lg:pl-0"}`}>
        <main className="flex-1 px-4 sm:px-6 lg:px-10 py-8">
          <div className="max-w-7xl mx-auto">

            {/* Page Header */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mb-8"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20">
                  <Users className="text-white" size={28} />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white drop-shadow-lg">Customer Information</h1>
                  <p className="text-white/90 mt-1 text-base drop-shadow">Manage and view all customer details</p>
                </div>
              </div>

              {/* Stats Cards - Glassmorphism */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-5 border border-white/20 shadow-2xl hover:bg-white/15 transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white/80">Total Customers</p>
                      <p className="text-3xl font-bold text-white mt-1 drop-shadow-lg">{stats.total}</p>
                    </div>
                    <div className="p-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
                      <Users className="text-white" size={24} />
                    </div>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-5 border border-white/20 shadow-2xl hover:bg-white/15 transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white/80">Total Wallet Balance</p>
                      <p className="text-3xl font-bold text-white mt-1 drop-shadow-lg">{formatWallet(stats.totalWallet)}</p>
                    </div>
                    <div className="p-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
                      <Wallet className="text-white" size={24} />
                    </div>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-5 border border-white/20 shadow-2xl hover:bg-white/15 transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white/80">Total Loyalty Points</p>
                      <p className="text-3xl font-bold text-white mt-1 drop-shadow-lg">{stats.totalLoyalty.toLocaleString()}</p>
                    </div>
                    <div className="p-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
                      <Award className="text-white" size={24} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Search Bar - Glassmorphism */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70" size={20} />
                <input
                  type="text"
                  placeholder="Search by name, mobile, or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border-2 border-white/20 rounded-2xl bg-white/10 backdrop-blur-xl text-white placeholder-white/60 focus:outline-none focus:ring-4 focus:ring-white/30 focus:border-white/40 transition-all text-base shadow-xl"
                />
              </div>
            </motion.div>

            {/* Table Container - Glassmorphism */}
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden">

              {/* Table Header */}
              <div className="bg-white/5 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-white/10">
                <h2 className="text-xl font-bold text-white flex items-center gap-2 drop-shadow-lg">
                  <Users size={20} />
                  Customer List ({filteredCustomers.length})
                </h2>
                <button className="px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-semibold rounded-xl border border-white/20 transition-all duration-200 flex items-center gap-2 text-base shadow-lg">
                  <Download size={16} />
                  Export
                </button>
              </div>

              {/* Desktop Table View */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-white/10">
                  <thead className="bg-white/5 backdrop-blur-md">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-white/80 uppercase tracking-wider">#</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-white/80 uppercase tracking-wider">Customer</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-white/80 uppercase tracking-wider">Phone</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-white/80 uppercase tracking-wider">Wallet</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-white/80 uppercase tracking-wider">Loyalty</th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-white/80 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-white/5">
                    {filteredCustomers.length > 0 ? (
                      filteredCustomers.map((c, i) => (
                        <motion.tr
                          key={c.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.02 }}
                          className="hover:bg-white/5 transition-colors duration-200"
                        >
                          <td className="px-6 py-4 text-base text-white/90 font-medium">
                            {i + 1}
                          </td>

                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-base shadow-lg">
                                {getInitials(getDisplayName(c))}
                              </div>
                              <div>
                                <p className="text-base font-semibold text-white">{getDisplayName(c)}</p>
                                <p className="text-sm text-white/60">{c.email || "—"}</p>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-base text-white/90">
                              <Phone size={14} className="text-emerald-300" />
                              <span className="font-medium">{formatPhoneNumber(c.country_code, c.mobile_number)}</span>
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1 text-base font-bold text-emerald-300">
                              <Wallet size={16} />
                              {formatWallet(c.wallet_balance)}
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1 text-base font-bold text-amber-300">
                              <Award size={16} />
                              {Number(c.loyalty_points || 0)}
                            </span>
                          </td>

                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => openCustomerDetails(c)}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-semibold rounded-xl border border-white/20 transition-all duration-200 text-base shadow-lg"
                            >
                              <Eye size={16} />
                              View
                            </button>
                          </td>
                        </motion.tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="px-6 py-12 text-center">
                          <Users size={48} className="mx-auto text-white/30 mb-3" />
                          <p className="text-white/70 font-medium text-base">No customers found</p>
                          <p className="text-sm text-white/50 mt-1">Try adjusting your search</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>

      {/* Customer Details Modal - Glassmorphism */}
      <AnimatePresence>
        {showModal && selectedCustomer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="bg-white/10 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-10 border-b border-white/10">
                <h3 className="text-xl font-bold text-white drop-shadow-lg">Customer Details</h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors border border-white/20"
                >
                  <X size={20} className="text-white" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6">
                {/* Customer Header */}
                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-white/10">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-3xl shadow-xl border-4 border-white/10 mx-auto">
                    {getInitials(getDisplayName(selectedCustomer))}
                  </div>
                  <div className="mt-4 text-center">
                    <h4 className="text-2xl font-bold text-white drop-shadow-lg">{getDisplayName(selectedCustomer)}</h4>
                    <p className="text-base text-white/70">Customer ID: #{selectedCustomer.id}</p>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="mb-6">
                  <h5 className="text-lg font-bold text-white mb-4 drop-shadow">Contact Information</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
                      <Phone size={20} className="text-emerald-300" />
                      <div>
                        <p className="text-sm text-white/60">Phone</p>
                        <p className="text-base font-semibold text-white">{formatPhoneNumber(selectedCustomer.country_code, selectedCustomer.mobile_number)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
                      <Mail size={20} className="text-emerald-300" />
                      <div>
                        <p className="text-sm text-white/60">Email</p>
                        <p className="text-base font-semibold text-white">{selectedCustomer.email || "—"}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Details */}
                <div className="mb-6">
                  <h5 className="text-lg font-bold text-white mb-4 drop-shadow">Additional Details</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {selectedCustomer.preferred_restaurant && (
                      <div className="flex items-center gap-3 p-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
                        <MapPin size={20} className="text-emerald-300" />
                        <div>
                          <p className="text-sm text-white/60">Preferred Restaurant</p>
                          <p className="text-base font-semibold text-white">{selectedCustomer.preferred_restaurant}</p>
                        </div>
                      </div>
                    )}
                    {selectedCustomer.date_of_birth && (
                      <div className="flex items-center gap-3 p-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
                        <Calendar size={20} className="text-emerald-300" />
                        <div>
                          <p className="text-sm text-white/60">Date of Birth</p>
                          <p className="text-base font-semibold text-white">{new Date(selectedCustomer.date_of_birth).toLocaleDateString('en-GB')}</p>
                        </div>
                      </div>
                    )}
                    {selectedCustomer.gender && (
                      <div className="flex items-center gap-3 p-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
                        <div>
                          <p className="text-sm text-white/60">Gender</p>
                          <p className="text-base font-semibold text-white">{selectedCustomer.gender}</p>
                        </div>
                      </div>
                    )}
                    {selectedCustomer.referral_code && (
                      <div className="flex items-center gap-3 p-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
                        <Gift size={20} className="text-emerald-300" />
                        <div>
                          <p className="text-sm text-white/60">Referral Code</p>
                          <p className="text-base font-bold text-emerald-300">{selectedCustomer.referral_code}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Wallet & Loyalty */}
                <div className="mb-6">
                  <h5 className="text-lg font-bold text-white mb-4 drop-shadow">Wallet & Loyalty</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 bg-emerald-500/20 backdrop-blur-md rounded-xl border border-emerald-400/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Wallet size={20} className="text-emerald-300" />
                        <p className="text-sm font-medium text-emerald-200">Wallet Balance</p>
                      </div>
                      <p className="text-2xl font-bold text-white drop-shadow-lg">{formatWallet(selectedCustomer.wallet_balance)}</p>
                    </div>
                    <div className="p-4 bg-amber-500/20 backdrop-blur-md rounded-xl border border-amber-400/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Award size={20} className="text-amber-300" />
                        <p className="text-sm font-medium text-amber-200">Loyalty Points</p>
                      </div>
                      <p className="text-2xl font-bold text-white drop-shadow-lg">{Number(selectedCustomer.loyalty_points || 0)}</p>
                    </div>
                    <div className="p-4 bg-teal-500/20 backdrop-blur-md rounded-xl border border-teal-400/30">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp size={20} className="text-teal-300" />
                        <p className="text-sm font-medium text-teal-200">Redeemable</p>
                      </div>
                      <p className="text-2xl font-bold text-white drop-shadow-lg">{calculateRedeemable(selectedCustomer)}</p>
                    </div>
                  </div>
                </div>

                {/* Account Info */}
                <div className="pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between text-sm text-white/70">
                    <span>Account Created:</span>
                    <span className="font-semibold text-white">{new Date(selectedCustomer.created_at).toLocaleDateString('en-GB')}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
