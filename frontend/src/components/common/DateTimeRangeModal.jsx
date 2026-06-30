import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Clock, X, Search, Check } from "lucide-react";
import { db } from "../../firebase";
import { collection, getDocs } from "firebase/firestore";

/**
 * DateTimeRangeModal
 * Allows user to:
 * 1. Select a date range
 * 2. Select specific customers from a dropdown
 * 3. Specify a time range (HH:MM format)
 * 4. Apply filters to dashboard
 */
const DateTimeRangeModal = ({ isOpen, onClose, onApplyFilters }) => {
  const [activeTab, setActiveTab] = useState("filter"); // "filter" or "compare"
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [compareOption, setCompareOption] = useState("Today vs Yesterday");

  const [customers, setCustomers] = useState([]);
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  const compareOptions = [
    "Today vs Yesterday",
    "This week vs last week",
    "This Month vs Last Month",
    "This Quarter vs Last Quarter",
    "This Half Year Vs Last Half Year",
    "This Year Vs Last Year"
  ];

  // Initialize with today's date
  useEffect(() => {
    if (isOpen) {
      const today = new Date().toISOString().split('T')[0];
      setStartDate(today);
      setEndDate(today);
      setActiveTab("filter");
    }
  }, [isOpen]);

  // Fetch customers on modal open
  useEffect(() => {
    if (isOpen) {
      fetchCustomers();
    }
  }, [isOpen]);

  const fetchCustomers = async () => {
    try {
      const snap = await getDocs(collection(db, "customers"));
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCustomers(data);
    } catch (err) {
      console.error("Failed to fetch customers:", err);
    }
  };

  const getComparisonRanges = (option) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const now = new Date();

    let currStart, currEnd, prevStart, prevEnd;

    switch (option) {
      case 'Today vs Yesterday':
        currStart = new Date(today);
        currEnd = new Date(now);
        prevStart = new Date(today);
        prevStart.setDate(prevStart.getDate() - 1);
        prevEnd = new Date(prevStart);
        break;
      case 'This week vs last week':
        const day = today.getDay() || 7;
        currStart = new Date(today);
        currStart.setDate(today.getDate() - (day - 1));
        currEnd = new Date(now);
        prevStart = new Date(currStart);
        prevStart.setDate(prevStart.getDate() - 7);
        prevEnd = new Date(currEnd);
        prevEnd.setDate(prevEnd.getDate() - 7);
        break;
      case 'This Month vs Last Month':
        currStart = new Date(today.getFullYear(), today.getMonth(), 1);
        currEnd = new Date(now);
        prevStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        prevEnd = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
        // Handle month end overflow
        if (prevEnd.getMonth() === today.getMonth()) {
          prevEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        }
        break;
      case 'This Quarter vs Last Quarter':
        const q = Math.floor(today.getMonth() / 3);
        currStart = new Date(today.getFullYear(), q * 3, 1);
        currEnd = new Date(now);
        prevStart = new Date(today.getFullYear(), (q - 1) * 3, 1);

        // Match duration: how many days into current quarter?
        const diffDaysQ = Math.floor((now - currStart) / (1000 * 60 * 60 * 24));
        prevEnd = new Date(prevStart);
        prevEnd.setDate(prevEnd.getDate() + diffDaysQ);
        break;
      case 'This Half Year Vs Last Half Year':
        const h = today.getMonth() < 6 ? 0 : 6;
        currStart = new Date(today.getFullYear(), h, 1);
        currEnd = new Date(now);
        prevStart = new Date(today.getFullYear(), h - 6, 1);

        const diffDaysH = Math.floor((now - currStart) / (1000 * 60 * 60 * 24));
        prevEnd = new Date(prevStart);
        prevEnd.setDate(prevEnd.getDate() + diffDaysH);
        break;
      case 'This Year Vs Last Year':
        currStart = new Date(today.getFullYear(), 0, 1);
        currEnd = new Date(now);
        prevStart = new Date(today.getFullYear() - 1, 0, 1);
        prevEnd = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
        break;
      default:
        return null;
    }

    return {
      startDate: currStart.toISOString().split('T')[0],
      endDate: currEnd.toISOString().split('T')[0],
      compareStartDate: prevStart.toISOString().split('T')[0],
      compareEndDate: prevEnd.toISOString().split('T')[0],
      label: option
    };
  };

  const handleApplyFilters = () => {
    if (activeTab === "filter") {
      onApplyFilters({
        startDate,
        endDate,
        customerIds: selectedCustomers.map(c => c.id).join(','),
        startTime,
        endTime,
        label: startDate === endDate ? startDate : `${startDate} to ${endDate}`
      });
    } else {
      const ranges = getComparisonRanges(compareOption);
      onApplyFilters({
        ...ranges,
        customerIds: selectedCustomers.map(c => c.id).join(','),
        startTime,
        endTime
      });
    }
    onClose();
  };

  const toggleCustomer = (customer) => {
    setSelectedCustomers(prev => {
      const exists = prev.find(c => c.id === customer.id);
      if (exists) {
        return prev.filter(c => c.id !== customer.id);
      } else {
        return [...prev, customer];
      }
    });
  };

  const filteredCustomers = customers.filter(c => {
    const name = (c.full_name || c.customer_name || '').toLowerCase();
    const email = (c.email || c.customer_email || '').toLowerCase();
    const phone = (c.mobile_number || c.customer_phone || '').toLowerCase();
    const search = customerSearch.toLowerCase();

    return name.includes(search) || email.includes(search) || phone.includes(search);
  });

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-md z-[200] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#1a1c23] border border-white/10 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-900 to-teal-900 px-8 py-6 border-b border-white/10">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-2xl font-black text-white flex items-center gap-3 uppercase tracking-wider">
                <Calendar size={28} className="text-emerald-400" /> Date Range
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-2.5 bg-white/5 hover:bg-white/10 rounded-2xl text-white/70 hover:text-white transition-all border border-white/5"
            >
              <X size={24} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("filter")}
              className={`px-6 py-2 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'filter' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-900/40' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
            >
              Filter
            </button>
            <button
              onClick={() => setActiveTab("compare")}
              className={`px-6 py-2 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'compare' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-900/40' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
            >
              Compare
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
          <div className="space-y-8">

            {activeTab === "filter" ? (
              /* Date Range Section */
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                <label className="block text-sm font-bold text-white/80 mb-3 uppercase tracking-widest">Select Period</label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-white/50 mb-2">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-emerald-500 focus:bg-white/20 transition-all font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/50 mb-2">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-emerald-500 focus:bg-white/20 transition-all font-mono"
                    />
                  </div>
                </div>
              </motion.div>
            ) : (
              /* Compare Tab */
              <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                <label className="block text-sm font-bold text-white/80 mb-3 uppercase tracking-widest">Select Comparison</label>
                <div className="grid grid-cols-1 gap-2">
                  {compareOptions.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setCompareOption(opt)}
                      className={`flex items-center gap-3 px-4 py-4 rounded-2xl border transition-all text-left ${compareOption === opt ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/20'}`}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${compareOption === opt ? 'border-emerald-500' : 'border-white/20'}`}>
                        {compareOption === opt && <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />}
                      </div>
                      <span className="font-bold text-sm">{opt}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            <div className="h-px bg-white/5 w-full" />

            {/* Time Range Section */}
            <div>
              <label className="block text-sm font-bold text-white/80 mb-3 uppercase tracking-widest flex items-center gap-2">
                <Clock size={18} /> Time Range (Optional)
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-white/50 mb-2">From Time</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-emerald-500 focus:bg-white/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-2">To Time</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-emerald-500 focus:bg-white/20 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Customers Section */}
            <div>
              <label className="block text-sm font-bold text-white/80 mb-3 uppercase tracking-widest">
                Customers (Optional)
              </label>
              <div className="relative">
                <div className="flex items-center gap-2 px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus-within:border-emerald-500 focus-within:bg-white/20 transition-all shadow-inner">
                  <Search size={18} className="text-white/40" />
                  <input
                    type="text"
                    placeholder="Search name, email, or phone..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    onFocus={() => setShowCustomerDropdown(true)}
                    className="flex-1 bg-transparent text-white placeholder-white/40 focus:outline-none text-sm"
                  />
                </div>

                {/* Customer Dropdown */}
                <AnimatePresence>
                  {showCustomerDropdown && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowCustomerDropdown(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-[#1f2937] border border-white/10 rounded-2xl shadow-2xl z-50 max-h-[300px] overflow-y-auto custom-scrollbar"
                      >
                        {filteredCustomers.length > 0 ? (
                          filteredCustomers.map((customer) => (
                            <button
                              key={customer.id}
                              onClick={() => toggleCustomer(customer)}
                              className="w-full px-4 py-4 hover:bg-white/10 transition-all text-left border-b border-white/5 last:border-b-0 flex items-center justify-between group"
                            >
                              <div className="flex-1">
                                <p className="text-white font-semibold text-sm group-hover:text-emerald-400 transition-colors">
                                  {customer.full_name || customer.customer_name}
                                </p>
                                <p className="text-white/40 text-[10px] mt-0.5 font-mono">
                                  {customer.mobile_number || customer.email || 'N/A'}
                                </p>
                              </div>
                              {selectedCustomers.find(c => c.id === customer.id) && (
                                <div className="ml-2 w-6 h-6 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-900/40">
                                  <Check size={14} className="text-white" />
                                </div>
                              )}
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-10 text-center">
                            <p className="text-white/30 text-xs italic">No matching customers found</p>
                          </div>
                        )}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>

                {/* Selected Tags */}
                {selectedCustomers.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {selectedCustomers.map((customer) => (
                      <div
                        key={customer.id}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl"
                      >
                        <span className="text-emerald-400 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                          {customer.full_name || customer.customer_name}
                        </span>
                        <button
                          onClick={() => toggleCustomer(customer)}
                          className="text-emerald-400 hover:text-rose-400 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="bg-white/5 p-8 border-t border-white/10 flex justify-between items-center gap-4">
          <button
            onClick={onClose}
            className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest border border-white/20 active:scale-95"
          >
            Cancel
          </button>
          <button
            onClick={handleApplyFilters}
            className="flex-1 max-w-[200px] py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-900/40 active:scale-95 flex items-center justify-center gap-2"
          >
            Apply Filters
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default DateTimeRangeModal;
