"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.disconnectOAuth = exports.checkOAuthStatus = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin_1 = require("./admin");
exports.checkOAuthStatus = (0, https_1.onRequest)(async (req, res) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
    try {
        const { company_id, site_id, subsite_id, tokenDocId, user_id } = req.query;
        // If tokenDocId is provided, check specific token
        if (tokenDocId) {
            const doc = await admin_1.firestore.collection('oauth_tokens').doc(tokenDocId).get();
            const exists = doc.exists;
            const valid = exists && ((_b = (_a = doc.data()) === null || _a === void 0 ? void 0 : _a.tokens) === null || _b === void 0 ? void 0 : _b.access_token);
            res.json({
                exists,
                valid,
                email: ((_c = doc.data()) === null || _c === void 0 ? void 0 : _c.email) || null,
                connectedAt: ((_d = doc.data()) === null || _d === void 0 ? void 0 : _d.connectedAt) || null
            });
            return;
        }
        // Otherwise, check all tokens for the company/site/subsite
        if (!company_id) {
            res.status(400).json({ error: 'Company ID is required' });
            return;
        }
        const siteId = site_id || 'default';
        const subsiteId = subsite_id || 'default';
        const userId = user_id || '';
        // Check Gmail connection
        const gmailDocId = userId
            ? `${company_id}_${siteId}_${subsiteId}_${userId}_gmail`
            : `${company_id}_${siteId}_${subsiteId}_gmail`;
        const gmailDoc = await admin_1.firestore.collection('oauth_tokens').doc(gmailDocId).get();
        const gmailConnected = gmailDoc.exists && ((_f = (_e = gmailDoc.data()) === null || _e === void 0 ? void 0 : _e.tokens) === null || _f === void 0 ? void 0 : _f.access_token);
        // Check Outlook connection
        const outlookDocId = userId
            ? `${company_id}_${siteId}_${subsiteId}_${userId}_outlook`
            : `${company_id}_${siteId}_${subsiteId}_outlook`;
        const outlookDoc = await admin_1.firestore.collection('oauth_tokens').doc(outlookDocId).get();
        const outlookConnected = outlookDoc.exists && ((_h = (_g = outlookDoc.data()) === null || _g === void 0 ? void 0 : _g.tokens) === null || _h === void 0 ? void 0 : _h.access_token);
        res.json({
            gmail: {
                connected: gmailConnected,
                email: ((_j = gmailDoc.data()) === null || _j === void 0 ? void 0 : _j.email) || null,
                connectedAt: ((_k = gmailDoc.data()) === null || _k === void 0 ? void 0 : _k.connectedAt) || null
            },
            outlook: {
                connected: outlookConnected,
                email: ((_l = outlookDoc.data()) === null || _l === void 0 ? void 0 : _l.email) || null,
                connectedAt: ((_m = outlookDoc.data()) === null || _m === void 0 ? void 0 : _m.connectedAt) || null
            }
        });
    }
    catch (error) {
        console.error('Check OAuth status error:', error);
        res.status(500).json({ error: 'Failed to check OAuth status' });
    }
});
exports.disconnectOAuth = (0, https_1.onRequest)(async (req, res) => {
    try {
        const { company_id, site_id, subsite_id, provider, user_id } = req.query;
        if (!company_id || !provider) {
            res.status(400).json({ error: 'Company ID and provider are required' });
            return;
        }
        const siteId = site_id || 'default';
        const subsiteId = subsite_id || 'default';
        const userId = user_id || '';
        const docId = userId
            ? `${company_id}_${siteId}_${subsiteId}_${userId}_${provider}`
            : `${company_id}_${siteId}_${subsiteId}_${provider}`;
        await admin_1.firestore.collection('oauth_tokens').doc(docId).delete();
        res.json({ success: true, message: `${provider} account disconnected successfully` });
    }
    catch (error) {
        console.error('Disconnect OAuth error:', error);
        res.status(500).json({ error: 'Failed to disconnect OAuth account' });
    }
});
//# sourceMappingURL=checkOAuthStatus.js.map