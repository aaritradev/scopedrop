"use client";

import { useEffect, useState } from "react";
import { OutputView } from "@/components/BriefOutput/OutputView";
import { formatPrice } from "@/lib/currency";
import { CheckCircle, UploadSimple, DownloadSimple, ShieldCheck } from "@phosphor-icons/react";
import { motion } from "framer-motion";

export function PortalClient({ slug }: { slug: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // States for actions
  const [approving, setApproving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [paying, setPaying] = useState(false);

  // Chat states
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSendingMsg, setIsSendingMsg] = useState(false);

  useEffect(() => {
    fetch(`/api/portal/${slug}`)
      .then((res) => {
        if (!res.ok) throw new Error("Portal not found");
        return res.json();
      })
      .then((resData) => setData(resData.project))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/portal/${slug}/messages`);
        const resData = await res.json();
        if (res.ok && resData.messages) {
          setMessages(resData.messages);
        }
      } catch (e) {}
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [slug]);

  const handleApprove = async () => {
    setApproving(true);
    try {
      const res = await fetch(`/api/portal/${slug}/approve`, { method: "POST" });
      if (res.ok) {
        setData({
          ...data,
          portal_activity: [...(data.portal_activity || []), { event: "scope_approved", actor: "client" }]
        });
      }
    } finally {
      setApproving(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError("");

    try {
      // 1. Get signed upload URL
      const presignRes = await fetch(`/api/portal/${slug}/files`, {
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
      const confirmRes = await fetch(`/api/portal/${slug}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm", fileName: file.name, storagePath: presignData.storagePath }),
      });
      const confirmData = await confirmRes.json();
      if (!confirmRes.ok) throw new Error(confirmData.error || "Failed to save file record");

      setData({
        ...data,
        portal_files: [confirmData.file, ...(data.portal_files || [])]
      });
    } catch (err: any) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleMarkPaid = async (invoiceId: string) => {
    setPaying(true);
    try {
      const res = await fetch(`/api/portal/${slug}/invoice/paid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoice_id: invoiceId }),
      });
      if (res.ok) {
        setData({
          ...data,
          invoices: data.invoices.map((inv: any) =>
            inv.id === invoiceId ? { ...inv, status: "paid" } : inv
          )
        });
      }
    } finally {
      setPaying(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    setIsSendingMsg(true);
    try {
      const res = await fetch(`/api/portal/${slug}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: newMessage }),
      });
      const resData = await res.json();
      if (res.ok) {
        setMessages([...messages, resData.message]);
        setNewMessage("");
      }
    } catch (e) {
    } finally {
      setIsSendingMsg(false);
    }
  };

  if (loading) {
    return <div className="mx-auto max-w-4xl p-8"><div className="h-10 w-48 rounded shimmer" /></div>;
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center">
        <div>
          <h1 className="text-2xl font-bold text-on-surface mb-2">Portal Not Found</h1>
          <p className="text-on-surface/55">This link may be invalid or expired.</p>
        </div>
      </div>
    );
  }

  const isApproved = data.portal_activity?.some((a: any) => a.event === "scope_approved");
  const invoice = data.invoices?.find((i: any) => i.status === "unpaid") || data.invoices?.[0];

  return (
    <div className="min-h-screen bg-[#121315] text-[#e3e2e5]">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#1a1b1e]/50 backdrop-blur-md sticky top-0 z-10">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-on-surface/50 mb-1">
              Project Portal
            </p>
            <h1 className="text-lg font-bold text-on-surface">
              {data.freelancer_name} × {data.client_name}
            </h1>
          </div>
          {isApproved ? (
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-400 bg-emerald-400/10 px-4 py-2 rounded-xl">
              <CheckCircle size={18} weight="fill" />
              Scope Approved
            </div>
          ) : (
            <button
              onClick={handleApprove}
              disabled={approving}
              className="btn-primary text-sm px-6"
            >
              {approving ? "Approving..." : "Approve Scope"}
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-10 space-y-12">
        {/* Scope Section */}
        <section>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold text-on-surface">Scope Document</h2>
          </div>
          {data.briefs ? (
            <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
               <OutputView brief={data.briefs.generated_brief} canExportPDF={false} isClientView={true} />
            </div>
          ) : (
            <div className="p-8 text-center text-sm text-on-surface/50 card-base">
              No scope document attached.
            </div>
          )}
        </section>

        {/* Chat Section */}
        <section className="space-y-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold text-on-surface">Messages</h2>
          </div>
          <div className="flex flex-col h-[400px] card-base overflow-hidden border border-white/10 shadow-2xl">
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-[#121315]/50">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-on-surface/40">
                  No messages yet. Send a message to {data.freelancer_name}.
                </div>
              ) : (
                messages.map((m) => {
                  const isMe = m.actor === "client";
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
            <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10 flex gap-2 bg-black/20">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                className="input-base flex-1 bg-white/5 border-white/10"
              />
              <button type="submit" disabled={isSendingMsg || !newMessage.trim()} className="btn-primary shrink-0">
                Send
              </button>
            </form>
          </div>
        </section>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Files Section */}
          <section className="space-y-6">
            <h2 className="text-xl font-bold text-on-surface">Files & Assets</h2>
            
            <div className="card-base p-6 text-center border-dashed border-2 hover:border-primary/50 transition-colors relative">
              <input
                type="file"
                onChange={handleUpload}
                disabled={uploading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
              <UploadSimple size={24} className="mx-auto text-on-surface/50 mb-2" />
              <p className="text-sm font-medium text-on-surface">Upload files for {data.freelancer_name}</p>
              <p className="text-xs text-on-surface/50 mt-1">Max 25MB per file</p>
              {uploading && <p className="text-xs text-primary mt-2">Uploading...</p>}
              {uploadError && <p className="text-xs text-red-400 mt-2">{uploadError}</p>}
            </div>

            <div className="space-y-8 mt-2">
              {/* You sent */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-on-surface/50 uppercase tracking-wider">You sent</h3>
                {(!data.portal_files || !data.portal_files.some((f: any) => f.uploaded_by === "client")) ? (
                  <p className="text-sm text-on-surface/40">You haven't uploaded any files yet.</p>
                ) : (
                  data.portal_files.filter((f: any) => f.uploaded_by === "client").map((f: any) => (
                    <div key={f.id} className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                      <div className="flex flex-col min-w-0 pr-4">
                        <span className="text-sm font-medium text-on-surface truncate">{f.file_name}</span>
                        <span className="text-xs text-on-surface/40 mt-0.5">{new Date(f.created_at).toLocaleDateString()}</span>
                      </div>
                      {f.signed_url && (
                        <a href={f.signed_url} download className="p-2 rounded-lg bg-white/5 hover:bg-white/10 shrink-0 text-on-surface/60">
                          <DownloadSimple size={16} />
                        </a>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Shared with you (from freelancer) */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-on-surface/50 uppercase tracking-wider">Shared with you</h3>
                {(!data.portal_files || !data.portal_files.some((f: any) => f.uploaded_by === "freelancer")) ? (
                  <p className="text-sm text-on-surface/40">No files shared by {data.freelancer_name} yet.</p>
                ) : (
                  data.portal_files.filter((f: any) => f.uploaded_by === "freelancer").map((f: any) => (
                    <div key={f.id} className="flex items-center justify-between p-4 rounded-xl border border-primary/10 bg-primary/[0.03]">
                      <div className="flex flex-col min-w-0 pr-4">
                        <span className="text-sm font-medium text-on-surface truncate">{f.file_name}</span>
                        <span className="text-xs text-on-surface/40 mt-0.5">{new Date(f.created_at).toLocaleDateString()}</span>
                      </div>
                      {f.signed_url && (
                        <a href={f.signed_url} download className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 shrink-0 text-primary">
                          <DownloadSimple size={16} />
                        </a>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          {/* Invoice Section */}
          <section className="space-y-6">
            <h2 className="text-xl font-bold text-on-surface">Payment & Invoice</h2>
            
            {!invoice ? (
              <div className="card-base p-8 text-center border border-white/5">
                <ShieldCheck size={32} className="mx-auto text-on-surface/30 mb-3" />
                <p className="text-sm text-on-surface/55">No pending invoices for this project.</p>
              </div>
            ) : (
              <motion.div 
                className={`card-base p-6 border ${invoice.status === 'paid' ? 'border-emerald-500/20' : 'border-primary/20'}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-sm font-semibold text-on-surface uppercase tracking-wider mb-1">Current Invoice</h3>
                    <p className="text-xs text-on-surface/50">Requested {new Date(invoice.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded ${
                    invoice.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-primary/10 text-primary'
                  }`}>
                    {invoice.status}
                  </div>
                </div>
                
                <div className="text-4xl font-bold tabular mb-6 text-on-surface">
                  {formatPrice(invoice.amount, invoice.currency as any)}
                </div>
                
                <div className="bg-black/30 rounded-xl p-5 mb-6 border border-white/5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-on-surface/50 mb-3">Payment Instructions</p>
                  <p className="text-sm text-on-surface whitespace-pre-wrap">{invoice.payment_details}</p>
                </div>

                {invoice.status === "unpaid" ? (
                  <button 
                    onClick={() => handleMarkPaid(invoice.id)}
                    disabled={paying}
                    className="btn-primary w-full justify-center h-12"
                  >
                    {paying ? "Updating..." : "I have made the payment"}
                  </button>
                ) : (
                  <div className="flex items-center justify-center gap-2 text-sm font-medium text-emerald-400 bg-emerald-500/10 py-3 rounded-xl border border-emerald-500/20">
                    <CheckCircle size={18} weight="fill" />
                    Payment Confirmed
                  </div>
                )}
              </motion.div>
            )}
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 text-center mt-12">
        <p className="text-sm text-on-surface/40">
          Powered by <a href="https://scopedrop.me" target="_blank" rel="noopener noreferrer" className="text-on-surface/70 hover:text-primary transition-colors">ScopeDrop</a>
        </p>
      </footer>
    </div>
  );
}
