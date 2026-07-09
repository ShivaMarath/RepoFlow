"use client";

import React from "react";
import { motion } from "framer-motion";
import { Button } from "../components/ui/Button";
import Link from "next/link";
import { ArrowRight, Zap, Shield, Cloud } from "lucide-react";

export default function Home() {
  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Background Effects */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', overflow: 'hidden', zIndex: -1 }}>
        <div style={{ position: 'absolute', top: '-10%', left: '50%', transform: 'translateX(-50%)', width: '80vw', height: '600px', background: 'radial-gradient(ellipse at top, rgba(96, 165, 250, 0.15), transparent 70%)', filter: 'blur(60px)' }}></div>
      </div>

      <div className="container" style={{ paddingTop: '8rem', paddingBottom: '8rem' }}>
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex-center" 
          style={{ flexDirection: 'column', textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', borderRadius: '24px', background: 'var(--glass-bg)', border: '1px solid var(--border)', marginBottom: '2rem', fontSize: '14px', fontWeight: 500 }}
          >
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)' }}></span>
            RepoFlow is now in Beta
          </motion.div>

          <h1 style={{ fontSize: 'clamp(3rem, 6vw, 5rem)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em', marginBottom: '1.5rem' }}>
            Deploy your code with <span className="text-gradient">zero friction</span>
          </h1>
          
          <p style={{ fontSize: '1.25rem', color: 'var(--muted)', marginBottom: '3rem', maxWidth: '600px' }}>
            Connect your GitHub repository and deploy full-stack applications in seconds. We handle the infrastructure so you can focus on building.
          </p>
          
          <div className="flex-center" style={{ gap: '1rem', flexWrap: 'wrap' }}>
            <Link href="/signup">
              <Button size="lg" style={{ gap: '8px' }}>
                Start Deploying <ArrowRight size={20} />
              </Button>
            </Link>
            <Link href="/signin">
              <Button size="lg" variant="secondary">
                View Dashboard
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Features Grid */}
        <div style={{ marginTop: '8rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          {[
            {
              icon: <Zap size={24} color="#60a5fa" />,
              title: "Lightning Fast Builds",
              description: "Our distributed build infrastructure compiles and containerizes your code instantly."
            },
            {
              icon: <Cloud size={24} color="#a78bfa" />,
              title: "Global Edge Network",
              description: "Your applications are automatically distributed to the edge for millisecond latencies globally."
            },
            {
              icon: <Shield size={24} color="#34d399" />,
              title: "Enterprise Grade Security",
              description: "Isolated execution environments, automated SSL, and DDoS protection out of the box."
            }
          ].map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + index * 0.1, duration: 0.5 }}
              className="glass-card"
              style={{ padding: '2rem', textAlign: 'left' }}
            >
              <div style={{ display: 'inline-flex', padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', marginBottom: '1.5rem' }}>
                {feature.icon}
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.75rem' }}>{feature.title}</h3>
              <p style={{ color: 'var(--muted)', lineHeight: 1.6 }}>{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
