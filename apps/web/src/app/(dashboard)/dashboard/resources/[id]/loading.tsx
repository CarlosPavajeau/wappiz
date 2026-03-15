import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function ResourceLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Skeleton className="h-4 w-20" />

        <div className="flex items-center gap-4">
          <Skeleton className="h-14 w-14 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-5 w-20" />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <Card>
          <CardHeader>
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {Array.from({ length: 7 }).map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton list
                <li
                  key={i}
                  className="flex items-center justify-between py-2.5"
                >
                  <Skeleton className="h-3.5 w-16" />
                  <Skeleton className="h-3.5 w-24" />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Skeleton className="h-5 w-40" />
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton list
              <Card key={i} size="sm">
                <CardHeader>
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-3 w-52" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-x-4">
                    {Array.from({ length: 3 }).map((_, j) => (
                      // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton list
                      <div key={j} className="space-y-1">
                        <Skeleton className="h-3 w-12" />
                        <Skeleton className="h-4 w-10" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
