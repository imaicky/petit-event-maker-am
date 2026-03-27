"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Menu,
  X,
  LogOut,
  Settings,
  User,
  CalendarDays,
  Bell,
  ChevronDown,
  LogIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/components/auth-provider";
import { NotificationBell } from "@/components/notification-bell";
import { LoginDialog } from "@/components/login-dialog";

const NAV_LINKS = [
  { href: "/explore", label: "イベントを探す" },
  { href: "/dashboard", label: "ダッシュボード" },
];

export function Header() {
  const { user, profile, isLoading, signOut } = useAuth();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  const displayName = profile?.display_name ?? user?.email ?? "";
  const username = profile?.username ?? "";
  const avatarUrl = profile?.avatar_url ?? user?.user_metadata?.avatar_url ?? "";
  const initials = displayName ? displayName.slice(0, 1) : "？";

  const handleLogout = async () => {
    await signOut();
    setDropdownOpen(false);
    setMenuOpen(false);
  };

  const handleLogin = () => {
    setLoginOpen(true);
    setMenuOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-30 w-full bg-[#FAFAFA]/92 backdrop-blur-md border-b border-[#E5E5E5]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
          {/* Logo */}
          <Link
            href={user ? "/dashboard" : "/"}
            className="group flex items-baseline gap-1.5 shrink-0"
            aria-label="プチイベント作成くん"
          >
            <span
              className="text-[1.1rem] font-bold text-[#1A1A1A] group-hover:opacity-80 transition-opacity duration-150"
              style={{ fontFamily: "var(--font-zen-maru)" }}
            >
              プチイベント
            </span>
            <span
              className="hidden sm:inline text-xs font-medium text-[#999999] group-hover:opacity-80 transition-opacity duration-150"
              style={{ fontFamily: "var(--font-zen-maru)" }}
            >
              作成くん
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden sm:flex items-center gap-1" aria-label="メインナビゲーション">
            {isLoading ? (
              <div className="h-8 w-24 animate-pulse rounded-full bg-[#F2F2F2]" />
            ) : user ? (
              <>
                {/* Nav links with active highlighting */}
                {NAV_LINKS.map(({ href, label }) => (
                  <Link key={href} href={href}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`rounded-full text-sm transition-colors duration-150 ${
                        pathname === href
                          ? "bg-[#F2F2F2] text-[#1A1A1A] font-semibold"
                          : "text-[#1A1A1A] hover:bg-[#F2F2F2] hover:text-[#1A1A1A]"
                      }`}
                    >
                      {label}
                    </Button>
                  </Link>
                ))}

                {/* Create event button */}
                <Link href="/events/new" className="ml-1">
                  <Button
                    size="sm"
                    className="rounded-full bg-[#1A1A1A] text-white hover:bg-[#111111] gap-1.5 shadow-sm transition-all duration-150"
                  >
                    <CalendarDays className="h-3.5 w-3.5" />
                    イベントを作る
                  </Button>
                </Link>

                {/* Notification bell */}
                <NotificationBell />

                {/* Avatar dropdown */}
                <div className="relative ml-1">
                  <button
                    onClick={() => setDropdownOpen((v) => !v)}
                    className="flex items-center gap-1.5 rounded-full pl-1 pr-2 py-1 hover:bg-[#F2F2F2] transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-[#1A1A1A]/40"
                    aria-label="アカウントメニューを開く"
                    aria-expanded={dropdownOpen}
                    aria-haspopup="menu"
                  >
                    <Avatar size="default">
                      {avatarUrl && (
                        <AvatarImage src={avatarUrl} alt={displayName} />
                      )}
                      <AvatarFallback className="bg-[#F2F2F2] text-[#1A1A1A] font-bold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <ChevronDown
                      className={`h-3.5 w-3.5 text-[#999999] transition-transform duration-200 ${
                        dropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {dropdownOpen && (
                    <>
                      {/* Backdrop */}
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setDropdownOpen(false)}
                        aria-hidden="true"
                      />
                      {/* Dropdown */}
                      <div
                        role="menu"
                        className="absolute right-0 top-full mt-2 z-20 w-52 rounded-2xl border border-[#E5E5E5] bg-white shadow-xl overflow-hidden"
                      >
                        {/* User info */}
                        <div className="px-4 py-3.5 border-b border-[#E5E5E5] bg-[#FAFAFA]">
                          <p className="text-sm font-semibold text-[#1A1A1A] truncate">
                            {displayName || "ユーザー"}
                          </p>
                          {username && (
                            <p className="text-xs text-[#999999] truncate mt-0.5">
                              @{username}
                            </p>
                          )}
                        </div>
                        <div className="py-1.5">
                          {[
                            {
                              href: "/dashboard",
                              icon: <CalendarDays className="h-4 w-4" />,
                              label: "ダッシュボード",
                            },
                            ...(username
                              ? [
                                  {
                                    href: `/${username}`,
                                    icon: <User className="h-4 w-4" />,
                                    label: "公開プロフィール",
                                  },
                                ]
                              : []),
                            {
                              href: "/settings/profile",
                              icon: <Settings className="h-4 w-4" />,
                              label: "プロフィール設定",
                            },
                          ].map(({ href, icon, label }) => (
                            <Link
                              key={href}
                              href={href}
                              role="menuitem"
                              onClick={() => setDropdownOpen(false)}
                              className={`flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors duration-100 ${
                                pathname === href
                                  ? "bg-[#F7F7F7] text-[#1A1A1A] font-medium"
                                  : "text-[#1A1A1A] hover:bg-[#FAFAFA]"
                              }`}
                            >
                              <span className="text-[#999999]">{icon}</span>
                              {label}
                            </Link>
                          ))}
                        </div>
                        <div className="py-1.5 border-t border-[#E5E5E5]">
                          <button
                            role="menuitem"
                            onClick={handleLogout}
                            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-[#DC2626] hover:bg-red-50 transition-colors duration-100"
                          >
                            <LogOut className="h-4 w-4" />
                            ログアウト
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link href="/explore">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`rounded-full text-sm transition-colors duration-150 ${
                      pathname === "/explore"
                        ? "bg-[#F2F2F2] text-[#1A1A1A] font-semibold"
                        : "text-[#1A1A1A] hover:bg-[#F2F2F2] hover:text-[#1A1A1A]"
                    }`}
                  >
                    イベントを探す
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogin}
                  className="rounded-full text-[#1A1A1A] hover:bg-[#F2F2F2] hover:text-[#1A1A1A] transition-colors duration-150 gap-1.5"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  ログイン
                </Button>
                <Link href="/events/new">
                  <Button
                    size="sm"
                    className="rounded-full bg-[#1A1A1A] text-white hover:bg-[#111111] shadow-sm transition-all duration-150"
                  >
                    無料ではじめる
                  </Button>
                </Link>
              </>
            )}
          </nav>

          {/* Mobile: notification + hamburger */}
          <div className="flex sm:hidden items-center gap-1">
            {user && <NotificationBell />}
            <button
              className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-[#F2F2F2] transition-colors duration-150"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? "メニューを閉じる" : "メニューを開く"}
              aria-expanded={menuOpen}
            >
              {menuOpen ? (
                <X className="h-5 w-5 text-[#1A1A1A]" />
              ) : (
                <Menu className="h-5 w-5 text-[#1A1A1A]" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile slide-in menu */}
        <div
          className={`sm:hidden overflow-hidden transition-all duration-300 ease-in-out ${
            menuOpen ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
          }`}
          aria-hidden={!menuOpen}
        >
          <div className="border-t border-[#E5E5E5] bg-white">
            {user ? (
              <>
                {/* User info strip */}
                <div className="flex items-center gap-3 px-5 py-4 bg-[#FAFAFA] border-b border-[#E5E5E5]">
                  <Avatar size="default">
                    {avatarUrl && (
                      <AvatarImage src={avatarUrl} alt={displayName} />
                    )}
                    <AvatarFallback className="bg-[#F2F2F2] text-[#1A1A1A] font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#1A1A1A] truncate">
                      {displayName || "ユーザー"}
                    </p>
                    {username && (
                      <p className="text-xs text-[#999999] truncate">@{username}</p>
                    )}
                  </div>
                </div>
                <nav className="py-2" aria-label="モバイルナビゲーション">
                  <Link
                    href="/events/new"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-5 py-3.5 text-sm font-semibold text-[#1A1A1A] hover:bg-[#F7F7F7] transition-colors duration-150"
                  >
                    <CalendarDays className="h-4 w-4 shrink-0" />
                    新しいイベントを作る
                  </Link>
                  <Link
                    href="/notifications"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-5 py-3.5 text-sm text-[#1A1A1A] hover:bg-[#FAFAFA] transition-colors duration-150"
                  >
                    <Bell className="h-4 w-4 shrink-0 text-[#999999]" />
                    通知
                  </Link>
                  <Link
                    href="/explore"
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-3 px-5 py-3.5 text-sm transition-colors duration-150 ${
                      pathname === "/explore"
                        ? "text-[#1A1A1A] font-medium bg-[#F7F7F7]"
                        : "text-[#1A1A1A] hover:bg-[#FAFAFA]"
                    }`}
                  >
                    <svg className="h-4 w-4 shrink-0 text-[#999999]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.35-4.35" />
                    </svg>
                    イベントを探す
                  </Link>
                  <Link
                    href="/dashboard"
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-3 px-5 py-3.5 text-sm transition-colors duration-150 ${
                      pathname === "/dashboard"
                        ? "text-[#1A1A1A] font-medium bg-[#F7F7F7]"
                        : "text-[#1A1A1A] hover:bg-[#FAFAFA]"
                    }`}
                  >
                    <CalendarDays className="h-4 w-4 shrink-0 text-[#999999]" />
                    ダッシュボード
                  </Link>
                  {username && (
                    <Link
                      href={`/${username}`}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-5 py-3.5 text-sm text-[#1A1A1A] hover:bg-[#FAFAFA] transition-colors duration-150"
                    >
                      <User className="h-4 w-4 shrink-0 text-[#999999]" />
                      公開プロフィール
                    </Link>
                  )}
                  <Link
                    href="/settings/profile"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-5 py-3.5 text-sm text-[#1A1A1A] hover:bg-[#FAFAFA] transition-colors duration-150"
                  >
                    <Settings className="h-4 w-4 shrink-0 text-[#999999]" />
                    プロフィール設定
                  </Link>
                  <div className="mx-5 my-1 h-px bg-[#E5E5E5]" />
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 px-5 py-3.5 text-sm text-[#DC2626] hover:bg-red-50 transition-colors duration-150"
                  >
                    <LogOut className="h-4 w-4 shrink-0" />
                    ログアウト
                  </button>
                </nav>
              </>
            ) : (
              <nav className="px-5 py-4 flex flex-col gap-2.5" aria-label="モバイルナビゲーション">
                <Link href="/explore" onClick={() => setMenuOpen(false)}>
                  <Button
                    variant="ghost"
                    className="w-full rounded-full border border-[#E5E5E5] text-[#1A1A1A] hover:bg-[#F2F2F2]"
                  >
                    イベントを探す
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  className="w-full rounded-full border-[#E5E5E5] text-[#1A1A1A] hover:bg-[#F2F2F2] gap-1.5"
                  onClick={handleLogin}
                >
                  <LogIn className="h-4 w-4" />
                  ログイン
                </Button>
                <Link href="/events/new" onClick={() => setMenuOpen(false)}>
                  <Button className="w-full rounded-full bg-[#1A1A1A] text-white hover:bg-[#111111]">
                    無料ではじめる
                  </Button>
                </Link>
              </nav>
            )}
          </div>
        </div>
      </header>
      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
    </>
  );
}
