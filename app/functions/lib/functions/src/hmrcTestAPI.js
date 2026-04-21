"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testHMRCAPIConnection = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin_1 = require("./admin");
/**
 * Test HMRC API connection - makes a simple GET request to list submissions
 * This must be done server-side because HMRC's API doesn't support CORS from browsers
 */
exports.testHMRCAPIConnection = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    var _a, _b;
    try {
        console.log('testHMRCAPIConnection called');
        // Only allow POST requests
        if (req.method !== 'POST') {
            res.status(405).json({ error: 'Method not allowed. Use POST.' });
            return;
        }
        const { companyId, siteId, subsiteId, userId, fraudHeaders, hmrcSettings: providedSettings } = req.body;
        console.log('Request body received:', { companyId, hasSiteId: !!siteId, hasSubsiteId: !!subsiteId, hasProvidedSettings: !!providedSettings });
        // Validate required fields
        if (!companyId) {
            res.status(400).json({
                error: 'Missing required field',
                message: 'companyId is required'
            });
            return;
        }
        // If settings are provided directly, use them (avoids database connection)
        let hmrcSettings = null;
        let settingsPath = null;
        if (providedSettings) {
            console.log('Using provided HMRC settings');
            hmrcSettings = providedSettings;
        }
        else {
            // Otherwise, fetch from database
            console.log('Fetching HMRC settings from database');
            // Use the shared database instance from admin.ts
            // Helper function to get HMRC settings path
            const getHMRCSettingsPath = (level) => {
                if (level === 'subsite' && subsiteId && siteId) {
                    return `companies/${companyId}/sites/${siteId}/subsites/${subsiteId}/data/company/hmrcSettings`;
                }
                else if (level === 'site' && siteId) {
                    return `companies/${companyId}/sites/${siteId}/data/company/hmrcSettings`;
                }
                else {
                    return `companies/${companyId}/data/company/hmrcSettings`;
                }
            };
            const paths = [];
            if (subsiteId && siteId) {
                paths.push({ path: getHMRCSettingsPath('subsite'), level: 'subsite' });
            }
            if (siteId) {
                paths.push({ path: getHMRCSettingsPath('site'), level: 'site' });
            }
            paths.push({ path: getHMRCSettingsPath('company'), level: 'company' });
            for (const { path } of paths) {
                try {
                    console.log(`Trying to fetch settings from path: ${path}`);
                    // Add timeout to prevent hanging
                    const snapshotPromise = admin_1.db.ref(path).once('value');
                    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Database query timeout after 10 seconds')), 10000));
                    const snapshot = await Promise.race([snapshotPromise, timeoutPromise]);
                    if (snapshot && snapshot.exists()) {
                        hmrcSettings = snapshot.val();
                        settingsPath = path;
                        console.log(`Found settings at path: ${path}`);
                        break;
                    }
                    else {
                        console.log(`No settings found at path: ${path}`);
                    }
                }
                catch (dbError) {
                    console.error(`Error accessing path ${path}:`, dbError.message || dbError);
                    console.error(`Error details:`, dbError);
                    // Continue to next path
                }
            }
        }
        if (!hmrcSettings) {
            res.status(400).json({
                error: 'HMRC settings not found',
                message: 'HMRC settings not configured. Please configure HMRC settings first.'
            });
            return;
        }
        // Comprehensive validation of required settings
        const validationErrors = [];
        // Clean and normalize PAYE Reference
        let cleanPAYERef = '';
        if (!hmrcSettings.employerPAYEReference) {
            validationErrors.push('PAYE Reference is required');
        }
        else {
            // Trim whitespace and convert to uppercase
            const trimmedPAYE = hmrcSettings.employerPAYEReference.trim().toUpperCase();
            // Remove all spaces for validation
            cleanPAYERef = trimmedPAYE.replace(/\s+/g, '');
            // Pattern: 3 digits, "/", followed by alphanumeric characters
            // Standard format: ###/AB##### (3 digits / 2 letters + 5-6 digits)
            // Test user format: ###/XXXXXXXXXX (3 digits / 10 alphanumeric characters)
            // HMRC accepts both formats
            const payeRefPattern = /^\d{3}\/[A-Z0-9]{5,12}$/i; // More flexible to handle both production and test formats
            if (!payeRefPattern.test(cleanPAYERef)) {
                validationErrors.push(`PAYE Reference format is invalid. Received: "${hmrcSettings.employerPAYEReference}". Expected format: ###/AB##### (production) or ###/XXXXXXXXXX (test users). Please check for spaces, typos, or incorrect format.`);
            }
            else {
                // Additional validation: should be between 8-15 characters after the slash
                const parts = cleanPAYERef.split('/');
                if (parts.length !== 2 || parts[1].length < 5 || parts[1].length > 12) {
                    validationErrors.push(`PAYE Reference format is invalid. Received: "${hmrcSettings.employerPAYEReference}". The part after the slash should be 5-12 alphanumeric characters.`);
                }
            }
        }
        // Clean and normalize Accounts Office Reference
        let cleanAOR = '';
        if (!hmrcSettings.accountsOfficeReference) {
            validationErrors.push('Accounts Office Reference is required');
        }
        else {
            // Trim whitespace and convert to uppercase
            const trimmedAOR = hmrcSettings.accountsOfficeReference.trim().toUpperCase();
            // Remove all spaces for validation
            cleanAOR = trimmedAOR.replace(/\s+/g, '');
            // Pattern: 3 digits, "PA", then 9 digits (total 14 characters)
            // HMRC format: ###PA######### (e.g., 123PA00012345 = 14 chars)
            // Breakdown: 123 (3 digits) + PA (2 letters) + 00012345 (9 digits) = 14 total
            const aorPattern = /^\d{3}PA\d{9}$/;
            // Check length first for better error message
            if (cleanAOR.length !== 14) {
                // Analyze what's wrong
                const parts = cleanAOR.match(/^(\d{0,3})(PA?)(\d*)$/i);
                let analysis = '';
                if (parts) {
                    const digitsBefore = ((_a = parts[1]) === null || _a === void 0 ? void 0 : _a.length) || 0;
                    const paPart = parts[2] || '';
                    const digitsAfter = ((_b = parts[3]) === null || _b === void 0 ? void 0 : _b.length) || 0;
                    analysis = ` Breakdown: ${digitsBefore} digits before PA, "${paPart}" for PA part, ${digitsAfter} digits after PA.`;
                    if (digitsBefore !== 3) {
                        analysis += ` Expected 3 digits before PA, got ${digitsBefore}.`;
                    }
                    if (paPart.toUpperCase() !== 'PA') {
                        analysis += ` Expected "PA", got "${paPart}".`;
                    }
                    if (digitsAfter !== 9) {
                        analysis += ` Expected 9 digits after PA, got ${digitsAfter}.`;
                    }
                }
                const expectedFormat = '###PA######### (3 digits + PA + 9 digits = 14 characters total)';
                validationErrors.push(`Accounts Office Reference length is invalid. Received: "${hmrcSettings.accountsOfficeReference}" (${cleanAOR.length} characters after cleaning: "${cleanAOR}"). Expected: 14 characters.${analysis} Format: ${expectedFormat}. Example: 123PA00012345 (note: 9 digits after PA, not 8)`);
            }
            else if (!aorPattern.test(cleanAOR)) {
                // Length is correct but format is wrong
                validationErrors.push(`Accounts Office Reference format is invalid. Received: "${hmrcSettings.accountsOfficeReference}" (cleaned: "${cleanAOR}"). Expected format: ###PA######### (3 digits + PA + 9 digits). Example: 123PA00012345`);
            }
        }
        if (!hmrcSettings.hmrcAccessToken) {
            validationErrors.push('HMRC access token is missing. Please connect to HMRC first.');
        }
        if (!hmrcSettings.hmrcRefreshToken) {
            validationErrors.push('HMRC refresh token is missing. Please connect to HMRC first.');
        }
        if (!hmrcSettings.hmrcEnvironment) {
            validationErrors.push('HMRC environment is not set');
        }
        else if (hmrcSettings.hmrcEnvironment !== 'sandbox' && hmrcSettings.hmrcEnvironment !== 'production') {
            validationErrors.push('HMRC environment must be either "sandbox" or "production"');
        }
        if (validationErrors.length > 0) {
            res.status(400).json({
                error: 'Invalid HMRC settings',
                message: validationErrors.join('; '),
                validationErrors
            });
            return;
        }
        // Determine base URL based on environment with validation
        const environment = hmrcSettings.hmrcEnvironment || 'sandbox';
        if (environment !== 'sandbox' && environment !== 'production') {
            res.status(400).json({
                error: 'Invalid environment',
                message: `Invalid HMRC environment: ${environment}. Must be 'sandbox' or 'production'.`
            });
            return;
        }
        const baseUrl = environment === 'production'
            ? 'https://api.service.hmrc.gov.uk'
            : 'https://test-api.service.hmrc.gov.uk';
        // Check if token needs refresh
        let accessToken = hmrcSettings.hmrcAccessToken;
        const now = Date.now();
        const tokenExpiry = hmrcSettings.hmrcTokenExpiry || 0;
        // Refresh token if expired or about to expire (5 minute buffer)
        if (!tokenExpiry || tokenExpiry <= now + 300000) {
            console.log('Token expired or expiring soon, refreshing...');
            if (!hmrcSettings.hmrcClientId || !hmrcSettings.hmrcClientSecret) {
                // If credentials not provided, try to use the token anyway (might still be valid)
                console.warn('HMRC OAuth credentials not available for token refresh, using existing token');
            }
            else {
                try {
                    const tokenUrl = `${baseUrl}/oauth/token`;
                    const credentials = Buffer.from(`${hmrcSettings.hmrcClientId}:${hmrcSettings.hmrcClientSecret}`).toString('base64');
                    console.log('Refreshing token from:', tokenUrl);
                    const refreshResponse = await fetch(tokenUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                            'Authorization': `Basic ${credentials}`,
                            'Accept': 'application/json'
                        },
                        body: new URLSearchParams({
                            grant_type: 'refresh_token',
                            refresh_token: hmrcSettings.hmrcRefreshToken
                        }).toString()
                    });
                    if (!refreshResponse.ok) {
                        const errorText = await refreshResponse.text();
                        let errorData;
                        try {
                            errorData = JSON.parse(errorText);
                        }
                        catch (_c) {
                            errorData = { error: 'unknown', error_description: errorText };
                        }
                        console.error('Token refresh failed:', errorData);
                        // If refresh fails, try using the existing token anyway (it might still work)
                        console.warn('Token refresh failed, attempting to use existing token');
                    }
                    else {
                        const tokenData = await refreshResponse.json();
                        accessToken = tokenData.access_token;
                        console.log('Token refreshed successfully');
                        // Update tokens in database (optional - async, don't wait)
                        if (settingsPath) {
                            const newExpiry = now + (tokenData.expires_in * 1000);
                            admin_1.db.ref(settingsPath).update({
                                hmrcAccessToken: tokenData.access_token,
                                hmrcRefreshToken: tokenData.refresh_token,
                                hmrcTokenExpiry: newExpiry,
                                updatedAt: now
                            }).catch(err => console.error('Error updating tokens:', err));
                        }
                    }
                }
                catch (refreshError) {
                    console.error('Error during token refresh:', refreshError);
                    // Continue with existing token - it might still be valid
                    console.warn('Token refresh error, attempting to use existing token');
                }
            }
        }
        else {
            console.log('Token is still valid, no refresh needed');
        }
        // Prepare fraud prevention headers
        // Use provided headers or generate minimal ones
        const defaultFraudHeaders = {
            'Gov-Client-Connection-Method': 'WEB_APP_VIA_SERVER',
            'Gov-Client-Device-ID': 'server-' + Date.now().toString(),
            'Gov-Client-User-IDs': userId ? `os=${userId}` : '',
            'Gov-Client-Timezone': 'UTC+00:00',
            'Gov-Client-Local-IPs': '',
            'Gov-Client-Screens': '',
            'Gov-Client-Window-Size': '',
            'Gov-Client-Browser-Plugins': '',
            'Gov-Client-Browser-JS-User-Agent': '',
            'Gov-Client-Browser-Do-Not-Track': 'false',
            'Gov-Client-Multi-Factor': ''
        };
        const finalFraudHeaders = fraudHeaders || defaultFraudHeaders;
        // Make API call to HMRC
        // Use cleaned references (should already be validated above)
        if (!cleanPAYERef) {
            res.status(400).json({
                error: 'Invalid employer reference',
                message: 'PAYE Reference is required'
            });
            return;
        }
        // Properly encode the employer reference for URL (use cleaned value)
        const employerRef = encodeURIComponent(cleanPAYERef.replace('/', '%2F'));
        const endpoint = `${baseUrl}/paye/employers/${employerRef}/submissions`;
        console.log('Making HMRC API call:', {
            endpoint,
            baseUrl,
            employerRef: cleanPAYERef,
            originalEmployerRef: hmrcSettings.employerPAYEReference,
            encodedEmployerRef: employerRef,
            accountsOfficeRef: cleanAOR || 'not provided',
            hasAccessToken: !!accessToken,
            accessTokenLength: (accessToken === null || accessToken === void 0 ? void 0 : accessToken.length) || 0,
            environment: hmrcSettings.hmrcEnvironment,
            fraudHeadersCount: Object.keys(finalFraudHeaders).length
        });
        let apiResponse;
        try {
            // Add timeout to HMRC API call (20 seconds)
            const fetchController = new AbortController();
            const fetchTimeout = setTimeout(() => fetchController.abort(), 20000);
            apiResponse = await fetch(endpoint, {
                method: 'GET',
                headers: Object.assign({ 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' }, finalFraudHeaders),
                signal: fetchController.signal
            });
            clearTimeout(fetchTimeout);
            console.log('HMRC API response status:', apiResponse.status, apiResponse.statusText);
        }
        catch (fetchError) {
            console.error('Error calling HMRC API:', fetchError);
            if (fetchError.name === 'AbortError') {
                res.status(500).json({
                    error: 'HMRC API call timeout',
                    message: 'The HMRC API call timed out after 20 seconds. Please try again.',
                    details: 'Timeout'
                });
            }
            else {
                res.status(500).json({
                    error: 'HMRC API call failed',
                    message: `Failed to call HMRC API: ${fetchError.message || 'Unknown error'}`,
                    details: fetchError.toString()
                });
            }
            return;
        }
        // Get response body
        let responseBody = {};
        const contentType = apiResponse.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            try {
                responseBody = await apiResponse.json();
            }
            catch (_d) {
                responseBody = { raw: await apiResponse.text() };
            }
        }
        else {
            responseBody = { raw: await apiResponse.text() };
        }
        // Get response headers
        const responseHeaders = {};
        apiResponse.headers.forEach((value, key) => {
            responseHeaders[key] = value;
        });
        // Return result
        console.log('HMRC API response:', {
            status: apiResponse.status,
            statusText: apiResponse.statusText,
            hasBody: !!responseBody
        });
        // Handle all possible HMRC response codes
        // Important: Even if HMRC returns an error, the API call was made and registered
        if (apiResponse.status === 200) {
            console.log('✅ Success! API call registered in HMRC Gateway');
            res.status(200).json({
                success: true,
                status: apiResponse.status,
                message: '✅ API connection test successful! This call has been registered in HMRC Gateway. You can now proceed to the next stage.',
                data: responseBody,
                headers: responseHeaders,
                registered: true
            });
        }
        else if (apiResponse.status === 202) {
            // 202 Accepted - also success
            console.log('✅ Success! API call accepted by HMRC');
            res.status(200).json({
                success: true,
                status: apiResponse.status,
                message: '✅ API call accepted by HMRC. This call has been registered in HMRC Gateway.',
                data: responseBody,
                headers: responseHeaders,
                registered: true
            });
        }
        else if (apiResponse.status === 404) {
            // 404 from HMRC - call was made, but endpoint/employer ref may not exist
            // This is still a success for registration purposes
            console.log('⚠️ HMRC returned 404 - API call was made and registered, but endpoint may not exist');
            res.status(200).json({
                success: true,
                status: apiResponse.status,
                message: '✅ API call made to HMRC and registered! Received 404 (no submissions found), but the call was successfully registered in HMRC Gateway. You can proceed to the next stage.',
                data: responseBody,
                headers: responseHeaders,
                registered: true,
                note: '404 typically means no submissions exist yet for this employer reference, which is normal for new setups.'
            });
        }
        else if (apiResponse.status === 401 || apiResponse.status === 403) {
            // Authentication/Authorization errors
            console.error('❌ HMRC authentication/authorization error:', apiResponse.status);
            res.status(200).json({
                success: false,
                status: apiResponse.status,
                message: `Authentication error (${apiResponse.status}): Your HMRC access token may be invalid or expired. Please reconnect to HMRC.`,
                data: responseBody,
                headers: responseHeaders,
                registered: false,
                requiresReconnect: true
            });
        }
        else if (apiResponse.status >= 400 && apiResponse.status < 500) {
            // Other 4xx errors - client errors but call was made
            console.log('⚠️ HMRC returned 4xx status:', apiResponse.status);
            res.status(200).json({
                success: true,
                status: apiResponse.status,
                message: `API call made to HMRC and registered. Received ${apiResponse.status}: ${apiResponse.statusText}. The call was registered in HMRC Gateway.`,
                data: responseBody,
                headers: responseHeaders,
                registered: true,
                warning: `HMRC returned ${apiResponse.status} - check your employer reference and settings if this persists.`
            });
        }
        else if (apiResponse.status >= 500) {
            // 5xx errors - server errors
            console.error('❌ HMRC server error:', apiResponse.status);
            res.status(200).json({
                success: false,
                status: apiResponse.status,
                message: `HMRC server error (${apiResponse.status}): HMRC's servers may be experiencing issues. The API call may not have been registered. Please try again later.`,
                data: responseBody,
                headers: responseHeaders,
                registered: false,
                retryRecommended: true
            });
        }
        else {
            // Unexpected status codes
            console.log('⚠️ Unexpected HMRC response status:', apiResponse.status);
            res.status(200).json({
                success: apiResponse.status < 400,
                status: apiResponse.status,
                message: `API call made to HMRC. Received status ${apiResponse.status}: ${apiResponse.statusText}`,
                data: responseBody,
                headers: responseHeaders,
                registered: apiResponse.status < 500
            });
        }
    }
    catch (error) {
        console.error('Error in testHMRCAPIConnection:', error);
        console.error('Error stack:', error.stack);
        // Make sure we always send a response
        if (!res.headersSent) {
            res.status(500).json({
                error: 'Internal server error',
                message: error.message || 'Unknown error occurred during API connection test',
                details: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    }
});
//# sourceMappingURL=hmrcTestAPI.js.map