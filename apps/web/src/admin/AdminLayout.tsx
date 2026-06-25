import { type ReactNode, useState } from "react";
import {
  BarChart3,
  ExternalLink,
  Landmark,
  LayoutDashboard,
  LogOut,
  Menu,
  RefreshCw,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Trophy,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { BrandLogo } from "@/components/icons/BrandLogo";
import { PUBLIC_APP_URL } from "../config/urls";

export type AdminTab =
  | "overview"
  | "clients"
  | "games"
  | "modes"
  | "analytics"
  | "bank"
  | "escrow"
  | "wallet"
  | "settings";

const NAV_ITEMS: { id: AdminTab; icon: LucideIcon }[] = [
  { id: "overview", icon: LayoutDashboard },
  { id: "clients", icon: Users },
  { id: "games", icon: Trophy },
  { id: "modes", icon: SlidersHorizontal },
  { id: "analytics", icon: BarChart3 },
  { id: "bank", icon: Landmark },
  { id: "escrow", icon: ShieldCheck },
  { id: "wallet", icon: Wallet },
  { id: "settings", icon: Settings },
];

interface AdminLayoutProps {
  tab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  sessionLabel?: string;
  dbProvider?: string;
  onRefresh: () => void;
  onLogout: () => void;
  children: ReactNode;
}

export function AdminLayout({
  tab,
  onTabChange,
  sessionLabel,
  dbProvider,
  onRefresh,
  onLogout,
  children,
}: AdminLayoutProps) {
  const { t } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="admin-layout">
      {sidebarOpen && (
        <button
          type="button"
          className="admin-sidebar-backdrop"
          aria-label={t("wallet.close")}
          onClick={closeSidebar}
        />
      )}

      <aside
        className={`admin-sidebar ${sidebarOpen ? "admin-sidebar--open" : ""}`}
        aria-label={t("admin.title")}
      >
        <div className="admin-sidebar-brand">
          <BrandLogo className="admin-sidebar-logo" size={40} />
          <div>
            <strong>SOL Tic Tac Toe</strong>
            <span>{t("admin.title")}</span>
          </div>
        </div>

        <nav className="admin-nav">
          {NAV_ITEMS.map(({ id, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={`admin-nav-item ${tab === id ? "admin-nav-item--active" : ""}`}
              onClick={() => {
                onTabChange(id);
                closeSidebar();
              }}
            >
              <Icon className="admin-nav-icon" aria-hidden />
              {t(`admin.tab.${id}`)}
            </button>
          ))}
        </nav>

        <div className="admin-sidebar-foot">
          <a
            href={PUBLIC_APP_URL}
            className="admin-nav-item admin-nav-item--link"
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink className="admin-nav-icon" aria-hidden />
            {t("admin.backToSite", { defaultValue: "Abrir site" })}
          </a>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-header">
          <div className="admin-header-left">
            <button
              type="button"
              className="admin-icon-btn admin-menu-btn"
              aria-label="Menu"
              onClick={() => setSidebarOpen((open) => !open)}
            >
              {sidebarOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
            <div>
              <h1 className="admin-page-title">{t(`admin.tab.${tab}`)}</h1>
              <p className="admin-page-subtitle">{t("admin.subtitle", { defaultValue: "Painel de controle" })}</p>
            </div>
          </div>

          <div className="admin-header-actions">
            {sessionLabel && (
              <span className="admin-badge admin-badge--muted">{sessionLabel}</span>
            )}
            {dbProvider && (
              <span className="admin-badge admin-badge--info">{dbProvider}</span>
            )}
            <button type="button" className="admin-icon-btn" onClick={() => void onRefresh()}>
              <RefreshCw className="size-4" />
              <span className="sr-only">{t("admin.refresh")}</span>
            </button>
            <button type="button" className="admin-btn admin-btn--outline" onClick={onLogout}>
              <LogOut className="size-4" />
              {t("admin.logout")}
            </button>
          </div>
        </header>

        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}

interface AdminStatCardProps {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  tone?: "blue" | "green" | "orange" | "purple" | "cyan";
}

export function AdminStatCard({
  label,
  value,
  icon: Icon,
  tone = "blue",
}: AdminStatCardProps) {
  return (
    <div className="admin-stat-card">
      <div className={`admin-stat-card-icon admin-stat-card-icon--${tone}`}>
        <Icon className="size-5" aria-hidden />
      </div>
      <div className="admin-stat-card-body">
        <span className="admin-stat-card-label">{label}</span>
        <strong className="admin-stat-card-value">{value}</strong>
      </div>
    </div>
  );
}
