import { describe, expect, it } from "vitest"
import { shouldApplyTransferStockMovement } from "./Stock"

describe("Transfer stock-apply guard", () => {
  it("returns true only for approved transfers not yet adjusted", () => {
    expect(
      shouldApplyTransferStockMovement({
        status: "Approved",
        stockAdjustedAt: undefined,
      }),
    ).toBe(true)

    expect(
      shouldApplyTransferStockMovement({
        status: "Awaiting Approval",
        stockAdjustedAt: undefined,
      }),
    ).toBe(false)

    expect(
      shouldApplyTransferStockMovement({
        status: "Approved",
        stockAdjustedAt: "2026-04-21T10:10:10.000Z",
      }),
    ).toBe(false)
  })
})

