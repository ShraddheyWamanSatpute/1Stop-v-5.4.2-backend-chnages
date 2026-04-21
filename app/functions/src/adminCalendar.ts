import { onRequest } from "firebase-functions/v2/https";
import { db as adminDb, firestore } from "./admin";
import { FUNCTION_KEYS } from "./keys";

type Provider = "google" | "outlook";

async function getGoogle() {
  // Lazy import to keep deploy-time export analysis fast.
  const mod = await import("googleapis");
  return mod.google;
}

function tokenDocIdFor(opts: { companyId: string; siteId?: string; subsiteId?: string; provider: "google_calendar" | "outlook_calendar" }) {
  return `${opts.companyId}_${opts.siteId || "default"}_${opts.subsiteId || "default"}_${opts.provider}`;
}

async function getOAuthTokenDoc(companyId: string, provider: "google_calendar" | "outlook_calendar", siteId?: string, subsiteId?: string) {
  const docId = tokenDocIdFor({ companyId, provider, siteId, subsiteId });
  const doc = await firestore.collection("oauth_tokens").doc(docId).get();
  if (!doc.exists) return null;
  return { id: docId, ...(doc.data() as any) } as any;
}

async function ensureGoogleOAuthClient(tokenDoc: any) {
  const google = await getGoogle();
  const oauth2Client = new google.auth.OAuth2(FUNCTION_KEYS.google.clientId, FUNCTION_KEYS.google.clientSecret);
  oauth2Client.setCredentials(tokenDoc.tokens || {});
  return oauth2Client;
}

async function ensureOutlookAccessToken(tokenDoc: any): Promise<string> {
  const tokens = tokenDoc.tokens || {};
  if (tokens.access_token) return tokens.access_token as string;
  throw new Error("Missing outlook access token");
}

export const listCalendars = onRequest({ cors: true }, async (req, res) => {
  try {
    const companyId = (req.query.company_id as string) || (req.body?.companyId as string);
    const provider = ((req.query.provider as string) || req.body?.provider || "google") as Provider;
    const siteId = (req.query.site_id as string) || req.body?.siteId || "default";
    const subsiteId = (req.query.subsite_id as string) || req.body?.subsiteId || "default";

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
    const data: any = await response.json();
    const calendars = (data.value || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      primary: Boolean(c.isDefaultCalendar),
    }));
    res.json({ success: true, provider, calendars });
  } catch (e: any) {
    console.error("listCalendars error", e);
    res.status(500).json({ success: false, error: e.message || "Unknown error" });
  }
});

export const listEvents = onRequest({ cors: true }, async (req, res) => {
  try {
    const companyId = (req.query.company_id as string) || (req.body?.companyId as string);
    const provider = ((req.query.provider as string) || req.body?.provider || "google") as Provider;
    const calendarId = (req.query.calendar_id as string) || req.body?.calendarId || "";
    const siteId = (req.query.site_id as string) || req.body?.siteId || "default";
    const subsiteId = (req.query.subsite_id as string) || req.body?.subsiteId || "default";
    const timeMin = (req.query.time_min as string) || req.body?.timeMin || "";
    const timeMax = (req.query.time_max as string) || req.body?.timeMax || "";

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
      const events = (list.data.items || []).map((ev: any) => ({
        id: ev.id,
        title: ev.summary || "",
        description: ev.description || "",
        location: ev.location || "",
        start: ev.start?.dateTime || ev.start?.date || "",
        end: ev.end?.dateTime || ev.end?.date || "",
        allDay: Boolean(ev.start?.date && !ev.start?.dateTime),
        updatedAt: ev.updated,
      }));
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
    const url =
      `https://graph.microsoft.com/v1.0/me/calendars/${encodeURIComponent(calendarId)}/events?` +
      `$top=100&$orderby=start/dateTime&$select=id,subject,bodyPreview,start,end,isAllDay,lastModifiedDateTime,location,attendees,webLink&$filter=${encodeURIComponent(filter)}`;

    const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!response.ok) {
      const text = await response.text();
      res.status(500).json({ success: false, error: "Outlook events fetch failed", details: text });
      return;
    }
    const data: any = await response.json();
    const events = (data.value || []).map((ev: any) => ({
      id: ev.id,
      title: ev.subject || "",
      description: ev.bodyPreview || "",
      location: ev.location?.displayName || "",
      start: ev.start?.dateTime || "",
      end: ev.end?.dateTime || "",
      allDay: Boolean(ev.isAllDay),
      updatedAt: ev.lastModifiedDateTime || null,
    }));
    res.json({ success: true, provider, calendarId, events });
  } catch (e: any) {
    console.error("listEvents error", e);
    res.status(500).json({ success: false, error: e.message || "Unknown error" });
  }
});

