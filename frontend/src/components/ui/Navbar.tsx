"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { Button } from "./Button";
import { Github } from "./Github";
import { Sun, Moon } from "lucide-react";

export function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="glass sticky top-0 z-50 w-full" style={{ position: 'sticky', top: 0, zIndex: 50, borderBottom: '1px solid var(--border)' }}>
      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '70px' }}>
        <Link href="/" className="text-xl font-bold flex-center" style={{ gap: '8px' }}>
          <Github className="w-6 h-6" />
          <span>Repo<span className="text-gradient">Flow</span></span>
        </Link>
        
        <div className="flex-center" style={{ gap: '16px' }}>
          <button 
            onClick={toggleTheme} 
            className="flex-center btn-ghost" 
            style={{ width: '40px', height: '40px', borderRadius: '50%' }}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          
          {user ? (
            <>
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">Dashboard</Button>
              </Link>
              <Button variant="outline" size="sm" onClick={logout}>Sign Out</Button>
            </>
          ) : (
            <>
              <Link href="/signin">
                <Button variant="ghost" size="sm">Sign In</Button>
              </Link>
              <Link href="/signup">
                <Button variant="primary" size="sm">Get Started</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
