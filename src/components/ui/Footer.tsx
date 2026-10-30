import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#1F3D33] text-white py-12 px-4 sm:px-6 mt-auto border-t border-[#2F6B4F]/30">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
          <span className="w-8 h-8 rounded-lg bg-[#D6F26B] text-[#1F3D33] font-bold flex items-center justify-center text-sm shadow-xs">
            P
          </span>
          <div>
            <h4 className="font-bold text-base text-white tracking-tight">
              PaperSite
            </h4>
            <p className="text-xs text-[#E3E8E4]/70">
              Draw your shop. Go live in <span className="font-serif italic text-[#D6F26B] text-sm">60 seconds</span>.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-[#E3E8E4]/80">
          <Link to="/" className="hover:text-white transition">Home</Link>
          <Link to="/dashboard" className="hover:text-white transition">Dashboard</Link>
          <Link to="/bookings" className="hover:text-white transition">Live bookings</Link>
          <Link to="/design" className="hover:text-white transition">Design tokens</Link>
          <span>•</span>
          <span>English • తెలుగు • हिन्दी</span>
        </div>
      </div>
    </footer>
  );
};
