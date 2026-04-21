import React, { useState } from "react"
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Link,
  Paper,
  Step,
  StepContent,
  StepLabel,
  Stepper,
  Typography,
} from "@mui/material"
import {
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckIcon,
  RadioButtonUnchecked as UncheckedIcon,
  OpenInNew as ExternalLinkIcon,
  ContentCopy as CopyIcon,
  Security as SecurityIcon,
  Email as EmailIcon,
  CalendarMonth as CalendarIcon,
  Key as KeyIcon,
  Settings as SettingsIcon,
  Help as HelpIcon,
} from "@mui/icons-material"

interface EmailSetupGuideProps {
  gmailConfigured: boolean
  calendarConfigured: boolean
  oauthGmailConnected: boolean
  oauthOutlookConnected: boolean
}

const EmailSetupGuide: React.FC<EmailSetupGuideProps> = ({
  gmailConfigured,
  calendarConfigured,
  oauthGmailConnected,
  oauthOutlookConnected,
}) => {
  const [expandedSection, setExpandedSection] = useState<string | false>("gmail-app-password")

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, p: 2, overflow: "auto" }}>
      {/* Overview Status */}
      <Paper variant="outlined" sx={{ p: 2.5 }}>
        <Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>
          Setup Overview
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Follow these guides to connect your email accounts and Google Calendar to the admin panel.
          The App Password method provides secure access without sharing your main password.
        </Typography>
        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
          <Chip
            icon={gmailConfigured ? <CheckIcon /> : <UncheckedIcon />}
            label="Gmail SMTP"
            color={gmailConfigured ? "success" : "default"}
            variant={gmailConfigured ? "filled" : "outlined"}
          />
          <Chip
            icon={oauthGmailConnected ? <CheckIcon /> : <UncheckedIcon />}
            label="Gmail OAuth"
            color={oauthGmailConnected ? "success" : "default"}
            variant={oauthGmailConnected ? "filled" : "outlined"}
          />
          <Chip
            icon={oauthOutlookConnected ? <CheckIcon /> : <UncheckedIcon />}
            label="Outlook OAuth"
            color={oauthOutlookConnected ? "success" : "default"}
            variant={oauthOutlookConnected ? "filled" : "outlined"}
          />
          <Chip
            icon={calendarConfigured ? <CheckIcon /> : <UncheckedIcon />}
            label="Google Calendar"
            color={calendarConfigured ? "success" : "default"}
            variant={calendarConfigured ? "filled" : "outlined"}
          />
        </Box>
      </Paper>

      {/* Gmail App Password Guide */}
      <Accordion
        expanded={expandedSection === "gmail-app-password"}
        onChange={(_, isExpanded) => setExpandedSection(isExpanded ? "gmail-app-password" : false)}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <KeyIcon color="primary" />
            <Box>
              <Typography fontWeight={700}>Setting Up Gmail App Password (SMTP)</Typography>
              <Typography variant="caption" color="text.secondary">
                Required for sending emails from the admin panel
              </Typography>
            </Box>
            {gmailConfigured && <Chip size="small" label="Configured" color="success" sx={{ ml: 1 }} />}
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Alert severity="info" sx={{ mb: 2 }}>
            <strong>Important:</strong> App Passwords require 2-Step Verification to be enabled on your Google account.
            App Passwords are 16-character codes that give an app access to your Google Account without your main password.
          </Alert>

          <Stepper orientation="vertical" activeStep={-1}>
            <Step active>
              <StepLabel>
                <Typography fontWeight={600}>Enable 2-Step Verification</Typography>
              </StepLabel>
              <StepContent>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  2-Step Verification must be enabled before you can create App Passwords.
                </Typography>
                <ol style={{ margin: 0, paddingLeft: 20 }}>
                  <li><Typography variant="body2">Go to your Google Account at <Link href="https://myaccount.google.com" target="_blank" rel="noopener">myaccount.google.com</Link></Typography></li>
                  <li><Typography variant="body2">Click <strong>Security</strong> in the left navigation</Typography></li>
                  <li><Typography variant="body2">Under "How you sign in to Google", click <strong>2-Step Verification</strong></Typography></li>
                  <li><Typography variant="body2">Follow the on-screen steps to enable it</Typography></li>
                </ol>
                <Button
                  size="small"
                  variant="outlined"
                  endIcon={<ExternalLinkIcon />}
                  sx={{ mt: 1 }}
                  onClick={() => window.open("https://myaccount.google.com/security", "_blank")}
                >
                  Open Google Security Settings
                </Button>
              </StepContent>
            </Step>

            <Step active>
              <StepLabel>
                <Typography fontWeight={600}>Generate an App Password</Typography>
              </StepLabel>
              <StepContent>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Once 2-Step Verification is enabled, create an App Password:
                </Typography>
                <ol style={{ margin: 0, paddingLeft: 20 }}>
                  <li><Typography variant="body2">Go to <Link href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener">myaccount.google.com/apppasswords</Link></Typography></li>
                  <li><Typography variant="body2">You may need to sign in again</Typography></li>
                  <li><Typography variant="body2">In the "App name" field, type <strong>1Stop Admin</strong> (or any descriptive name)</Typography></li>
                  <li><Typography variant="body2">Click <strong>Create</strong></Typography></li>
                  <li><Typography variant="body2">A 16-character password will appear. <strong>Copy it immediately</strong> — you won't see it again!</Typography></li>
                </ol>
                <Button
                  size="small"
                  variant="outlined"
                  endIcon={<ExternalLinkIcon />}
                  sx={{ mt: 1 }}
                  onClick={() => window.open("https://myaccount.google.com/apppasswords", "_blank")}
                >
                  Open App Passwords Page
                </Button>
              </StepContent>
            </Step>

            <Step active>
              <StepLabel>
                <Typography fontWeight={600}>Enter the App Password in Settings</Typography>
              </StepLabel>
              <StepContent>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Now paste the App Password into the admin email settings:
                </Typography>
                <ol style={{ margin: 0, paddingLeft: 20 }}>
                  <li><Typography variant="body2">Go to the <strong>Settings</strong> tab in this Email section</Typography></li>
                  <li><Typography variant="body2">Under "Gmail App Password (SMTP Sending)", click <strong>Edit</strong></Typography></li>
                  <li><Typography variant="body2">Enter your Gmail address</Typography></li>
                  <li><Typography variant="body2">Enter a Sender Name (e.g. "Your Name" or "1Stop Admin")</Typography></li>
                  <li><Typography variant="body2">Paste the 16-character App Password you copied</Typography></li>
                  <li><Typography variant="body2">Click <strong>Save</strong></Typography></li>
                </ol>
                <Alert severity="warning" sx={{ mt: 1 }}>
                  The App Password is stored securely and will not be displayed again. If you lose it, you'll need to generate a new one from Google.
                </Alert>
              </StepContent>
            </Step>

            <Step active>
              <StepLabel>
                <Typography fontWeight={600}>Test Your Setup</Typography>
              </StepLabel>
              <StepContent>
                <Typography variant="body2">
                  After saving, compose a test email from the <strong>Inbox</strong> tab to verify everything is working.
                  If sending fails, double-check:
                </Typography>
                <ul style={{ margin: "8px 0", paddingLeft: 20 }}>
                  <li><Typography variant="body2">The Gmail address is correct</Typography></li>
                  <li><Typography variant="body2">The App Password was copied correctly (no extra spaces)</Typography></li>
                  <li><Typography variant="body2">2-Step Verification is still enabled</Typography></li>
                  <li><Typography variant="body2">"Less secure app access" is NOT relevant — App Passwords bypass this</Typography></li>
                </ul>
              </StepContent>
            </Step>
          </Stepper>
        </AccordionDetails>
      </Accordion>

      {/* Google Calendar App Password Guide */}
      <Accordion
        expanded={expandedSection === "google-calendar"}
        onChange={(_, isExpanded) => setExpandedSection(isExpanded ? "google-calendar" : false)}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <CalendarIcon color="primary" />
            <Box>
              <Typography fontWeight={700}>Connecting Google Calendar (App Password)</Typography>
              <Typography variant="caption" color="text.secondary">
                Sync your Google Calendar events to the admin panel
              </Typography>
            </Box>
            {calendarConfigured && <Chip size="small" label="Connected" color="success" sx={{ ml: 1 }} />}
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Alert severity="info" sx={{ mb: 2 }}>
            Google Calendar integration uses the same App Password method as email.
            If you've already created an App Password for email, you can use the same one for Calendar access.
          </Alert>

          <Stepper orientation="vertical" activeStep={-1}>
            <Step active>
              <StepLabel>
                <Typography fontWeight={600}>Ensure 2-Step Verification is Enabled</Typography>
              </StepLabel>
              <StepContent>
                <Typography variant="body2">
                  If you haven't already, follow the steps in the Gmail App Password guide above to enable 2-Step Verification.
                </Typography>
              </StepContent>
            </Step>

            <Step active>
              <StepLabel>
                <Typography fontWeight={600}>Generate or Reuse an App Password</Typography>
              </StepLabel>
              <StepContent>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  You can reuse the same App Password created for email, or generate a new one specifically for Calendar:
                </Typography>
                <ol style={{ margin: 0, paddingLeft: 20 }}>
                  <li><Typography variant="body2">Visit <Link href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener">myaccount.google.com/apppasswords</Link></Typography></li>
                  <li><Typography variant="body2">Create a new App Password named <strong>1Stop Calendar</strong></Typography></li>
                  <li><Typography variant="body2">Copy the 16-character password</Typography></li>
                </ol>
              </StepContent>
            </Step>

            <Step active>
              <StepLabel>
                <Typography fontWeight={600}>Find Your Calendar ID</Typography>
              </StepLabel>
              <StepContent>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  To sync a specific calendar (not your primary one):
                </Typography>
                <ol style={{ margin: 0, paddingLeft: 20 }}>
                  <li><Typography variant="body2">Open <Link href="https://calendar.google.com" target="_blank" rel="noopener">Google Calendar</Link></Typography></li>
                  <li><Typography variant="body2">Click the three dots next to the calendar name → <strong>Settings and sharing</strong></Typography></li>
                  <li><Typography variant="body2">Scroll down to "Integrate calendar"</Typography></li>
                  <li><Typography variant="body2">Copy the <strong>Calendar ID</strong> (looks like an email address)</Typography></li>
                </ol>
                <Alert severity="info" sx={{ mt: 1 }}>
                  If you want to use your main calendar, leave the Calendar ID field blank — it defaults to "primary".
                </Alert>
              </StepContent>
            </Step>

            <Step active>
              <StepLabel>
                <Typography fontWeight={600}>Configure in Settings</Typography>
              </StepLabel>
              <StepContent>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  In the <strong>Settings</strong> tab:
                </Typography>
                <ol style={{ margin: 0, paddingLeft: 20 }}>
                  <li><Typography variant="body2">Scroll to "Google Calendar Integration"</Typography></li>
                  <li><Typography variant="body2">Click <strong>Connect Google Calendar</strong></Typography></li>
                  <li><Typography variant="body2">Enter your Gmail address</Typography></li>
                  <li><Typography variant="body2">Paste the App Password</Typography></li>
                  <li><Typography variant="body2">Optionally enter a Calendar ID</Typography></li>
                  <li><Typography variant="body2">Choose a sync interval and calendar color</Typography></li>
                  <li><Typography variant="body2">Click <strong>Test Connection</strong> to verify</Typography></li>
                  <li><Typography variant="body2">Click <strong>Save Configuration</strong></Typography></li>
                </ol>
              </StepContent>
            </Step>
          </Stepper>
        </AccordionDetails>
      </Accordion>

      {/* Gmail OAuth Guide */}
      <Accordion
        expanded={expandedSection === "gmail-oauth"}
        onChange={(_, isExpanded) => setExpandedSection(isExpanded ? "gmail-oauth" : false)}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <EmailIcon color="primary" />
            <Box>
              <Typography fontWeight={700}>Connecting Gmail via OAuth (Inbox Sync)</Typography>
              <Typography variant="caption" color="text.secondary">
                Sync your Gmail inbox directly into the admin panel
              </Typography>
            </Box>
            {oauthGmailConnected && <Chip size="small" label="Connected" color="success" sx={{ ml: 1 }} />}
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" sx={{ mb: 1 }}>
            OAuth allows the admin panel to read your Gmail inbox securely without storing your password.
          </Typography>
          <ol style={{ margin: 0, paddingLeft: 20 }}>
            <li><Typography variant="body2">Go to the <strong>Settings</strong> tab</Typography></li>
            <li><Typography variant="body2">Under "Connected Email Providers", click <strong>Connect</strong> next to Gmail</Typography></li>
            <li><Typography variant="body2">You will be redirected to Google's consent screen</Typography></li>
            <li><Typography variant="body2">Sign in and grant the requested permissions</Typography></li>
            <li><Typography variant="body2">You'll be redirected back to the admin panel</Typography></li>
            <li><Typography variant="body2">Click <strong>Sync</strong> to pull in your latest emails</Typography></li>
          </ol>
        </AccordionDetails>
      </Accordion>

      {/* Outlook OAuth Guide */}
      <Accordion
        expanded={expandedSection === "outlook-oauth"}
        onChange={(_, isExpanded) => setExpandedSection(isExpanded ? "outlook-oauth" : false)}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <EmailIcon color="primary" />
            <Box>
              <Typography fontWeight={700}>Connecting Outlook via OAuth</Typography>
              <Typography variant="caption" color="text.secondary">
                Sync your Outlook / Microsoft 365 inbox
              </Typography>
            </Box>
            {oauthOutlookConnected && <Chip size="small" label="Connected" color="success" sx={{ ml: 1 }} />}
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Connect Outlook in the same way as Gmail:
          </Typography>
          <ol style={{ margin: 0, paddingLeft: 20 }}>
            <li><Typography variant="body2">Go to the <strong>Settings</strong> tab</Typography></li>
            <li><Typography variant="body2">Under "Connected Email Providers", click <strong>Connect</strong> next to Outlook</Typography></li>
            <li><Typography variant="body2">Sign in with your Microsoft account and grant permissions</Typography></li>
            <li><Typography variant="body2">You'll be redirected back to the admin panel</Typography></li>
            <li><Typography variant="body2">Click <strong>Sync</strong> to pull in your latest emails</Typography></li>
          </ol>
        </AccordionDetails>
      </Accordion>

      {/* Troubleshooting */}
      <Accordion
        expanded={expandedSection === "troubleshooting"}
        onChange={(_, isExpanded) => setExpandedSection(isExpanded ? "troubleshooting" : false)}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <HelpIcon color="primary" />
            <Box>
              <Typography fontWeight={700}>Troubleshooting</Typography>
              <Typography variant="caption" color="text.secondary">
                Common issues and their solutions
              </Typography>
            </Box>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: "grid", gap: 2 }}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography fontWeight={700} sx={{ mb: 0.5 }}>
                "App Passwords" option is not visible
              </Typography>
              <Typography variant="body2" color="text.secondary">
                App Passwords only appear when 2-Step Verification is turned on. Go to{" "}
                <Link href="https://myaccount.google.com/security" target="_blank" rel="noopener">
                  Google Security Settings
                </Link>{" "}
                and enable 2-Step Verification first.
              </Typography>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography fontWeight={700} sx={{ mb: 0.5 }}>
                Email sending fails with authentication error
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Double-check that the App Password was copied correctly (16 characters, no spaces).
                Also verify the Gmail address matches the account where the App Password was created.
                If problems persist, generate a new App Password and try again.
              </Typography>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography fontWeight={700} sx={{ mb: 0.5 }}>
                Calendar sync not working
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Ensure the Calendar ID is correct (or left blank for primary).
                Use the "Test Connection" button to diagnose issues.
                Make sure the Google account has Google Calendar API access enabled.
              </Typography>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography fontWeight={700} sx={{ mb: 0.5 }}>
                OAuth redirect fails or shows an error
              </Typography>
              <Typography variant="body2" color="text.secondary">
                This is usually caused by browser popup blockers or expired tokens.
                Try clearing your browser cache, disabling popup blockers, and reconnecting.
                If using a Google Workspace account, your admin may need to whitelist the application.
              </Typography>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography fontWeight={700} sx={{ mb: 0.5 }}>
                Revoking access
              </Typography>
              <Typography variant="body2" color="text.secondary">
                To fully revoke access: (1) Click "Disconnect" in the Settings tab, (2) Go to{" "}
                <Link href="https://myaccount.google.com/permissions" target="_blank" rel="noopener">
                  Google Third-Party Access
                </Link>{" "}
                and remove the app, (3) Delete the App Password from{" "}
                <Link href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener">
                  App Passwords
                </Link>.
              </Typography>
            </Paper>
          </Box>
        </AccordionDetails>
      </Accordion>
    </Box>
  )
}

export default EmailSetupGuide
