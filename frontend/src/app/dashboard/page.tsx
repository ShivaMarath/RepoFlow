"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Github } from "../../components/ui/Github";
import { Plus, ExternalLink, Activity, X, Terminal } from "lucide-react";
import { io, Socket } from "socket.io-client";

interface Deployment {
  id: string;
  status: string;
  createdAt: string;
}

interface Project {
  id: string;
  name: string;
  gitURL: string;
  subDomain: string;
  Deployment: Deployment[];
  _count: {
    Deployment: number;
  };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9000";
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:9002";

export default function DashboardPage() {
  const { user, token, isLoading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // New Project Form
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newGitUrl, setNewGitUrl] = useState("");
  const [createError, setCreateError] = useState("");

  // Deploy log modal
  const [deployingProjectId, setDeployingProjectId] = useState<string | null>(null);
  const [activeDeployId, setActiveDeployId] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [logModalOpen, setLogModalOpen] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const logsEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Only fetch once auth is fully settled and we have a valid token
    if (!authLoading && token) {
      fetchProjects();
    }
  }, [token, authLoading]);

  // Auto-scroll logs to bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Cleanup socket on unmount
  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  const fetchProjects = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/projects`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        // Token expired or invalid — log out and redirect
        logout();
        router.push("/signin");
        return;
      }
      const data = await res.json();
      if (res.ok && data.status === "success") {
        setProjects(data.data.projects);
      } else {
        setError("Failed to load projects");
      }
    } catch {
      setError("Network error while loading projects");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    setIsCreating(true);
    try {
      const res = await fetch(`${API_URL}/project`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newProjectName, gitURL: newGitUrl }),
      });
      const data = await res.json();
      if (res.ok && data.status === "success") {
        setNewProjectName("");
        setNewGitUrl("");
        fetchProjects();
      } else {
        setCreateError(data.error || "Failed to create project");
      }
    } catch {
      setCreateError("Network error while creating project");
    } finally {
      setIsCreating(false);
    }
  };

  const deployProject = async (projectId: string) => {
    setDeployingProjectId(projectId);
    try {
      const res = await fetch(`${API_URL}/deploy`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ projectId }),
      });

      if (res.status === 401) {
        logout();
        router.push("/signin");
        return;
      }

      const data = await res.json();

      if (res.ok) {
        const deploymentId: string = data.data.deploymentId;
        setActiveDeployId(deploymentId);
        setLogs([]);
        setLogModalOpen(true);

        // Disconnect any previous socket
        socketRef.current?.disconnect();

        // Connect to socket server and subscribe to this deployment's logs
        const socket = io(SOCKET_URL, { transports: ["websocket"] });
        socketRef.current = socket;

        socket.on("connect", () => {
          socket.emit("subscribe", `logs:${deploymentId}`);
        });

        socket.on("message", (msg: string) => {
          try {
            const parsed = JSON.parse(msg);
            setLogs((prev) => [...prev, parsed.log ?? msg]);
          } catch {
            setLogs((prev) => [...prev, msg]);
          }
        });

        socket.on("connect_error", (err) => {
          setLogs((prev) => [...prev, `[socket error] ${err.message}`]);
        });

        fetchProjects();
      } else {
        alert(data.error || "Failed to deploy project");
      }
    } catch {
      alert("Network error during deploy");
    } finally {
      setDeployingProjectId(null);
    }
  };

  const closeLogModal = () => {
    setLogModalOpen(false);
    socketRef.current?.disconnect();
    socketRef.current = null;
    fetchProjects(); // refresh status after closing
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "READY": return "var(--success)";
      case "IN_PROGRESS": return "var(--primary)";
      case "QUEUED": return "var(--muted)";
      case "FAIL": return "var(--error)";
      default: return "var(--muted)";
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "4px" }}>Dashboard</h1>
          <p style={{ color: "var(--muted)" }}>Welcome back, {user?.name}</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: "2rem", alignItems: "start" }}>

        {/* Create Project Card */}
        <Card glass style={{ padding: "2rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "1.5rem" }}>
            <div style={{ padding: "8px", background: "rgba(59, 130, 246, 0.1)", color: "var(--primary)", borderRadius: "8px" }}>
              <Plus size={20} />
            </div>
            <h2 style={{ fontSize: "18px", fontWeight: 600 }}>New Project</h2>
          </div>

          {createError && (
            <div style={{ padding: "12px", background: "rgba(239, 68, 68, 0.1)", color: "var(--error)", borderRadius: "8px", marginBottom: "16px", fontSize: "14px" }}>
              {createError}
            </div>
          )}

          <form onSubmit={handleCreateProject}>
            <Input
              label="Project Name"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="my-awesome-app"
              required
            />
            <div style={{ position: "relative", marginTop: "4px" }}>
              <Input
                label="GitHub Repository URL"
                value={newGitUrl}
                onChange={(e) => setNewGitUrl(e.target.value)}
                placeholder="https://github.com/user/repo"
                required
                style={{ paddingLeft: "40px" }}
              />
              <Github size={18} style={{ position: "absolute", left: "14px", top: "43px", color: "var(--muted)" }} />
            </div>
            <Button type="submit" variant="primary" style={{ width: "100%", marginTop: "1rem" }} isLoading={isCreating}>
              Create Project
            </Button>
          </form>
        </Card>

        {/* Projects List — span full remaining width */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", gridColumn: "1 / -1" }}>
          <h2 style={{ fontSize: "20px", fontWeight: 600, marginBottom: "0.5rem" }}>Your Projects</h2>

          {isLoading ? (
            <div className="flex-center" style={{ padding: "4rem 0" }}>
              <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          ) : error ? (
            <div style={{ color: "var(--error)" }}>{error}</div>
          ) : projects.length === 0 ? (
            <Card glass style={{ padding: "3rem", textAlign: "center", color: "var(--muted)" }}>
              No projects yet. Create your first project to get started!
            </Card>
          ) : (
            projects.map((project, index) => {
              const latestDeployment = project.Deployment?.[0];
              const isDeploying = deployingProjectId === project.id;

              return (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card glass style={{ padding: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "8px" }}>{project.name}</h3>
                      <div style={{ display: "flex", gap: "16px", color: "var(--muted)", fontSize: "14px", alignItems: "center", flexWrap: "wrap" }}>
                        <a href={project.gitURL} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: "4px", textDecoration: "underline" }}>
                          <Github size={14} /> Repository
                        </a>
                        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <Activity size={14} /> {project._count?.Deployment || 0} Deployments
                        </span>
                        {latestDeployment && (
                          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: getStatusColor(latestDeployment.status), flexShrink: 0 }} />
                            {latestDeployment.status}
                          </span>
                        )}
                      </div>
                      <div style={{ marginTop: "12px", fontSize: "14px" }}>
                        <a
                          href={`http://${project.subDomain}.localhost:8000`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--primary)" }}
                        >
                          {project.subDomain}.localhost:8000 <ExternalLink size={14} />
                        </a>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                      {activeDeployId && project.Deployment?.[0]?.id === activeDeployId && (
                        <Button
                          variant="outline"
                          onClick={() => setLogModalOpen(true)}
                          style={{ display: "flex", alignItems: "center", gap: "6px" }}
                        >
                          <Terminal size={14} /> Logs
                        </Button>
                      )}
                      <Button
                        variant="secondary"
                        onClick={() => deployProject(project.id)}
                        isLoading={isDeploying}
                        disabled={isDeploying}
                      >
                        Deploy Now
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* Log Modal */}
      <AnimatePresence>
        {logModalOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeLogModal}
              style={{
                position: "fixed", inset: 0,
                background: "rgba(0,0,0,0.6)",
                backdropFilter: "blur(4px)",
                zIndex: 100,
              }}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.97 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              style={{
                position: "fixed",
                top: 0, left: 0, right: 0, bottom: 0,
                margin: "auto",
                width: "min(90vw, 760px)",
                height: "min(80vh, 600px)",
                display: "flex",
                flexDirection: "column",
                background: "var(--card-bg, #0f1117)",
                border: "1px solid var(--border)",
                borderRadius: "16px",
                zIndex: 101,
                overflow: "hidden",
              }}
            >
              {/* Modal header */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "1rem 1.5rem",
                borderBottom: "1px solid var(--border)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Terminal size={18} style={{ color: "var(--primary)" }} />
                  <span style={{ fontWeight: 600, fontSize: "15px" }}>Build Logs</span>
                  {activeDeployId && (
                    <span style={{ fontSize: "12px", color: "var(--muted)", fontFamily: "monospace" }}>
                      {activeDeployId}
                    </span>
                  )}
                </div>
                <button
                  onClick={closeLogModal}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", display: "flex", padding: "4px" }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Log output */}
              <div style={{
                flex: 1,
                overflowY: "auto",
                padding: "1rem 1.5rem",
                fontFamily: "monospace",
                fontSize: "13px",
                lineHeight: "1.7",
                background: "#0a0c10",
                color: "#e2e8f0",
              }}>
                {logs.length === 0 ? (
                  <span style={{ color: "#64748b" }}>Waiting for logs...</span>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} style={{
                      color: log.startsWith("error") ? "#f87171" : log.startsWith("[socket") ? "#fb923c" : "#e2e8f0",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-all",
                    }}>
                      <span style={{ color: "#475569", userSelect: "none" }}>{String(i + 1).padStart(3, " ")} │ </span>
                      {log}
                    </div>
                  ))
                )}
                <div ref={logsEndRef} />
              </div>

              {/* Modal footer */}
              <div style={{
                padding: "0.75rem 1.5rem",
                borderTop: "1px solid var(--border)",
                display: "flex", justifyContent: "space-between", alignItems: "center",
                fontSize: "13px", color: "var(--muted)",
              }}>
                <span>{logs.length} lines</span>
                <Button variant="outline" onClick={closeLogModal} style={{ fontSize: "13px", padding: "6px 14px" }}>
                  Close
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
