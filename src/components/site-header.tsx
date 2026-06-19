import { Link, useNavigate } from "@tanstack/react-router";
import { GraduationCap, LogOut, BookOpen, LayoutDashboard, Presentation, Megaphone, CalendarDays, Award, MessagesSquare, User, Bookmark } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function SiteHeader() {
  const { user, isInstructor, signOut } = useAuth();
  const navigate = useNavigate();

  const initials = (user?.email ?? "?").slice(0, 2).toUpperCase();

  const navLinkCls =
    "rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground [&.active]:bg-secondary [&.active]:text-foreground";

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4 md:px-8">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <GraduationCap className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight">Lumen LMS</span>
        </Link>

        {user ? (
          <nav className="hidden flex-1 items-center justify-center gap-0.5 lg:flex">
            <Link to="/dashboard" className={navLinkCls}><LayoutDashboard className="mr-1.5 inline h-4 w-4" /> Dashboard</Link>
            <Link to="/courses" className={navLinkCls}><BookOpen className="mr-1.5 inline h-4 w-4" /> Catalog</Link>
            <Link to="/discussions" className={navLinkCls}><MessagesSquare className="mr-1.5 inline h-4 w-4" /> Discuss</Link>
            <Link to="/calendar" className={navLinkCls}><CalendarDays className="mr-1.5 inline h-4 w-4" /> Calendar</Link>
            <Link to="/announcements" className={navLinkCls}><Megaphone className="mr-1.5 inline h-4 w-4" /> Announcements</Link>
            {isInstructor && (
              <Link to="/teach" className={navLinkCls}><Presentation className="mr-1.5 inline h-4 w-4" /> Teach</Link>
            )}
          </nav>
        ) : (
          <nav className="hidden items-center gap-1 md:flex">
            <Link to="/features" className={navLinkCls}>Features</Link>
            <Link to="/pricing" className={navLinkCls}>Pricing</Link>
            <Link to="/about" className={navLinkCls}>About</Link>
          </nav>
        )}

        <div className="flex items-center gap-2">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded-full ring-2 ring-transparent transition hover:ring-border">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="text-sm font-medium">{user.user_metadata?.full_name || "Account"}</div>
                  <div className="truncate text-xs text-muted-foreground">{user.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate({ to: "/profile" })}><User className="mr-2 h-4 w-4" /> Profile</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/grades" })}><Award className="mr-2 h-4 w-4" /> Grades</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/certificates" })}><Award className="mr-2 h-4 w-4" /> Certificates</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/bookmarks" })}><Bookmark className="mr-2 h-4 w-4" /> Saved courses</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => {
                    await signOut();
                    navigate({ to: "/auth" });
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="ghost" onClick={() => navigate({ to: "/auth" })}>Sign in</Button>
              <Button onClick={() => navigate({ to: "/auth" })}>Get started</Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
