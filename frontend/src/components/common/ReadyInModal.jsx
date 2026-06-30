import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, X, CheckCircle } from "lucide-react";

const ReadyInModal = ({ isOpen, onClose, onConfirm, orderNumber }) => {
    const [minutes, setMinutes] = useState("");
    const [error, setError] = useState("");

    const handleConfirm = () => {
        const mins = parseInt(minutes);
        if (!mins || mins <= 0) {
            setError("Please enter a valid time");
            return;
        }
        onConfirm(mins);
        setMinutes("");
        setError("");
    };

    const quickTimes = [5, 10, 15, 20, 30, 45];

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 font-sans">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/80 backdrop-blur-md"
                        onClick={onClose}
                    />

                    {/* Modal content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-md bg-zinc-900/90 border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-white/5 bg-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 border border-emerald-500/30">
                                    <Clock size={20} />
                                </div>
                                <div>
                                    <h3 className="text-white font-bold text-lg">Preparation Time</h3>
                                    <p className="text-white/40 text-xs uppercase tracking-widest font-bold">Order #{orderNumber}</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/10 rounded-xl text-white/40 hover:text-white transition-colors"
                                id="close_ready_modal"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-8">
                            <div className="mb-8">
                                <label className="block text-white/60 text-sm font-medium mb-3">Ready in how many minutes?</label>
                                <div className="relative group">
                                    <input
                                        type="number"
                                        value={minutes}
                                        onChange={(e) => {
                                            setMinutes(e.target.value);
                                            if (error) setError("");
                                        }}
                                        placeholder="e.g. 15"
                                        className={`w-full bg-white/5 border ${error ? 'border-rose-500/50' : 'border-white/10'} rounded-2xl px-5 py-4 text-white text-2xl font-bold placeholder-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all text-center`}
                                        autoFocus
                                        onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
                                        id="ready_minutes_input"
                                    />
                                    <div className="absolute right-6 top-1/2 -translate-y-1/2 text-white/20 font-bold uppercase tracking-widest text-xs pointer-events-none">
                                        Mins
                                    </div>
                                </div>
                                {error && <p className="text-rose-400 text-xs mt-2 font-medium text-center">{error}</p>}
                            </div>

                            {/* Quick Select */}
                            <div className="grid grid-cols-3 gap-3">
                                {quickTimes.map((t) => (
                                    <button
                                        key={t}
                                        onClick={() => {
                                            setMinutes(t.toString());
                                            setError("");
                                        }}
                                        className={`py-3 rounded-xl border text-sm font-bold transition-all ${minutes === t.toString()
                                                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                                                : 'bg-white/5 border-white/5 text-white/60 hover:border-white/20 hover:text-white'
                                            }`}
                                    >
                                        {t} Min
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 bg-white/5 border-t border-white/5 flex gap-3">
                            <button
                                onClick={onClose}
                                className="flex-1 py-4 px-6 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl transition-all border border-white/5"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirm}
                                className="flex-1 py-4 px-6 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl shadow-lg shadow-emerald-900/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                                id="confirm_ready_time"
                            >
                                <CheckCircle size={20} />
                                Accept Order
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default ReadyInModal;
