"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onSocialPostCreated = exports.processScheduledSocialPosts = void 0;
const https_1 = require("firebase-functions/v2/https");
const database_1 = require("firebase-functions/v2/database");
const admin_1 = require("./admin");
async function postToTwitter(accessToken, content) {
    const resp = await fetch("https://api.twitter.com/2/tweets", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: content }),
    });
    if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Twitter post failed: ${resp.statusText} ${text}`);
    }
}
async function postToLinkedIn(accessToken, authorUrn, content) {
    // authorUrn example: urn:li:person:xxxx or urn:li:organization:xxxx
    const payload = {
        author: authorUrn,
        lifecycleState: "PUBLISHED",
        specificContent: {
            "com.linkedin.ugc.ShareContent": {
                shareCommentary: { text: content },
                shareMediaCategory: "NONE",
            },
        },
        visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
    };
    const resp = await fetch("https://api.linkedin.com/v2/ugcPosts", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify(payload),
    });
    if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`LinkedIn post failed: ${resp.statusText} ${text}`);
    }
}
async function postToFacebookPage(pageAccessToken, pageId, content) {
    const url = `https://graph.facebook.com/v20.0/${encodeURIComponent(pageId)}/feed`;
    const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ message: content, access_token: pageAccessToken }).toString(),
    });
    if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Facebook post failed: ${resp.statusText} ${text}`);
    }
}
async function postToInstagram(igAccessToken, igUserId, caption, imageUrl) {
    // Step 1: create media container
    const createUrl = `https://graph.facebook.com/v20.0/${encodeURIComponent(igUserId)}/media`;
    const createResp = await fetch(createUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            image_url: imageUrl,
            caption,
            access_token: igAccessToken,
        }).toString(),
    });
    if (!createResp.ok) {
        const text = await createResp.text();
        throw new Error(`Instagram media create failed: ${createResp.statusText} ${text}`);
    }
    const created = await createResp.json();
    const creationId = created === null || created === void 0 ? void 0 : created.id;
    if (!creationId)
        throw new Error("Instagram media create returned no id");
    // Step 2: publish
    const publishUrl = `https://graph.facebook.com/v20.0/${encodeURIComponent(igUserId)}/media_publish`;
    const publishResp = await fetch(publishUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            creation_id: creationId,
            access_token: igAccessToken,
        }).toString(),
    });
    if (!publishResp.ok) {
        const text = await publishResp.text();
        throw new Error(`Instagram publish failed: ${publishResp.statusText} ${text}`);
    }
}
exports.processScheduledSocialPosts = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    try {
        const postsSnap = await admin_1.db.ref(`admin/social/posts`).get();
        const posts = postsSnap.val() || {};
        const now = Date.now();
        const due = Object.entries(posts)
            .map(([id, post]) => ({ id, post }))
            .filter((x) => x.post && (x.post.status === "scheduled" || x.post.status === "queued"))
            .filter((x) => !x.post.scheduledAt || Number(x.post.scheduledAt) <= now);
        for (const item of due) {
            await processOne(item.id, item.post);
        }
        res.json({ success: true, processed: due.length });
    }
    catch (e) {
        console.error("processScheduledSocialPosts error", e);
        res.status(500).json({ success: false, error: e.message || "Unknown error" });
    }
});
async function processOne(postId, post) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const ref = admin_1.db.ref(`admin/social/posts/${postId}`);
    const now = Date.now();
    const scheduledAt = (post === null || post === void 0 ? void 0 : post.scheduledAt) ? Number(post.scheduledAt) : null;
    if (scheduledAt && scheduledAt > now) {
        await ref.update({ status: "scheduled", updatedAt: now });
        return;
    }
    await ref.update({ status: "sending", updatedAt: now });
    const platforms = Array.isArray(post === null || post === void 0 ? void 0 : post.platforms) ? post.platforms : [];
    const content = String((post === null || post === void 0 ? void 0 : post.content) || "").trim();
    const mediaUrl = String((post === null || post === void 0 ? void 0 : post.mediaUrl) || "").trim();
    if (!content || platforms.length === 0) {
        await ref.update({ status: "failed", error: "Missing content/platforms", updatedAt: Date.now() });
        return;
    }
    const [credsSnap, accountsSnap, platformSettingsSnap] = await Promise.all([
        admin_1.db.ref(`admin/social/credentials`).get(),
        admin_1.db.ref(`admin/social/accounts`).get(),
        admin_1.db.ref(`admin/content/platforms`).get(),
    ]);
    const creds = credsSnap.val() || {};
    const accounts = accountsSnap.val() || {};
    const platformSettings = platformSettingsSnap.val() || {};
    const isAccountConnected = (p) => {
        for (const [, raw] of Object.entries(accounts)) {
            const r = raw || {};
            if (String(r.platform || "") !== p)
                continue;
            return Boolean(r.connected);
        }
        return false;
    };
    const isPlatformEnabled = (p) => {
        for (const [, raw] of Object.entries(platformSettings)) {
            const r = raw || {};
            if (String(r.platform || "") !== p)
                continue;
            return Boolean(r.isConnected);
        }
        return false;
    };
    for (const p of platforms) {
        if (!isPlatformEnabled(p)) {
            throw new Error(`Platform is disabled in Marketing Settings: ${p}`);
        }
        if (!isAccountConnected(p)) {
            throw new Error(`Social account not connected/enabled in Marketing Settings: ${p}`);
        }
    }
    try {
        for (const p of platforms) {
            if (p === "twitter") {
                const token = (_a = creds === null || creds === void 0 ? void 0 : creds.twitter) === null || _a === void 0 ? void 0 : _a.accessToken;
                if (!token)
                    throw new Error("Missing twitter accessToken");
                await postToTwitter(token, content);
            }
            else if (p === "linkedin") {
                const token = (_b = creds === null || creds === void 0 ? void 0 : creds.linkedin) === null || _b === void 0 ? void 0 : _b.accessToken;
                const authorUrn = (_c = creds === null || creds === void 0 ? void 0 : creds.linkedin) === null || _c === void 0 ? void 0 : _c.authorUrn;
                if (!token || !authorUrn)
                    throw new Error("Missing linkedin accessToken/authorUrn");
                await postToLinkedIn(token, authorUrn, content);
            }
            else if (p === "facebook") {
                const pageAccessToken = (_d = creds === null || creds === void 0 ? void 0 : creds.facebook) === null || _d === void 0 ? void 0 : _d.pageAccessToken;
                const pageId = (_e = creds === null || creds === void 0 ? void 0 : creds.facebook) === null || _e === void 0 ? void 0 : _e.pageId;
                if (!pageAccessToken || !pageId)
                    throw new Error("Missing facebook pageAccessToken/pageId");
                await postToFacebookPage(pageAccessToken, pageId, content);
            }
            else if (p === "instagram") {
                const igUserId = (_f = creds === null || creds === void 0 ? void 0 : creds.instagram) === null || _f === void 0 ? void 0 : _f.igUserId;
                const igAccessToken = ((_g = creds === null || creds === void 0 ? void 0 : creds.instagram) === null || _g === void 0 ? void 0 : _g.accessToken) || ((_h = creds === null || creds === void 0 ? void 0 : creds.facebook) === null || _h === void 0 ? void 0 : _h.pageAccessToken);
                if (!igUserId || !igAccessToken)
                    throw new Error("Missing instagram igUserId/accessToken");
                if (!mediaUrl)
                    throw new Error("Instagram requires mediaUrl (image_url)");
                await postToInstagram(igAccessToken, igUserId, content, mediaUrl);
            }
        }
        await ref.update({ status: "sent", sentAt: Date.now(), updatedAt: Date.now() });
    }
    catch (e) {
        await ref.update({ status: "failed", error: e.message || "Unknown error", updatedAt: Date.now() });
    }
}
exports.onSocialPostCreated = (0, database_1.onValueCreated)({ ref: "admin/social/posts/{postId}", region: "europe-west1" }, async (event) => {
    const postId = event.params.postId;
    const post = event.data.val();
    // Only process queued posts immediately; scheduled are handled by processScheduledSocialPosts.
    if ((post === null || post === void 0 ? void 0 : post.status) !== "queued")
        return;
    await processOne(postId, post);
});
//# sourceMappingURL=socialPoster.js.map