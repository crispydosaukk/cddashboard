import React, { useEffect, useMemo, useRef, useState } from "react";
import Header from "../../components/common/header.jsx";
import Sidebar from "../../components/common/sidebar.jsx";
import Footer from "../../components/common/footer.jsx";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, Edit, Trash2, X, Shield, ChevronDown, Check } from "lucide-react";
import { usePopup } from "../../context/PopupContext";
import { db } from "../../firebase";
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc, addDoc } from "firebase/firestore";

// Helper: Custom Glass MultiSelect
const GlassMultiSelect = ({ loading, options, selected, onToggle, label }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const labelText = useMemo(() => {
    if (loading) return "Loading...";
    if (!options?.length) return "No items found";
    if (!selected?.length) return `Select ${label}...`;
    const picked = options.filter((o) => selected.includes(o.id)).map((o) => o.title);
    if (picked.length <= 2) return picked.join(", ");
    return `${picked.slice(0, 2).join(", ")} +${picked.length - 2} more`;
  }, [loading, options, selected, label]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-left focus:outline-none focus:ring-2 focus:ring-emerald-500/50 flex justify-between items-center text-white transition-all hover:bg-white/10"
      >
        <span className={selected.length ? "text-white" : "text-white/40"}>{labelText}</span>
        <ChevronDown size={16} className={`text-white/40 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            className="absolute z-50 mt-2 w-full rounded-xl border border-white/20 bg-slate-900/90 backdrop-blur-xl shadow-2xl max-h-60 overflow-y-auto custom-scrollbar"
          >
            {loading ? (
              <div className="px-4 py-3 text-white/50 text-sm">Loading...</div>
            ) : !options?.length ? (
              <div className="px-4 py-3 text-white/50 text-sm">No items found</div>
            ) : (
              <div className="p-2 space-y-1">
                {options.map((opt) => {
                  const active = selected.includes(opt.id);
                  return (
                    <div
                      key={opt.id}
                      onClick={() => onToggle(opt.id)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${active ? "bg-emerald-600/20 text-emerald-300" : "hover:bg-white/10 text-white/80"}`}
                    >
                      <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${active ? "bg-emerald-500 border-emerald-500" : "border-white/30"}`}>
                        {active && <Check size={12} className="text-white" />}
                      </div>
                      <span className="text-sm font-medium">{opt.title}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};


export default function Roles() {
  const { showPopup } = usePopup();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Create modal
  const [openCreate, setOpenCreate] = useState(false);
  const [roleTitle, setRoleTitle] = useState("");

  // Edit modal
  const [openEdit, setOpenEdit] = useState(false);
  const [editRole, setEditRole] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSelectedIds, setEditSelectedIds] = useState([]);

  // Permissions
  const [permLoading, setPermLoading] = useState(true);
  const [permError, setPermError] = useState("");
  const [permissions, setPermissions] = useState([]);

  // Selected permissions for CREATE
  const [selectedIds, setSelectedIds] = useState([]);

  // Roles list
  const [rolesLoading, setRolesLoading] = useState(true);
  const [rolesError, setRolesError] = useState("");
  const [roles, setRoles] = useState([]);

  // Search
  const [searchTerm, setSearchTerm] = useState("");
  const pageSize = 10;

  const fetchRoles = async (perms = permissions) => {
    try {
      setRolesLoading(true);
      const res = await getDocs(collection(db, "roles"));
      const list = res.docs.map(docSnap => {
         const data = docSnap.data();
         let pIds = data.permission_ids;
         if (typeof pIds === 'string') {
             try { pIds = JSON.parse(pIds); } catch(e){ pIds = []; }
         }
         if (!Array.isArray(pIds)) pIds = [];
         
         const rolePerms = pIds.map(id => perms.find(p => String(p.id) === String(id))).filter(Boolean);
         return { id: docSnap.id, ...data, permissions: rolePerms };
      });
      setRoles(list);
      setRolesError("");
    } catch (e) {
      setRolesError(e?.message || "Failed to load roles");
    } finally {
      setRolesLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        setPermLoading(true);
        const res = await getDocs(collection(db, "permissions"));
        const list = res.docs.map(d => ({ id: d.id, ...d.data() }));
        setPermissions(list);
        setPermError("");
        await fetchRoles(list);
      } catch (e) {
        setPermError(e?.message || "Failed to load permissions");
      } finally {
        setPermLoading(false);
      }
    })();
  }, []);

  // Multi-select helpers
  const allIds = useMemo(() => permissions.map((p) => p.id), [permissions]);
  const handleSelectAll = () => setSelectedIds(allIds);
  const handleDeselectAll = () => setSelectedIds([]);
  const toggleOne = (id) => setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const editAllIds = useMemo(() => permissions.map((p) => p.id), [permissions]);
  const editHandleSelectAll = () => setEditSelectedIds(editAllIds);
  const editHandleDeselectAll = () => setEditSelectedIds([]);
  const editToggleOne = (id) => setEditSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  // Create
  const [submitting, setSubmitting] = useState(false);
  const handleSubmit = async () => {
    if (!roleTitle.trim()) return;
    try {
      setSubmitting(true);
      const permission_ids = selectedIds.map(String).filter(Boolean);
      await addDoc(collection(db, "roles"), { title: roleTitle.trim(), permission_ids });
      await fetchRoles(permissions);
      setRoleTitle("");
      setSelectedIds([]);
      setOpenCreate(false);
      showPopup({ title: "Success", message: `Role "${roleTitle}" created.`, type: "success" });
    } catch (e) {
      showPopup({ title: "Error", message: e?.message || "Failed to create role", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  // Edit
  const onEdit = (role) => {
    setEditRole(role);
    setEditTitle(role?.title || "");
    const pre = (role?.permissions || []).map((p) => p.id);
    setEditSelectedIds(pre);
    setOpenEdit(true);
  };

  const [updating, setUpdating] = useState(false);
  const handleUpdate = async () => {
    if (!editTitle.trim()) return;
    try {
      setUpdating(true);
      const permission_ids = editSelectedIds.map(String).filter(Boolean);
      await updateDoc(doc(db, "roles", String(editRole.id)), { title: editTitle.trim(), permission_ids });
      await fetchRoles(permissions);
      setOpenEdit(false);
      setEditRole(null);
      setEditTitle("");
      setEditSelectedIds([]);
      showPopup({ title: "Success", message: "Role updated successfully.", type: "success" });
    } catch (e) {
      showPopup({ title: "Error", message: e?.message || "Failed to update role", type: "error" });
    } finally {
      setUpdating(false);
    }
  };

  // Delete
  const [deletingId, setDeletingId] = useState(null);
  const handleDelete = async (role) => {
    if (!role?.id) return;
    showPopup({
      title: "Delete Role?",
      message: `Are you sure you want to delete the role "${role.title}"?`,
      type: "confirm",
      onConfirm: async () => {
        try {
          setDeletingId(role.id);
          await deleteDoc(doc(db, "roles", String(role.id)));
          await fetchRoles(permissions);
          showPopup({ title: "Deleted", message: "Role removed successfully.", type: "success" });
        } catch (e) {
          showPopup({ title: "Error", message: e?.message || "Failed to delete role", type: "error" });
        } finally {
          setDeletingId(null);
        }
      }
    });
  };

  // Filter
  const filteredRoles = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter((r) => {
      const inTitle = String(r.title || "").toLowerCase().includes(q);
      const inPerms = (r.permissions || []).some((p) => String(p.title || "").toLowerCase().includes(q));
      return inTitle || inPerms;
    });
  }, [roles, searchTerm]);

  const renderPermissionsInline = (permArr = []) => {
    if (!permArr.length) return <span className="text-white/40 italic">No permissions</span>;
    return (
      <div className="flex flex-wrap gap-1.5">
        {permArr.map((p, i) => (
          <span key={p.id || i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
            {p.title}
          </span>
        ))}
      </div>
    );
  };

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
                Manage Roles
              </h2>
              <p className="mt-2 text-white/70">Configure user roles and their associated permissions.</p>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <button
                onClick={() => setOpenCreate(true)}
                className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600/80 hover:bg-emerald-600 backdrop-blur-md text-white rounded-xl font-bold shadow-lg border border-white/20 transition-all hover:-translate-y-0.5"
              >
                <Plus size={20} />
                Add Role
              </button>
            </div>
          </motion.div>

          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            {/* Toolbar */}
            <div className="p-4 border-b border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white/5">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                  <input
                    type="text"
                    placeholder="Search roles or permissions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                  />
                </div>
              </div>
              <div className="text-white/50 text-sm font-medium">
                {filteredRoles.length} entries
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10 text-white/70 text-xs uppercase tracking-wider">
                    <th className="px-6 py-4 font-bold w-16">#</th>
                    <th className="px-6 py-4 font-bold w-48">Role Title</th>
                    <th className="px-6 py-4 font-bold">Permissions</th>
                    <th className="px-6 py-4 font-bold text-right w-40">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-white/90">
                  {rolesLoading ? (
                    <tr><td colSpan={4} className="px-6 py-8 text-center text-white/50">Loading roles...</td></tr>
                  ) : rolesError ? (
                    <tr><td colSpan={4} className="px-6 py-8 text-center text-red-300">{rolesError}</td></tr>
                  ) : filteredRoles.length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-8 text-center text-white/50">No roles found</td></tr>
                  ) : (
                    filteredRoles.map((r, idx) => (
                      <motion.tr
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        key={r.id}
                        className="hover:bg-white/5 transition-colors"
                      >
                        <td className="px-6 py-4 text-white/50">{idx + 1}</td>
                        <td className="px-6 py-4 font-bold text-emerald-300">{r.title}</td>
                        <td className="px-6 py-4">
                          {renderPermissionsInline(r.permissions)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => onEdit(r)}
                              className="p-2 bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 rounded-lg transition-colors border border-blue-500/30"
                              title="Edit"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(r)}
                              disabled={deletingId === r.id}
                              className="p-2 bg-red-500/20 text-red-300 hover:bg-red-500/30 rounded-lg transition-colors border border-red-500/30 disabled:opacity-50"
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
              <span>Showing {Math.min(filteredRoles.length, pageSize)} of {filteredRoles.length} entries</span>
              <div className="flex gap-1">
                <button className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-50" disabled>&laquo;</button>
                <button className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">1</button>
                <button className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-50" disabled>&raquo;</button>
              </div>
            </div>
          </div>
          {permError && <div className="mt-4 p-4 bg-red-500/20 border border-red-500/40 rounded-xl text-red-200">{permError}</div>}
        </main>
        <Footer />
      </div>

      {/* CREATE MODAL */}
      <AnimatePresence>
        {openCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setOpenCreate(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-xl bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden p-6 max-h-[90vh] flex flex-col"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Create New Role</h3>
                <button onClick={() => setOpenCreate(false)} className="text-white/50 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pr-2">
                <div>
                  <label className="text-sm font-medium text-white/80 mb-2 block">Role Title</label>
                  <input
                    autoFocus
                    placeholder="e.g. Moderator"
                    value={roleTitle}
                    onChange={(e) => setRoleTitle(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-white/80 block">Assign Permissions</label>
                    <div className="flex gap-2">
                      <button type="button" onClick={handleSelectAll} className="px-2 py-1 text-xs font-semibold rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30">Select All</button>
                      <button type="button" onClick={handleDeselectAll} className="px-2 py-1 text-xs font-semibold rounded-lg bg-white/5 text-white/60 border border-white/10 hover:bg-white/10">Deselect All</button>
                    </div>
                  </div>
                  <GlassMultiSelect
                    loading={permLoading}
                    options={permissions}
                    selected={selectedIds}
                    onToggle={toggleOne}
                    label="permissions"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/10">
                <button onClick={() => setOpenCreate(false)} className="px-5 py-2.5 rounded-xl border border-white/10 text-white/70 hover:bg-white/10 transition-colors">Cancel</button>
                <button onClick={handleSubmit} disabled={submitting || !roleTitle.trim()} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-lg border border-white/10 transition-all hover:-translate-y-0.5 disabled:opacity-60">
                  {submitting ? "Creating..." : "Create Role"}
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
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setOpenEdit(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-xl bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden p-6 max-h-[90vh] flex flex-col"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Edit Role</h3>
                <button onClick={() => setOpenEdit(false)} className="text-white/50 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pr-2">
                <div>
                  <label className="text-sm font-medium text-white/80 mb-2 block">Role Title</label>
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-white/80 block">Assign Permissions</label>
                    <div className="flex gap-2">
                      <button type="button" onClick={editHandleSelectAll} className="px-2 py-1 text-xs font-semibold rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30">Select All</button>
                      <button type="button" onClick={editHandleDeselectAll} className="px-2 py-1 text-xs font-semibold rounded-lg bg-white/5 text-white/60 border border-white/10 hover:bg-white/10">Deselect All</button>
                    </div>
                  </div>
                  <GlassMultiSelect
                    loading={permLoading}
                    options={permissions}
                    selected={editSelectedIds}
                    onToggle={editToggleOne}
                    label="permissions"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/10">
                <button onClick={() => setOpenEdit(false)} className="px-5 py-2.5 rounded-xl border border-white/10 text-white/70 hover:bg-white/10 transition-colors">Cancel</button>
                <button onClick={handleUpdate} disabled={updating || !editTitle.trim()} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-lg border border-white/10 transition-all hover:-translate-y-0.5 disabled:opacity-60">
                  {updating ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
