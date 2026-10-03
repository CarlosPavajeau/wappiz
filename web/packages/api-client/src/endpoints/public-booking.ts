import { defineResource } from "../core/define-resource"
import type { EndpointDefinition } from "../core/types"
import type {
  AvailabilityParams,
  AvailableSlot,
  BookAppointmentRequest,
  BookAppointmentResponse,
  PublicTenant,
} from "../types/public-booking"

const tenantPath = (slug: string) =>
  `/public/tenants/${encodeURIComponent(slug)}`

const getTenantDefinition: EndpointDefinition<PublicTenant, void, string> = {
  method: "GET",
  path: tenantPath,
  public: true,
}

const availabilityDefinition: EndpointDefinition<
  AvailableSlot[],
  void,
  AvailabilityParams
> = {
  method: "GET",
  path: ({ date, resourceId, serviceId, slug }) => {
    const query = new URLSearchParams({ date, serviceId })
    if (resourceId !== undefined) {
      query.set("resourceId", resourceId)
    }
    return `${tenantPath(slug)}/availability?${query.toString()}`
  },
  public: true,
}

const bookDefinition: EndpointDefinition<
  BookAppointmentResponse,
  BookAppointmentRequest,
  string
> = {
  method: "POST",
  path: (slug: string) => `${tenantPath(slug)}/appointments`,
  public: true,
}

const definitions = {
  availability: availabilityDefinition,
  book: bookDefinition,
  getTenant: getTenantDefinition,
}

export const publicBookingEndpoints = defineResource(definitions)
