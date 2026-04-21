/**
 * ESS Emergency Contacts Page
 * 
 * Manage emergency contacts:
 * - View existing contacts
 * - Add/Edit/Delete contacts
 */

"use client"

import React, { useState } from "react"
import {
  Box,
  Card,
  Typography,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Avatar,
  Divider,
  useTheme,
} from "@mui/material"
import {
  ContactPhone as ContactIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Add as AddIcon,
} from "@mui/icons-material"
import { useESS } from "../../backend/context/MobileContext"
import { EmptyState } from "../components"
import type { ESSEmergencyContact } from "../../backend/interfaces"

const ESSEmergencyContacts: React.FC = () => {
  const theme = useTheme()
  const { state, updateEmergencyContacts } = useESS()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<ESSEmergencyContact | null>(null)
  const [formData, setFormData] = useState<Partial<ESSEmergencyContact>>({
    name: "",
    relationship: "",
    phone: "",
    email: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Handle open add dialog
  const handleOpenAdd = () => {
    setEditingContact(null)
    setFormData({ name: "", relationship: "", phone: "", email: "" })
    setDialogOpen(true)
  }

  // Handle open edit dialog
  const handleOpenEdit = (contact: ESSEmergencyContact) => {
    setEditingContact(contact)
    setFormData({
      name: contact.name,
      relationship: contact.relationship,
      phone: contact.phone,
      email: contact.email || "",
    })
    setDialogOpen(true)
  }

  // Handle save
  const handleSave = async () => {
    if (!formData.name || !formData.phone) return

    setIsSubmitting(true)
    try {
      let updatedContacts: ESSEmergencyContact[]

      if (editingContact) {
        // Update existing contact
        updatedContacts = state.emergencyContacts.map((c: ESSEmergencyContact) =>
          c.id === editingContact.id
            ? { ...c, ...formData } as ESSEmergencyContact
            : c
        )
      } else {
        // Add new contact
        const newContact: ESSEmergencyContact = {
          id: `ec-${Date.now()}`,
          name: formData.name || "",
          relationship: formData.relationship || "",
          phone: formData.phone || "",
          email: formData.email,
          isPrimary: state.emergencyContacts.length === 0,
        }
        updatedContacts = [...state.emergencyContacts, newContact]
      }

      await updateEmergencyContacts(updatedContacts)
      setDialogOpen(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle delete
  const handleDelete = async (contactId: string) => {
    const updatedContacts = state.emergencyContacts.filter((c: ESSEmergencyContact) => c.id !== contactId)
    await updateEmergencyContacts(updatedContacts)
  }

  return (
    <Box sx={{ 
      p: { xs: 1.5, sm: 2 },
      pb: { xs: 12, sm: 4 },
      maxWidth: "100%",
      overflowX: "hidden",
    }}>
      {/* Add Button - Positioned just below header */}
      <Box sx={{ 
        display: "flex", 
        justifyContent: "flex-end", 
        mb: { xs: 2, sm: 2.5 },
        mt: { xs: 0.5, sm: 1 },
      }}>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={handleOpenAdd}
          sx={{ 
            borderRadius: 2,
            minWidth: "auto",
            px: 1.5,
            fontSize: { xs: "0.75rem", sm: "0.875rem" },
            minHeight: { xs: 36, sm: 40 },
          }}
        >
          Add
        </Button>
      </Box>

      {/* Contacts List */}
      {state.emergencyContacts.length > 0 ? (
        <Card sx={{ borderRadius: 3 }}>
          <List disablePadding>
            {state.emergencyContacts.map((contact: ESSEmergencyContact, index: number) => (
              <React.Fragment key={contact.id}>
                <ListItem sx={{ py: 2 }}>
                  <ListItemIcon>
                    <Avatar sx={{ bgcolor: theme.palette.primary.light }}>
                      <PersonIcon color="primary" />
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                          {contact.name}
                        </Typography>
                        {contact.isPrimary && (
                          <Typography
                            variant="caption"
                            sx={{
                              bgcolor: "primary.main",
                              color: "primary.contrastText",
                              px: 1,
                              py: 0.25,
                              borderRadius: 1,
                              fontWeight: 500,
                            }}
                          >
                            Primary
                          </Typography>
                        )}
                      </Box>
                    }
                    secondary={
                      <Box sx={{ mt: 0.5 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            {contact.relationship}
                          </Typography>
                        </Box>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5 }}>
                          <PhoneIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                          <Typography variant="body2">{contact.phone}</Typography>
                        </Box>
                        {contact.email && (
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.25 }}>
                            <EmailIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                            <Typography variant="body2">{contact.email}</Typography>
                          </Box>
                        )}
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton size="small" onClick={() => handleOpenEdit(contact)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(contact.id)}
                      sx={{ ml: 0.5 }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
                {index < state.emergencyContacts.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </Card>
      ) : (
          <EmptyState
            icon={<ContactIcon sx={{ fontSize: 48 }} />}
            title="No Emergency Contacts"
            description="Add emergency contacts so your employer can reach someone in case of an emergency."
          />
      )}

      {/* Add/Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {editingContact ? "Edit Contact" : "Add Emergency Contact"}
          <IconButton onClick={() => setDialogOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <TextField
              label="Full Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Relationship"
              value={formData.relationship}
              onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
              placeholder="e.g., Spouse, Parent, Sibling"
              fullWidth
            />
            <TextField
              label="Phone Number"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Email (Optional)"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              type="email"
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!formData.name || !formData.phone || isSubmitting}
          >
            {isSubmitting ? "Saving..." : editingContact ? "Update" : "Add Contact"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default ESSEmergencyContacts