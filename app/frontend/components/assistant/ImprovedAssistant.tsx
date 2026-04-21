import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Typography,
  List,
  ListItem,
  CircularProgress,
  Divider,
  useTheme,
  Button,
  Paper,
  Chip,
  Avatar,
} from '@mui/material';
import { alpha } from "@mui/material/styles"
import { themeConfig } from "../../../theme/AppTheme"
import {
  Send as SendIcon,
  SmartToy as AssistantIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useCompany } from '../../../backend/context/CompanyContext';
import { useAnalytics } from '../../../backend/context/AnalyticsContext';
import { analyzeChatPrompt, draftEmailResponse, generateBusinessReport } from '../../../backend/services/VertexService';
import {
  buildMetricDictionary,
  calculateDerivedMetrics,
  defaultAssistantRange,
  parseAssistantDateRange,
  tryResolveMetricQuery,
  type AssistantDateRange,
} from './assistantAnalytics';
import {
  loadChatHistory,
  loadLearnedState,
  makeAssistantStorageKey,
  saveChatHistory,
  saveLearnedState,
  tryExtractPreference,
  type StoredMessage,
} from './assistantMemory';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ImprovedAssistantProps {
  onClose?: () => void;
}

const ImprovedAssistant: React.FC<ImprovedAssistantProps> = () => {
  const theme = useTheme();
  const secondaryText = alpha(themeConfig.brandColors.navy, 0.7)
  const hoverBg = alpha(themeConfig.brandColors.navy, 0.04)
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { getBasePath } = useCompany();
  const analytics = useAnalytics();

  const [, setLastEmail] = useState<{ subject: string; body: string } | null>(null);
  const [, setLastReport] = useState<string | null>(null);
  const bundleCacheRef = useRef(new Map<string, any>());

  const basePath = getBasePath();
  const storageKey = useMemo(() => makeAssistantStorageKey(basePath || 'unknown'), [basePath]);
  const learnedRef = useRef(loadLearnedState(storageKey));

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load persisted chat on mount / basePath change
  useEffect(() => {
    const stored = loadChatHistory(storageKey);
    if (!stored.length) return;
    const restored = stored.map((m): Message => ({
      role: m.role,
      content: m.content,
      timestamp: new Date(m.timestamp),
    }));
    setMessages(restored);
    learnedRef.current = loadLearnedState(storageKey);
  }, [storageKey]);

  // Auto-remember defaults (per company/site/subsite) for consistent behaviour.
  useEffect(() => {
    // Default: takings should exclude tips/service (common ops view of "net takings").
    // User can override any time by saying e.g. "/remember takings include tips/service charge".
    const existing = (learnedRef.current.preferences || []).some(p => (p.text || '').toLowerCase().includes('takings'))
    if (existing) return

    const next = {
      preferences: [
        ...(learnedRef.current.preferences || []),
        { timestamp: new Date().toISOString(), text: 'Takings exclude tips and service charge by default.' },
      ].slice(-50),
    }
    learnedRef.current = next
    saveLearnedState(storageKey, next)
  }, [storageKey]);

  // Persist chat updates
  useEffect(() => {
    const serial: StoredMessage[] = messages.slice(-50).map(m => ({
      role: m.role,
      content: m.content,
      timestamp: m.timestamp.toISOString(),
    }));
    saveChatHistory(storageKey, serial);
  }, [messages, storageKey]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    
    const userMsg: Message = {
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      // Lightweight "learning": store explicit preferences/instructions the user states.
      const pref = tryExtractPreference(userMessage);
      if (pref) {
        const next = {
          preferences: [
            ...(learnedRef.current.preferences || []),
            { timestamp: new Date().toISOString(), text: pref },
          ].slice(-50),
        };
        learnedRef.current = next;
        saveLearnedState(storageKey, next);

        const assistantMsg: Message = {
          role: 'assistant',
          content: 'Got it — I’ll remember that.',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMsg]);
        setLastEmail(null);
        setLastReport(null);
        return;
      }

      const resolveRange = (text: string): AssistantDateRange => parseAssistantDateRange(text) || defaultAssistantRange(30);
      const dateRange = resolveRange(userMessage);
      const cacheKey = `${dateRange.startDate}_${dateRange.endDate}`;

      const getAssistantBundle = async () => {
        const cached = bundleCacheRef.current.get(cacheKey);
        if (cached) return cached;

        // Keep this intentionally compact; the assistant does better with a small, well-named snapshot.
        const [bookings, pos, finance, hr, stock, company] = await Promise.all([
          analytics.getBookingsWidgets({ startDate: dateRange.startDate, endDate: dateRange.endDate }).catch(() => null),
          analytics.getPOSWidgets({ startDate: dateRange.startDate, endDate: dateRange.endDate }).catch(() => null),
          analytics.getFinanceWidgets({ startDate: dateRange.startDate, endDate: dateRange.endDate }).catch(() => null),
          analytics.getHRWidgets({ startDate: dateRange.startDate, endDate: dateRange.endDate }).catch(() => null),
          analytics.getStockWidgets({ startDate: dateRange.startDate, endDate: dateRange.endDate }).catch(() => null),
          analytics.getCompanyWidgets().catch(() => null),
        ]);

        const snapshot = {
          dateRange,
          bookings: bookings
            ? {
                kpis: bookings.kpis,
                bookingsByDay: bookings.bookingsByDay?.slice?.(0, 31) || [],
                bookingsByHour: bookings.bookingsByHour?.slice?.(0, 24) || [],
                bookingsBySource: bookings.bookingsBySource?.slice?.(0, 15) || [],
              }
            : null,
          pos: pos
            ? {
                kpis: pos.kpis,
                salesByDay: pos.salesByDay?.slice?.(0, 31) || [],
                salesByHour: pos.salesByHour?.slice?.(0, 24) || [],
                topSellingItems: pos.topSellingItems?.slice?.(0, 10) || [],
              }
            : null,
          finance: finance
            ? {
                kpis: finance.kpis,
                profitLossTrends: finance.profitLossTrends?.slice?.(0, 24) || [],
                expensesByCategory: finance.expensesByCategory?.slice?.(0, 20) || [],
              }
            : null,
          hr: hr ? { kpis: hr.kpis } : null,
          stock: stock ? { kpis: stock.kpis } : null,
          company: company ? { kpis: company.kpis } : null,
        };

        const derived = calculateDerivedMetrics(snapshot, dateRange);
        const metricDictionary = buildMetricDictionary(snapshot, derived);

        const bundle = { snapshot, derived, metricDictionary };
        bundleCacheRef.current.set(cacheKey, bundle);
        return bundle;
      };

      // Slash commands
      if (userMessage.startsWith('/email')) {
        const inputText = userMessage.replace('/email', '').trim();
        const email = await draftEmailResponse(inputText || 'Create a reply to the above context.', {
          tone: 'concise',
        });
        setLastEmail(email);
        const formatted = `Subject: ${email.subject}\n\n${email.body}`;
        
        const assistantMsg: Message = {
          role: 'assistant',
          content: formatted,
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, assistantMsg]);
        setLastReport(null);
        return;
      }
      
      if (userMessage.startsWith('/report')) {
        const request = userMessage.replace('/report', '').trim() || 'Generate a weekly summary.';
        const { snapshot, derived, metricDictionary } = await getAssistantBundle();
        const report = await generateBusinessReport(request, {
          basePath,
          analyticsSnapshot: snapshot,
          derivedMetrics: derived,
          metricDictionary,
          chatHistory: messages.slice(-12).map(m => ({ role: m.role, content: m.content })),
          learnedPreferences: learnedRef.current.preferences || [],
        });
        setLastReport(report);
        
        const assistantMsg: Message = {
          role: 'assistant',
          content: report,
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, assistantMsg]);
        setLastEmail(null);
        return;
      }

      const { snapshot, derived, metricDictionary } = await getAssistantBundle();

      // Fast-path for “what is X” metric questions (less hallucination + more brief).
      const quick = tryResolveMetricQuery(
        userMessage,
        metricDictionary,
        snapshot?.dateRange?.label,
        learnedRef.current.preferences || [],
      );
      if (quick) {
        const assistantMsg: Message = {
          role: 'assistant',
          content: quick,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMsg]);
        setLastEmail(null);
        setLastReport(null);
        return;
      }

      const response = await analyzeChatPrompt(userMessage, {
        basePath,
        analyticsSnapshot: snapshot,
        derivedMetrics: derived,
        metricDictionary,
        chatHistory: messages.slice(-12).map(m => ({ role: m.role, content: m.content })),
        learnedPreferences: learnedRef.current.preferences || [],
      });
      
      const assistantMsg: Message = {
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, assistantMsg]);
      setLastEmail(null);
      setLastReport(null);
    } catch (error) {
      const errorMsg: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatMessage = (content: string) => {
    // Simple formatting for better readability
    return content.split('\n').map((line, index) => (
      <span key={index}>
        {line}
        {index < content.split('\n').length - 1 && <br />}
      </span>
    ));
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Chat Messages */}
      <Box sx={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {messages.length === 0 ? (
          <Box sx={{ 
            flexGrow: 1, 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center', 
            alignItems: 'center',
            p: 3,
            textAlign: 'center',
            bgcolor: themeConfig.brandColors.offWhite,
          }}>
            <Avatar sx={{ 
              width: 64, 
              height: 64, 
              mb: 2, 
              bgcolor: themeConfig.brandColors.navy,
              color: themeConfig.brandColors.offWhite,
              fontSize: '2rem',
            }}>
              <AssistantIcon />
            </Avatar>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, color: themeConfig.brandColors.navy }}>
              AI Assistant
            </Typography>
            <Typography variant="body1" sx={{ mb: 3, maxWidth: 400, color: secondaryText }}>
              I'm here to help you with your business needs. Ask me anything or use special commands like /email or /report.
            </Typography>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
              <Chip 
                label="/email - Draft emails" 
                variant="outlined" 
                sx={{
                  borderColor: alpha(themeConfig.brandColors.navy, 0.35),
                  color: themeConfig.brandColors.navy,
                }}
                size="small"
              />
              <Chip 
                label="/report - Generate reports" 
                variant="outlined" 
                sx={{
                  borderColor: alpha(themeConfig.brandColors.navy, 0.35),
                  color: themeConfig.brandColors.navy,
                }}
                size="small"
              />
              <Chip 
                label="Ask questions" 
                variant="outlined" 
                sx={{
                  borderColor: alpha(themeConfig.brandColors.navy, 0.35),
                  color: themeConfig.brandColors.navy,
                }}
                size="small"
              />
            </Box>
          </Box>
        ) : (
          <Box sx={{ 
            flexGrow: 1, 
            overflowY: 'auto', 
            p: 2,
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: alpha(themeConfig.brandColors.navy, 0.06),
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: alpha(themeConfig.brandColors.navy, 0.25),
              borderRadius: '4px',
              '&:hover': {
                backgroundColor: alpha(themeConfig.brandColors.navy, 0.35),
              },
            },
          }}>
            <List sx={{ p: 0 }}>
              {messages.map((message, index) => (
                <ListItem key={index} sx={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  alignItems: message.role === 'user' ? 'flex-end' : 'flex-start',
                  p: 0,
                  mb: 2,
                }}>
                  <Paper
                    elevation={1}
                    sx={{
                      p: 2,
                      maxWidth: '80%',
                      backgroundColor: message.role === 'user' 
                        ? themeConfig.brandColors.navy 
                        : themeConfig.brandColors.offWhite,
                      color: message.role === 'user' 
                        ? themeConfig.brandColors.offWhite
                        : themeConfig.brandColors.navy,
                      borderRadius: 2,
                      borderTopLeftRadius: message.role === 'user' ? 2 : 8,
                      borderTopRightRadius: message.role === 'user' ? 8 : 2,
                      border: message.role === 'user' ? "none" : `1px solid ${alpha(themeConfig.brandColors.navy, 0.12)}`,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                      <Avatar sx={{ 
                        width: 32, 
                        height: 32,
                        bgcolor: message.role === 'user' 
                          ? themeConfig.colors.primary.light 
                          : themeConfig.colors.primary.light,
                        color: themeConfig.brandColors.offWhite,
                      }}>
                        {message.role === 'user' ? <PersonIcon /> : <AssistantIcon />}
                      </Avatar>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="body1" sx={{ 
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          lineHeight: 1.5,
                        }}>
                          {formatMessage(message.content)}
                        </Typography>
                        <Typography variant="caption" sx={{ 
                          display: 'block', 
                          mt: 1, 
                          opacity: 0.7,
                          fontSize: '0.75rem',
                        }}>
                          {message.timestamp.toLocaleTimeString()}
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                </ListItem>
              ))}
              
              {loading && (
                <ListItem sx={{ 
                  display: 'flex', 
                  justifyContent: 'flex-start',
                  p: 0,
                  mb: 2,
                }}>
                  <Paper
                    elevation={1}
                    sx={{
                      p: 2,
                      backgroundColor: themeConfig.brandColors.offWhite,
                      border: `1px solid ${alpha(themeConfig.brandColors.navy, 0.12)}`,
                      borderRadius: 2,
                      borderTopLeftRadius: 8,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ 
                        width: 32, 
                        height: 32,
                        bgcolor: themeConfig.colors.primary.light,
                        color: themeConfig.brandColors.offWhite,
                      }}>
                        <AssistantIcon />
                      </Avatar>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CircularProgress size={16} />
                        <Typography variant="body2" sx={{ color: secondaryText }}>
                          Thinking...
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                </ListItem>
              )}
            </List>
            <div ref={messagesEndRef} />
          </Box>
        )}
      </Box>

      <Divider />

      {/* Input Section */}
      <Box sx={{ p: 2, bgcolor: themeConfig.brandColors.offWhite, borderTop: `1px solid ${alpha(themeConfig.brandColors.navy, 0.12)}` }}>
        <TextField
          fullWidth
          multiline
          maxRows={4}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message... (/email, /report supported)"
          variant="outlined"
          size="small"
          disabled={loading}
          InputProps={{
            endAdornment: (
              <IconButton
                onClick={handleSend}
                disabled={!input.trim() || loading}
                color="primary"
                sx={{ ml: 1 }}
              >
                <SendIcon />
              </IconButton>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 3,
              backgroundColor: themeConfig.brandColors.offWhite,
            },
          }}
        />
        
        {/* Quick Actions */}
        {messages.length === 0 && (
          <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              size="small"
              variant="outlined"
              onClick={() => setInput('/email Help me draft a professional email')}
              disabled={loading}
              sx={{
                borderColor: alpha(themeConfig.brandColors.navy, 0.35),
                color: themeConfig.brandColors.navy,
                "&:hover": { borderColor: themeConfig.brandColors.navy, bgcolor: hoverBg },
              }}
            >
              Draft Email
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => setInput('/report Generate a business summary')}
              disabled={loading}
              sx={{
                borderColor: alpha(themeConfig.brandColors.navy, 0.35),
                color: themeConfig.brandColors.navy,
                "&:hover": { borderColor: themeConfig.brandColors.navy, bgcolor: hoverBg },
              }}
            >
              Generate Report
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => setInput('Analyze my business data')}
              disabled={loading}
              sx={{
                borderColor: alpha(themeConfig.brandColors.navy, 0.35),
                color: themeConfig.brandColors.navy,
                "&:hover": { borderColor: themeConfig.brandColors.navy, bgcolor: hoverBg },
              }}
            >
              Analyze Data
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default ImprovedAssistant;
