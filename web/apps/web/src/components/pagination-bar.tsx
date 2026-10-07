import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

type Props = {
  page: number
  limit: number
  total: number
  /** Noun for the summary line, e.g. `{ one: "usuario", other: "usuarios" }`. */
  noun: { one: string; other: string }
  /** Real hrefs keep "open in new tab" working; clicks go through `onPageChange`. */
  hrefFor: (page: number) => string
  onPageChange: (page: number) => void
}

/** Renders nothing for a single page: there is nowhere to go. */
export function PaginationBar({
  page,
  limit,
  total,
  noun,
  hrefFor,
  onPageChange,
}: Props) {
  const pageCount = Math.ceil(total / limit)
  if (pageCount <= 1) {
    return null
  }

  const firstItem = (page - 1) * limit + 1
  const lastItem = Math.min(page * limit, total)
  const hasPrevious = page > 1
  const hasNext = page < pageCount

  const goTo = (target: number) => (event: React.MouseEvent) => {
    // Modified clicks (new tab/window, download) belong to the browser, and a
    // click another handler already claimed is not ours to act on.
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return
    }
    event.preventDefault()
    onPageChange(target)
  }

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Mostrando {firstItem}–{lastItem} de {total}{" "}
        {total === 1 ? noun.one : noun.other}
      </p>

      <Pagination className="mx-0 w-auto">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href={hrefFor(Math.max(1, page - 1))}
              onClick={goTo(Math.max(1, page - 1))}
              aria-disabled={!hasPrevious}
              className={
                hasPrevious ? undefined : "pointer-events-none opacity-50"
              }
              text="Anterior"
            />
          </PaginationItem>

          {getPageRange(page, pageCount).map((p, i) =>
            p === "ellipsis" ? (
              <PaginationItem key={`ellipsis-${i}`}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={p}>
                <PaginationLink
                  href={hrefFor(p)}
                  isActive={p === page}
                  onClick={goTo(p)}
                >
                  {p}
                </PaginationLink>
              </PaginationItem>
            )
          )}

          <PaginationItem>
            <PaginationNext
              href={hrefFor(Math.min(pageCount, page + 1))}
              onClick={goTo(Math.min(pageCount, page + 1))}
              aria-disabled={!hasNext}
              className={hasNext ? undefined : "pointer-events-none opacity-50"}
              text="Siguiente"
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )
}

function getPageRange(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  const delta = 1
  const left = Math.max(2, current - delta)
  const right = Math.min(total - 1, current + delta)
  const pages: (number | "ellipsis")[] = [1]
  if (left > 2) {
    pages.push("ellipsis")
  }
  for (let i = left; i <= right; i += 1) {
    pages.push(i)
  }
  if (right < total - 1) {
    pages.push("ellipsis")
  }
  pages.push(total)
  return pages
}
