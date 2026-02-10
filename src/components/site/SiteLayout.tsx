import { Outlet } from "react-router-dom";
import { Footer } from "@/components/site/Footer";
import { Navbar } from "@/components/site/Navbar";
import { useLocation } from "react-router-dom";

export function SiteLayout() {
  const { pathname } = useLocation();
  const isHome = pathname === "/";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className={isHome ? "" : "pt-20"}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
