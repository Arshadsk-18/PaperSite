import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Button } from './Button';
import { LogOut, LayoutDashboard, Menu, X } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isLandingPage = location.pathname === '/';

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    if (!isLandingPage) {
      window.location.href = `/#${id}`;
      return;
    }
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E3E8E4]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <span className="w-8 h-8 rounded-lg bg-[#1F3D33] text-[#D6F26B] font-bold flex items-center justify-center text-sm shadow-xs group-hover:scale-105 transition-transform">
            P
          </span>
          <span className="font-bold text-lg tracking-tight text-[#14221B]">
            PaperSite
          </span>
        </Link>

        {/* Desktop Nav Items */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#5E6B63]">
          <button
            type="button"
            onClick={() => scrollToSection('features')}
            className="hover:text-[#14221B] transition-colors cursor-pointer"
          >
            Features
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('how-it-works')}
            className="hover:text-[#14221B] transition-colors cursor-pointer"
          >
            How it works
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('languages')}
            className="hover:text-[#14221B] transition-colors cursor-pointer"
          >
            Languages
          </button>
          {user && (
            <Link
              to="/dashboard"
              className="hover:text-[#14221B] transition-colors flex items-center gap-1.5"
            >
              <LayoutDashboard className="w-4 h-4 text-[#2F6B4F]" />
              <span>Dashboard</span>
            </Link>
          )}
        </nav>

        {/* Action CTAs */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-[#5E6B63] max-w-[140px] truncate">
                {user.email}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut()}
                icon={<LogOut className="w-3.5 h-3.5" />}
              >
                Sign out
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Log in
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="accent" size="sm">
                  Start free
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button
          type="button"
          className="md:hidden p-2 rounded-lg text-[#14221B] hover:bg-[#F4F6F4] focus-visible:outline-forest"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[#E3E8E4] bg-white px-4 py-4 space-y-3">
          <nav className="flex flex-col gap-2.5 text-sm font-medium text-[#5E6B63]">
            <button
              type="button"
              onClick={() => scrollToSection('features')}
              className="text-left py-2 hover:text-[#14221B]"
            >
              Features
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('how-it-works')}
              className="text-left py-2 hover:text-[#14221B]"
            >
              How it works
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('languages')}
              className="text-left py-2 hover:text-[#14221B]"
            >
              Languages
            </button>
            {user && (
              <Link
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 hover:text-[#14221B] flex items-center gap-2"
              >
                <LayoutDashboard className="w-4 h-4 text-[#2F6B4F]" />
                <span>Dashboard</span>
              </Link>
            )}
          </nav>

          <div className="pt-3 border-t border-[#E3E8E4] flex flex-col gap-2">
            {user ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setMobileMenuOpen(false);
                  signOut();
                }}
              >
                Sign out
              </Button>
            ) : (
              <>
                <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" size="sm" className="w-full">
                    Log in
                  </Button>
                </Link>
                <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="accent" size="sm" className="w-full">
                    Start free
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
