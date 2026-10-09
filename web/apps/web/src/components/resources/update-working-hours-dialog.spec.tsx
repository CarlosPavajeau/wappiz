import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { WorkingHour } from "@wappiz/api-client/types/resources"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { render } from "vitest-browser-react"
import { page } from "vitest/browser"

import { UpdateWorkingHoursDialog } from "@/components/resources/update-working-hours-dialog"
import { VIEWPORTS } from "@/test/viewports"

vi.mock("@/lib/client-api", () => ({
  api: { resources: { updateWorkingHours: vi.fn<() => Promise<void>>() } },
}))
vi.mock("sonner", () => ({
  toast: { error: vi.fn<() => void>(), success: vi.fn<() => void>() },
}))

// Every day split into three shifts: the tallest schedule a user can
// reasonably build, and the one that used to push the save button away.
const SHIFTS = [
  ["08:00", "10:00"],
  ["11:00", "13:00"],
  ["14:00", "18:00"],
] as const
const busyWeek: WorkingHour[] = Array.from({ length: 7 }, (_, dayOfWeek) =>
  SHIFTS.map(([startTime, endTime], shift) => ({
    dayName: String(dayOfWeek),
    dayOfWeek,
    endTime,
    id: `${dayOfWeek}-${shift}`,
    isActive: true,
    startTime,
  }))
).flat()

describe("UpdateWorkingHoursDialog", () => {
  describe.each(VIEWPORTS)("on $name", ({ height, width }) => {
    beforeEach(async () => {
      await page.viewport(width, height)
    })

    it("scrolls the day list and keeps the title and save action on screen", async () => {
      await render(
        <QueryClientProvider client={new QueryClient()}>
          <UpdateWorkingHoursDialog
            defaultOpen
            resourceId="resource-1"
            workingHours={busyWeek}
          />
        </QueryClientProvider>
      )

      const list = page.getByRole("list", { name: "Horario semanal" })
      const title = page.getByRole("heading", {
        name: "Editar horario semanal",
      })
      const save = page.getByRole("button", { name: "Guardar" })
      const days = list.element()

      // Without overflow this spec would pass without exercising the scroll.
      expect(days.scrollHeight).toBeGreaterThan(days.clientHeight)
      await expect.element(title).toBeInViewport({ ratio: 1 })
      await expect.element(save).toBeInViewport({ ratio: 1 })

      days.scrollTop = days.scrollHeight

      await expect
        .element(page.getByRole("checkbox", { name: "sábado" }))
        .toBeInViewport()
      await expect.element(title).toBeInViewport({ ratio: 1 })
      await expect.element(save).toBeInViewport({ ratio: 1 })
    })
  })
})
