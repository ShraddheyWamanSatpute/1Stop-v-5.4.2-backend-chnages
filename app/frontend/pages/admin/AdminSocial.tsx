import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControlLabel,
  Grid,
  MenuItem,
  Select,
  Switch,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { Add as AddIcon, Send as SendIcon, Share as ShareIcon, Key as KeyIcon } from "@mui/icons-material";
import { APP_KEYS, getFunctionsBaseUrl } from "../../../config/keys";
import { db, onValue, push, ref, set, update } from "../../../backend/services/Firebase";
import DataHeader from "../../components/reusable/DataHeader";
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../../components/reusable/CRUDModal";
import { useLocation, useNavigate } from "react-router-dom";

type SocialPlatform = "twitter" | "instagram" | "facebook" | "linkedin";
type PostStatus = "draft" | "scheduled" | "queued" | "sent" | "failed";

interface SocialAccount {
  id: string;
  platform: SocialPlatform;
  displayName: string;
  connected: boolean;
  createdAt: number;
  updatedAt: number;
}

interface SocialPost {
  id: string;
  platforms: SocialPlatform[];
  content: string;
  mediaUrl?: string;
  scheduledAt?: number;
  status: PostStatus;
  createdAt: number;
  updatedAt: number;
}

const PLATFORMS: SocialPlatform[] = ["twitter", "instagram", "facebook", "linkedin"];

