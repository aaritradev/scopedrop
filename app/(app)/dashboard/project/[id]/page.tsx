"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, UploadSimple, DownloadSimple, CheckCircle, Warning, Check, Copy } from "@phosphor-icons/react";
import { OutputView } from "@/components/BriefOutput/OutputView";
import { formatPrice } from "@/lib/currency";

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"scope" | "files" | "chat" | "invoice" | "activity">("scope");
  
  // File upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // Invoice state
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [invoiceDetails, setInvoiceDetails] = useState("");
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  
  // Chat state
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSendingMsg, setIsSendingMsg] = useState(false);
  
  const [copied, setCopied] = useState(false);

  const fetchProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${params.id}`);
      if (!res.ok) throw new Error("Not found");
      const data = await res.json();
      setProject(data.project);
    } catch {
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  useEffect(() => {
    if (!project || activeTab !== "chat") return;
    
    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/projects/${project.id}/messages`);
        const data = await res.json();
        if (res.ok && data.messages) {
          setMessages(data.messages);
        }
      } catch (e) {}
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [project, activeTab]);

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    const res = await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) setProject({ ...project, status: newStatus });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    setUploadError("");

    try {
      // 1. Get signed upload URL
      const presignRes = await fetch(`/api/projects/${project.id}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "presign", fileName: file.name }),
      });
      const presignData = await presignRes.json();
      if (!presignRes.ok) throw new Error(presignData.error || "Failed to initialize upload");

      // 2. Upload file directly to Supabase Storage
      const uploadRes = await fetch(presignData.signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!uploadRes.ok) throw new Error("Failed to upload file to storage");

      // 3. Confirm upload and save to database
      const confirmRes = await fetch(`/api/projects/${project.id}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm", fileName: file.name, storagePath: presignData.storagePath }),
      });
      const confirmData = await confirmRes.json();
      if (!confirmRes.ok) throw new Error(confirmData.error || "Failed to save file record");
      
      setProject({
        ...project,
        portal_files: [confirmData.file, ...(project.portal_files || [])],
      });
    } catch (err: any) {
      setUploadError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingInvoice(true);
    
    const amountInPaise = Math.round(parseFloat(invoiceAmount) * 100);

    try {
      const res = await fetch(`/api/projects/${project.id}/invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountInPaise,
          payment_method: "upi",
          payment_details: invoiceDetails,
          currency: "INR"
        }),
      });
      
      if (!res.ok) throw new Error("Failed to create invoice");
      await fetchProject();
      setInvoiceAmount("");
      setInvoiceDetails("");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsCreatingInvoice(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    setIsSendingMsg(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: newMessage }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessages([...messages, data.message]);
        setNewMessage("");
      }
    } catch (e) {
    } finally {
      setIsSendingMsg(false);
    }
  };

  const handleMarkInvoicePaid = async (invoiceId: string) => {
    try {
      const res = await fetch(`/api/projects/${project.id}/invoice`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoice_id: invoiceId }),
      });
      if (res.ok) await fetchProject();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div className="mx-auto max-w-5xl px-6 py-10"><div className="h-10 w-48 rounded shimmer" /></div>;
  }

  if (!project) return null;

  const currentInvoice = project.invoices?.find((i: any) => i.status === "unpaid") || project.invoices?.[0];
  const hasApprovedActivity = project.portal_activity?.some((a: any) => a.event === "scope_approved");

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6 sm:py-10">
      <Link href="/dashboard" className="mb-6 inline-flex items-center gap-1.5 text-sm text-on-surface/50 hover:text-on-surface transition-colors">
        <ArrowLeft size={14} /> Back to Dashboard
      </Link>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Main Content */}
        <div className="flex-1 w-full min-w-0">
          <h1 className="text-display-sm font-bold text-on-surface mb-2 truncate">
            {project.client_name}
          </h1>
          <p className="text-sm text-on-surface/55 mb-8">
            Project Portal
          </p>

          <div className="flex border-b border-white/10 mb-6 overflow-x-auto">
            {["scope", "files", "chat", "invoice", "activity"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-5 py-2.5 text-sm font-medium transition-colors relative whitespace-nowrap capitalize ${
                  activeTab === tab ? "text-on-surface" : "text-on-surface/50 hover:text-on-surface/80"
                }`}
              >
                {tab}
                {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
              </button>
            ))}
          </div>

          <div className="min-h-[400px]">
            {activeTab === "scope" && (
              <div className="space-y-4">
                {hasApprovedActivity && (
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 flex items-center gap-2 text-sm text-emerald-400">
                    <CheckCircle size={16} weight="fill" />
                    Client approved this scope document
                  </div>
                )}
                {project.briefs ? (
                  <OutputView brief={project.briefs.generated_brief} canExportPDF={false} />
                ) : (
                  <div className="p-8 text-center text-sm text-on-surface/50 card-base">
                    No scope document linked.
                  </div>
                )}
              </div>
            )}

            {activeTab === "files" && (
              <div className="space-y-6">
                <div className="card-base p-6 text-center border-dashed border-2 hover:border-primary/50 transition-colors relative">
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  />
                  <UploadSimple size={24} className="mx-auto text-on-surface/50 mb-2" />
                  <p className="text-sm font-medium text-on-surface">Click or drag to upload files</p>
                  <p className="text-xs text-on-surface/50 mt-1">Max 25MB per file</p>
                  {isUploading && <p className="text-xs text-primary mt-2">Uploading...</p>}
                  {uploadError && <p className="text-xs text-red-400 mt-2">{uploadError}</p>}
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-on-surface uppercase tracking-wider mb-4">Project Files</h3>
                  {(!project.portal_files || project.portal_files.length === 0) && (
                    <p className="text-sm text-on-surface/40">No files uploaded yet.</p>
                  )}
                  {project.portal_files?.map((f: any) => (
                    <div key={f.id} className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                      <div className="flex flex-col min-w-0 pr-4">
                        <span className="text-sm font-medium text-on-surface truncate">{f.file_name}</span>
                        <span className="text-xs text-on-surface/40 mt-0.5">
                          Uploaded by {f.uploaded_by} · {new Date(f.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {f.signed_url && (
                        <a href={f.signed_url} download className="p-2 rounded-lg bg-white/5 hover:bg-white/10 shrink-0">
                          <DownloadSimple size={16} />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "chat" && (
              <div className="flex flex-col h-[500px] card-base overflow-hidden">
                <div className="flex-1 p-4 overflow-y-auto space-y-4">
                  {messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-sm text-on-surface/40">
                      No messages yet. Start the conversation!
                    </div>
                  ) : (
                    messages.map((m) => {
                      const isMe = m.actor === "freelancer";
                      return (
                        <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${isMe ? "bg-primary text-black rounded-tr-sm" : "bg-white/10 text-on-surface rounded-tl-sm"}`}>
                            <p className="whitespace-pre-wrap">{m.message}</p>
                            <p className={`text-[10px] mt-1 ${isMe ? "text-black/60" : "text-on-surface/40"}`}>
                              {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                <form onSubmit={handleSendMessage} className="p-4 border-t border-white/5 flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="input-base flex-1"
                  />
                  <button type="submit" disabled={isSendingMsg || !newMessage.trim()} className="btn-primary">
                    Send
                  </button>
                </form>
              </div>
            )}

            {activeTab === "invoice" && (
              <div className="space-y-6">
                {!currentInvoice || currentInvoice.status === "paid" ? (
                  <form onSubmit={handleCreateInvoice} className="card-base p-6 space-y-4">
                    <h3 className="text-sm font-semibold text-on-surface uppercase tracking-wider mb-2">Create New Invoice</h3>
                    <div>
                      <label className="block text-xs font-medium text-on-surface/55 mb-1.5">Amount (₹)</label>
                      <input
                        type="number"
                        min="1"
                        step="0.01"
                        required
                        value={invoiceAmount}
                        onChange={(e) => setInvoiceAmount(e.target.value)}
                        className="input-base"
                        placeholder="e.g. 50000"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-on-surface/55 mb-1.5">Payment Details (UPI ID / Bank Details)</label>
                      <textarea
                        required
                        value={invoiceDetails}
                        onChange={(e) => setInvoiceDetails(e.target.value)}
                        className="input-base min-h-[100px] resize-y"
                        placeholder="yourname@upi"
                      />
                    </div>
                    <button type="submit" disabled={isCreatingInvoice} className="btn-primary w-full text-sm disabled:opacity-50">
                      {isCreatingInvoice ? "Creating..." : "Generate Invoice Request"}
                    </button>
                  </form>
                ) : null}

                {currentInvoice && (
                  <div className={`card-base p-6 border ${currentInvoice.status === 'paid' ? 'border-emerald-500/20' : 'border-amber-500/20'}`}>
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h3 className="text-sm font-semibold text-on-surface uppercase tracking-wider mb-1">Current Invoice</h3>
                        <p className="text-xs text-on-surface/50">Created on {new Date(currentInvoice.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded ${
                        currentInvoice.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                      }`}>
                        {currentInvoice.status}
                      </div>
                    </div>
                    
                    <div className="text-3xl font-bold tabular mb-4">
                      {formatPrice(currentInvoice.amount, currentInvoice.currency as any)}
                    </div>
                    
                    <div className="bg-black/20 rounded-lg p-4 mb-6">
                      <p className="text-xs text-on-surface/50 mb-1">Payment Details Provided:</p>
                      <p className="text-sm font-medium whitespace-pre-wrap">{currentInvoice.payment_details}</p>
                    </div>

                    {currentInvoice.status === "unpaid" && (
                      <button 
                        onClick={() => handleMarkInvoicePaid(currentInvoice.id)}
                        className="btn-secondary w-full text-sm"
                      >
                        Mark as Paid Manually
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === "activity" && (
              <div className="space-y-4">
                {(!project.portal_activity || project.portal_activity.length === 0) && (
                  <p className="text-sm text-on-surface/40">No activity yet.</p>
                )}
                {project.portal_activity?.map((a: any) => (
                  <div key={a.id} className="flex gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                    <div className="mt-0.5 text-on-surface/30">
                      {a.actor === "client" ? <CheckCircle size={16} /> : <ArrowLeft size={16} />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-on-surface">
                        <span className="capitalize">{a.actor}</span>: {a.event.replace(/_/g, " ")}
                      </p>
                      <p className="text-xs text-on-surface/40 mt-1">
                        {new Date(a.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-[320px] shrink-0 space-y-6">
          <div className="card-base p-5">
            <h3 className="text-xs font-semibold text-on-surface/50 uppercase tracking-wider mb-4">Share Portal Link</h3>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={`${window.location.origin}/p/${project.portal_slug}`}
                className="input-base text-xs bg-black/20"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/p/${project.portal_slug}`);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="btn-secondary px-3"
              >
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              </button>
            </div>
            <a 
              href={`/p/${project.portal_slug}`} 
              target="_blank" 
              className="mt-3 block text-center text-xs text-primary hover:underline"
            >
              Open portal in new tab
            </a>
          </div>

          <div className="card-base p-5">
            <h3 className="text-xs font-semibold text-on-surface/50 uppercase tracking-wider mb-4">Project Status</h3>
            <select
              value={project.status}
              onChange={handleStatusChange}
              className="w-full input-base bg-black/20 cursor-pointer appearance-none"
            >
              <option value="not_started" className="bg-[#1a1b1e] text-[#e3e2e5]">Not Started</option>
              <option value="in_progress" className="bg-[#1a1b1e] text-[#e3e2e5]">In Progress</option>
              <option value="in_review" className="bg-[#1a1b1e] text-[#e3e2e5]">In Review</option>
              <option value="delivered" className="bg-[#1a1b1e] text-[#e3e2e5]">Delivered</option>
              <option value="paid" className="bg-[#1a1b1e] text-[#e3e2e5]">Paid</option>
            </select>
          </div>

          <div className="card-base p-5">
            <h3 className="text-xs font-semibold text-on-surface/50 uppercase tracking-wider mb-4">Client Details</h3>
            <p className="text-sm font-medium text-on-surface mb-1">{project.client_name}</p>
            {project.client_email && (
              <p className="text-xs text-on-surface/60">{project.client_email}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
