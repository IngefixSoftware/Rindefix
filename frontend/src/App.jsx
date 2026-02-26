import { Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import UploadPage from "./pages/UploadPage";
import ApprovalPage from "./pages/ApprovalPage";
import ReportsPage from "./pages/ReportsPage";
import ReportExportsPage from "./pages/ReportExportsPage";
import UsersPage from "./pages/UsersPage";
import MyExpensesPage from "./pages/MyExpensesPage";
import SummaryPage from "./pages/SummaryPage";
import FondoSummaryPage from "./pages/FondoSummaryPage";
import CartolaPage from "./pages/CartolaPage";
import AdminCartolaPage from "./pages/AdminCartolaPage";
import LoginPage from "./pages/LoginPage";
import EmailTemplatePage from "./pages/EmailTemplatePage";
import CreateUserPage from "./pages/CreateUserPage";
import { useEffect, useState } from "react";
import api from "./api";

const NAV_ITEMS = [
  {
    to: "/resumen",
    label: "Resumen",
    roles: ["RENDIDOR"],
  },
  {
    to: "/resumen-fondos",
    label: "Resumen fondos por rendir",
    roles: ["RENDIDOR"],
  },
  {
    to: "/carga",
    label: "Nuevo gasto",
    roles: ["RENDIDOR"],
  },
  {
    to: "/mis-pendientes",
    label: "Mis rendiciones pendientes",
    roles: ["RENDIDOR"],
  },
  {
    to: "/mis-aprobadas",
    label: "Mis rendiciones aprobadas",
    roles: ["RENDIDOR"],
  },
  {
    to: "/mis-rechazadas",
    label: "Mis rendiciones rechazadas",
    roles: ["RENDIDOR"],
  },
  {
    to: "/cartola",
    label: "Cartola de transferencias",
    roles: ["RENDIDOR"],
  },
  {
    to: "/aprobacion",
    label: "Aprobación de gastos",
    roles: ["APROBADOR", "ADMIN"],
  },
  {
    to: "/reportes",
    label: "Resumen rendiciones",
    roles: ["APROBADOR", "ADMIN"],
  },
  {
    to: "/generar-informes",
    label: "Informes rendiciones",
    roles: ["APROBADOR", "ADMIN"],
  },
  {
    to: "/usuarios",
    label: "Usuarios",
    roles: ["ADMIN", "APROBADOR"],
  },
  {
    to: "/crear-usuario",
    label: "Crear usuario",
    roles: ["ADMIN"],
  },
  {
    to: "/configurar-correo",
    label: "Correo de informes",
    roles: ["ADMIN"],
  },
  {
    to: "/cartolas",
    label: "Cartola de transferencias (admin)",
    roles: ["ADMIN", "APROBADOR"],
  },
];

const USER_STORAGE_KEY = "rindefix:user";

const getDefaultPath = (role) => {
  if (role === "RENDIDOR") return "/resumen";
  return "/aprobacion";
};

function Layout({ children, user, onLogout }) {
  const location = useLocation();
  const links = NAV_ITEMS.filter((item) => item.roles.includes(user.role));
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  const roleLabel =
    user.role === "RENDIDOR"
      ? "Rendidor"
      : user.role === "APROBADOR"
      ? "Aprobador"
      : "Administrador";

  return (
    <>
      <div className={`app ${user.role === "ADMIN" ? "app-admin" : ""}`}>
        <aside className={`sidebar ${mobileNavOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <button
            type="button"
            className="mobile-menu-toggle"
            onClick={() => setMobileNavOpen((prev) => !prev)}
          >
            ☰
          </button>
          <h2>
            Rinde<span className="accent">Fix</span>
          </h2>
        </div>
        <nav>
          {links.map((item) => (
            <Link
              key={item.to}
              className={location.pathname === item.to ? "active" : ""}
              to={item.to}
              onClick={() => setMobileNavOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-user">
          <strong>{user.name}</strong>
          <span>{user.branch}</span>
          <button className="secondary" onClick={onLogout}>
            Cerrar sesión
          </button>
        </div>
        </aside>
        <button
          type="button"
          className="mobile-menu-fab"
          onClick={() => setMobileNavOpen((prev) => !prev)}
        >
          ☰
        </button>
        <main className="main">
          <div className="topbar mobile-only">
            <button
              type="button"
              className="mobile-menu-toggle"
              onClick={() => setMobileNavOpen(true)}
            >
              ☰
            </button>
          </div>
          <div className="main-content">{children}</div>
        </main>
        {mobileNavOpen && (
          <div className="mobile-overlay" onClick={() => setMobileNavOpen(false)} />
        )}
      </div>
      <footer className="app-footer">Desarrollado por Ingefix 2025</footer>
    </>
  );
}

export default function App() {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem(USER_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  });

  const persistUser = (data) => {
    setUser(data);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data));
  };

  const handleLogin = (data) => {
    persistUser(data);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem(USER_STORAGE_KEY);
  };

  const refreshUser = async () => {
    if (!user) return null;
    const { data } = await api.get(`/users/${user.id}`);
    persistUser(data);
    return data;
  };

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
      <Layout user={user} onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<Navigate to={getDefaultPath(user.role)} replace />} />
          <Route
            path="/resumen"
            element={<SummaryPage user={user} onUserRefresh={refreshUser} />}
          />
          <Route
            path="/resumen-fondos"
            element={<FondoSummaryPage user={user} onUserRefresh={refreshUser} />}
          />
          <Route
            path="/carga"
            element={<UploadPage user={user} onUserRefresh={refreshUser} />}
          />
          <Route
            path="/aprobacion"
            element={<ApprovalPage user={user} />}
          />
          <Route
            path="/reportes"
            element={<ReportsPage user={user} />}
          />
          <Route
            path="/generar-informes"
            element={<ReportExportsPage user={user} />}
          />
          <Route
            path="/usuarios"
            element={<UsersPage user={user} onUserRefresh={refreshUser} />}
          />
          <Route
            path="/crear-usuario"
            element={<CreateUserPage user={user} />}
          />
          <Route
            path="/configurar-correo"
            element={<EmailTemplatePage user={user} />}
          />
          <Route
            path="/mis-pendientes"
            element={<MyExpensesPage user={user} status="PENDIENTE" />}
          />
          <Route
            path="/mis-aprobadas"
            element={<MyExpensesPage user={user} status="APROBADO" />}
          />
          <Route
            path="/mis-rechazadas"
            element={<MyExpensesPage user={user} status="RECHAZADO" />}
          />
          <Route
            path="/cartola"
            element={<CartolaPage user={user} />}
          />
          <Route
            path="/cartolas"
            element={<AdminCartolaPage user={user} />}
          />
      </Routes>
    </Layout>
  );
}
