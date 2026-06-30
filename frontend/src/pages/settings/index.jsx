import React, { useEffect, useState } from "react";
import Header from "../../components/common/header.jsx";
import Sidebar from "../../components/common/sidebar.jsx";
import Footer from "../../components/common/footer.jsx";

import { motion } from "framer-motion";
import {
  Settings as SettingsIcon, Save, CreditCard, Gift, ShoppingCart,
  Percent, Clock, AlertCircle, Users, Wallet, Award, Calendar, Coins, ShieldCheck
} from "lucide-react";
import { usePopup } from "../../context/PopupContext";
import { db } from "../../firebase";
import { collection, getDocs, doc, setDoc, getDoc } from "firebase/firestore";

export default function Settings() {
  const { showPopup } = usePopup();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [form, setForm] = useState({
    signup_bonus_amount: "",
    referral_bonus_amount: "",
    minimum_order: "",
    minimum_cart_total: "",
    earn_per_order_amount: "",

    // ✅ Loyalty dynamic settings
    loyalty_points_per_gbp: "",
    loyalty_redeem_points: "",
    loyalty_redeem_value: "",
    loyalty_available_after_hours: "",
    loyalty_expiry_days: "",
  });

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [settingsDocId, setSettingsDocId] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // ---------- LOAD EXISTING SETTINGS ----------
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const docRef = doc(db, "settings", "global");
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const s = docSnap.data();
        setSettingsDocId("global");

        setForm({
          signup_bonus_amount: s.signup_bonus_amount ?? "",
          referral_bonus_amount: s.referral_bonus_amount ?? "",
          minimum_order: s.minimum_order ?? "",
          minimum_cart_total: s.minimum_cart_total ?? "",
          earn_per_order_amount: s.earn_per_order_amount ?? "",

          loyalty_points_per_gbp: s.loyalty_points_per_gbp ?? "",
          loyalty_redeem_points: s.loyalty_redeem_points ?? "",
          loyalty_redeem_value: s.loyalty_redeem_value ?? "",
          loyalty_available_after_hours: s.loyalty_available_after_hours ?? "",
          loyalty_expiry_days: s.loyalty_expiry_days ?? "",
        });
      }
    } catch (err) {
      console.error("Load settings error:", err);
    } finally {
      setLoading(false);
    }
  };

  // ---------- SAVE (INSERT or UPDATE) ----------
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);

      await setDoc(doc(db, "settings", "global"), form, { merge: true });
      setSettingsDocId("global");

      showPopup({
        title: "Settings Updated",
        message: "Global configuration has been saved successfully.",
        type: "success"
      });
    } catch (err) {
      console.error("Save settings error:", err);
      showPopup({
        title: "System Error",
        message: "Something went wrong while saving settings.",
        type: "error"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-900 via-teal-800 to-emerald-900 font-sans">
      <Header onToggleSidebar={() => setSidebarOpen((s) => !s)} />
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
                  <SettingsIcon className="text-white" size={28} />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white drop-shadow-lg">Global Settings</h1>
                  <p className="text-white/90 mt-1 text-base drop-shadow">
                    Configure bonuses, order rules, and loyalty rewards (GBP £).
                  </p>
                </div>
              </div>

              {/* MAIN FORM */}
              <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 sm:p-8 shadow-2xl border border-white/20">
                {loading ? (
                  <div className="text-center py-20 text-white/70 flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
                    <span className="text-lg animate-pulse">Loading Configuration...</span>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-12">

                    {/* SECTION 1: CUSTOMER REWARDS & BONUSES */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 border-b border-white/10 pb-3">
                        <Gift className="text-amber-400" size={24} />
                        <div>
                          <h3 className="text-xl font-bold text-white drop-shadow">Customer Rewards & Bonuses</h3>
                          <p className="text-white/60 text-sm">Credits and earnings for customer acquisition and retention.</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Signup Bonus Amount */}
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-white/90 ml-1">Signup Bonus (£)</label>
                          <div className="relative group">
                            <Gift className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-amber-400 transition-colors" size={18} />
                            <input
                              type="number"
                              step="0.01"
                              name="signup_bonus_amount"
                              value={form.signup_bonus_amount}
                              onChange={handleChange}
                              placeholder="0.00"
                              className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:bg-white/10 transition-all hover:bg-white/10 shadow-inner"
                            />
                          </div>
                        </div>

                        {/* Referral Bonus Amount */}
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-white/90 ml-1">Referral Bonus (£)</label>
                          <div className="relative group">
                            <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-amber-400 transition-colors" size={18} />
                            <input
                              type="number"
                              step="0.01"
                              name="referral_bonus_amount"
                              value={form.referral_bonus_amount}
                              onChange={handleChange}
                              placeholder="0.00"
                              className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:bg-white/10 transition-all hover:bg-white/10 shadow-inner"
                            />
                          </div>
                        </div>

                        {/* Earn Per Order Amount */}
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-white/90 ml-1">Earn Per Order (£)</label>
                          <div className="relative group">
                            <Coins className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-amber-400 transition-colors" size={18} />
                            <input
                              type="number"
                              step="0.01"
                              name="earn_per_order_amount"
                              value={form.earn_per_order_amount}
                              onChange={handleChange}
                              placeholder="0.00"
                              className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:bg-white/10 transition-all hover:bg-white/10 shadow-inner"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* SECTION 2: ORDER CONSTRAINTS */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 border-b border-white/10 pb-3">
                        <ShieldCheck className="text-emerald-400" size={24} />
                        <div>
                          <h3 className="text-xl font-bold text-white drop-shadow">Order Constraints</h3>
                          <p className="text-white/60 text-sm">Rules for order eligibility and checkout validation.</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Minimum Order */}
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-white/90 ml-1">Minimum Order for Rewards (£)</label>
                          <div className="relative group">
                            <ShoppingCart className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-emerald-400 transition-colors" size={18} />
                            <input
                              type="number"
                              step="0.01"
                              name="minimum_order"
                              value={form.minimum_order}
                              onChange={handleChange}
                              placeholder="0.00"
                              className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:bg-white/10 transition-all hover:bg-white/10"
                            />
                          </div>
                        </div>

                        {/* Minimum Cart Total */}
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-white/90 ml-1">Minimum Final Checkout Total (£)</label>
                          <div className="relative group">
                            <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-emerald-400 transition-colors" size={18} />
                            <input
                              type="number"
                              step="0.01"
                              name="minimum_cart_total"
                              value={form.minimum_cart_total}
                              onChange={handleChange}
                              placeholder="0.00"
                              className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:bg-white/10 transition-all hover:bg-white/10"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* SECTION 3: LOYALTY PROGRAM */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 border-b border-white/10 pb-3">
                        <Award className="text-teal-400" size={24} />
                        <div>
                          <h3 className="text-xl font-bold text-white drop-shadow">Loyalty Program Dynamics</h3>
                          <p className="text-white/60 text-sm">Points calculation and redemption rules for repeat customers.</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Loyalty Points Per GBP */}
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-white/90 ml-1">Points Earned Per £1</label>
                          <div className="relative group">
                            <Percent className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-teal-400 transition-colors" size={18} />
                            <input
                              type="number"
                              step="0.01"
                              name="loyalty_points_per_gbp"
                              value={form.loyalty_points_per_gbp}
                              onChange={handleChange}
                              placeholder="1"
                              className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:bg-white/10 transition-all hover:bg-white/10"
                            />
                          </div>
                        </div>

                        {/* Loyalty Redeem Points */}
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-white/90 ml-1">Points Needed to Redeem</label>
                          <div className="relative group">
                            <Award className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-teal-400 transition-colors" size={18} />
                            <input
                              type="number"
                              step="1"
                              name="loyalty_redeem_points"
                              value={form.loyalty_redeem_points}
                              onChange={handleChange}
                              placeholder="10"
                              className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:bg-white/10 transition-all hover:bg-white/10"
                            />
                          </div>
                        </div>

                        {/* Loyalty Redeem Value */}
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-white/90 ml-1">Value Per Redemption (£)</label>
                          <div className="relative group">
                            <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-teal-400 transition-colors" size={18} />
                            <input
                              type="number"
                              step="0.01"
                              name="loyalty_redeem_value"
                              value={form.loyalty_redeem_value}
                              onChange={handleChange}
                              placeholder="1.00"
                              className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:bg-white/10 transition-all hover:bg-white/10"
                            />
                          </div>
                        </div>

                        {/* Loyalty Available After (Hours) */}
                        <div className="space-y-2 text-white/50 focus-within:text-white transition-colors">
                          <label className="block text-sm font-medium ml-1 flex items-center gap-1.5">
                            <Clock size={14} /> Available After (Hours)
                          </label>
                          <input
                            type="number"
                            step="1"
                            name="loyalty_available_after_hours"
                            value={form.loyalty_available_after_hours}
                            onChange={handleChange}
                            placeholder="24"
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:bg-white/10 transition-all hover:bg-white/10"
                          />
                        </div>

                        {/* Loyalty Expiry Days */}
                        <div className="space-y-2 text-white/50 focus-within:text-white transition-colors">
                          <label className="block text-sm font-medium ml-1 flex items-center gap-1.5">
                            <Calendar size={14} /> Points Expiry (Days)
                          </label>
                          <input
                            type="number"
                            step="1"
                            name="loyalty_expiry_days"
                            value={form.loyalty_expiry_days}
                            onChange={handleChange}
                            placeholder="30"
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:bg-white/10 transition-all hover:bg-white/10"
                          />
                        </div>
                      </div>
                    </div>

                    {/* ACTION BUTTONS */}
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-6 pt-6 border-t border-white/10">
                      <div className="flex items-start gap-3 max-w-xl text-xs text-white/40 italic">
                        <AlertCircle className="shrink-0" size={16} />
                        <p>Changes to these settings will apply immediately to all new registrations, orders, and rewards processing. Please double-check values before saving.</p>
                      </div>
                      <button
                        type="submit"
                        disabled={saving}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-10 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold rounded-2xl shadow-xl hover:shadow-emerald-500/30 transform hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed border border-white/20"
                      >
                        {saving ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            Processing...
                          </>
                        ) : (
                          <>
                            <Save size={22} />
                            Commit Changes
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}

