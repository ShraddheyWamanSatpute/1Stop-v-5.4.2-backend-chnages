"use client"

import { themeConfig } from "../../../theme/AppTheme";
import React, { useLayoutEffect, useRef, useState } from 'react'
import { useLocation } from "react-router-dom"
import { useWorkspaceNavigationOptional } from "../../context/WorkspaceNavigationContext"
import { parseWorkspaceRecent } from "../../utils/workspaceShortcuts"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Typography,
  Box,
  useTheme,
  useMediaQuery,
  Slide,
  Button,
  CircularProgress,
} from '@mui/material'
import type { SxProps } from '@mui/material/styles'
import {
  Close as CloseIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  Save as SaveIcon,
  Edit as EditIcon,
  GetApp as DownloadIcon,
  PictureAsPdf as PdfIcon,
  TableChart as CsvIcon,
} from '@mui/icons-material'
import { TransitionProps } from '@mui/material/transitions'
import { alpha } from '@mui/material/styles'

export type CRUDModalCloseReason = "backdropClick" | "escapeKeyDown" | "closeButton"

/** Use in page `onClose` handlers: clear entity / reset only when the user used the header close control. */
export function isCrudModalHardDismiss(reason?: CRUDModalCloseReason): boolean {
  return reason === "closeButton"
}

export type CRUDModalWorkspaceFormShortcut = {
  crudEntity: string
  crudMode: "create" | "edit" | "view"
  id?: string
  itemLabel?: string
}

function buildWorkspaceCrudSearch(input: CRUDModalWorkspaceFormShortcut): string {
  const s = new URLSearchParams()
  s.set("crudEntity", input.crudEntity)
  s.set("crudMode", input.crudMode)
  if (input.id) s.set("id", input.id)
  if (input.itemLabel) s.set("itemLabel", input.itemLabel)
  return s.toString()
}

/** Call after a successful save so a stale workspace draft is not restored from Recents. */
export function removeWorkspaceFormDraft(pathname: string, shortcut: CRUDModalWorkspaceFormShortcut) {
  const parsed = parseWorkspaceRecent(pathname, buildWorkspaceCrudSearch(shortcut))
  if (!parsed) return
  try {
    sessionStorage.removeItem(`workspaceFormDraft:${parsed.key}`)
  } catch {
    // ignore
  }
}

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement<any, any>
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />
})

export type CRUDModalFormRef = {
  submit: () => void | Promise<void>
  getWorkspaceDraft?: () => unknown
  applyWorkspaceDraft?: (draft: unknown) => void
}

interface CRUDModalProps {
  open: boolean
  onClose?: (reason?: CRUDModalCloseReason) => void
  title?: string
  subtitle?: string
  icon?: React.ReactNode
  children: React.ReactNode
  actions?: React.ReactNode
  topBarActions?: React.ReactNode // Actions to show in the top bar (DialogTitle)
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false
  fullWidth?: boolean
  disableEscapeKeyDown?: boolean
  disableBackdropClick?: boolean
  hideCloseButton?: boolean // Hides the top-right "X" icon
  hideCloseAction?: boolean // Hides the footer "Close" button in view mode
  // Additional properties for CRUD functionality
  mode?: 'create' | 'edit' | 'view'
  onSave?: (data?: any) => void | Promise<void>
  onEdit?: () => void
  saveButtonText?: string
  editButtonText?: string
  cancelButtonText?: string
  loading?: boolean
  hideDefaultActions?: boolean
  /** When true, default footer Save is hidden (form may use its own submit). */
  hideSaveButton?: boolean
  disabled?: boolean
  /** When set, backdrop / Escape dismiss registers Recents and keeps dialog content mounted so in-modal form state survives. */
  workspaceFormShortcut?: CRUDModalWorkspaceFormShortcut | null
  // Form ref for integration
  formRef?: React.RefObject<CRUDModalFormRef | null>
  // Export functionality for view mode
  onExportCSV?: () => void
  onExportPDF?: () => void
  // Styling hook for callers that need to override stacking context (e.g. AppBar z-index).
  dialogSx?: SxProps
}

