"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Dialog, DialogTitle, DialogContent, TextField, DialogActions, Button } from "@mui/material"

interface SaveScreenDialogProps {
  open: boolean
  onClose: () => void
  onSave?: (name: string, description: string) => void
  initialName?: string
  initialDescription?: string
}

const SaveScreenDialog: React.FC<SaveScreenDialogProps> = ({
  open,
  onClose,
  onSave,
  initialName = "New Till Screen",
  initialDescription = "",
}) => {
  const [screenName, setScreenName] = useState(initialName)
  const [screenDescription, setScreenDescription] = useState(initialDescription)

  useEffect(() => {
    setScreenName(initialName)
    setScreenDescription(initialDescription)
  }, [initialName, initialDescription])

  const handleSave = () => {
    if (onSave) {
      onSave(screenName, screenDescription)
    }
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Save Till Screen</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Screen Name"
          fullWidth
          variant="outlined"
          value={screenName}
          onChange={(e) => setScreenName(e.target.value)}
          helperText="Enter a name for this till screen"
        />
        <TextField
          margin="dense"
          label="Description"
          fullWidth
          variant="outlined"
          value={screenDescription}
          onChange={(e) => setScreenDescription(e.target.value)}
          multiline
          rows={3}
          helperText="Optional: Add details about this till screen's purpose or usage"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSave} 
          variant="contained" 
          color="primary"
          disabled={!screenName.trim()}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default SaveScreenDialog