const AdminSocial: React.FC = () => {
  const companyId = "admin";
  const location = useLocation();
  const navigate = useNavigate();

  const [tab, setTab] = useState<0 | 1>(0); // 0=Posts, 1=Settings
  const [search, setSearch] = useState("");
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [statusFilter, setStatusFilter] = useState<PostStatus[]>([]);
  const [platformFilter, setPlatformFilter] = useState<SocialPlatform[]>([]);
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [credentials, setCredentials] = useState<any>({
    twitter: { accessToken: "" },
    facebook: { pageId: "", pageAccessToken: "" },
    linkedin: { authorUrn: "", accessToken: "" },
    instagram: { igUserId: "", accessToken: "" },
  });
  const [credsModalOpen, setCredsModalOpen] = useState(false);

  const [postModalOpen, setPostModalOpen] = useState(false);
  const [postModalMode, setPostModalMode] = useState<"create" | "edit" | "view">("create");
  const [editingPostId, setEditingPostId] = useState<string | null>(null);

  const [draft, setDraft] = useState<{
    platforms: Record<SocialPlatform, boolean>;
    content: string;
    mediaUrl: string;
    scheduledAt: string; // datetime-local
    schedule: boolean;
  }>({
    platforms: { twitter: true, instagram: false, facebook: false, linkedin: false },
    content: "",
    mediaUrl: "",
    scheduledAt: "",
    schedule: false,
  });

  useEffect(() => {
    const accRef = ref(db, `admin/social/accounts`);
    const postsRef = ref(db, `admin/social/posts`);
    const credRef = ref(db, `admin/social/credentials`);

    const unsubAcc = onValue(accRef, (snap) => {
      const val = snap.val() || {};
      const rows: SocialAccount[] = Object.entries(val).map(([id, raw]: any) => ({
        id,
        platform: (raw?.platform as SocialPlatform) || "twitter",
        displayName: raw?.displayName || "",
        connected: Boolean(raw?.connected),
        createdAt: raw?.createdAt || Date.now(),
        updatedAt: raw?.updatedAt || Date.now(),
      }));
      rows.sort((a, b) => a.platform.localeCompare(b.platform));
      setAccounts(rows);
    });

    const unsubPosts = onValue(postsRef, (snap) => {
      const val = snap.val() || {};
      const rows: SocialPost[] = Object.entries(val).map(([id, raw]: any) => ({
        id,
        platforms: Array.isArray(raw?.platforms) ? raw.platforms : [],
        content: raw?.content || "",
        mediaUrl: raw?.mediaUrl || "",
        scheduledAt: raw?.scheduledAt || undefined,
        status: (raw?.status as PostStatus) || "draft",
        createdAt: raw?.createdAt || Date.now(),
        updatedAt: raw?.updatedAt || Date.now(),
      }));
      rows.sort((a, b) => (b.scheduledAt || b.updatedAt) - (a.scheduledAt || a.updatedAt));
      setPosts(rows);
    });

    const unsubCreds = onValue(credRef, (snap) => {
      const val = snap.val() || {};
      setCredentials((c: any) => ({
        twitter: { accessToken: val?.twitter?.accessToken || c.twitter.accessToken || "" },
        facebook: {
          pageId: val?.facebook?.pageId || c.facebook.pageId || "",
          pageAccessToken: val?.facebook?.pageAccessToken || c.facebook.pageAccessToken || "",
        },
        linkedin: {
          authorUrn: val?.linkedin?.authorUrn || c.linkedin.authorUrn || "",
          accessToken: val?.linkedin?.accessToken || c.linkedin.accessToken || "",
        },
        instagram: {
          igUserId: val?.instagram?.igUserId || c.instagram.igUserId || "",
          accessToken: val?.instagram?.accessToken || c.instagram.accessToken || "",
        },
      }));
    });

    return () => {
      unsubAcc();
      unsubPosts();
      unsubCreds();
    };
  }, [companyId]);

  useEffect(() => {
    const params = new URLSearchParams(location.search || "");
    const t = (params.get("tab") || "").toLowerCase();
    if (t === "settings") setTab(1);
    if (t === "posts") setTab(0);
  }, [location.search]);

  const connectedPlatforms = useMemo(() => {
    const setp = new Set<SocialPlatform>();
    accounts.filter((a) => a.connected).forEach((a) => setp.add(a.platform));
    return setp;
  }, [accounts]);

  const openCompose = () => {
    setEditingPostId(null);
    setPostModalMode("create");
    setDraft({
      platforms: { twitter: true, instagram: false, facebook: false, linkedin: false },
      content: "",
      mediaUrl: "",
      scheduledAt: "",
      schedule: false,
    });
    setPostModalOpen(true);
  };

  const openViewPost = (p: SocialPost) => {
    setEditingPostId(p.id);
    setPostModalMode("view");
    setDraft({
      platforms: {
        twitter: (p.platforms || []).includes("twitter"),
        instagram: (p.platforms || []).includes("instagram"),
        facebook: (p.platforms || []).includes("facebook"),
        linkedin: (p.platforms || []).includes("linkedin"),
      },
      content: p.content || "",
      mediaUrl: p.mediaUrl || "",
      scheduledAt: p.scheduledAt ? new Date(p.scheduledAt).toISOString().slice(0, 16) : "",
      schedule: Boolean(p.scheduledAt),
    });
    setPostModalOpen(true);
  };

  const saveCredentials = async () => {
    const credRef = ref(db, `admin/social/credentials`);
    await set(credRef, credentials);
  };

  const processDue = async () => {
    if (!companyId) return;
    const fnBase = getFunctionsBaseUrl({
      projectId: APP_KEYS.firebase.projectId,
      region: APP_KEYS.firebase.functionsRegion,
    });
    const url = new URL(`${fnBase}/processScheduledSocialPosts`);
    url.searchParams.set("company_id", companyId);
    await fetch(url.toString());
  };

  const savePost = async (status: PostStatus) => {
    const now = Date.now();
    const modeSnapshot = postModalMode;
    const platforms = PLATFORMS.filter((p) => Boolean(draft.platforms[p]));
    if (platforms.length === 0) return;
    if (!draft.content.trim()) return;

    const scheduledAt =
      draft.schedule && draft.scheduledAt ? new Date(draft.scheduledAt).getTime() : undefined;

    if (editingPostId && postModalMode === "edit") {
      await update(ref(db, `admin/social/posts/${editingPostId}`), {
        platforms,
        content: draft.content,
        mediaUrl: draft.mediaUrl || "",
        scheduledAt: scheduledAt || null,
        status: scheduledAt ? "scheduled" : status,
        updatedAt: now,
      });
      removeWorkspaceFormDraft(location.pathname, {
        crudEntity: "adminSocialModal1",
        crudMode: modeSnapshot,
        id: editingPostId,
        itemLabel: draft.content.trim().slice(0, 80) || undefined,
      });
      setPostModalOpen(false);
      setPostModalMode("view");
      return;
    }

    const postsRef = ref(db, `admin/social/posts`);
    const newRef = push(postsRef);
    await set(newRef, {
      platforms,
      content: draft.content,
      mediaUrl: draft.mediaUrl || "",
      scheduledAt: scheduledAt || null,
      status: scheduledAt ? "scheduled" : status,
      createdAt: now,
      updatedAt: now,
    });
    removeWorkspaceFormDraft(location.pathname, {
      crudEntity: "adminSocialModal1",
      crudMode: modeSnapshot,
      id: newRef.key || undefined,
      itemLabel: draft.content.trim().slice(0, 80) || undefined,
    });
    setPostModalOpen(false);
    setDraft({
      platforms: { twitter: true, instagram: false, facebook: false, linkedin: false },
      content: "",
      mediaUrl: "",
      scheduledAt: "",
      schedule: false,
    });
  };

  const toggleAccount = async (accountId: string, connected: boolean) => {
    const now = Date.now();
    const accountRef = ref(db, `admin/social/accounts/${accountId}`);
    await update(accountRef, { connected, updatedAt: now });
  };

  const addStubAccount = async (platform: SocialPlatform) => {
    const now = Date.now();
    const accRef = ref(db, `admin/social/accounts`);
    const newRef = push(accRef);
    await set(newRef, {
      platform,
      displayName: `${platform} account`,
      connected: false,
      createdAt: now,
      updatedAt: now,
    });
  };

  const filteredPosts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return posts.filter((p) => {
      if (statusFilter.length > 0 && !statusFilter.includes(p.status)) return false;
      if (platformFilter.length > 0) {
        const platforms = new Set(p.platforms || []);
        if (!platformFilter.some((x) => platforms.has(x))) return false;
      }
      if (!q) return true;
      return (p.content || "").toLowerCase().includes(q) || (p.mediaUrl || "").toLowerCase().includes(q);
    });
  }, [posts, search, statusFilter, platformFilter]);

  return (
    <Box sx={{ p: 3 }}>
      <DataHeader
        showDateControls={false}
        showDateTypeSelector={false}
        searchTerm={tab === 0 ? search : ""}
        onSearchChange={tab === 0 ? (t) => setSearch(t) : undefined}
        searchPlaceholder={tab === 0 ? "Search posts…" : "Search…"}
        filtersExpanded={tab === 0 ? filtersExpanded : undefined}
        onFiltersToggle={tab === 0 ? () => setFiltersExpanded((p) => !p) : undefined}
        filters={
          tab === 0
            ? [
                {
                  label: "Status",
                  options: [
                    { id: "draft", name: "draft" },
                    { id: "scheduled", name: "scheduled" },
                    { id: "queued", name: "queued" },
                    { id: "sent", name: "sent" },
                    { id: "failed", name: "failed" },
                  ],
                  selectedValues: statusFilter,
                  onSelectionChange: (values) => setStatusFilter(values as PostStatus[]),
                },
                {
                  label: "Platform",
                  options: PLATFORMS.map((p) => ({ id: p, name: p })),
                  selectedValues: platformFilter,
                  onSelectionChange: (values) => setPlatformFilter(values as SocialPlatform[]),
                },
              ]
            : []
        }
        onCreateNew={tab === 0 ? openCompose : undefined}
        createButtonLabel="Compose"
        createDisabled={tab !== 0}
        createDisabledTooltip="Switch to Posts tab to compose."
        additionalButtons={[
          tab === 0
            ? { label: "Process due", icon: <SendIcon />, onClick: processDue, variant: "outlined" }
            : { label: "Edit credentials", icon: <KeyIcon />, onClick: () => setCredsModalOpen(true), variant: "outlined" },
        ].filter(Boolean) as any}
        additionalControls={
          <Tabs
            value={tab}
            onChange={(_e, v) => {
              setTab(v)
              const params = new URLSearchParams(location.search || "")
              params.set("tab", v === 1 ? "settings" : "posts")
              navigate({ pathname: "/Admin/Social", search: `?${params.toString()}` }, { replace: true })
            }}
            sx={{
              ml: 1,
              "& .MuiTab-root": { color: "primary.contrastText", textTransform: "none", minHeight: 40 },
              "& .MuiTabs-indicator": { bgcolor: "primary.contrastText" },
            }}
          >
            <Tab label="Posts" />
            <Tab label="Settings" />
          </Tabs>
        }
      />

      {tab === 0 && (
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Posts are stored in <code>admin/social/posts</code> and processed by Functions.
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Platforms</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Scheduled</TableCell>
                    <TableCell>Content</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredPosts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        <Typography color="text.secondary">No posts yet.</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPosts.slice(0, 200).map((p) => (
                      <TableRow key={p.id} hover sx={{ cursor: "pointer" }} onClick={() => openViewPost(p)}>
                        <TableCell>{(p.platforms || []).join(", ")}</TableCell>
                        <TableCell>
                          <Chip size="small" label={p.status} />
                        </TableCell>
                        <TableCell>
                          {p.scheduledAt ? new Date(p.scheduledAt).toLocaleString() : "Immediate"}
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ maxWidth: 520 }} noWrap>
                            {p.content || "—"}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {tab === 1 && (
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Alert severity="info">
              Settings controls how Social posting works. Accounts enable platforms; Credentials are required for actual posting.
            </Alert>
          </Grid>

          <Grid item xs={12} md={7}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  Accounts
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Add an account per platform and enable/disable it. (Account records live in <code>admin/social/accounts</code>.)
                </Typography>

                <Grid container spacing={2}>
                  {PLATFORMS.map((p) => {
                    const acc = accounts.find((a) => a.platform === p);
                    const enabled = Boolean(acc?.connected);

                    return (
                      <Grid item xs={12} md={6} key={p}>
                        <Card variant="outlined">
                          <CardContent>
                            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2 }}>
                              <Typography variant="subtitle1" sx={{ textTransform: "capitalize", fontWeight: 800 }}>
                                {p}
                              </Typography>
                              <Chip size="small" label={acc ? (enabled ? "Enabled" : "Disabled") : "Not added"} />
                            </Box>

                            {!acc ? (
                              <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
                                <Button variant="outlined" onClick={() => addStubAccount(p)} startIcon={<AddIcon />}>
                                  Add account
                                </Button>
                              </Box>
                            ) : (
                              <>
                                <TextField
                                  label="Display name"
                                  fullWidth
                                  value={acc.displayName || ""}
                                  onChange={(e) =>
                                    update(ref(db, `admin/social/accounts/${acc.id}`), {
                                      displayName: e.target.value,
                                      updatedAt: Date.now(),
                                    })
                                  }
                                  sx={{ mt: 2 }}
                                />

                                <FormControlLabel
                                  sx={{ mt: 1 }}
                                  control={<Switch checked={enabled} onChange={(e) => toggleAccount(acc.id, e.target.checked)} />}
                                  label="Enabled"
                                />
                              </>
                            )}
                          </CardContent>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={5}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  Credentials
                </Typography>
                <Alert severity="warning" sx={{ mb: 2 }}>
                  Tokens are currently stored in RTDB at <code>admin/social/credentials</code>. For production, move these to server-only storage.
                </Alert>

                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2">Twitter</Typography>
                    <TextField
                      label="Access token"
                      fullWidth
                      value={credentials.twitter.accessToken}
                      onChange={(e) => setCredentials((p: any) => ({ ...p, twitter: { ...p.twitter, accessToken: e.target.value } }))}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2">Facebook</Typography>
                    <TextField
                      label="Page ID"
                      fullWidth
                      value={credentials.facebook.pageId}
                      onChange={(e) => setCredentials((p: any) => ({ ...p, facebook: { ...p.facebook, pageId: e.target.value } }))}
                      sx={{ mb: 1 }}
                    />
                    <TextField
                      label="Page access token"
                      fullWidth
                      value={credentials.facebook.pageAccessToken}
                      onChange={(e) => setCredentials((p: any) => ({ ...p, facebook: { ...p.facebook, pageAccessToken: e.target.value } }))}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2">LinkedIn</Typography>
                    <TextField
                      label="Author URN"
                      fullWidth
                      value={credentials.linkedin.authorUrn}
                      onChange={(e) => setCredentials((p: any) => ({ ...p, linkedin: { ...p.linkedin, authorUrn: e.target.value } }))}
                      sx={{ mb: 1 }}
                    />
                    <TextField
                      label="Access token"
                      fullWidth
                      value={credentials.linkedin.accessToken}
                      onChange={(e) => setCredentials((p: any) => ({ ...p, linkedin: { ...p.linkedin, accessToken: e.target.value } }))}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2">Instagram</Typography>
                    <TextField
                      label="IG User ID"
                      fullWidth
                      value={credentials.instagram.igUserId}
                      onChange={(e) => setCredentials((p: any) => ({ ...p, instagram: { ...p.instagram, igUserId: e.target.value } }))}
                      sx={{ mb: 1 }}
                    />
                    <TextField
                      label="Access token"
                      fullWidth
                      value={credentials.instagram.accessToken}
                      onChange={(e) => setCredentials((p: any) => ({ ...p, instagram: { ...p.instagram, accessToken: e.target.value } }))}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
                      <Button variant="outlined" startIcon={<KeyIcon />} onClick={() => setCredsModalOpen(true)}>
                        Advanced editor
                      </Button>
                      <Button variant="contained" onClick={saveCredentials}>
                        Save credentials
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

                        <CRUDModal
              open={postModalOpen}
              onClose={(reason) => {
                setPostModalOpen(false)
                if (isCrudModalHardDismiss(reason)) {
                  setEditingPostId(null)
                  setPostModalMode("create")
                }
              }}
              workspaceFormShortcut={{
                crudEntity: "adminSocialModal1",
                crudMode: postModalMode,
                id: editingPostId || undefined,
                itemLabel: draft.content.trim().slice(0, 80) || undefined,
              }}
              title={
                postModalMode === "create"
                  ? "Compose post"
                  : postModalMode === "edit"
                    ? "Edit post"
                    : "View post"
              }
              subtitle={editingPostId ? `Post: ${editingPostId}` : undefined}
              icon={<ShareIcon />}
              mode={postModalMode}
              onEdit={postModalMode === "view" ? () => setPostModalMode("edit") : undefined}
              onSave={postModalMode === "view" ? undefined : () => savePost("queued")}
              saveButtonText={draft.schedule ? "Schedule" : "Queue"}
            >
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Platforms
            </Typography>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              {PLATFORMS.map((p) => (
                <FormControlLabel
                  key={p}
                  control={
                    <Switch
                      checked={Boolean(draft.platforms[p])}
                      onChange={(e) => setDraft((d) => ({ ...d, platforms: { ...d.platforms, [p]: e.target.checked } }))}
                      disabled={postModalMode === "view" || (!connectedPlatforms.has(p) && accounts.some((a) => a.platform === p))}
                    />
                  }
                  label={p}
                />
              ))}
            </Box>
            <Typography variant="caption" color="text.secondary">
              Tip: “Enabled” accounts are the ones that can be posted to.
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Content"
              fullWidth
              multiline
              minRows={6}
              value={draft.content}
              disabled={postModalMode === "view"}
              onChange={(e) => setDraft((d) => ({ ...d, content: e.target.value }))}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Media URL (optional)"
              fullWidth
              value={draft.mediaUrl}
              disabled={postModalMode === "view"}
              onChange={(e) => setDraft((d) => ({ ...d, mediaUrl: e.target.value }))}
            />
          </Grid>

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={draft.schedule}
                  disabled={postModalMode === "view"}
                  onChange={(e) => setDraft((d) => ({ ...d, schedule: e.target.checked }))}
                />
              }
              label="Schedule"
            />
            {draft.schedule ? (
              <TextField
                type="datetime-local"
                fullWidth
                label="Scheduled time"
                value={draft.scheduledAt}
                disabled={postModalMode === "view"}
                onChange={(e) => setDraft((d) => ({ ...d, scheduledAt: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            ) : null}
          </Grid>
        </Grid>
      </CRUDModal>

                        <CRUDModal
              open={credsModalOpen}
              onClose={(reason) => {
                setCredsModalOpen(false)
                if (isCrudModalHardDismiss(reason)) {
                  /* no local draft entity beyond modal open */
                }
              }}
              workspaceFormShortcut={{
                crudEntity: "adminSocialModal2",
                crudMode: "edit",
              }}
              title="Social credentials"
              subtitle="Stored at admin/social/credentials"
              icon={<KeyIcon />}
              mode="edit"
              onSave={async () => {
                await saveCredentials()
                removeWorkspaceFormDraft(location.pathname, {
                  crudEntity: "adminSocialModal2",
                  crudMode: "edit",
                })
                setCredsModalOpen(false)
              }}
              saveButtonText="Save"
            >
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="h6">Twitter/X</Typography>
            <TextField
              fullWidth
              label="Access token (Bearer)"
              value={credentials.twitter.accessToken}
              onChange={(e) => setCredentials((c: any) => ({ ...c, twitter: { ...c.twitter, accessToken: e.target.value } }))}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="h6">LinkedIn</Typography>
            <TextField
              fullWidth
              label="Author URN (urn:li:person:... or urn:li:organization:...)"
              value={credentials.linkedin.authorUrn}
              onChange={(e) => setCredentials((c: any) => ({ ...c, linkedin: { ...c.linkedin, authorUrn: e.target.value } }))}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Access token (Bearer)"
              value={credentials.linkedin.accessToken}
              onChange={(e) => setCredentials((c: any) => ({ ...c, linkedin: { ...c.linkedin, accessToken: e.target.value } }))}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="h6">Facebook Page</Typography>
            <TextField
              fullWidth
              label="Page ID"
              value={credentials.facebook.pageId}
              onChange={(e) => setCredentials((c: any) => ({ ...c, facebook: { ...c.facebook, pageId: e.target.value } }))}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Page access token"
              value={credentials.facebook.pageAccessToken}
              onChange={(e) => setCredentials((c: any) => ({ ...c, facebook: { ...c.facebook, pageAccessToken: e.target.value } }))}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="h6">Instagram</Typography>
            <TextField
              fullWidth
              label="Instagram Business Account ID (igUserId)"
              value={credentials.instagram.igUserId}
              onChange={(e) => setCredentials((c: any) => ({ ...c, instagram: { ...c.instagram, igUserId: e.target.value } }))}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Instagram access token"
              value={credentials.instagram.accessToken}
              onChange={(e) => setCredentials((c: any) => ({ ...c, instagram: { ...c.instagram, accessToken: e.target.value } }))}
            />
            <Typography variant="caption" color="text.secondary">
              Note: Instagram requires a media URL (image_url) to publish.
            </Typography>
          </Grid>
        </Grid>
      </CRUDModal>
    </Box>
  );
};

export default AdminSocial;

