import { onSchedule } from "firebase-functions/v2/scheduler"
import { processApprovedActions } from "./opsActions"

export const opsProcessActions = onSchedule("every 10 minutes", async () => {
  await processApprovedActions(5)
})

