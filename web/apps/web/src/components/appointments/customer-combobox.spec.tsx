import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { Customer, CustomerPage } from "@wappiz/api-client/types/customers"
import { describe, expect, it, vi } from "vitest"
import { render } from "vitest-browser-react"
import { page } from "vitest/browser"

import { CustomerCombobox } from "@/components/appointments/customer-combobox"

const ana: Customer = {
  appointmentCount: 3,
  displayName: "Ana Gómez",
  id: "customer-ana",
  isBlocked: false,
  lateCancelCount: 0,
  name: "Ana Gómez",
  noShowCount: 0,
  phoneNumber: "+573001112233",
}

vi.mock("@/lib/client-api", () => ({
  api: {
    customers: {
      list: vi.fn<() => Promise<CustomerPage>>(() =>
        Promise.resolve({ customers: [], total: 0 })
      ),
    },
  },
}))

type ComboboxProps = { value: string; selectedCustomer?: Customer }

function Harness(props: ComboboxProps) {
  return (
    <QueryClientProvider client={client}>
      <CustomerCombobox invalid={false} onChange={() => {}} {...props} />
    </QueryClientProvider>
  )
}

const client = new QueryClient()

function renderCombobox(props: ComboboxProps) {
  return render(<Harness {...props} />)
}

describe("CustomerCombobox", () => {
  it("shows a selection resolved outside the picker, such as from the URL", async () => {
    await renderCombobox({ selectedCustomer: ana, value: ana.id })

    await expect.element(page.getByRole("combobox")).toHaveValue("Ana Gómez")
  })

  it("ignores a resolved customer that no longer matches the value", async () => {
    await renderCombobox({ selectedCustomer: ana, value: "" })

    await expect.element(page.getByRole("combobox")).toHaveValue("")
  })

  it("clears the box when the parent drops the selection", async () => {
    const screen = await renderCombobox({
      selectedCustomer: ana,
      value: ana.id,
    })
    await expect.element(page.getByRole("combobox")).toHaveValue("Ana Gómez")

    await screen.rerender(<Harness selectedCustomer={ana} value="" />)

    await expect.element(page.getByRole("combobox")).toHaveValue("")
  })
})
