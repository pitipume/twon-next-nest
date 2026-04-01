// Route group (main) is used only for layout organisation — Navbar lives in root layout
export default function MainLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
