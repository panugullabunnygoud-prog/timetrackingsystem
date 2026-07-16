import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  useEffect(() => {
    if (loading) return;
    nav({ to: user ? (user.role === "Admin" ? "/admin" : "/dashboard") : "/login", replace: true });
  }, [user, loading, nav]);
  return (
    <div className="grid min-h-screen place-items-center bg-background">
      <div className="h-10 w-10 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
    </div>
  );
}
