import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, AlertTriangle, Info, X, HelpCircle } from "lucide-react";

const GlobalPopup = ({ isOpen, onClose, title, message, type = "success", onConfirm }) => {

    const icons = {
        success: <CheckCircle className="text-emerald-400" size={40} />,
        error: <XCircle className="text-rose-400" size={40} />,
        warning: <AlertTriangle className="text-amber-400" size={40} />,
        info: <Info className="text-blue-400" size={40} />,
        confirm: <HelpCircle className="text-blue-400" size={40} />,
    };

    const bgs = {
        success: "bg-emerald-500/10 border-emerald-500/20",
        error: "bg-rose-500/10 border-rose-500/20",
        warning: "bg-amber-500/10 border-amber-500/20",
        info: "bg-blue-500/10 border-blue-500/20",
        confirm: "bg-blue-500/10 border-blue-500/20",
    };

    const buttonBgs = {
        success: "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/40",
        error: "bg-rose-600 hover:bg-rose-500 shadow-rose-900/40",
        warning: "bg-amber-600 hover:bg-amber-500 shadow-amber-900/40",
        info: "bg-blue-600 hover:bg-blue-500 shadow-blue-900/40",
        confirm: "bg-blue-600 hover:bg-blue-500 shadow-blue-900/40",
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 font-sans">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/60 backdrop-blur-md"
                        onClick={onClose}
                    />

                    {/* Popup Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 40 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 40 }}
                        transition={{ type: "spring", damping: 25, stiffness: 400 }}
                        className="relative w-full max-w-sm bg-zinc-900/95 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden"
                    >
                        {/* Status Icon Area */}
                        <div className={`pt-10 pb-6 flex justify-center`}>
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.1, type: "spring", damping: 12 }}
                                className={`w-20 h-20 rounded-3xl ${bgs[type]} border flex items-center justify-center`}
                            >
                                {icons[type]}
                            </motion.div>
                        </div>

                        {/* Text Content */}
                        <div className="px-8 pb-4 text-center">
                            <h3 className="text-white text-2xl font-black mb-2 tracking-tight">
                                {title || (type === 'confirm' ? 'Are you sure?' : type.charAt(0).toUpperCase() + type.slice(1))}
                            </h3>
                            <p className="text-white/60 leading-relaxed font-medium">
                                {message}
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="p-8 pt-4 flex gap-3">
                            {type === 'confirm' && (
                                <button
                                    onClick={onClose}
                                    className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl transition-all border border-white/5"
                                >
                                    Cancel
                                </button>
                            )}
                            <button
                                onClick={() => {
                                    if (onConfirm) onConfirm();
                                    onClose();
                                }}
                                className={`${type === 'confirm' ? 'flex-1' : 'w-full'} py-4 text-white font-black rounded-2xl shadow-lg transition-all active:scale-[0.97] flex items-center justify-center gap-2 ${buttonBgs[type]}`}
                            >
                                {type === "success" ? "Great!" : type === 'confirm' ? 'Confirm' : "Understood"}
                            </button>
                        </div>

                        {/* Close button */}
                        <button
                            onClick={onClose}
                            className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-white/10 rounded-full text-white/40 hover:text-white transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default GlobalPopup;
