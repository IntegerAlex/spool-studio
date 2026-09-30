import { describe, expect, it } from "vitest"
import { distributeRemaining } from "../plan-utils"

describe("distributeRemaining", () => {
  const ends = ["2026-09-07", "2026-09-14", "2026-09-21", "2026-09-28"]
  it("subtracts carry-in and zeroes elapsed weeks", () => {
    expect(distributeRemaining(8, 3, ends, "2026-09-10")).toEqual([0, 2, 2, 1])
  })
  it("clamps over-carry to zero", () => {
    expect(distributeRemaining(4, 9, ends, "2026-09-01")).toEqual([0, 0, 0, 0])
  })
  it("all-zero when cycle fully elapsed", () => {
    expect(distributeRemaining(8, 0, ends, "2026-10-01")).toEqual([0, 0, 0, 0])
  })
})
