import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/login/index.jsx";
import Dashboard from "./components/dashboard/dashboard.jsx";
import AccessManagement from "./pages/access/index.jsx";
import Roles from "./pages/roles/index.jsx";
import Users from "./pages/users/index.jsx";
import Restuarent from "./pages/restuarent/index.jsx";      // ← NEW
import RequirePerm from "./components/RequirePerm.jsx";
import Category from "./pages/category/index.jsx";
import Product from "./pages/product/index.jsx";
import CustomerInfo from "./pages/customerinfo/index.jsx";
import Orders from "./pages/orders/index.jsx";
import Settings from "./pages/settings/index.jsx";
import CustomerDetails from "./pages/customerdetails/index.jsx";
import PrivacyPolicy from "./pages/privacy-policy/index.jsx";
import DeleteAccount from "./pages/delete-account/index.jsx";
import { PopupProvider } from "./context/PopupContext";

function PrivateRoute({ children }) {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <PopupProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/delete-account" element={<DeleteAccount />} />

          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <RequirePerm perm="dashboard"><Dashboard /></RequirePerm>
              </PrivateRoute>
            }
          />


          <Route
            path="/restuarent"
            element={
              <PrivateRoute>
                <RequirePerm perm="restaurant"><Restuarent /></RequirePerm>
              </PrivateRoute>
            }
          />

          <Route
            path="/access"
            element={
              <PrivateRoute>
                <RequirePerm perm="access"><AccessManagement /></RequirePerm>
              </PrivateRoute>
            }
          />
          <Route
            path="/access/roles"
            element={
              <PrivateRoute>
                <RequirePerm perm="access"><Roles /></RequirePerm>
              </PrivateRoute>
            }
          />
          <Route
            path="/access/users"
            element={
              <PrivateRoute>
                <RequirePerm perm="access"><Users /></RequirePerm>
              </PrivateRoute>
            }
          />

          <Route
            path="/category"
            element={
              <PrivateRoute>
                <RequirePerm perm="category"><Category /></RequirePerm>
              </PrivateRoute>
            }
          />

          <Route
            path="/product"
            element={
              <PrivateRoute>
                <RequirePerm perm="product"><Product /></RequirePerm>
              </PrivateRoute>
            }
          />

          <Route
            path="/customerinfo"
            element={
              <PrivateRoute>
                <RequirePerm perm="customer_info">
                  <CustomerInfo />
                </RequirePerm>
              </PrivateRoute>
            }
          />

          <Route
            path="/customerdetails"
            element={
              <PrivateRoute>
                <RequirePerm perm="customer_details">
                  <CustomerDetails />
                </RequirePerm>
              </PrivateRoute>
            }
          />

          <Route
            path="/"
            element={
              localStorage.getItem("token") ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/orders"
            element={
              <PrivateRoute>
                <RequirePerm perm="order_management">
                  <Orders />
                </RequirePerm>
              </PrivateRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <PrivateRoute>
                <RequirePerm perm="settings">
                  <Settings />
                </RequirePerm>
              </PrivateRoute>
            }
          />


          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </PopupProvider>
  );
}

