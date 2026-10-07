import "./_group.css";
import { TopAppBar } from "./_shared/TopAppBar";
import { BottomNavigation } from "./_shared/BottomNavigation";
import { FloatingActionButton } from "./_shared/FloatingActionButton";
import { Footer } from "./_shared/Footer";
import Dashboard from "./_shared/Dashboard";

// Extracted app shell and dashboard with preview-only data/auth boundaries.
export function Current() {
  return (
    <div className="relative flex min-h-dvh w-full min-w-0 flex-col overflow-x-clip bg-white">
      <TopAppBar />
      <main className="mx-auto min-h-0 w-full min-w-0 max-w-[1440px] flex-1 pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0">
        <Dashboard />
      </main>
      <Footer withMobileNavigation />
      <BottomNavigation />
      <FloatingActionButton />
    </div>
  );
}
