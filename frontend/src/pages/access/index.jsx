import React, { useEffect, useState } from "react";
import Header from "../../components/common/header.jsx";
import Sidebar from "../../components/common/sidebar.jsx";
import Footer from "../../components/common/footer.jsx";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, Edit, Trash2, X, Shield } from "lucide-react";
import { db } from "../../firebase";
import { collection, getDocs, doc, addDoc, updateDoc, deleteDoc } from "firebase/firestore";

export default function AccessManagement() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [openModal, setOpenModal] = useState(false); // create modal
  const [title, setTitle] = useState("");
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // edit state
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editingId, setEditingId] = useState(null);

  const [search, setSearch] = useState("");

  async function loadPermissions() {
    try {
      setLoading(true);
      const res = await getDocs(collection(db, "permissions"));
      const list = res.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPermissions(list);
      setError("");
    } catch (e) {
      setError(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadPermissions(); }, []);

  async function handleCreate() {
    if (!title.trim()) { setError("Title is required"); return; }
    try {
      setSubmitting(true);
      await addDoc(collection(db, "permissions"), { 
        title: title.trim(), 
        created_at: new Date().toISOString() 
      });
      setTitle("");
      setOpenModal(false);
      await loadPermissions();
    } catch (e) {
      setError(e.message || "Failed to create");
    } finally {
      setSubmitting(false);
    }
  }

  function openEdit(p) {
    setEditingId(p.id);
    setEditTitle(p.title || "");
    setEditOpen(true);
  }

  async function handleEditSave() {
    if (!editTitle.trim()) { setError("Title is required"); return; }
    try {
      setSubmitting(true);
      await updateDoc(doc(db, "permissions", String(editingId)), { title: editTitle.trim() });
      setEditOpen(false);
      setEditingId(null);
      setEditTitle("");
      await loadPermissions();
    } catch (e) {
      setError(e.message || "Failed to update");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    const ok = window.confirm("Delete this permission?");
    if (!ok) return;
    try {
      await deleteDoc(doc(db, "permissions", String(id)));
      // optimistic update
      setPermissions(prev => prev.filter(p => p.id !== id));
    } catch (e) {
      setError(e.message || "Failed to delete");
    }
  }

  const filtered = permissions.filter(p =>
    (p.title || "").toLowerCase().includes(search.toLowerCase().trim())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-900 via-teal-800 to-emerald-900 font-sans">
      <Header onToggleSidebar={() => setSidebarOpen((s) => !s)} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className={`flex-1 flex flex-col pt-36 lg:pt-24 transition-all duration-300 ease-in-out ${sidebarOpen ? "lg:pl-72" : "lg:pl-0"}`}>
        <main className="flex-1 px-4 sm:px-6 lg:px-10 py-8">

          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8"
          >
            <div>
              <h2 className="text-3xl font-bold text-white drop-shadow-lg flex items-center gap-3">
                <Shield className="text-emerald-400" size={32} />
                Permissions
              </h2>
              <p className="mt-2 text-white/70">Manage system access levels and capabilities.</p>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <button
                onClick={() => setOpenModal(true)}
                className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600/80 hover:bg-emerald-600 backdrop-blur-md text-white rounded-xl font-bold shadow-lg border border-white/20 transition-all hover:-translate-y-0.5"
              >
                <Plus size={20} />
                Create Permission
              </button>
            </div>
          </motion.div>

          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            {/* Toolbar */}
            <div className="p-4 border-b border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white/5">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                  <input
                    type="text"
                    placeholder="Search permissions..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                  />
                </div>
              </div>
              <div className="text-white/50 text-sm font-medium">
                {filtered.length} entries
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10 text-white/70 text-xs uppercase tracking-wider">
                    <th className="px-6 py-4 font-bold w-20">#</th>
                    <th className="px-6 py-4 font-bold">Permission Title</th>
                    <th className="px-6 py-4 font-bold">Created At</th>
                    <th className="px-6 py-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-white/90">
                  {loading ? (
                    <tr><td colSpan={4} className="px-6 py-8 text-center text-white/50">Loading permissions...</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-8 text-center text-white/50">No permissions found</td></tr>
                  ) : (
                    filtered.map((p, idx) => (
                      <motion.tr
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        key={p.id}
                        className="hover:bg-white/5 transition-colors"
                      >
                        <td className="px-6 py-4 text-white/50">{idx + 1}</td>
                        <td className="px-6 py-4 font-medium">{p.title}</td>
                        <td className="px-6 py-4 text-white/60 text-sm">
                          {p.created_at ? new Date(p.created_at).toLocaleDateString() : "-"}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEdit(p)}
                              className="p-2 bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 rounded-lg transition-colors border border-blue-500/30"
                              title="Edit"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(p.id)}
                              className="p-2 bg-red-500/20 text-red-300 hover:bg-red-500/30 rounded-lg transition-colors border border-red-500/30"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10 bg-white/5 text-white/50 text-sm flex justify-between items-center">
              <span>Showing {filtered.length} entries</span>
              {/* Pagination Placeholders */}
              <div className="flex gap-1">
                <button className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-50" disabled>&laquo;</button>
                <button className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">1</button>
                <button className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-50" disabled>&raquo;</button>
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-500/20 border border-red-500/40 rounded-xl text-red-200 flex items-center gap-2 animate-pulse">
              <div className="w-2 h-2 rounded-full bg-red-400" />
              {error}
            </div>
          )}
        </main>

        <Footer />
      </div>

      {/* CREATE MODAL */}
      <AnimatePresence>
        {openModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setOpenModal(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden p-6"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">New Permission</h3>
                <button onClick={() => setOpenModal(false)} className="text-white/50 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-white/80 mb-2 block">Permission Title</label>
                  <input
                    autoFocus
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    placeholder="e.g. DELETE_USERS"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/10">
                  <button onClick={() => setOpenModal(false)} className="px-5 py-2.5 rounded-xl border border-white/10 text-white/70 hover:bg-white/10 transition-colors">
                    Cancel
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={submitting}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-lg border border-white/10 transition-all hover:-translate-y-0.5 disabled:opacity-60"
                  >
                    {submitting ? "Creating..." : "Create Permission"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT MODAL */}
      <AnimatePresence>
        {editOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setEditOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden p-6"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Edit Permission</h3>
                <button onClick={() => setEditOpen(false)} className="text-white/50 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-white/80 mb-2 block">Permission Title</label>
                  <input
                    autoFocus
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                  />
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/10">
                  <button onClick={() => setEditOpen(false)} className="px-5 py-2.5 rounded-xl border border-white/10 text-white/70 hover:bg-white/10 transition-colors">
                    Cancel
                  </button>
                  <button
                    onClick={handleEditSave}
                    disabled={submitting}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-lg border border-white/10 transition-all hover:-translate-y-0.5 disabled:opacity-60"
                  >
                    {submitting ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
