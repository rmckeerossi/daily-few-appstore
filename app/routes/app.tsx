import { Link, NavLink, Outlet, redirect, useLocation } from "react-router";
import { eq } from "drizzle-orm";
import {
  LuMoon,
  LuLayers,
  LuPlus,
  LuBookOpen,
  LuUserRound,
} from "react-icons/lu";
import { createDb } from "~stencil/db";
import { settings } from "~/generated/db-schema";
import { requireAuth } from "~stencil/auth/server";
import { AuthProvider, useAuth } from "~stencil/ui/auth/context";
import { SignOutButton } from "~stencil/ui/auth/sign-out-button";
import { Text } from "~stencil/ui/strings";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { cn } from "~/lib/utils";
import type { Route } from "./+types/app";

export async function loader({ request, context }: Route.LoaderArgs) {
  const { user } = await requireAuth(request, context.cloudflare.env);
  const db = createDb(context.cloudflare.env);

  // Everyone passes through the onboarding form (name, birthday, phone, season,
  // consent) once. Until it's completed, /app sends them to /welcome — which also
  // holds the under-18 gate for anyone whose recorded birthday is too young.
  const [row] = await db
    .select({ onboardedAt: settings.onboardedAt })
    .from(settings)
    .where(eq(settings.createdBy, user.id))
    .limit(1);
  if (!row?.onboardedAt) throw redirect("/welcome");

  return { user };
}

export default function AppLayout({ loaderData }: Route.ComponentProps) {
  return (
    <AuthProvider user={loaderData.user}>
      <Outlet />
      <BottomNav />
    </AuthProvider>
  );
}

const navItems = [
  { to: "/app", icon: LuMoon, id: "nav.home" as const, end: true },
  { to: "/app/library", icon: LuLayers, id: "nav.library" as const, end: false },
  { to: "/app/history", icon: LuBookOpen, id: "nav.history" as const, end: false },
  { to: "/app/profile", icon: LuUserRound, id: "nav.profile" as const, end: false },
];

function BottomNav() {
  const { user } = useAuth();
  const location = useLocation();
  const initial = (user.name || user.email || "?").charAt(0).toUpperCase();

  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-0 left-1/2 z-50 w-full max-w-[430px] -translate-x-1/2 px-[22px] pb-6 pt-3"
    >
      <div className="flex items-center justify-between rounded-full border border-[rgba(254,252,242,0.14)] bg-[rgba(40,14,26,0.72)] px-4 py-3 backdrop-blur-md">
        <NavIcon item={navItems[0]} pathname={location.pathname} />
        <NavIcon item={navItems[1]} pathname={location.pathname} />

        <Link
          to="/app/library"
          className="flex h-[54px] w-[54px] items-center justify-center rounded-full bg-[#FEFCF2] text-[#4C1C31] shadow-[0_8px_24px_rgba(40,14,26,0.30)] transition-transform active:translate-y-px"
        >
          <LuPlus size={22} strokeWidth={1.5} />
          <span className="sr-only">
            <Text id="nav.pull" />
          </span>
        </Link>

        <NavIcon item={navItems[2]} pathname={location.pathname} />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-[54px] w-[54px] flex-col items-center justify-center rounded-full border border-transparent text-[rgba(254,252,242,0.60)] transition-colors hover:bg-[rgba(254,252,242,0.08)] hover:text-foreground data-[state=open]:text-foreground"
            >
              <LuUserRound size={20} strokeWidth={1.5} />
              <span className="sr-only">
                <Text id="nav.menu" />
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            side="top"
            className="mb-2 min-w-[200px]"
          >
            <DropdownMenuLabel className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(254,252,242,0.10)] font-mono text-xs">
                {initial}
              </span>
              <span className="truncate text-sm font-normal">
                {user.name || user.email}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/app/profile">
                <Text id="nav.profile" />
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <SignOutButton className="w-full cursor-pointer text-left">
                <Text id="nav.signOut" />
              </SignOutButton>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}

function NavIcon({
  item,
  pathname,
}: {
  item: (typeof navItems)[number];
  pathname: string;
}) {
  const Icon = item.icon;
  const active = item.end ? pathname === item.to : pathname.startsWith(item.to);
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={cn(
        "flex h-[54px] w-[54px] flex-col items-center justify-center gap-1 rounded-full border transition-colors",
        active
          ? "border-[rgba(254,252,242,0.28)] bg-[rgba(254,252,242,0.08)] text-foreground"
          : "border-transparent text-[rgba(254,252,242,0.60)] hover:bg-[rgba(254,252,242,0.08)] hover:text-foreground"
      )}
    >
      <Icon size={20} strokeWidth={1.5} />
      <span className="font-mono text-[9px] uppercase tracking-[0.12em]">
        <Text id={item.id} />
      </span>
    </NavLink>
  );
}
