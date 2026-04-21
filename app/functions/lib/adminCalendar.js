"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCalendarTaskLinks = exports.upsertEvent = exports.deleteEvent = exports.listEvents = exports.listCalendars = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin_1 = require("./admin");
const keys_1 = require("./keys");
async function getGoogle() {
    // Lazy import to keep deploy-time export analysis fast.
    const mod = await Promise.resolve().then(() => __importStar(require("googleapis")));
    return mod.google;
}
function tokenDocIdFor(opts) {
    return `${opts.companyId}_${opts.siteId || "default"}_${opts.subsiteId || "default"}_${opts.provider}`;
}
async function getOAuthTokenDoc(companyId, provider, siteId, subsiteId) {
    const docId = tokenDocIdFor({ companyId, provider, siteId, subsiteId });
    const doc = await admin_1.firestore.collection("oauth_tokens").doc(docId).get();
    if (!doc.exists)
        return null;
    return Object.assign({ id: docId }, doc.data());
}
async function ensureGoogleOAuthClient(tokenDoc) {
    const google = await getGoogle();
    const oauth2Client = new google.auth.OAuth2(keys_1.FUNCTION_KEYS.google.clientId, keys_1.FUNCTION_KEYS.google.clientSecret);
    oauth2Client.setCredentials(tokenDoc.tokens || {});
    return oauth2Client;
}
async function ensureOutlookAccessToken(tokenDoc) {
    const tokens = tokenDoc.tokens || {};
    if (tokens.access_token)
        return tokens.access_token;
    throw new Error("Missing outlook access token");
}
exports.listCalendars = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    var _a, _b, _c, _d;
    try {
        const companyId = req.query.company_id || ((_a = req.body) === null || _a === void 0 ? void 0 : _a.companyId);
        const provider = (req.query.provider || ((_b = req.body) === null || _b === void 0 ? void 0 : _b.provider) || "google");
        const siteId = req.query.site_id || ((_c = req.body) === null || _c === void 0 ? void 0 : _c.siteId) || "default";
        const subsiteId = req.query.subsite_id || ((_d = req.body) === null || _d === void 0 ? void 0 : _d.subsiteId) || "default";
        if (!companyId) {
            res.status(400).json({ success: false, error: "company_id is required" });
            return;
        }
        if (provider === "google") {
            const google = await getGoogle();
            const tokenDoc = await getOAuthTokenDoc(companyId, "google_calendar", siteId, subsiteId);
            if (!tokenDoc) {
                res.status(404).json({ success: false, error: "No Google Calendar OAuth token connected" });
                return;
            }
            const auth = await ensureGoogleOAuthClient(tokenDoc);
            const cal = google.calendar({ version: "v3", auth });
            const list = await cal.calendarList.list();
            const calendars = (list.data.items || []).map((c) => ({
                id: c.id,
                name: c.summary,
                primary: Boolean(c.primary),
            }));
            res.json({ success: true, provider, calendars });
            return;
        }
        // Outlook
        const tokenDoc = await getOAuthTokenDoc(companyId, "outlook_calendar", siteId, subsiteId);
        if (!tokenDoc) {
            res.status(404).json({ success: false, error: "No Outlook Calendar OAuth token connected" });
            return;
        }
        const accessToken = await ensureOutlookAccessToken(tokenDoc);
        const response = await fetch("https://graph.microsoft.com/v1.0/me/calendars?$top=100&$select=id,name,isDefaultCalendar", {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!response.ok) {
            const text = await response.text();
            res.status(500).json({ success: false, error: "Outlook calendars fetch failed", details: text });
            return;
        }
        const data = await response.json();
        const calendars = (data.value || []).map((c) => ({
            id: c.id,
            name: c.name,
            primary: Boolean(c.isDefaultCalendar),
        }));
        res.json({ success: true, provider, calendars });
    }
    catch (e) {
        console.error("listCalendars error", e);
        res.status(500).json({ success: false, error: e.message || "Unknown error" });
    }
});
exports.listEvents = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    var _a, _b, _c, _d, _e, _f, _g;
    try {
        const companyId = req.query.company_id || ((_a = req.body) === null || _a === void 0 ? void 0 : _a.companyId);
        const provider = (req.query.provider || ((_b = req.body) === null || _b === void 0 ? void 0 : _b.provider) || "google");
        const calendarId = req.query.calendar_id || ((_c = req.body) === null || _c === void 0 ? void 0 : _c.calendarId) || "";
        const siteId = req.query.site_id || ((_d = req.body) === null || _d === void 0 ? void 0 : _d.siteId) || "default";
        const subsiteId = req.query.subsite_id || ((_e = req.body) === null || _e === void 0 ? void 0 : _e.subsiteId) || "default";
        const timeMin = req.query.time_min || ((_f = req.body) === null || _f === void 0 ? void 0 : _f.timeMin) || "";
        const timeMax = req.query.time_max || ((_g = req.body) === null || _g === void 0 ? void 0 : _g.timeMax) || "";
        if (!companyId) {
            res.status(400).json({ success: false, error: "company_id is required" });
            return;
        }
        if (!calendarId) {
            res.status(400).json({ success: false, error: "calendar_id is required" });
            return;
        }
        const now = new Date();
        const minIso = timeMin || now.toISOString();
        const maxIso = timeMax || new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30).toISOString();
        if (provider === "google") {
            const google = await getGoogle();
            const tokenDoc = await getOAuthTokenDoc(companyId, "google_calendar", siteId, subsiteId);
            if (!tokenDoc) {
                res.status(404).json({ success: false, error: "No Google Calendar OAuth token connected" });
                return;
            }
            const auth = await ensureGoogleOAuthClient(tokenDoc);
            const cal = google.calendar({ version: "v3", auth });
            const list = await cal.events.list({
                calendarId,
                timeMin: minIso,
                timeMax: maxIso,
                singleEvents: true,
                orderBy: "startTime",
                maxResults: 100,
            });
            const events = (list.data.items || []).map((ev) => {
                var _a, _b, _c, _d, _e, _f;
                return ({
                    id: ev.id,
                    title: ev.summary || "",
                    description: ev.description || "",
                    location: ev.location || "",
                    start: ((_a = ev.start) === null || _a === void 0 ? void 0 : _a.dateTime) || ((_b = ev.start) === null || _b === void 0 ? void 0 : _b.date) || "",
                    end: ((_c = ev.end) === null || _c === void 0 ? void 0 : _c.dateTime) || ((_d = ev.end) === null || _d === void 0 ? void 0 : _d.date) || "",
                    allDay: Boolean(((_e = ev.start) === null || _e === void 0 ? void 0 : _e.date) && !((_f = ev.start) === null || _f === void 0 ? void 0 : _f.dateTime)),
                    updatedAt: ev.updated,
                });
            });
            res.json({ success: true, provider, calendarId, events });
            return;
        }
        const tokenDoc = await getOAuthTokenDoc(companyId, "outlook_calendar", siteId, subsiteId);
        if (!tokenDoc) {
            res.status(404).json({ success: false, error: "No Outlook Calendar OAuth token connected" });
            return;
        }
        const accessToken = await ensureOutlookAccessToken(tokenDoc);
        // NOTE: Use an overlap filter, otherwise we miss events spanning the window.
        // "start < max AND end > min"
        const filter = `start/dateTime lt '${maxIso}' and end/dateTime gt '${minIso}'`;
        const url = `https://graph.microsoft.com/v1.0/me/calendars/${encodeURIComponent(calendarId)}/events?` +
            `$top=100&$orderby=start/dateTime&$select=id,subject,bodyPreview,start,end,isAllDay,lastModifiedDateTime,location,attendees,webLink&$filter=${encodeURIComponent(filter)}`;
        const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
        if (!response.ok) {
            const text = await response.text();
            res.status(500).json({ success: false, error: "Outlook events fetch failed", details: text });
            return;
        }
        const data = await response.json();
        const events = (data.value || []).map((ev) => {
            var _a, _b, _c;
            return ({
                id: ev.id,
                title: ev.subject || "",
                description: ev.bodyPreview || "",
                location: ((_a = ev.location) === null || _a === void 0 ? void 0 : _a.displayName) || "",
                start: ((_b = ev.start) === null || _b === void 0 ? void 0 : _b.dateTime) || "",
                end: ((_c = ev.end) === null || _c === void 0 ? void 0 : _c.dateTime) || "",
                allDay: Boolean(ev.isAllDay),
                updatedAt: ev.lastModifiedDateTime || null,
            });
        });
        res.json({ success: true, provider, calendarId, events });
    }
    catch (e) {
        console.error("listEvents error", e);
        res.status(500).json({ success: false, error: e.message || "Unknown error" });
    }
});
exports.deleteEvent = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    var _a, _b, _c, _d, _e, _f;
    try {
        const companyId = req.query.company_id || ((_a = req.body) === null || _a === void 0 ? void 0 : _a.companyId) || "";
        const provider = (req.query.provider || ((_b = req.body) === null || _b === void 0 ? void 0 : _b.provider) || "google");
        const calendarId = req.query.calendar_id || ((_c = req.body) === null || _c === void 0 ? void 0 : _c.calendarId) || "";
        const eventId = req.query.event_id || ((_d = req.body) === null || _d === void 0 ? void 0 : _d.eventId) || "";
        const siteId = req.query.site_id || ((_e = req.body) === null || _e === void 0 ? void 0 : _e.siteId) || "default";
        const subsiteId = req.query.subsite_id || ((_f = req.body) === null || _f === void 0 ? void 0 : _f.subsiteId) || "default";
        if (!companyId) {
            res.status(400).json({ success: false, error: "company_id is required" });
            return;
        }
        if (!eventId) {
            res.status(400).json({ success: false, error: "event_id is required" });
            return;
        }
        if (provider === "google") {
            const google = await getGoogle();
            if (!calendarId) {
                res.status(400).json({ success: false, error: "calendar_id is required for google" });
                return;
            }
            const tokenDoc = await getOAuthTokenDoc(companyId, "google_calendar", siteId, subsiteId);
            if (!tokenDoc) {
                res.status(404).json({ success: false, error: "No Google Calendar OAuth token connected" });
                return;
            }
            const auth = await ensureGoogleOAuthClient(tokenDoc);
            const cal = google.calendar({ version: "v3", auth });
            await cal.events.delete({ calendarId, eventId });
            res.json({ success: true, provider, eventId });
            return;
        }
        const tokenDoc = await getOAuthTokenDoc(companyId, "outlook_calendar", siteId, subsiteId);
        if (!tokenDoc) {
            res.status(404).json({ success: false, error: "No Outlook Calendar OAuth token connected" });
            return;
        }
        const accessToken = await ensureOutlookAccessToken(tokenDoc);
        const resp = await fetch(`https://graph.microsoft.com/v1.0/me/events/${encodeURIComponent(eventId)}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!resp.ok) {
            const text = await resp.text();
            res.status(500).json({ success: false, error: "Outlook event delete failed", details: text });
            return;
        }
        res.json({ success: true, provider, eventId });
    }
    catch (e) {
        console.error("deleteEvent error", e);
        res.status(500).json({ success: false, error: e.message || "Unknown error" });
    }
});
exports.upsertEvent = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    try {
        const body = req.body || {};
        const companyId = req.query.company_id || body.companyId || "";
        const provider = (req.query.provider || body.provider || "google");
        const calendarId = req.query.calendar_id || body.calendarId || "";
        const eventId = req.query.event_id || body.eventId || "";
        const siteId = req.query.site_id || body.siteId || "default";
        const subsiteId = req.query.subsite_id || body.subsiteId || "default";
        const title = String(body.title || body.summary || "").trim();
        const description = String(body.description || "").trim();
        const location = String(body.location || "").trim();
        const attendees = Array.isArray(body.attendees) ? body.attendees.map((x) => String(x || "").trim()).filter(Boolean) : [];
        const start = String(body.start || "").trim();
        const end = String(body.end || "").trim();
        const allDay = Boolean(body.allDay);
        const timeZone = String(body.timeZone || "UTC");
        if (!companyId) {
            res.status(400).json({ success: false, error: "company_id is required" });
            return;
        }
        if (!calendarId) {
            res.status(400).json({ success: false, error: "calendar_id is required" });
            return;
        }
        if (!title) {
            res.status(400).json({ success: false, error: "title is required" });
            return;
        }
        if (!start || !end) {
            res.status(400).json({ success: false, error: "start/end are required" });
            return;
        }
        if (provider === "google") {
            const google = await getGoogle();
            const tokenDoc = await getOAuthTokenDoc(companyId, "google_calendar", siteId, subsiteId);
            if (!tokenDoc) {
                res.status(404).json({ success: false, error: "No Google Calendar OAuth token connected" });
                return;
            }
            const auth = await ensureGoogleOAuthClient(tokenDoc);
            const cal = google.calendar({ version: "v3", auth });
            const resource = {
                summary: title,
                description,
                location: location || undefined,
                start: allDay ? { date: start } : { dateTime: start, timeZone },
                end: allDay ? { date: end } : { dateTime: end, timeZone },
            };
            if (attendees.length > 0) {
                resource.attendees = attendees.map((email) => ({ email }));
            }
            if (eventId) {
                const updated = await cal.events.update({ calendarId, eventId, requestBody: resource });
                res.json({ success: true, provider, eventId: updated.data.id });
                return;
            }
            const created = await cal.events.insert({ calendarId, requestBody: resource });
            res.json({ success: true, provider, eventId: created.data.id });
            return;
        }
        const tokenDoc = await getOAuthTokenDoc(companyId, "outlook_calendar", siteId, subsiteId);
        if (!tokenDoc) {
            res.status(404).json({ success: false, error: "No Outlook Calendar OAuth token connected" });
            return;
        }
        const accessToken = await ensureOutlookAccessToken(tokenDoc);
        const payload = {
            subject: title,
            body: { contentType: "Text", content: description },
            start: { dateTime: start, timeZone: "UTC" },
            end: { dateTime: end, timeZone: "UTC" },
        };
        if (location) {
            payload.location = { displayName: location };
        }
        if (attendees.length > 0) {
            payload.attendees = attendees.map((address) => ({
                emailAddress: { address },
                type: "required",
            }));
        }
        if (eventId) {
            const resp = await fetch(`https://graph.microsoft.com/v1.0/me/events/${encodeURIComponent(eventId)}`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!resp.ok) {
                const text = await resp.text();
                res.status(500).json({ success: false, error: "Outlook event update failed", details: text });
                return;
            }
            res.json({ success: true, provider, eventId });
            return;
        }
        const resp = await fetch(`https://graph.microsoft.com/v1.0/me/calendars/${encodeURIComponent(calendarId)}/events`, {
            method: "POST",
            headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        if (!resp.ok) {
            const text = await resp.text();
            res.status(500).json({ success: false, error: "Outlook event create failed", details: text });
            return;
        }
        const created = await resp.json();
        res.json({ success: true, provider, eventId: created.id });
    }
    catch (e) {
        console.error("upsertEvent error", e);
        res.status(500).json({ success: false, error: e.message || "Unknown error" });
    }
});
exports.getCalendarTaskLinks = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    // Convenience helper for debugging / quick UI wiring if needed.
    try {
        const taskId = req.query.task_id || "";
        if (!taskId) {
            res.status(400).json({ success: false, error: "task_id is required" });
            return;
        }
        const snap = await admin_1.db.ref(`admin/calendar/taskLinks/${taskId}`).get();
        res.json({ success: true, taskId, links: snap.exists() ? snap.val() : null });
    }
    catch (e) {
        res.status(500).json({ success: false, error: e.message || "Unknown error" });
    }
});
//# sourceMappingURL=adminCalendar.js.map