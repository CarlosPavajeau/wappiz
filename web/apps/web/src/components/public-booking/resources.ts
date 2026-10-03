import type {
  PublicResource,
  PublicService,
  PublicTenant,
} from "@wappiz/api-client/types/public-booking"

/** The people who can perform `service`, in the business's order. */
export function resourcesFor(
  tenant: PublicTenant,
  service: PublicService
): PublicResource[] {
  return tenant.resources.filter((resource) =>
    resource.serviceIds.includes(service.id)
  )
}

/**
 * Whether the customer gets to pick who attends them; with a single option
 * the "who" step would be a pointless click.
 */
export function offersResourceChoice(
  tenant: PublicTenant,
  service: PublicService
): boolean {
  return resourcesFor(tenant, service).length > 1
}
