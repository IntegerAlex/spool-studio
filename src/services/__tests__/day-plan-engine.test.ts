import { describe, expect, it } from "vitest"
import {
  type EngineCycle,
  type EngineDesigner,
  isWorkday,
  recommendDay,
} from "../day-plan-engine"

const designers: EngineDesigner[] = [{ id: "d1", name: "Prem", dailyCapacityUnits: 4 }]

function cycle(over: Partial<EngineCycle> = {}): EngineCycle {
  return {
    id: "c1",
    clientId: "cl1",
    clientName: "SH",
    endDate: "2026-10-31",
    reelsTarget: 8,
    postersTarget: 8,
    alreadyPublishedReels: 0,
    alreadyPublishedPosters: 0,
    totalReelsPublished: 0,
    totalPostersPublished: 0,
    ...over,
  }
}

describe("isWorkday", () => {
  it("skips Sunday", () => {
    expect(isWorkday("2026-09-27")).toBe(false)
    expect(isWorkday("2026-09-28")).toBe(true)
  })
})

describe("recommendDay", () => {
  it("returns [] on Sunday", () => {
    expect(
      recommendDay({ cycles: [cycle()], designers, date: "2026-09-27" }),
    ).toEqual([])
  })
  it("fills 4 units as 1 reel + 2 posters", () => {
    const recs = recommendDay({
      cycles: [cycle()],
      designers,
      date: "2026-09-28",
    })
    const units = recs.reduce(
      (s, r) => s + r.qty * (r.kind === "reel" ? 2 : 1),
      0,
    )
    expect(units).toBe(4)
    expect(recs.find((r) => r.kind === "reel")?.qty).toBe(1)
    expect(recs.find((r) => r.kind === "poster")?.qty).toBe(2)
  })
  it("poster-only when reels remaining hit zero", () => {
    const recs = recommendDay({
      cycles: [cycle({ reelsTarget: 0 })],
      designers,
      date: "2026-09-28",
    })
    expect(recs).toHaveLength(1)
    expect(recs[0].kind).toBe("poster")
    expect(recs[0].qty).toBe(4)
  })
  it("puts behind cycles first", () => {
    const ahead = cycle({
      id: "a",
      clientId: "ca",
      clientName: "AA",
      totalReelsPublished: 7,
      totalPostersPublished: 7,
    })
    const behind = cycle({
      id: "b",
      clientId: "cb",
      clientName: "BB",
      reelsTarget: 8,
      totalReelsPublished: 1,
    })
    const recs = recommendDay({
      cycles: [ahead, behind],
      designers,
      date: "2026-09-28",
    })
    expect(recs[0].cycleId).toBe("b")
    expect(recs[0].reason).toContain("behind")
  })
  it("respects custom designer capacity", () => {
    const recs = recommendDay({
      cycles: [cycle()],
      designers: [{ id: "d2", name: "X", dailyCapacityUnits: 6 }],
      date: "2026-09-28",
    })
    const units = recs.reduce(
      (s, r) => s + r.qty * (r.kind === "reel" ? 2 : 1),
      0,
    )
    expect(units).toBe(6)
  })
  it("clamps over-carry to no tasks", () => {
    const recs = recommendDay({
      cycles: [
        cycle({
          reelsTarget: 2,
          alreadyPublishedReels: 3,
          postersTarget: 0,
        }),
      ],
      designers,
      date: "2026-09-28",
    })
    expect(recs).toEqual([])
  })
})
