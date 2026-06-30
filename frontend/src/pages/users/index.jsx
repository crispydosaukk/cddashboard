import React, { useEffect, useMemo, useRef, useState } from "react";
import Header from "../../components/common/header.jsx";
import Sidebar from "../../components/common/sidebar.jsx";
import Footer from "../../components/common/footer.jsx";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, Edit, Trash2, X, Users as UsersIcon, ChevronDown, Check, User, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { usePopup } from "../../context/PopupContext";
import { db, firebaseConfig } from "../../firebase";
import { collection, getDocs, doc, deleteDoc, updateDoc, addDoc } from "firebase/firestore";
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";

// Helper: Custom Glass MultiSelect (reused concept)
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

export default function Users() {
  const { showPopup } = usePopup();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Table state
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");

  // Roles
  const [rolesLoading, setRolesLoading] = useState(true);
  const [rolesError, setRolesError] = useState("");
  const [roleOptions, setRoleOptions] = useState([]);

  // Create modal
  const [openCreate, setOpenCreate] = useState(false);
  const [cName, setCName] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cPassword, setCPassword] = useState("");
  const [showCPassword, setShowCPassword] = useState(false);
  const [cRoleIds, setCRoleIds] = useState([]);
  const [saving, setSaving] = useState(false);
  const canSave = cName.trim() && cEmail.trim() && cRoleIds.length > 0;

  // Edit modal
  const [openEdit, setOpenEdit] = useState(false);
  const [eId, setEId] = useState(null);
  const [eName, setEName] = useState("");
  const [eEmail, setEEmail] = useState("");
  const [ePassword, setEPassword] = useState("");
  const [showEPassword, setShowEPassword] = useState(false);
  const [eRoleIds, setERoleIds] = useState([]);
  const [updating, setUpdating] = useState(false);
  const canUpdate = eId && eName.trim() && eEmail.trim() && eRoleIds.length > 0;

  // Load roles
  useEffect(() => {
    (async () => {
      try {
        setRolesLoading(true);
        const res = await getDocs(collection(db, "roles"));
        const list = res.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setRoleOptions(list.map(r => ({ id: r.id, title: r.title })));
        setRolesError("");
      } catch (e) {
        setRolesError(e?.message || "Failed to load roles");
      } finally {
        setRolesLoading(false);
      }
    })();
  }, []);

  // Load users
  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      const res = await getDocs(collection(db, "users"));
      const usersData = res.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Join roles to get role_title
      const finalUsers = usersData.map(u => {
        const role = roleOptions.find(r => String(r.id) === String(u.role_id));
        return {
          ...u,
          role_title: role ? role.title : null
        };
      });

      setUsers(finalUsers);
      setUsersError("");
    } catch (e) {
      setUsersError(e?.message || "Failed to load users");
    } finally {
      setUsersLoading(false);
    }
  };
  
  // Refetch users when roles change so role titles are hydrated
  useEffect(() => { 
    if (!rolesLoading) {
       fetchUsers(); 
    }
  }, [rolesLoading, roleOptions]);

  // Search
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return users;
    return users.filter((u) => {
      const role = (u.role_title || "").toLowerCase();
      const pwd = u.has_password ? "password set" : "no password";
      return (
        (u.name || "").toLowerCase().includes(needle) ||
        (u.email || "").toLowerCase().includes(needle) ||
        role.includes(needle) ||
        pwd.includes(needle)
      );
    });
  }, [q, users]);

  useEffect(() => setPage(1), [q, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageSlice = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  // Create
  const handleCreate = async () => {
    if (!canSave) return;
    try {
      setSaving(true);
      const role_id = cRoleIds[0] || null;
      
      // 1. Create user in Firebase Auth using secondary app to not disrupt current session
      const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp" + Date.now());
      const secondaryAuth = getAuth(secondaryApp);
      await createUserWithEmailAndPassword(secondaryAuth, cEmail, cPassword);
      await secondaryAuth.signOut();
      
      // 2. Add to Firestore users collection
      await addDoc(collection(db, "users"), { 
        name: cName, 
        email: cEmail, 
        password: cPassword, // Save password in plain text so it can be viewed later
        role_id: String(role_id), 
        status: 1 
      });

      setCName(""); setCEmail(""); setCPassword(""); setCRoleIds([]);
      setOpenCreate(false);
      await fetchUsers();
      showPopup({ title: "User Created", message: `Successfully added ${cName}.`, type: "success" });
    } catch (e) {
      showPopup({ title: "Error", message: e?.message || "Failed to create user", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  // Edit populator
  const openEditFor = (u) => {
    setEId(u.id);
    setEName(u.name || "");
    setEEmail(u.email || "");
    setEPassword(u.password || "");
    setERoleIds(u.role_id ? [Number(u.role_id)] : []);
    setOpenEdit(true);
  };

  // Update
  const handleUpdate = async () => {
    if (!canUpdate) return;
    try {
      setUpdating(true);
      const role_id = eRoleIds[0] || null;
      const body = { name: eName, email: eEmail, role_id: String(role_id) };
      if (ePassword.trim()) {
        body.password = ePassword;
      }
      
      await updateDoc(doc(db, "users", String(eId)), body);
      
      setOpenEdit(false);
      await fetchUsers();
      showPopup({ title: "Success", message: "User updated successfully.", type: "success" });
    } catch (e) {
      showPopup({ title: "Error", message: e?.message || "Failed to update user", type: "error" });
    } finally {
      setUpdating(false);
    }
  };

  // Delete
  const handleDelete = async (u) => {
    showPopup({
      title: "Delete User?",
      message: `Are you sure you want to delete "${u.name}"? This will revoke their access to the dashboard.`,
      type: "confirm",
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "users", String(u.id)));
          await fetchUsers();
          showPopup({ title: "Deleted", message: "User has been removed from database.", type: "success" });
        } catch (e) {
          showPopup({ title: "Error", message: e?.message || "Failed to delete user", type: "error" });
        }
      }
    });
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
                <UsersIcon className="text-emerald-400" size={32} />
                Users List
              </h2>
              <p className="mt-2 text-white/70">Manage registered users and their roles.</p>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <button
                onClick={() => setOpenCreate(true)}
                className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600/80 hover:bg-emerald-600 backdrop-blur-md text-white rounded-xl font-bold shadow-lg border border-white/20 transition-all hover:-translate-y-0.5"
              >
                <Plus size={20} />
                Add User
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
                    placeholder="Search users by name, email, role..."
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10 text-white/70 text-xs uppercase tracking-wider">
                    <th className="px-6 py-4 font-bold w-16">#</th>
                    <th className="px-6 py-4 font-bold">Name</th>
                    <th className="px-6 py-4 font-bold">Email</th>
                    <th className="px-6 py-4 font-bold">Role</th>
                    <th className="px-6 py-4 font-bold text-right w-40">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-white/90">
                  {usersLoading ? (
                    <tr><td colSpan={5} className="px-6 py-8 text-center text-white/50">Loading users...</td></tr>
                  ) : usersError ? (
                    <tr><td colSpan={5} className="px-6 py-8 text-center text-red-300">{usersError}</td></tr>
                  ) : pageSlice.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-8 text-center text-white/50">No users found</td></tr>
                  ) : (
                    pageSlice.map((u, idx) => (
                      <motion.tr
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        key={u.id}
                        className="hover:bg-white/5 transition-colors"
                      >
                        <td className="px-6 py-4 text-white/50">{(page - 1) * pageSize + idx + 1}</td>
                        <td className="px-6 py-4 font-semibold">{u.name}</td>
                        <td className="px-6 py-4 text-white/70">{u.email}</td>
                        <td className="px-6 py-4">
                          {u.role_title ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/20">
                              {u.role_title}
                            </span>
                          ) : (
                            <span className="text-white/30 italic">No Role</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditFor(u)}
                              className="p-2 bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 rounded-lg transition-colors border border-blue-500/30"
                              title="Edit"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(u)}
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
            <div className="p-4 border-t border-white/10 bg-white/5 text-white/50 text-sm flex flex-col sm:flex-row justify-between items-center gap-4">
              <span>Showing {pageSlice.length ? (page - 1) * pageSize + 1 : 0} to {Math.min(page * pageSize, filtered.length)} of {filtered.length} entries</span>

              <div className="flex items-center gap-4">
                <select
                  className="bg-white/5 border border-white/10 rounded-lg text-xs py-1 px-2 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                >
                  <option value="10" className="bg-slate-800">10 / page</option>
                  <option value="25" className="bg-slate-800">25 / page</option>
                  <option value="50" className="bg-slate-800">50 / page</option>
                </select>

                <div className="flex gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-50 border border-white/10" disabled={page === 1}>&laquo;</button>
                  <button className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">{page}</button>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-50 border border-white/10" disabled={page >= totalPages}>&raquo;</button>
                </div>
              </div>
            </div>
          </div>
          {usersError && <div className="mt-4 p-4 bg-red-500/20 border border-red-500/40 rounded-xl text-red-200">{usersError}</div>}
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
                <h3 className="text-xl font-bold text-white">Create New User</h3>
                <button onClick={() => setOpenCreate(false)} className="text-white/50 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-5 pr-2">
                <div>
                  <label className="text-sm font-medium text-white/80 mb-2 block">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                    <input
                      value={cName} onChange={(e) => setCName(e.target.value)}
                      className="w-full pl-10 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      placeholder="Enter full name"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-white/80 mb-2 block">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                    <input
                      type="email" value={cEmail} onChange={(e) => setCEmail(e.target.value)}
                      className="w-full pl-10 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      placeholder="name@example.com"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-white/80 mb-2 block">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                    <input
                      type={showCPassword ? "text" : "password"} value={cPassword} onChange={(e) => setCPassword(e.target.value)}
                      className="w-full pl-10 pr-10 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      placeholder="Set initial password"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCPassword(!showCPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
                    >
                      {showCPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-white/80 mb-2 block">Assign Role</label>
                  <GlassMultiSelect
                    loading={rolesLoading} options={roleOptions} selected={cRoleIds}
                    onToggle={(id) => setCRoleIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
                    label="role"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/10">
                <button onClick={() => setOpenCreate(false)} className="px-5 py-2.5 rounded-xl border border-white/10 text-white/70 hover:bg-white/10 transition-colors">Cancel</button>
                <button onClick={handleCreate} disabled={!canSave || saving} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-lg border border-white/10 transition-all hover:-translate-y-0.5 disabled:opacity-60">
                  {saving ? "Creating..." : "Create User"}
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
                <h3 className="text-xl font-bold text-white">Edit User</h3>
                <button onClick={() => setOpenEdit(false)} className="text-white/50 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-5 pr-2">
                <div>
                  <label className="text-sm font-medium text-white/80 mb-2 block">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                    <input
                      value={eName} onChange={(e) => setEName(e.target.value)}
                      className="w-full pl-10 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      placeholder="Enter full name"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-white/80 mb-2 block">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                    <input
                      type="email" value={eEmail} onChange={(e) => setEEmail(e.target.value)}
                      className="w-full pl-10 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      placeholder="name@example.com"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-white/80 mb-2 block">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                    <input
                      type={showEPassword ? "text" : "password"} value={ePassword} onChange={(e) => setEPassword(e.target.value)}
                      className="w-full pl-10 pr-10 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      placeholder="Blank to keep current"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEPassword(!showEPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
                    >
                      {showEPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-white/80 mb-2 block">Assign Role</label>
                  <GlassMultiSelect
                    loading={rolesLoading} options={roleOptions} selected={eRoleIds}
                    onToggle={(id) => setERoleIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
                    label="role"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/10">
                <button onClick={() => setOpenEdit(false)} className="px-5 py-2.5 rounded-xl border border-white/10 text-white/70 hover:bg-white/10 transition-colors">Cancel</button>
                <button onClick={handleUpdate} disabled={!canUpdate || updating} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-lg border border-white/10 transition-all hover:-translate-y-0.5 disabled:opacity-60">
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
