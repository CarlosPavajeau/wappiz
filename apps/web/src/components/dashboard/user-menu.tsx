import {
  CreditCardIcon,
  Invoice01Icon,
  Logout,
  User,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useMutation } from "@tanstack/react-query"
import { Link, useNavigate, useRouteContext } from "@tanstack/react-router"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { authClient } from "@/lib/auth-client"

export function UserMenu() {
  const { isMobile } = useSidebar()
  const { user, isSuperAdmin } = useRouteContext({
    from: "/_authed",
  })

  const navigate = useNavigate()

  const { mutate: signOut, isPending } = useMutation({
    mutationFn: () => authClient.signOut(),
    onSuccess: () => {
      navigate({ to: "/sign-in" })
    },
  })

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                size="lg"
              >
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage
                    alt={user.user.name}
                    src={user.user.image ?? ""}
                  />
                  <AvatarFallback className="rounded-lg">
                    {user.user.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.user.name}</span>
                  <span className="truncate text-xs">{user.user.email}</span>
                </div>
              </SidebarMenuButton>
            }
          />

          <DropdownMenuContent
            align="end"
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuItem onClick={() => signOut()} disabled={isPending}>
              {!isPending && (
                <HugeiconsIcon
                  icon={Logout}
                  strokeWidth={2}
                  data-icon="inline-start"
                />
              )}
              Cerrar sesión
            </DropdownMenuItem>

            {!isSuperAdmin && (
              <DropdownMenuItem
                render={<Link to="/dashboard/billing" />}
                nativeButton={false}
              >
                <HugeiconsIcon
                  icon={CreditCardIcon}
                  strokeWidth={2}
                  data-icon="inline-start"
                />
                Facturación
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
