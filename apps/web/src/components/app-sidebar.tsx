"use client"

import {
  Appointment01Icon,
  ResourcesAddIcon,
  ServiceIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type { Tenant } from "@wappiz/api-client/types/tenants"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { use } from "react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  useSidebar,
} from "@/components/ui/sidebar"
import { authClient } from "@/lib/auth-client"

import { tenantContext } from "./tenant-provider"
import { Skeleton } from "./ui/skeleton"

const USER_NAV_ITEMS = [
  {
    href: "/dashboard",
    icon: () => <HugeiconsIcon icon={Appointment01Icon} strokeWidth={2} />,
    label: "Citas",
  },
  {
    href: "/dashboard/services",
    icon: () => <HugeiconsIcon icon={ServiceIcon} strokeWidth={2} />,
    label: "Servicios",
  },
  {
    href: "/dashboard/resources",
    icon: () => <HugeiconsIcon icon={ResourcesAddIcon} strokeWidth={2} />,
    label: "Recursos",
  },
] as const

const ADMIN_NAV_ITEMS = [
  {
    href: "/dashboard",
    icon: () => <HugeiconsIcon icon={Appointment01Icon} strokeWidth={2} />,
    label: "Solicitudes",
  },
] as const

type TenantHeaderContentProps = {
  tenant: Tenant | undefined
  isLoading: boolean
}

function TenantHeaderContent({ tenant, isLoading }: TenantHeaderContentProps) {
  if (isLoading) {
    return <Skeleton className="h-10 w-full" />
  }
  if (!tenant) {
    return null
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
        {tenant.name[0].toUpperCase()}
      </div>
      <div className="flex min-w-0 flex-col overflow-hidden group-data-[collapsible=icon]:hidden">
        <span className="truncate text-sm font-semibold leading-tight">
          {tenant.name}
        </span>
        <span className="truncate text-xs capitalize text-muted-foreground">
          {tenant.plan}
        </span>
      </div>
    </div>
  )
}

type NavMenuProps = {
  isPending: boolean
  isLoading: boolean
  role?: string
  pathname: string
  onNavigate: () => void
}

function NavMenu({
  isPending,
  isLoading,
  role,
  pathname,
  onNavigate,
}: NavMenuProps) {
  if (isPending || isLoading) {
    return (
      <>
        {Array.from({ length: 5 }).map((_, index) => (
          <SidebarMenuItem key={index}>
            <SidebarMenuSkeleton />
          </SidebarMenuItem>
        ))}
      </>
    )
  }

  const navItems = role === "admin" ? ADMIN_NAV_ITEMS : USER_NAV_ITEMS

  return (
    <>
      {navItems.map(({ href, icon: Icon, label }) => {
        const isActive =
          href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname === href || pathname.startsWith(`${href}/`)

        return (
          <SidebarMenuItem key={href}>
            <SidebarMenuButton
              isActive={isActive}
              render={<Link href={href} />}
              onClick={onNavigate}
            >
              <Icon />
              <span>{label}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )
      })}
    </>
  )
}

export function AppSidebar() {
  const pathname = usePathname()
  const { data, isPending } = authClient.useSession()
  const { tenant, isLoading } = use(tenantContext)
  const { isMobile, openMobile, setOpenMobile } = useSidebar()

  const toggleSidebar = () => {
    if (isMobile) {
      setOpenMobile(!openMobile)
    } else {
      setOpenMobile(false)
      setOpenMobile(!openMobile)
    }
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-16 flex-col justify-center">
        <TenantHeaderContent tenant={tenant} isLoading={isLoading} />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              <NavMenu
                isPending={isPending}
                isLoading={isLoading}
                role={data?.user.role ?? undefined}
                pathname={pathname}
                onNavigate={toggleSidebar}
              />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
