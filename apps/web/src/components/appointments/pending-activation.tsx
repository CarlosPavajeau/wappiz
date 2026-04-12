import type { PendingActivationsResponse } from "@wappiz/api-client/types/admin"

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { ActivateDialog } from "./activate-dialog"
import { RejectDialog } from "./reject-dialog"

type Props = {
  request: PendingActivationsResponse
}

export function PendingActivationCard({ request }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{request.tenantName}</CardTitle>
      </CardHeader>

      <CardContent>
        <p>
          <strong>Email:</strong> {request.contactEmail}
        </p>

        {request.notes && (
          <p>
            <strong>Notas:</strong> {request.notes}
          </p>
        )}
      </CardContent>

      <CardFooter className="flex gap-2">
        <ActivateDialog request={request} />
        <RejectDialog request={request} />
      </CardFooter>
    </Card>
  )
}
