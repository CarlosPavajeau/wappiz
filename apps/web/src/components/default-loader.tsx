import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "./ui/empty"
import { Spinner } from "./ui/spinner"

export function DefaultLoader() {
  return (
    <Empty className="w-full">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Spinner />
        </EmptyMedia>
        <EmptyTitle>Cargando...</EmptyTitle>
      </EmptyHeader>
    </Empty>
  )
}
