import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Divider,
  FormControlLabel,
  Grid,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import { useSettings } from "../../../backend/context/SettingsContext";
import { APP_KEYS, getFunctionsBaseUrl } from "../../../config/keys";
import { auth, db, onValue, ref, update } from "../../../backend/services/Firebase";
import type { AdminPageKey } from "./AdminAccess";
import CreateAdmin from "./CreateAdmin";
import DataHeader from "../../components/reusable/DataHeader";

const PAGE_KEYS: AdminPageKey[] = [
  "viewer",
  "crm",
  "tasks",
  "calendar",
  "social",
  "email",
  "referrals",
  "createCompany",
  "createAdmin",
  "staff",
];

export default function AdminStaff() {
  const location = useLocation();
  const navigate = useNavigate();
  const { state: settingsState } = useSettings();
  const [tab, setTab] = useState<0 | 1 | 2>(0);
  const [staff, setStaff] = useState<Record<string, any>>({});
  const [invites, setInvites] = useState<Record<string, any>>({});
  const [crmContacts, setCrmContacts] = useState<Record<string, any>>({});
  const [staffSearch, setStaffSearch] = useState("");

  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePages, setInvitePages] = useState<Record<string, boolean>>(() => {
    const out: any = {};
    PAGE_KEYS.forEach((k) => (out[k] = false));
    out.viewer = true;
    return out;
  });
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  useEffect(() => {
    const staffRef = ref(db, "admin/staff");
    const invRef = ref(db, "admin/staffInvites");
    const contactsRef = ref(db, "admin/crm/contacts");
    const unsub1 = onValue(staffRef, (snap) => {
      setStaff(snap.val() || {});
    });
    const unsub2 = onValue(invRef, (snap) => {
      setInvites(snap.val() || {});
    });
    const unsub3 = onValue(contactsRef, (snap) => {
      setCrmContacts(snap.val() || {});
    });
    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search || "");
    const t = (params.get("tab") || "").toLowerCase();
    if (t === "createadmin") setTab(1);
    if (t === "invites") setTab(0);
    if (t === "contacts") setTab(2);
  }, [location.search]);

  const createInvite = async () => {
    setInviteLink(null);
    const token = await auth.currentUser?.getIdToken();
    if (!token) return;

    const fnBase = getFunctionsBaseUrl({
      projectId: APP_KEYS.firebase.projectId,
      region: APP_KEYS.firebase.functionsRegion,
    });

    const resp = await fetch(`${fnBase}/createAdminInvite`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        email: inviteEmail.trim(),
        pages: invitePages,
        expiresInHours: 168,
        appOrigin: `${window.location.origin}/App`,
      }),
    });
    const data = await resp.json();
    if (data?.success) {
      setInviteLink(data.link);
    }
  };

  const updateStaffPages = async (uid: string, pages: Record<string, boolean>) => {
    await update(ref(db, `users/${uid}/adminStaff/pages`), pages);
    await update(ref(db, `admin/staff/${uid}/pages`), pages);
  };

  const activeStaffList = useMemo(() => {
    return Object.entries(staff).map(([uid, s]: any) => ({ uid, ...(s || {}) }));
  }, [staff]);

  const staffContacts = useMemo(() => {
    const q = staffSearch.trim().toLowerCase();
    const rows = Object.entries(crmContacts || {}).map(([id, raw]: any) => ({
      id,
      name: raw?.name || "",
      email: raw?.email || "",
      phone: raw?.phone || "",
      status: raw?.status || "",
      tags: Array.isArray(raw?.tags) ? raw.tags : [],
      notes: raw?.notes || "",
      updatedAt: raw?.updatedAt || 0,
    }));

    const staffOnly = rows.filter((c) => {
      const tags = c.tags || [];
      if (tags.includes("staff")) return true;
      const notes = String(c.notes || "").toLowerCase();
      return notes.includes("staff intro") || notes.includes("staff");
    });

    const searched = staffOnly.filter((c) => {
      if (!q) return true;
      return (
        String(c.name || "").toLowerCase().includes(q) ||
        String(c.email || "").toLowerCase().includes(q) ||
        String(c.phone || "").toLowerCase().includes(q) ||
        String(c.status || "").toLowerCase().includes(q) ||
        (c.tags || []).join(" ").toLowerCase().includes(q)
      );
    });

    searched.sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
    return searched;
  }, [crmContacts, staffSearch]);

  return (
    <Box sx={{ p: 3 }}>
      <DataHeader
        showDateControls={false}
        showDateTypeSelector={false}
        searchTerm={tab === 2 ? staffSearch : ""}
        onSearchChange={tab === 2 ? (t) => setStaffSearch(t) : undefined}
        searchPlaceholder={tab === 2 ? "Search staff contacts…" : "Search…"}
        additionalControls={
          <Tabs
            value={tab}
            onChange={(_e, v) => {
              setTab(v)
              const params = new URLSearchParams(location.search || "")
              if (v === 0) params.set("tab", "invites")
              if (v === 1) params.set("tab", "createAdmin")
              if (v === 2) params.set("tab", "contacts")
              navigate({ pathname: "/Admin/Staff", search: `?${params.toString()}` }, { replace: true })
            }}
            sx={{
              ml: 1,
              "& .MuiTab-root": { color: "primary.contrastText", textTransform: "none", minHeight: 40 },
              "& .MuiTabs-indicator": { bgcolor: "primary.contrastText" },
            }}
          >
            <Tab label="Invites" />
            <Tab label="Create Admin" />
            <Tab label="Contacts" />
          </Tabs>
        }
      />

      {tab === 1 ? <CreateAdmin embed /> : null}
      {tab === 2 ? (
        <Card>
          <CardContent>
            <Typography variant="h6">Staff contacts</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Contacts from CRM tagged as <code>staff</code> (or created via staff intro referrals).
            </Typography>

            {staffContacts.length === 0 ? (
              <Alert severity="info">No staff contacts yet.</Alert>
            ) : (
              <Box sx={{ display: "grid", gap: 1 }}>
                {staffContacts.slice(0, 200).map((c: any) => (
                  <Box
                    key={c.id}
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 2,
                      p: 1,
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 1,
                    }}
                  >
                    <Box>
                      <Typography fontWeight={800}>{c.name || "—"}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {c.email || "—"} {c.phone ? ` • ${c.phone}` : ""}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {c.status || ""}
                    </Typography>
                  </Box>
                ))}
                {staffContacts.length > 200 ? (
                  <Typography variant="caption" color="text.secondary">
                    Showing first 200 of {staffContacts.length}
                  </Typography>
                ) : null}
              </Box>
            )}
          </CardContent>
        </Card>
      ) : null}
      {tab !== 0 ? null : (

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6">Invite staff member</Typography>
              <Typography variant="body2" color="text.secondary">
                Generates a link that lets a staff member login/register, then grants them access to allowed admin pages.
              </Typography>
              <Divider sx={{ my: 2 }} />
              <TextField
                fullWidth
                label="Staff email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                sx={{ mb: 2 }}
              />
              <Typography variant="subtitle2" color="text.secondary">
                Pages
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap" }}>
                {PAGE_KEYS.map((k) => (
                  <FormControlLabel
                    key={k}
                    control={
                      <Checkbox
                        checked={Boolean(invitePages[k])}
                        onChange={(e) => setInvitePages((p) => ({ ...p, [k]: e.target.checked }))}
                      />
                    }
                    label={k}
                  />
                ))}
              </Box>
              <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
                <Button variant="contained" onClick={createInvite} disabled={!inviteEmail.trim()}>
                  Create invite link
                </Button>
              </Box>
              {inviteLink && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  Invite link: {inviteLink}
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6">Active staff</Typography>
              <Divider sx={{ my: 2 }} />
              {activeStaffList.length === 0 ? (
                <Typography color="text.secondary">No admin staff yet.</Typography>
              ) : (
                activeStaffList.map((s) => (
                  <Box key={s.uid} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 1.5, mb: 1.5 }}>
                    <Typography fontWeight={700}>{s.email || s.uid}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      UID: {s.uid}
                    </Typography>
                    <Divider sx={{ my: 1 }} />
                    <Box sx={{ display: "flex", flexWrap: "wrap" }}>
                      {PAGE_KEYS.map((k) => (
                        <FormControlLabel
                          key={`${s.uid}-${k}`}
                          control={
                            <Checkbox
                              checked={Boolean(s.pages?.[k])}
                              onChange={(e) =>
                                updateStaffPages(s.uid, { ...(s.pages || {}), [k]: e.target.checked })
                              }
                            />
                          }
                          label={k}
                        />
                      ))}
                    </Box>
                  </Box>
                ))
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6">Invites</Typography>
              <Typography variant="body2" color="text.secondary">
                Stored at `admin/staffInvites`. (Claimed invites are marked.)
              </Typography>
              <Divider sx={{ my: 2 }} />
              {Object.keys(invites).length === 0 ? (
                <Typography color="text.secondary">No invites yet.</Typography>
              ) : (
                Object.entries(invites)
                  .sort((a: any, b: any) => Number(b[1]?.createdAt || 0) - Number(a[1]?.createdAt || 0))
                  .slice(0, 25)
                  .map(([id, inv]: any) => (
                    <Box key={id} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 1.5, mb: 1 }}>
                      <Typography fontWeight={700}>{inv.email}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {inv.claimed ? `Claimed by ${inv.claimedBy}` : "Not claimed"} • Expires:{" "}
                        {inv.expiresAt ? new Date(inv.expiresAt).toLocaleString() : "—"}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Link: {window.location.origin}/App/AdminInvite/{id}
                      </Typography>
                    </Box>
                  ))
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      )}
    </Box>
  );
}

