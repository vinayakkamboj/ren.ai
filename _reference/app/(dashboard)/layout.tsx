// Auth redirect is handled in middleware and in the page itself.
// This layout is intentionally minimal.
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
