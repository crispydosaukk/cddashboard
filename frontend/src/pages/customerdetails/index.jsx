import React, { useState, useEffect } from "react";
import Header from "../../components/common/header.jsx";
import Sidebar from "../../components/common/sidebar.jsx";
import Footer from "../../components/common/footer.jsx";

import { db } from "../../firebase";
import { collection, getDocs } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import {
    Users, RefreshCw, Phone, Mail, ShoppingBag, CheckCircle,
    TrendingUp, Calendar, Loader2, UserCheck, Eye, X
} from "lucide-react";

const CustomerDetails = () => {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const customersPerPage = 10;
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        try {
            setLoading(true);
            const res = await getDocs(collection(db, "customers"));
            const data = res.docs.map(doc => {
                const c = doc.data();
                return {
                    id: doc.id,
                    ...c,
                    created_at: c.created_at?.toDate ? c.created_at.toDate().toISOString() : c.created_at,
                    date_of_birth: c.date_of_birth?.toDate ? c.date_of_birth.toDate().toISOString() : c.date_of_birth,
                };
            });
            // We can filter if needed, but we'll show all users as the dashboard is an admin view
            setCustomers(data);
            setError(null);
        } catch (err) {
            console.error("Error fetching customers:", err);
            setError("Failed to load customer details");
        } finally {
            setLoading(false);
        }
    };

    const getInitials = (name) => {
        if (!name) return "?";
        const parts = name.split(" ");
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    const stats = {
        total: customers.length,
        active: customers.filter(c => Number(c.live_orders) > 0).length,
        totalOrders: customers.reduce((sum, c) => sum + Number(c.total_orders || 0), 0),
    };

    // Pagination logic
    const indexOfLastCustomer = currentPage * customersPerPage;
    const indexOfFirstCustomer = indexOfLastCustomer - customersPerPage;
    const currentCustomers = customers.slice(indexOfFirstCustomer, indexOfLastCustomer);
    const totalPages = Math.ceil(customers.length / customersPerPage);

    const openCustomerDetails = (customer) => {
        setSelectedCustomer(customer);
        setShowModal(true);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-amber-900 via-teal-800 to-emerald-900">
            <Header onToggleSidebar={() => setSidebarOpen((s) => !s)} darkMode={true} />
            <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <div className={`flex-1 flex flex-col min-h-screen pt-36 lg:pt-24 transition-all duration-300 ease-in-out ${sidebarOpen ? "lg:pl-72" : "lg:pl-0"}`}>
                <main className="flex-1 px-4 sm:px-6 lg:px-10 py-8">
                    <div className="max-w-7xl mx-auto">

                        {/* Page Header */}
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4 }}
                            className="mb-8"
                        >
                            <div className="flex items-center justify-between gap-4 mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20">
                                        <UserCheck className="text-white" size={28} />
                                    </div>
                                    <div>
                                        <h1 className="text-3xl font-bold text-white drop-shadow-lg">Customer Details</h1>
                                        <p className="text-white/90 mt-1 text-base drop-shadow">View customers who have ordered from you</p>
                                    </div>
                                </div>
                                <button
                                    onClick={fetchCustomers}
                                    disabled={loading}
                                    className="px-4 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-xl text-white font-semibold rounded-xl border border-white/20 shadow-xl transition-all duration-200 flex items-center gap-2 disabled:opacity-50 text-base"
                                >
                                    <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                                    Refresh
                                </button>
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
                                            <p className="text-sm font-medium text-white/80">Active Orders</p>
                                            <p className="text-3xl font-bold text-white mt-1 drop-shadow-lg">{stats.active}</p>
                                        </div>
                                        <div className="p-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
                                            <TrendingUp className="text-white" size={24} />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-5 border border-white/20 shadow-2xl hover:bg-white/15 transition-all duration-300">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-white/80">Total Orders</p>
                                            <p className="text-3xl font-bold text-white mt-1 drop-shadow-lg">{stats.totalOrders}</p>
                                        </div>
                                        <div className="p-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
                                            <ShoppingBag className="text-white" size={24} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Error Message */}
                        {error && (
                            <div className="mb-4 bg-red-500/20 backdrop-blur-md text-red-100 p-4 rounded-xl border border-red-400/30 flex items-center gap-2 text-base shadow-lg">
                                <span className="font-medium">{error}</span>
                            </div>
                        )}

                        {/* Table Container - Glassmorphism */}
                        <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden">

                            {/* Table Header */}
                            <div className="bg-white/5 backdrop-blur-md px-6 py-4 border-b border-white/10">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2 drop-shadow-lg">
                                    <Users size={20} />
                                    Customer List ({customers.length})
                                </h2>
                            </div>

                            {/* Desktop Table View */}
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-white/10">
                                    <thead className="bg-white/5 backdrop-blur-md">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-white/80 uppercase tracking-wider">#</th>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-white/80 uppercase tracking-wider">Customer</th>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-white/80 uppercase tracking-wider">Contact</th>
                                            <th className="px-6 py-4 text-center text-xs font-bold text-white/80 uppercase tracking-wider">Live Orders</th>
                                            <th className="px-6 py-4 text-center text-xs font-bold text-white/80 uppercase tracking-wider">Total Orders</th>
                                            <th className="px-6 py-4 text-center text-xs font-bold text-white/80 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {loading ? (
                                            <tr>
                                                <td colSpan="6" className="px-6 py-12 text-center">
                                                    <div className="flex flex-col items-center justify-center text-white">
                                                        <Loader2 className="animate-spin text-4xl mb-3" />
                                                        <span className="text-white/80 font-medium text-base">Loading customers...</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : customers.length === 0 ? (
                                            <tr>
                                                <td colSpan="6" className="px-6 py-12 text-center">
                                                    <Users size={48} className="mx-auto text-white/30 mb-3" />
                                                    <p className="text-white/70 font-medium text-base">No customers found</p>
                                                    <p className="text-sm text-white/50 mt-1">Customers will appear here once they place orders</p>
                                                </td>
                                            </tr>
                                        ) : (
                                            currentCustomers.map((customer, idx) => (
                                                <motion.tr
                                                    key={customer.id}
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    transition={{ delay: idx * 0.02 }}
                                                    className="hover:bg-white/5 transition-colors duration-200"
                                                >
                                                    <td className="px-6 py-4 text-base text-white/90 font-medium">
                                                        #{customer.id}
                                                    </td>

                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-base shadow-lg">
                                                                {getInitials(customer.full_name)}
                                                            </div>
                                                            <div>
                                                                <p className="text-base font-semibold text-white">{customer.full_name || "-"}</p>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col gap-1">
                                                            {customer.email && (
                                                                <div className="flex items-center gap-2 text-base text-white/90">
                                                                    <Mail size={14} className="text-emerald-300" />
                                                                    <span>{customer.email}</span>
                                                                </div>
                                                            )}
                                                            {customer.mobile_number && (
                                                                <div className="flex items-center gap-2 text-base text-white/90">
                                                                    <Phone size={14} className="text-emerald-300" />
                                                                    <span>{customer.mobile_number}</span>
                                                                </div>
                                                            )}
                                                            {!customer.email && !customer.mobile_number && (
                                                                <span className="text-white/50 text-base">-</span>
                                                            )}
                                                        </div>
                                                    </td>

                                                    <td className="px-6 py-4 text-center">
                                                        {Number(customer.live_orders) > 0 ? (
                                                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 animate-pulse backdrop-blur-md">
                                                                <TrendingUp size={12} />
                                                                {customer.live_orders} Active
                                                            </span>
                                                        ) : (
                                                            <span className="text-white/50 text-base">-</span>
                                                        )}
                                                    </td>

                                                    <td className="px-6 py-4 text-center">
                                                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-base font-bold bg-teal-500/30 text-teal-200 border border-teal-400/30 backdrop-blur-md">
                                                            <ShoppingBag size={14} />
                                                            {customer.total_orders || 0}
                                                        </span>
                                                    </td>

                                                    <td className="px-6 py-4 text-center">
                                                        <button
                                                            onClick={() => openCustomerDetails(customer)}
                                                            className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-semibold rounded-xl border border-white/20 transition-all duration-200 text-base shadow-lg"
                                                        >
                                                            <Eye size={16} />
                                                            View
                                                        </button>
                                                    </td>
                                                </motion.tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {!loading && customers.length > customersPerPage && (
                                <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between bg-white/5 backdrop-blur-md">
                                    <div className="text-base text-white/80">
                                        Showing {indexOfFirstCustomer + 1} to {Math.min(indexOfLastCustomer, customers.length)} of {customers.length} customers
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                            disabled={currentPage === 1}
                                            className="px-3 py-1.5 text-base font-medium text-white bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors backdrop-blur-md"
                                        >
                                            Previous
                                        </button>

                                        <div className="flex items-center gap-1">
                                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                                <button
                                                    key={page}
                                                    onClick={() => setCurrentPage(page)}
                                                    className={`px-3 py-1.5 text-base font-medium rounded-xl transition-colors backdrop-blur-md ${currentPage === page
                                                        ? 'bg-white/30 text-white border border-white/40'
                                                        : 'text-white/80 bg-white/10 border border-white/20 hover:bg-white/20'
                                                        }`}
                                                >
                                                    {page}
                                                </button>
                                            ))}
                                        </div>

                                        <button
                                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                            disabled={currentPage === totalPages}
                                            className="px-3 py-1.5 text-base font-medium text-white bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors backdrop-blur-md"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )}
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
                                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                                        {getInitials(selectedCustomer.full_name)}
                                    </div>
                                    <div>
                                        <h4 className="text-2xl font-bold text-white drop-shadow-lg">{selectedCustomer.full_name}</h4>
                                        <p className="text-base text-white/70">Customer ID: #{selectedCustomer.id}</p>
                                    </div>
                                </div>

                                {/* Contact Information */}
                                <div className="mb-6">
                                    <h5 className="text-lg font-bold text-white mb-4 drop-shadow">Contact Information</h5>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {selectedCustomer.mobile_number && (
                                            <div className="flex items-center gap-3 p-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
                                                <Phone size={20} className="text-emerald-300" />
                                                <div>
                                                    <p className="text-sm text-white/60">Phone</p>
                                                    <p className="text-base font-semibold text-white">{selectedCustomer.mobile_number}</p>
                                                </div>
                                            </div>
                                        )}
                                        {selectedCustomer.email && (
                                            <div className="flex items-center gap-3 p-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
                                                <Mail size={20} className="text-emerald-300" />
                                                <div>
                                                    <p className="text-sm text-white/60">Email</p>
                                                    <p className="text-base font-semibold text-white">{selectedCustomer.email}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Order Statistics */}
                                <div className="mb-6">
                                    <h5 className="text-lg font-bold text-white mb-4 drop-shadow">Order Statistics</h5>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div className="p-4 bg-emerald-500/20 backdrop-blur-md rounded-xl border border-emerald-400/30">
                                            <div className="flex items-center gap-2 mb-2">
                                                <TrendingUp size={20} className="text-emerald-300" />
                                                <p className="text-sm font-medium text-emerald-200">Live Orders</p>
                                            </div>
                                            <p className="text-2xl font-bold text-white drop-shadow-lg">{Number(selectedCustomer.live_orders || 0)}</p>
                                        </div>
                                        <div className="p-4 bg-teal-500/20 backdrop-blur-md rounded-xl border border-teal-400/30">
                                            <div className="flex items-center gap-2 mb-2">
                                                <CheckCircle size={20} className="text-teal-300" />
                                                <p className="text-sm font-medium text-teal-200">Completed</p>
                                            </div>
                                            <p className="text-2xl font-bold text-white drop-shadow-lg">{Number(selectedCustomer.completed_orders || 0)}</p>
                                        </div>
                                        <div className="p-4 bg-amber-500/20 backdrop-blur-md rounded-xl border border-amber-400/30">
                                            <div className="flex items-center gap-2 mb-2">
                                                <ShoppingBag size={20} className="text-amber-300" />
                                                <p className="text-sm font-medium text-amber-200">Total Orders</p>
                                            </div>
                                            <p className="text-2xl font-bold text-white drop-shadow-lg">{Number(selectedCustomer.total_orders || 0)}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Account Info */}
                                <div className="pt-4 border-t border-white/10">
                                    <div className="flex items-center justify-between text-base text-white/70">
                                        <span>Last Seen:</span>
                                        <span className="font-semibold text-white">
                                            {selectedCustomer.last_seen ? new Date(selectedCustomer.last_seen).toLocaleDateString('en-GB') : "N/A"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CustomerDetails;
