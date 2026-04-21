"use client"

import React from "react"
import { useLocation } from "react-router-dom"
import { Assignment as AssignmentIcon } from "@mui/icons-material"
import CRUDModal, { isCrudModalHardDismiss } from "../reusable/CRUDModal"
import FinalizeShifts from "./FinalizeShifts"

type FinalizeShiftsModalProps = {
  open: boolean
  onClose: () => void
}

const FinalizeShiftsModal: React.FC<FinalizeShiftsModalProps> = ({ open, onClose }) => {
  const location = useLocation()

  return (
    <CRUDModal
      open={open}
      onClose={(reason) => {
        void location.pathname
        onClose()
        if (isCrudModalHardDismiss(reason)) {
          /* no local entity; parent owns modal state */
        }
      }}
      workspaceFormShortcut={{ crudEntity: "finalizeShifts", crudMode: "view" }}
      title="Finalize Shifts"
      icon={<AssignmentIcon />}
      maxWidth="xl"
      hideDefaultActions
      hideCloseButton={true}
      hideCloseAction={true}
    >
      <FinalizeShifts embedded hideRotaButton />
    </CRUDModal>
  )
}

export default FinalizeShiftsModal