const CRUDModal: React.FC<CRUDModalProps> = ({
  open,
  onClose,
  title,
  subtitle,
  icon,
  children,
  actions,
  topBarActions,
  maxWidth = 'md',
  fullWidth,
  disableEscapeKeyDown = false,
  disableBackdropClick = false,
  hideCloseButton = false,
  hideCloseAction = false,
  mode,
  onSave,
  onEdit,
  saveButtonText = 'Save',
  editButtonText = 'Edit',
  cancelButtonText = undefined,
  loading = false,
  hideDefaultActions = false,
  hideSaveButton = false,
  disabled = false,
  workspaceFormShortcut,
  formRef,
  onExportCSV,
  onExportPDF,
  dialogSx,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const contentRef = useRef<HTMLDivElement | null>(null)
  const retainMountedContentRef = useRef(false)
  const location = useLocation()
  const workspaceNav = useWorkspaceNavigationOptional()

  if (open && workspaceFormShortcut) {
    retainMountedContentRef.current = true
  }

  const handleToggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  const resolveWorkspaceShortcut = () => {
    if (!workspaceFormShortcut) return null
    return parseWorkspaceRecent(location.pathname, buildWorkspaceCrudSearch(workspaceFormShortcut))
  }

  const finalizeDismiss = (reason: CRUDModalCloseReason) => {
    setIsFullscreen(false)
    const shortcut = resolveWorkspaceShortcut()

    if (reason === "closeButton") {
      if (workspaceFormShortcut) {
        retainMountedContentRef.current = false
      }
      if (shortcut) {
        try {
          sessionStorage.removeItem(`workspaceFormDraft:${shortcut.key}`)
        } catch {
          // ignore
        }
      }
    } else {
      if (shortcut && formRef?.current?.getWorkspaceDraft) {
        try {
          const draft = formRef.current.getWorkspaceDraft()
          sessionStorage.setItem(`workspaceFormDraft:${shortcut.key}`, JSON.stringify(draft))
        } catch {
          // ignore
        }
      }
      if (shortcut && workspaceNav?.addRecent) {
        workspaceNav.addRecent(shortcut)
      }
    }

    onClose?.(reason)
  }

  useLayoutEffect(() => {
    if (!open || !workspaceFormShortcut) return
    if (!formRef?.current?.applyWorkspaceDraft) return
    const shortcut = parseWorkspaceRecent(location.pathname, buildWorkspaceCrudSearch(workspaceFormShortcut))
    if (!shortcut) return
    const raw = sessionStorage.getItem(`workspaceFormDraft:${shortcut.key}`)
    if (!raw) return
    queueMicrotask(() => {
      try {
        formRef.current?.applyWorkspaceDraft?.(JSON.parse(raw))
      } catch {
        // ignore
      }
    })
  }, [
    open,
    location.pathname,
    workspaceFormShortcut?.crudEntity,
    workspaceFormShortcut?.crudMode,
    workspaceFormShortcut?.id,
    workspaceFormShortcut?.itemLabel,
    formRef,
  ])

  const handleDialogClose = (_event: unknown, reason: "backdropClick" | "escapeKeyDown") => {
    if (disableBackdropClick && reason === "backdropClick") return
    if (disableEscapeKeyDown && reason === "escapeKeyDown") return
    finalizeDismiss(reason)
  }

  const handleCloseButton = () => {
    finalizeDismiss("closeButton")
  }

  const handleSave = async () => {
    if (!onSave) return
    
    try {
      setIsSaving(true)
      
      // Check for exposed form submit function (for TimeOffCRUDForm, etc.)
      if ((window as any).__timeOffFormSubmit) {
        (window as any).__timeOffFormSubmit()
        return
      }
      // TabbedBookingForm registers this global while the modal is open (create/edit)
      if (typeof (window as any).bookingFormSubmit === "function") {
        ;(window as any).bookingFormSubmit()
        return
      }

      // Use formRef if available
      if (formRef && formRef.current) {
        await Promise.resolve(formRef.current.submit())
      } else {
        // Fallback: look for a form *inside this modal* (avoid grabbing unrelated page forms)
        const formElement = contentRef.current?.querySelector('form')
        if (formElement) {
          // Trigger form submission which will call the form's handleSubmit
          const submitEvent = new Event('submit', { bubbles: true, cancelable: true })
          formElement.dispatchEvent(submitEvent)
        } else {
          // If caller manages state itself (common), allow onSave() with no args.
          if (onSave.length === 0) {
            await (onSave as any)()
            return
          }

          // Last resort: call onSave with empty data (legacy behavior)
          console.warn('No form ref or submit button found; calling onSave with empty data')
          await onSave({})
        }
      }
    } catch (error) {
      console.error('Error saving:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleEdit = () => {
    if (onEdit) {
      onEdit()
    }
  }

  // Generate default actions based on mode
  const getDefaultActions = () => {
    if (hideDefaultActions) return actions
    
    const defaultActions = []

    // IMPORTANT UX RULE:
    // - No footer Cancel / Close buttons.
    // - Close is always via the top-right "X".

    // Mode-specific buttons
    if (mode === 'create' || mode === 'edit') {
      if (onSave && !hideSaveButton) {
        defaultActions.push(
          <Button
            key="save"
            onClick={handleSave}
            variant="contained"
            startIcon={isSaving || loading ? <CircularProgress size={16} /> : <SaveIcon />}
            disabled={isSaving || loading || disabled}
            sx={{
              bgcolor: themeConfig.brandColors.navy,
              color: themeConfig.brandColors.offWhite,
              '&:hover': { bgcolor: themeConfig.brandColors.navy },
            }}
          >
            {isSaving ? 'Saving...' : (saveButtonText || 'Save')}
          </Button>
        )
      }
    }
    
    // If custom actions are provided, merge them with default actions.
    // Use Children.toArray to ensure stable keys and avoid React "unique key" warnings.
    if (actions) {
      const customActions = React.Children.toArray(actions)
      return [...defaultActions, ...customActions]
    }
    
    return defaultActions
  }

  return (
    <Dialog
      open={open}
      onClose={
        disableBackdropClick && disableEscapeKeyDown
          ? undefined
          : handleDialogClose
      }
      keepMounted={Boolean(workspaceFormShortcut && retainMountedContentRef.current)}
      TransitionComponent={Transition}
      maxWidth={isFullscreen ? false : maxWidth}
      fullWidth={isFullscreen ? false : fullWidth ?? true}
      fullScreen={isFullscreen || isMobile}
      disableEscapeKeyDown={disableEscapeKeyDown}
      sx={dialogSx}
      PaperProps={{
        sx: {
          borderRadius: isFullscreen ? 0 : 2,
          minHeight: isFullscreen ? '100vh' : 'auto',
          maxHeight: isFullscreen ? '100vh' : '90vh',
          width: isFullscreen ? '100vw' : 'auto',
          margin: isFullscreen ? 0 : 2,
        },
      }}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          p: 2,
          pb: 1,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: themeConfig.brandColors.navy,
          color: themeConfig.brandColors.offWhite,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, flex: 1 }}>
            {icon && (
              <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                {icon}
              </Box>
            )}
            <Box sx={{ minWidth: 0, flex: 1 }}>
              {title && (
                <Typography
                  variant="h6"
                  component="div"
                  sx={{
                    fontWeight: 600,
                    fontSize: '1.1rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {title}
                </Typography>
              )}
              {subtitle && (
                <Typography
                  variant="body2"
                  sx={{
                    opacity: 0.9,
                    fontSize: '0.875rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {subtitle}
                </Typography>
              )}
            </Box>
          </Box>
          
          {/* Action Buttons */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
            {/* Top bar actions (custom buttons) */}
            {topBarActions && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mr: 1 }}>
                {topBarActions}
              </Box>
            )}
            {/* View mode: put Edit in the top bar (no footer buttons) */}
            {mode === 'view' && onEdit && (
              <Button
                onClick={handleEdit}
                variant="contained"
                startIcon={<EditIcon />}
                size="small"
                disabled={loading || disabled}
                sx={{
                  mr: 0.5,
                  bgcolor: themeConfig.brandColors.offWhite,
                  color: themeConfig.brandColors.navy,
                  '&:hover': { bgcolor: alpha(themeConfig.brandColors.offWhite, 0.92) },
                }}
              >
                {editButtonText}
              </Button>
            )}
            {/* Export buttons for view mode */}
            {mode === 'view' && (onExportCSV || onExportPDF) && (
              <>
                {onExportCSV && (
                  <IconButton
                    onClick={onExportCSV}
                    size="small"
                    title="Export as CSV"
                    sx={{
                      color: 'inherit',
                      '&:hover': {
                        bgcolor: alpha(theme.palette.primary.contrastText, 0.1),
                      },
                    }}
                  >
                    <CsvIcon fontSize="small" />
                  </IconButton>
                )}
                {onExportPDF && (
                  <IconButton
                    onClick={onExportPDF}
                    size="small"
                    title="Export as PDF"
                    sx={{
                      color: 'inherit',
                      '&:hover': {
                        bgcolor: alpha(theme.palette.primary.contrastText, 0.1),
                      },
                    }}
                  >
                    <PdfIcon fontSize="small" />
                  </IconButton>
                )}
              </>
            )}
            {!isMobile && (
              <IconButton
                onClick={handleToggleFullscreen}
                size="small"
                sx={{
                  color: 'inherit',
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.contrastText, 0.1),
                  },
                }}
              >
                {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
              </IconButton>
            )}
            {!hideCloseButton && (
              <IconButton
                onClick={handleCloseButton}
                size="small"
                sx={{
                  color: 'inherit',
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.contrastText, 0.1),
                  },
                }}
              >
                <CloseIcon />
              </IconButton>
            )}
          </Box>
        </Box>
      </DialogTitle>

      {/* Content */}
      <DialogContent
        sx={{
          p: 0,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <Box
          ref={contentRef}
          sx={{
            p: 3,
            flex: 1,
            overflow: 'auto',
            '&::-webkit-scrollbar': {
              width: 8,
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: alpha(theme.palette.primary.main, 0.08),
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: alpha(theme.palette.primary.main, 0.30),
              borderRadius: 4,
            },
          }}
        >
          {children}
        </Box>
      </DialogContent>

      {/* Actions */}
      {(actions ||
        (!hideDefaultActions && mode !== 'view' && !(hideSaveButton && onSave))) && (
        <DialogActions
          sx={{
            p: 2,
            pt: 1,
            borderTop: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
            gap: 1,
          }}
        >
          {(() => {
            const actions = getDefaultActions()
            return actions
          })()}
        </DialogActions>
      )}
    </Dialog>
  )
}

export default CRUDModal

