"use client"

import React, { useState, useEffect } from "react"
import { Box, useMediaQuery, useTheme, Drawer, IconButton, Typography, Button } from "@mui/material"
import { Menu as MenuIcon, ArrowBack as ArrowBackIcon, Chat as ChatIcon, Add as AddIcon } from "@mui/icons-material"
import { alpha } from "@mui/material/styles"
import { themeConfig } from "../../theme/AppTheme"
import { useMessenger } from "../../backend/context/MessengerContext"
import { useCompany } from "../../backend/context/CompanyContext"
import ChatSidebar from "../components/messenger/ChatSidebar"
import ChatArea from "../components/messenger/ChatArea"
import NewChatDialog from "../components/messenger/NewChatDialog"
import ContactsManager from "../components/messenger/ContactsManager"
import EmptyStateCard from "../components/reusable/EmptyStateCard"

const SIDEBAR_WIDTH = 320
const COLLAPSED_SIDEBAR_WIDTH = 72

const Messenger: React.FC = () => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down("md"))
  const secondaryText = alpha(themeConfig.brandColors.navy, 0.7)
  const [showNewChatDialog, setShowNewChatDialog] = useState(false)
  const [showContactsManager, setShowContactsManager] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile)
  const [sidebarCollapsed] = useState(false)
  
  let messengerState, setActiveChat, refreshChats, createChat, companyState, hasPermission
  
  try {
    const messenger = useMessenger()
    messengerState = messenger?.state || null
    setActiveChat = messenger?.setActiveChat || (() => {})
    refreshChats = messenger?.refreshChats || (async () => {})
    createChat = messenger?.createChat || (async () => null)
  } catch (error) {
    // Error in useMessenger - handled by context
    // Return error UI immediately
    return (
      <Box sx={{ p: 3, textAlign: 'center', minHeight: '50vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <Typography variant="h6" color="error">
          Error: Messenger context failed to load
        </Typography>
        <Typography variant="body2" sx={{ mt: 2 }}>
          {error instanceof Error ? error.message : String(error)}
        </Typography>
      </Box>
    )
  }
  
  try {
    const company = useCompany()
    companyState = company?.state || null
    hasPermission = company?.hasPermission || (() => false)
  } catch (error) {
    // Error in useCompany - handled by context
    return (
      <Box sx={{ p: 3, textAlign: 'center', minHeight: '50vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <Typography variant="h6" color="error">
          Error: Company context failed to load
        </Typography>
        <Typography variant="body2" sx={{ mt: 2 }}>
          {error instanceof Error ? error.message : String(error)}
        </Typography>
      </Box>
    )
  }
  
  // Show empty state if contexts aren't ready yet (UI renders immediately)
  if (!companyState || !messengerState) {
    return (
      <Box sx={{ p: 3, textAlign: 'center', minHeight: '50vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <EmptyStateCard
          icon={ChatIcon}
          title="Loading Messenger..."
          description="Please wait while the messenger initializes."
        />
      </Box>
    )
  }

  // Messenger's internal sidebar width (for chat list)
  const messengerSidebarWidth = sidebarCollapsed ? COLLAPSED_SIDEBAR_WIDTH : SIDEBAR_WIDTH

  const handleChatSelect = (chatId: string) => {
    setActiveChat(chatId)
    if (isMobile) {
      setSidebarOpen(false)
    }
  }

  const handleNewChat = () => {
    setShowNewChatDialog(true)
  }

  const handleShowContacts = () => {
    setShowContactsManager(true)
  }

  const handleChatCreated = async (chatId: string) => {
    // Refresh chats to ensure the new chat appears in the sidebar
    await refreshChats()
    
    // Set the newly created chat as active
    setActiveChat(chatId)
    setShowNewChatDialog(false)
    if (isMobile) {
      setSidebarOpen(false)
    }
  }

  const handleStartChatFromContacts = async (userId: string) => {
    const contactUser = messengerState?.users?.find((user) => user.uid === userId)
    const contactName = contactUser
      ? `${contactUser.firstName || ""} ${contactUser.lastName || ""}`.trim() || contactUser.email
      : "Direct Chat"

    const chatId = await createChat(contactName, [userId], "direct", {
      isPrivate: true,
      isArchived: false,
    })

    if (!chatId) return

    await refreshChats()
    setActiveChat(chatId)
    setShowContactsManager(false)
    if (isMobile) {
      setSidebarOpen(false)
    }
  }

  const handleBackToChats = () => {
    setActiveChat(null)
    setSidebarOpen(true)
  }

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  // Sidebar collapse toggle removed from header actions; keep state for future use if needed

  // Show message if no company selected (this check comes first)
  // Note: companyState might be an object but companyID might be null/undefined
  const hasCompany = companyState?.companyID
  if (!hasCompany) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "50vh",
          p: 3,
        }}
      >
        <Typography variant="h5" gutterBottom>
          Messenger
        </Typography>
        <Typography variant="body1" sx={{ color: secondaryText }} textAlign="center">
          Please select a company to access messaging.
        </Typography>
      </Box>
    )
  }

  // Note: MessengerProvider might be lazy loaded, so messengerState might be fallback initially
  // That's okay - the component will work once the provider loads

  // Check if user has permission to access messenger
  const hasViewPermission = hasPermission("messenger", "chat", "view")
  if (!hasViewPermission) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "50vh",
          p: 3,
        }}
      >
        <Typography variant="h5" gutterBottom>
          Access Restricted
        </Typography>
        <Typography variant="body1" sx={{ color: secondaryText }} textAlign="center">
          You don't have permission to access the messenger. Please contact your administrator.
        </Typography>
      </Box>
    )
  }

  const sidebarContent = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <ChatSidebar
        onChatSelect={handleChatSelect}
        onNewChat={hasPermission("messenger", "chat", "edit") ? handleNewChat : () => {}}
        onShowContacts={hasPermission("messenger", "contacts", "view") ? handleShowContacts : () => {}}
        selectedChatId={messengerState.activeChat?.id || undefined}
      />
    </Box>
  )
  
  const canCreateChat = hasPermission("messenger", "chat", "edit")

  return (
    <Box sx={{ width: "100%", height: "100%", minHeight: 0 }}>
      {/* Main Content */}
      <Box
        sx={{
          // Full-bleed inside MainLayout (MainLayout handles top-bar offset + no padding on /Messenger)
          borderRadius: 0,
          overflow: "hidden",
          border: 0,
          bgcolor: "transparent",
          height: "100%",
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Mobile in-panel header (keeps controls consistent without a second AppBar) */}
        {isMobile && (
          <Box
            sx={{
              px: 1.5,
              py: 1,
              display: "flex",
              alignItems: "center",
              gap: 1,
              bgcolor: themeConfig.brandColors.navy,
              color: themeConfig.brandColors.offWhite,
              borderBottom: 1,
              borderColor: alpha(themeConfig.brandColors.offWhite, 0.15),
            }}
          >
            {messengerState.activeChat ? (
              <>
                <IconButton
                  size="small"
                  onClick={handleBackToChats}
                  sx={{ color: themeConfig.brandColors.offWhite }}
                >
                  <ArrowBackIcon />
                </IconButton>
                <Typography variant="subtitle1" sx={{ flex: 1, fontWeight: 600 }}>
                  {messengerState.activeChat?.name || "Chat"}
                </Typography>
              </>
            ) : (
              <>
                <IconButton
                  size="small"
                  onClick={toggleSidebar}
                  sx={{ color: themeConfig.brandColors.offWhite }}
                >
                  <MenuIcon />
                </IconButton>
                <Typography variant="subtitle1" sx={{ flex: 1, fontWeight: 600 }}>
                  Messages
                </Typography>
              </>
            )}
            {canCreateChat && (
              <IconButton
                size="small"
                onClick={handleNewChat}
                sx={{ color: themeConfig.brandColors.offWhite }}
              >
                <AddIcon />
              </IconButton>
            )}
          </Box>
        )}

        <Box sx={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
        {/* Sidebar */}
        {!isMobile ? (
          <Box
            sx={{
              width: messengerSidebarWidth,
              flexShrink: 0,
              borderRight: 1,
              borderColor: "divider",
              bgcolor: "background.paper",
              height: "100%",
              transition: (theme) => theme.transitions.create("width", { duration: theme.transitions.duration.shortest }),
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {sidebarContent}
          </Box>
        ) : (
          <Drawer
            variant="temporary"
            anchor="left"
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            ModalProps={{
              keepMounted: true, // Better open performance on mobile
            }}
            sx={{
              "& .MuiDrawer-paper": {
                width: SIDEBAR_WIDTH,
                boxSizing: "border-box",
                height: "100%",
              },
            }}
          >
            {sidebarContent}
          </Drawer>
        )}

        {/* Chat Area */}
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, height: "100%", overflow: "hidden" }}>
          {messengerState.activeChat ? (
            <ChatArea
              chat={messengerState.activeChat}
              onBack={isMobile ? handleBackToChats : undefined}
              showBackButton={isMobile}
            />
          ) : (
            <Box
              sx={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                p: 3,
                bgcolor: themeConfig.brandColors.offWhite,
              }}
            >
              <EmptyStateCard
                icon={ChatIcon}
                title="Welcome to Messenger"
                description="Select a conversation from the sidebar to start messaging, or create a new chat to get started."
                action={
                  <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", justifyContent: "center", mt: 2 }}>
                    {hasPermission("messenger", "chat", "edit") && (
                      <Button
                        variant="contained"
                        onClick={handleNewChat}
                        sx={{
                          borderRadius: 2,
                          bgcolor: themeConfig.brandColors.navy,
                          color: themeConfig.brandColors.offWhite,
                          boxShadow: "none",
                          "&:hover": {
                            bgcolor: themeConfig.colors.primary.light,
                            boxShadow: "none",
                          },
                        }}
                      >
                        Start New Chat
                      </Button>
                    )}
                    {hasPermission("messenger", "contacts", "view") && (
                      <Button
                        variant="outlined"
                        onClick={handleShowContacts}
                        sx={{
                          borderRadius: 2,
                          borderColor: alpha(themeConfig.brandColors.navy, 0.35),
                          color: themeConfig.brandColors.navy,
                          "&:hover": {
                            borderColor: themeConfig.brandColors.navy,
                            bgcolor: alpha(themeConfig.brandColors.navy, 0.04),
                          },
                        }}
                      >
                        View Contacts
                      </Button>
                    )}
                  </Box>
                }
              />
            </Box>
          )}
        </Box>
      </Box>
      </Box>

      {/* Dialogs */}
      {hasPermission("messenger", "chat", "edit") && (
        <NewChatDialog
          open={showNewChatDialog}
          onClose={() => setShowNewChatDialog(false)}
          onChatCreated={handleChatCreated}
        />
      )}

      {hasPermission("messenger", "contacts", "view") && (
        <ContactsManager
          open={showContactsManager}
          onClose={() => setShowContactsManager(false)}
          onStartChat={handleStartChatFromContacts}
        />
      )}
    </Box>
  )
}

export default Messenger
