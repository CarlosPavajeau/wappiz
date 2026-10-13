import type { Appointment } from "@wappiz/api-client/types/appointments"
import { describe, expect, it } from "vitest"

import { groupCustomerAppointments } from "@/components/appointments/calendar-config"

function apt(id: string, startsAt: Date): Appointment {
  return {
    customerName: "Ana",
    endsAt: new Date(startsAt.getTime() + 30 * 60_000).toISOString(),
    fieldResponses: [],
    id,
    priceAtBooking: 0,
    resourceName: "Silla 1",
    serviceName: "Corte",
    startsAt: startsAt.toISOString(),
    status: "confirmed",
  }
}

const now = new Date(2026, 9, 12, 15, 0)
const at = (day: number, hour: number) => new Date(2026, 9, day, hour, 0)

describe("groupCustomerAppointments", () => {
  it("lists upcoming days forward from today and past days backwards", () => {
    const groups = groupCustomerAppointments(
      [
        apt("next-week", at(19, 9)),
        apt("last-week", at(5, 9)),
        apt("today-late", at(12, 18)),
        apt("yesterday", at(11, 9)),
        apt("today-early", at(12, 8)),
      ],
      now
    )

    expect(
      groups.upcoming.map((group) => group.apts.map((a) => a.id))
    ).toStrictEqual([["today-early", "today-late"], ["next-week"]])
    expect(
      groups.past.map((group) => group.apts.map((a) => a.id))
    ).toStrictEqual([["yesterday"], ["last-week"]])
  })

  it("keeps earlier appointments of today in the upcoming section", () => {
    const groups = groupCustomerAppointments([apt("morning", at(12, 8))], now)

    expect(groups.upcoming).toHaveLength(1)
    expect(groups.past).toHaveLength(0)
  })

  it("returns empty sections without appointments", () => {
    expect(groupCustomerAppointments([], now)).toStrictEqual({
      past: [],
      upcoming: [],
    })
  })
})
