import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { FiLogIn } from "react-icons/fi";
import { ImSpinner2 } from "react-icons/im";

export default function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [remember, setRemember] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const rememberFlag = localStorage.getItem("remember");
    const token = localStorage.getItem("token");
    if (token && !rememberFlag) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("perms");
    }
    setTimeout(() => setMounted(true), 40);
  }, []);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    const email = form.email.trim().toLowerCase();
    const password = String(form.password || "");
    if (!email || !password) return setErr("Email and password are required");

    try {
      setLoading(true);

      // 1. Authenticate with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // 2. Fetch User from Firestore 'users' collection (Admin)
      const q = query(collection(db, "users"), where("email", "==", email));
      const userSnapshot = await getDocs(q);
      
      if (userSnapshot.empty) {
        throw new Error("Admin user not found in database.");
      }
      
      const userData = { id: userSnapshot.docs[0].id, ...userSnapshot.docs[0].data() };
      
      // 3. Fetch Role & Permissions
      let roleTitle = null;
      let permissions = [];
      
      const pSnapshot = await getDocs(collection(db, "permissions"));
      const allPerms = pSnapshot.docs.map(d => ({ id: String(d.id), ...d.data() }));

      const isSuper = (
        String(userData.role_id) === "6" || 
        email === "rahulbadugu22@gmail.com" || 
        email === "sandeep786@gmail.com"
      );

      if (userData.role_id) {
        // Get Role Title & permissions on role document
        const roleDoc = await getDoc(doc(db, "roles", String(userData.role_id)));
        let rolePermIds = [];

        if (roleDoc.exists()) {
          const roleData = roleDoc.data();
          roleTitle = roleData.title;
          if (Array.isArray(roleData.permission_ids)) {
            rolePermIds = roleData.permission_ids.map(String);
          }
        }

        if (isSuper || (roleTitle && roleTitle.toLowerCase().includes("super"))) {
          // Super Admin has all permissions
          permissions = allPerms.map(p => String(p.title || "").toLowerCase()).filter(Boolean);
        } else {
          // Fallback to permission_role collection if role document doesn't have permission_ids
          if (rolePermIds.length === 0) {
            try {
              const numId = Number(userData.role_id);
              const prQuery = !isNaN(numId)
                ? query(collection(db, "permission_role"), where("role_id", "==", numId))
                : query(collection(db, "permission_role"), where("role_id", "==", String(userData.role_id)));
              const prSnapshot = await getDocs(prQuery);
              rolePermIds = prSnapshot.docs.map(d => String(d.data().permission_id));
            } catch (err) {
              console.warn("Could not query permission_role:", err);
            }
          }

          // Map permission IDs to permission titles
          if (rolePermIds.length > 0) {
            permissions = allPerms
              .filter(p => rolePermIds.includes(String(p.id)) || (p.id && rolePermIds.includes(String(p.id))))
              .map(p => String(p.title || "").toLowerCase())
              .filter(Boolean);
          }
        }
      } else if (isSuper) {
        roleTitle = "Super Admin";
        permissions = allPerms.map(p => String(p.title || "").toLowerCase()).filter(Boolean);
      }

      // 4. Construct Data for localStorage to match old Node backend structure
      const userObj = { 
        id: userData.id, 
        name: userData.name, 
        email: userData.email, 
        role_id: userData.role_id, 
        role_title: roleTitle || "Admin",
        role: roleTitle || "Admin"
      };

      // We use the Firebase access token as the app token
      const token = await userCredential.user.getIdToken();

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(userObj));
      localStorage.setItem("userid", userObj.id);
      localStorage.setItem("perms", JSON.stringify(permissions || []));
      remember ? localStorage.setItem("remember", "1") : localStorage.removeItem("remember");

      navigate("/dashboard", { replace: true });
    } catch (error) {
      setErr(error.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        .animated-border { position: relative; border-radius: 20px; }
        .animated-border::before {
          content:""; position:absolute; inset:-6px; border-radius:inherit;
          background:linear-gradient(120deg,#4ade80,#22d3ee,#818cf8,#f472b6,#facc15,#4ade80);
          background-size:250% 250%; animation:borderGlow 4s ease infinite;
          filter:blur(18px); opacity:0.55; z-index:-1;
        }
        @keyframes borderGlow { 0%{background-position:0 50%} 50%{background-position:150% 50%} 100%{background-position:0 50%}}
        @keyframes floatUpDown {0%{transform:translateY(0)}50%{transform:translateY(-14px)}100%{transform:translateY(0)}}

        .underline-input {
          width: 100%;
          padding: 10px 2px;
          font-size: 14px;
          outline: none;
          border: none;
          border-bottom: 2px solid #d1d5db;
          transition: border-color .3s ease;
        }
        .underline-input:focus {
          border-bottom-color: #059669;
        }
        .underline-focus-line {
          position: relative;
        }
        .underline-focus-line::after {
          content:"";
          position:absolute;
          left:0; bottom:0;
          width:0%; height:2px;
          background:#059669;
          transition:width .35s ease;
        }
        .underline-input:focus + .underline-focus-line::after {
          width:100%;
        }
      `}</style>

      <div className="min-h-screen w-full bg-white flex items-center justify-center px-3 py-6">
        <div className={`animated-border shadow-xl w-full max-w-5xl rounded-xl transition-all flex flex-col md:flex-row ${
          mounted ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}>

          {/* LEFT (Hidden on small screens) */}
          <div className="hidden md:flex flex-col justify-center items-center w-1/2 px-6 py-10 bg-gradient-to-br from-[#e9faff] via-[#dff3ff] to-[#cfeaff] text-center">
            <h2 className="leading-tight font-extrabold">
              <span className="block text-lg text-emerald-700">Welcome to</span>
              <span className="block text-2xl text-emerald-600">Crispy Dosa Admin</span>
            </h2>
            <img src="/login-side.png" className="w-72 mt-8 ml-8" style={{ animation:"floatUpDown 4s ease-in-out infinite" }} draggable="false" />
          </div>

          {/* RIGHT */}
          <div className="flex-1 px-6 sm:px-10 py-10 bg-white">
            <div className="flex justify-center">
              <img src="/Crispy-Dosalogo.png" alt="logo" className="h-14 object-contain" />
            </div>
            
            <h2 className="text-center mt-6 font-extrabold">
              <span className="block text-lg text-emerald-700">Login to start your session</span>
            </h2>

            {err && (
              <div className="mt-5 bg-red-50 text-red-700 text-sm px-3 py-2 rounded border border-red-200">{err}</div>
            )}

            <form onSubmit={handleSubmit} className="mt-8 space-y-6">

              <div>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={onChange}
                  placeholder="Email address"
                  className="underline-input"
                />
                <span className="underline-focus-line"></span>
              </div>

              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={onChange}
                  placeholder="Password"
                  className="underline-input"
                />
                <span className="underline-focus-line"></span>

                <button
                  type="button"
                  onClick={() => setShowPwd((s) => !s)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-500"
                >
                  {showPwd ? "Hide" : "Show"}
                </button>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={remember} onChange={(e)=>setRemember(e.target.checked)} className="h-4 w-4"/>
                  Remember me
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto flex items-center justify-center bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2 rounded-md text-sm"
                >
                  {loading ? <><ImSpinner2 className="animate-spin mr-2" /> Logging in…</> : <><FiLogIn className="mr-2" /> Login</>}
                </button>
              </div>
            </form>

            <p className="mt-6 text-center text-xs text-gray-500">Forgot password? Contact admin</p>
          </div>
        </div>
      </div>
    </>
  );
}
