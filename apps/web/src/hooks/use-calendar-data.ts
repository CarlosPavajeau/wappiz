import { useQuery } from "@tanstack/react-query"
import type { Appointment } from "@wappiz/api-client/types/appointments"
import { useMemo } from "react"

import type { CalView } from "@/components/appointments/calendar-config"
import { api } from "@/lib/client-api"

type Params = {
  calView: CalView
  from: string
  to: string
  resourceIds: string[]
  serviceIds: string[]
  statuses: string[]
  selectedAptId: string | null
}

export function useCalendarData({
  calView,
  from,
  to,
  resourceIds,
  serviceIds,
  statuses,
  selectedAptId,
}: Params) {
  const { data: resources, isLoading: isLoadingResources } = useQuery({
    queryFn: () => api.resources.list(),
    queryKey: ["resources"],
    staleTime: 5 * 60 * 1000,
  })

  const { data: services, isLoading: isLoadingServices } = useQuery({
    queryFn: () => api.services.list(),
    queryKey: ["services"],
    staleTime: 5 * 60 * 1000,
  })

  const { data, isError, isLoading } = useQuery({
    queryFn: () =>
      api.appointments.list({
        params: {
          from,
          to,
          ...(resourceIds.length > 0 && { resource: resourceIds }),
          ...(serviceIds.length > 0 && { service: serviceIds }),
          ...(statuses.length > 0 && { status: statuses }),
        },
      }),
    queryKey: [
      "appointments",
      "calendar",
      calView,
      from,
      to,
      resourceIds,
      serviceIds,
      statuses,
    ],
  })

  const apts = useMemo(
    () =>
      (data ?? []).toSorted(
        (a: Appointment, b: Appointment) =>
          new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
      ),
    [data]
  )

  const selectedApt = useMemo(
    () =>
      selectedAptId
        ? ((data ?? []).find((a: Appointment) => a.id === selectedAptId) ??
          null)
        : null,
    [selectedAptId, data]
  )

  return {
    apts,
    isError,
    isLoading,
    isLoadingResources,
    isLoadingServices,
    resources,
    selectedApt,
    services,
  }
}