export const deleteEvent = onRequest({ cors: true }, async (req, res) => {
  try {
    const companyId = (req.query.company_id as string) || (req.body?.companyId as string) || "";
    const provider = ((req.query.provider as string) || req.body?.provider || "google") as Provider;
    const calendarId = (req.query.calendar_id as string) || req.body?.calendarId || "";
    const eventId = (req.query.event_id as string) || req.body?.eventId || "";
    const siteId = (req.query.site_id as string) || req.body?.siteId || "default";
    const subsiteId = (req.query.subsite_id as string) || req.body?.subsiteId || "default";

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
  } catch (e: any) {
    console.error("deleteEvent error", e);
    res.status(500).json({ success: false, error: e.message || "Unknown error" });
  }
});

export const upsertEvent = onRequest({ cors: true }, async (req, res) => {
  try {
    const body: any = req.body || {};
    const companyId = (req.query.company_id as string) || body.companyId || "";
    const provider = ((req.query.provider as string) || body.provider || "google") as Provider;
    const calendarId = (req.query.calendar_id as string) || body.calendarId || "";
    const eventId = (req.query.event_id as string) || body.eventId || "";
    const siteId = (req.query.site_id as string) || body.siteId || "default";
    const subsiteId = (req.query.subsite_id as string) || body.subsiteId || "default";

    const title = String(body.title || body.summary || "").trim();
    const description = String(body.description || "").trim();
    const location = String(body.location || "").trim();
    const attendees = Array.isArray(body.attendees) ? body.attendees.map((x: any) => String(x || "").trim()).filter(Boolean) : [];
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

      const resource: any = {
        summary: title,
        description,
        location: location || undefined,
        start: allDay ? { date: start } : { dateTime: start, timeZone },
        end: allDay ? { date: end } : { dateTime: end, timeZone },
      };

      if (attendees.length > 0) {
        resource.attendees = attendees.map((email: string) => ({ email }));
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

    const payload: any = {
      subject: title,
      body: { contentType: "Text", content: description },
      start: { dateTime: start, timeZone: "UTC" },
      end: { dateTime: end, timeZone: "UTC" },
    };

    if (location) {
      payload.location = { displayName: location };
    }
    if (attendees.length > 0) {
      payload.attendees = attendees.map((address: string) => ({
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
    const created: any = await resp.json();
    res.json({ success: true, provider, eventId: created.id });
  } catch (e: any) {
    console.error("upsertEvent error", e);
    res.status(500).json({ success: false, error: e.message || "Unknown error" });
  }
});

export const getCalendarTaskLinks = onRequest({ cors: true }, async (req, res) => {
  // Convenience helper for debugging / quick UI wiring if needed.
  try {
    const taskId = (req.query.task_id as string) || "";
    if (!taskId) {
      res.status(400).json({ success: false, error: "task_id is required" });
      return;
    }
    const snap = await adminDb.ref(`admin/calendar/taskLinks/${taskId}`).get();
    res.json({ success: true, taskId, links: snap.exists() ? snap.val() : null });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message || "Unknown error" });
  }
});

