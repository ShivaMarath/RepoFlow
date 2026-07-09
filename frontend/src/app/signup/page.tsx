"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Card } from "../../components/ui/Card";
import { Github } from "../../components/ui/Github";
import Link from "next/link";
import { Mail, Lock, User as UserIcon } from "lucide-react";

export default function SignUpPage() {
  const { login } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9000";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (res.ok && data.status === "success") {
        login(data.data.token, data.data.user);
      } else {
        // Handle Zod array errors nicely
        if (data.error && Array.isArray(data.error.issues)) {
          setError(data.error.issues[0].message);
        } else {
          setError(data.error || data.message || "Failed to sign up. Please try again.");
        }
      }
    } catch (err) {
      setError("Network error. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-center" style={{ minHeight: 'calc(100vh - 70px)', padding: '2rem' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', overflow: 'hidden', zIndex: -1 }}>
        <div style={{ position: 'absolute', top: '10%', left: '20%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(96, 165, 250, 0.15) 0%, transparent 70%)', filter: 'blur(60px)' }}></div>
        <div style={{ position: 'absolute', bottom: '10%', right: '20%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(167, 139, 250, 0.15) 0%, transparent 70%)', filter: 'blur(60px)' }}></div>
      </div>

      <Card glass style={{ width: '100%', maxWidth: '440px', padding: '2.5rem' }}>
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          transition={{ delay: 0.1 }}
          className="flex-center" 
          style={{ flexDirection: 'column', marginBottom: '2rem' }}
        >
          <div style={{ display: 'inline-flex', padding: '12px', borderRadius: '12px', background: 'var(--primary)', color: 'white', marginBottom: '16px' }}>
            <Github size={24} />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>Create an account</h1>
          <p style={{ color: 'var(--muted)', textAlign: 'center' }}>Start deploying your projects seamlessly</p>
        </motion.div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }}
            style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--error)', color: 'var(--error)', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', textAlign: 'center' }}
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ position: 'relative' }}>
            <Input 
              label="Full Name" 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="John Doe"
              required 
              style={{ paddingLeft: '40px' }}
            />
            <UserIcon size={18} style={{ position: 'absolute', left: '14px', top: '43px', color: 'var(--muted)' }} />
          </div>

          <div style={{ position: 'relative', marginTop: '4px' }}>
            <Input 
              label="Email Address" 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="you@example.com"
              required 
              style={{ paddingLeft: '40px' }}
            />
            <Mail size={18} style={{ position: 'absolute', left: '14px', top: '43px', color: 'var(--muted)' }} />
          </div>

          <div style={{ position: 'relative', marginTop: '4px' }}>
            <Input 
              label="Password" 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="••••••••"
              required 
              style={{ paddingLeft: '40px' }}
            />
            <Lock size={18} style={{ position: 'absolute', left: '14px', top: '43px', color: 'var(--muted)' }} />
          </div>

          <Button type="submit" variant="primary" style={{ width: '100%', marginTop: '1rem' }} isLoading={isLoading}>
            Sign Up
          </Button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
          <span style={{ padding: '0 16px', color: 'var(--muted)', fontSize: '14px' }}>or</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
        </div>

        <Button variant="outline" style={{ width: '100%', gap: '8px' }}>
          <Github size={18} />
          Sign up with GitHub
        </Button>

        <p style={{ marginTop: '24px', textAlign: 'center', fontSize: '14px', color: 'var(--muted)' }}>
          Already have an account?{' '}
          <Link href="/signin" style={{ color: 'var(--primary)', fontWeight: 500 }}>
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}
