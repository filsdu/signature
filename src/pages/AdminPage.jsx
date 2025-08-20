import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ====== CONFIG: WHO CAN SEE ADMIN ======
const ADMIN_EMAIL = "talkloopers@gmail.com"; // change if needed

// Small helpers
function cls(...a) { return a.filter(Boolean).join(" "); }
function fmt(n) { return new Intl.NumberFormat().format(n ?? 0); }

export default function AdminPage() {
  const [me, setMe] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [message, setMessage] = useState("");

  // Dashboard counts
  const [counts, setCounts] = useState({
    signatures: 0,
    confessions: 0,
    photos: 0,
    word_signatures: 0,
    reports_pending: 0,
    campaigns_active: 0,
  });

  // Campaigns
  const [campaigns, setCampaigns] = useState([]);
  const [form, setForm] = useState({
    type: "signature",      // signature | confession | photo | word
    title: "",
    slug: "",
    is_active: true,
    config_word_phrase: "", // for word campaigns
    config_max_len: 280,    // for confession campaigns
  });

  // Moderation queue
  const [reports, setReports] = useState([]);
  const [reportFilter, setReportFilter] = useState("pending"); // pending|cleared|removed

  // Users
  const [searchOwner, setSearchOwner] = useState("");
  const [ownerResults, setOwnerResults] = useState([]);
  const [blockedOwners, setBlockedOwners] = useState([]);

  // Logs
  const [logs, setLogs] = useState([]);

  // ========= AUTH =========
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data?.user || null;
      setMe(user);
      setAuthChecked(true);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setMe(session?.user || null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const isAdmin = useMemo(() => {
    if (!me?.email) return false;
    return me.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  }, [me]);

  // ========= LOAD DASH & DATA =========
  useEffect(() => {
    if (!isAdmin) return;
    refreshAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, reportFilter]);

  async function refreshAll() {
    await Promise.all([
      loadCounts(),
      loadCampaigns(),
      loadReports(),
      loadBlockedOwners(),
      loadLogs(),
    ]);
  }

  // COUNTS
  async function tableCount(name) {
    const { count, error } = await supabase.from(name).select("*", { count: "exact", head: true });
    if (error) return 0;
    return count || 0;
  }
  async function loadCounts() {
    const [signatures, confessions, photos, word_signatures, reports_pending, campaigns_active] = await Promise.all([
      tableCount("signatures"),
      tableCount("confessions"),
      tableCount("photos"),
      tableCount("word_signatures"),
      supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "pending").then(r=>r.count||0),
      supabase.from("campaigns").select("*", { count: "exact", head: true }).eq("is_active", true).then(r=>r.count||0),
    ]);
    setCounts({ signatures, confessions, photos, word_signatures, reports_pending, campaigns_active });
  }

  // CAMPAIGNS
  function autoSlug(title) {
    return title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 50);
  }
  async function loadCampaigns() {
    const { data, error } = await supabase
      .from("campaigns")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) setCampaigns(data || []);
  }
  async function createCampaign(e) {
    e.preventDefault();
    if (!form.title) { setMessage("Enter a title"); return; }
    const slug = form.slug || autoSlug(form.title);
    const cfg = {
      word_phrase: form.type === "word" ? (form.config_word_phrase || form.title) : undefined,
      confession_max_len: form.type === "confession" ? Number(form.config_max_len || 280) : undefined,
    };
    const row = {
      type: form.type,
      title: form.title,
      slug,
      is_active: form.is_active,
      config_json: cfg,
      created_by: me?.email || ADMIN_EMAIL,
      status: "active",
    };
    const { error } = await supabase.from("campaigns").insert(row).single();
    if (error) { setMessage("Failed to create campaign"); return; }
    setForm({ type: "signature", title: "", slug: "", is_active: true, config_word_phrase: "", config_max_len: 280 });
    await loadCampaigns();
    await loadCounts();
    setMessage("Campaign created.");
  }
  async function toggleCampaignActive(c) {
    const { error } = await supabase.from("campaigns").update({ is_active: !c.is_active }).eq("id", c.id);
    if (!error) {
      await logAction("campaign_toggle", `Toggled ${c.slug} -> ${!c.is_active}`);
      await loadCampaigns(); await loadCounts();
    }
  }
  async function archiveCampaign(c) {
    const { error } = await supabase.from("campaigns").update({ status: "archived", is_active: false }).eq("id", c.id);
    if (!error) {
      await logAction("campaign_archive", `Archived ${c.slug}`);
      await loadCampaigns(); await loadCounts();
    }
  }
  async function deleteCampaign(c) {
    if (!confirm(`Delete campaign "${c.title}"? This does NOT delete existing wall items.`)) return;
    const { error } = await supabase.from("campaigns").delete().eq("id", c.id);
    if (!error) {
      await logAction("campaign_delete", `Deleted ${c.slug}`);
      await loadCampaigns(); await loadCounts();
    }
  }

  // REPORTS
  async function loadReports() {
    let q = supabase.from("reports").select("*").order("created_at", { ascending: false }).limit(200);
    if (reportFilter) q = q.eq("status", reportFilter);
    const { data, error } = await q;
    if (!error) setReports(data || []);
  }
  async function setReportStatus(r, status) {
    const { error } = await supabase.from("reports").update({ status }).eq("id", r.id);
    if (!error) {
      await logAction("report_status", `Report ${r.id} -> ${status}`);
      await loadReports(); await loadCounts();
    }
  }
  async function removeReportedItem(r) {
    // r.item_table, r.item_id holds the target
    if (!confirm(`Remove the referenced item from "${r.item_table}"?`)) return;
    const { error } = await supabase.from(r.item_table).delete().eq("id", r.item_id);
    if (error) { setMessage("Failed to remove content"); return; }
    await setReportStatus(r, "removed");
    await logAction("content_remove", `Removed ${r.item_table}:${r.item_id}`);
    await loadCounts();
  }
  async function blockOwner(owner) {
    const { error } = await supabase.from("blocked_owners").insert({ owner });
    if (!error) {
      await logAction("owner_block", `Blocked ${owner}`);
      await loadBlockedOwners();
    }
  }
  async function unblockOwner(owner) {
    const { error } = await supabase.from("blocked_owners").delete().eq("owner", owner);
    if (!error) {
      await logAction("owner_unblock", `Unblocked ${owner}`);
      await loadBlockedOwners();
    }
  }
  async function loadBlockedOwners() {
    const { data, error } = await supabase.from("blocked_owners").select("*").order("created_at", { ascending: false });
    if (!error) setBlockedOwners(data || []);
  }

  // USERS
  async function searchByOwner() {
    const term = (searchOwner || "").trim();
    if (!term) { setOwnerResults([]); return; }
    const [sig, conf, pho, word] = await Promise.all([
      supabase.from("signatures").select("id, owner, name, created_at").ilike("owner", `%${term}%`),
      supabase.from("confessions").select("id, owner, name, created_at").ilike("owner", `%${term}%`),
      supabase.from("photos").select("id, owner, name, created_at").ilike("owner", `%${term}%`),
      supabase.from("word_signatures").select("id, owner, name, created_at").ilike("owner", `%${term}%`),
    ]);
    setOwnerResults([
      ...(sig.data || []).map(x => ({ table: "signatures", ...x })),
      ...(conf.data || []).map(x => ({ table: "confessions", ...x })),
      ...(pho.data || []).map(x => ({ table: "photos", ...x })),
      ...(word.data || []).map(x => ({ table: "word_signatures", ...x })),
    ]);
  }
  async function deleteContribution(row) {
    if (!confirm(`Delete this ${row.table} item?`)) return;
    const { error } = await supabase.from(row.table).delete().eq("id", row.id);
    if (!error) {
      await logAction("content_remove", `Removed ${row.table}:${row.id}`);
      await searchByOwner(); await loadCounts();
    }
  }

  // LOGS
  async function loadLogs() {
    const { data, error } = await supabase
      .from("mod_actions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (!error) setLogs(data || []);
  }
  async function logAction(action, details) {
    await supabase.from("mod_actions").insert({
      actor_email: me?.email || ADMIN_EMAIL,
      action, details
    });
    await loadLogs();
  }

  if (!authChecked) {
    return <div className="max-w-6xl mx-auto p-6">Checking access…</div>;
  }
  if (!isAdmin) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <h1 className="text-xl font-semibold">Admin</h1>
        <p className="text-neutral-600 mt-2">You must sign in as <b>{ADMIN_EMAIL}</b> to access this page.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Moderator / Admin</h1>
            <p className="text-sm text-neutral-600">Private control center. Signed in as <b>{me?.email}</b></p>
          </div>
          <button onClick={refreshAll} className="px-3 py-1.5 rounded-xl bg-neutral-200 hover:bg-neutral-300 text-sm">
            Refresh
          </button>
        </header>

        {message && <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-sm">{message}</div>}

        {/* DASHBOARD */}
        <section className="grid md:grid-cols-3 lg:grid-cols-6 gap-3">
          <DashCard label="Active campaigns" value={counts.campaigns_active} />
          <DashCard label="Signatures" value={counts.signatures} />
          <DashCard label="Confessions" value={counts.confessions} />
          <DashCard label="Photos" value={counts.photos} />
          <DashCard label="Word signatures" value={counts.word_signatures} />
          <DashCard label="Reports pending" value={counts.reports_pending} highlight />
        </section>

        {/* CREATE CAMPAIGN */}
        <section className="p-4 rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <h2 className="font-medium mb-3">Create a Campaign</h2>
          <form onSubmit={createCampaign} className="grid md:grid-cols-2 gap-4">
            <label className="block text-sm">
              Type
              <select
                value={form.type}
                onChange={e=>setForm({...form, type:e.target.value})}
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm">
                <option value="signature">Signature Wall</option>
                <option value="confession">Confession Wall</option>
                <option value="photo">Photo Wall</option>
                <option value="word">Word Campaign</option>
              </select>
            </label>

            <label className="block text-sm">
              Title
              <input
                value={form.title}
                onChange={e=>setForm({...form, title:e.target.value})}
                placeholder="e.g., Dog Swimming Pictures"
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"/>
            </label>

            <label className="block text-sm">
              Slug (optional)
              <input
                value={form.slug}
                onChange={e=>setForm({...form, slug:e.target.value})}
                placeholder="dog-swimming-pictures"
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"/>
            </label>

            <label className="inline-flex items-center gap-2 text-sm mt-5">
              <input type="checkbox" checked={form.is_active} onChange={e=>setForm({...form, is_active:e.target.checked})}/>
              Active
            </label>

            {form.type === "word" && (
              <label className="block text-sm md:col-span-2">
                Word / Phrase (for Word Campaign)
                <input
                  value={form.config_word_phrase}
                  onChange={e=>setForm({...form, config_word_phrase:e.target.value})}
                  placeholder="BLACK LIVES MATTER"
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"/>
              </label>
            )}

            {form.type === "confession" && (
              <label className="block text-sm">
                Max Length (characters)
                <input
                  type="number"
                  min="60" max="500"
                  value={form.config_max_len}
                  onChange={e=>setForm({...form, config_max_len: e.target.value})}
                  className="mt-1 w-40 rounded-lg border border-neutral-300 px-3 py-2 text-sm"/>
              </label>
            )}

            <div className="md:col-span-2">
              <button type="submit" className="px-4 py-2 rounded-xl bg-black text-white text-sm hover:opacity-90">
                Create Campaign
              </button>
            </div>
          </form>
        </section>

        {/* MANAGE CAMPAIGNS */}
        <section className="p-4 rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <h2 className="font-medium mb-3">Manage Campaigns</h2>
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-neutral-500">
                  <th className="py-2 pr-4">Title</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Slug</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Active</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map(c => (
                  <tr key={c.id} className="border-t border-neutral-200">
                    <td className="py-2 pr-4">{c.title}</td>
                    <td className="py-2 pr-4 capitalize">{c.type}</td>
                    <td className="py-2 pr-4">{c.slug}</td>
                    <td className="py-2 pr-4">{c.status}</td>
                    <td className="py-2 pr-4">{c.is_active ? "Yes" : "No"}</td>
                    <td className="py-2 flex gap-2">
                      <button onClick={()=>toggleCampaignActive(c)} className="px-2 py-1 rounded bg-neutral-100 hover:bg-neutral-200">Toggle</button>
                      <button onClick={()=>archiveCampaign(c)} className="px-2 py-1 rounded bg-neutral-100 hover:bg-neutral-200">Archive</button>
                      <button onClick={()=>deleteCampaign(c)} className="px-2 py-1 rounded bg-red-100 hover:bg-red-200 text-red-700">Delete</button>
                    </td>
                  </tr>
                ))}
                {campaigns.length === 0 && (
                  <tr>
                    <td colSpan="6" className="py-6 text-neutral-500">No campaigns yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* MODERATION QUEUE */}
        <section className="p-4 rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-medium mb-3">Moderation Queue</h2>
            <div className="flex items-center gap-2">
              <select value={reportFilter} onChange={e=>setReportFilter(e.target.value)} className="rounded-lg border border-neutral-300 px-2 py-1 text-sm">
                <option value="pending">Pending</option>
                <option value="cleared">Cleared</option>
                <option value="removed">Removed</option>
              </select>
            </div>
          </div>
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-neutral-500">
                  <th className="py-2 pr-3">Table</th>
                  <th className="py-2 pr-3">Item ID</th>
                  <th className="py-2 pr-3">Owner</th>
                  <th className="py-2 pr-3">Reason</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map(r => (
                  <tr key={r.id} className="border-t border-neutral-200">
                    <td className="py-2 pr-3">{r.item_table}</td>
                    <td className="py-2 pr-3">{r.item_id}</td>
                    <td className="py-2 pr-3">{r.owner}</td>
                    <td className="py-2 pr-3">{r.reason}</td>
                    <td className="py-2 pr-3">{r.status}</td>
                    <td className="py-2 flex gap-2">
                      <button onClick={()=>setReportStatus(r, "cleared")} className="px-2 py-1 rounded bg-neutral-100 hover:bg-neutral-200">Approve</button>
                      <button onClick={()=>removeReportedItem(r)} className="px-2 py-1 rounded bg-red-100 hover:bg-red-200 text-red-700">Remove</button>
                      <button onClick={()=>blockOwner(r.owner)} className="px-2 py-1 rounded bg-amber-100 hover:bg-amber-200 text-amber-800">Block owner</button>
                    </td>
                  </tr>
                ))}
                {reports.length === 0 && (
                  <tr>
                    <td colSpan="6" className="py-6 text-neutral-500">No reports for this filter.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* USER MANAGEMENT */}
        <section className="p-4 rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <h2 className="font-medium mb-3">User Management</h2>
          <div className="flex items-end gap-3 mb-3">
            <label className="block text-sm">
              Search owner (exact or partial)
              <input
                value={searchOwner}
                onChange={e=>setSearchOwner(e.target.value)}
                placeholder="owner id or email fragment"
                className="mt-1 w-72 rounded-lg border border-neutral-300 px-3 py-2 text-sm"/>
            </label>
            <button onClick={searchByOwner} className="px-3 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-sm">Search</button>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium mb-2 text-sm">Results</h3>
              <div className="border rounded-lg overflow-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-neutral-500">
                      <th className="py-2 px-2">Table</th>
                      <th className="py-2 px-2">ID</th>
                      <th className="py-2 px-2">Owner</th>
                      <th className="py-2 px-2">Name</th>
                      <th className="py-2 px-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ownerResults.map(r => (
                      <tr key={`${r.table}:${r.id}`} className="border-t border-neutral-200">
                        <td className="py-1 px-2">{r.table}</td>
                        <td className="py-1 px-2">{r.id}</td>
                        <td className="py-1 px-2">{r.owner}</td>
                        <td className="py-1 px-2">{r.name || "-"}</td>
                        <td className="py-1 px-2">
                          <button onClick={()=>deleteContribution(r)} className="px-2 py-1 rounded bg-red-100 hover:bg-red-200 text-red-700">Delete</button>
                        </td>
                      </tr>
                    ))}
                    {ownerResults.length === 0 && (
                      <tr><td colSpan="5" className="py-6 text-neutral-500">No results.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-2 text-sm">Blocked owners</h3>
              <div className="border rounded-lg overflow-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-neutral-500">
                      <th className="py-2 px-2">Owner</th>
                      <th className="py-2 px-2">Since</th>
                      <th className="py-2 px-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {blockedOwners.map(b => (
                      <tr key={b.owner} className="border-t border-neutral-200">
                        <td className="py-1 px-2">{b.owner}</td>
                        <td className="py-1 px-2">{new Date(b.created_at).toLocaleString()}</td>
                        <td className="py-1 px-2">
                          <button onClick={()=>unblockOwner(b.owner)} className="px-2 py-1 rounded bg-neutral-100 hover:bg-neutral-200">Unblock</button>
                        </td>
                      </tr>
                    ))}
                    {blockedOwners.length === 0 && (
                      <tr><td colSpan="3" className="py-6 text-neutral-500">Nobody is blocked.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* LOGS */}
        <section className="p-4 rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <h2 className="font-medium mb-3">Recent Moderator Actions</h2>
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-neutral-500">
                  <th className="py-2 pr-3">Time</th>
                  <th className="py-2 pr-3">Actor</th>
                  <th className="py-2 pr-3">Action</th>
                  <th className="py-2 pr-3">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(l => (
                  <tr key={l.id} className="border-t border-neutral-200">
                    <td className="py-2 pr-3">{new Date(l.created_at).toLocaleString()}</td>
                    <td className="py-2 pr-3">{l.actor_email}</td>
                    <td className="py-2 pr-3">{l.action}</td>
                    <td className="py-2 pr-3">{l.details}</td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr><td colSpan="4" className="py-6 text-neutral-500">No actions yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="text-xs text-neutral-500">
          Admin tools are live. Be careful — actions apply immediately.
        </footer>
      </div>
    </div>
  );
}

function DashCard({ label, value, highlight }) {
  return (
    <div className={cls("p-3 rounded-xl border shadow-sm",
      highlight ? "border-red-200 bg-red-50" : "border-neutral-200 bg-white")}>
      <div className="text-xs text-neutral-500">{label}</div>
      <div className={cls("mt-1 font-semibold", highlight ? "text-red-700" : "text-neutral-900")}>{fmt(value)}</div>
    </div>
  );
}
