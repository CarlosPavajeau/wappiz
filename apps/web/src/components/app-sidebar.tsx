"use client"

import {
  Appointment01Icon,
  ResourcesAddIcon,
  ServiceIcon,
  Settings01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Link, useLocation, useRouteContext } from "@tanstack/react-router"
import type { Tenant } from "@wappiz/api-client/types/tenants"
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
  useSidebar,
} from "@/components/ui/sidebar"

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
  {
    href: "/dashboard/customers",
    icon: () => <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} />,
    label: "Clientes",
  },
  {
    href: "/dashboard/settings",
    icon: () => <HugeiconsIcon icon={Settings01Icon} strokeWidth={2} />,
    label: "Ajustes",
  },
] as const

const ADMIN_NAV_ITEMS = [
  {
    href: "/dashboard",
    icon: () => <HugeiconsIcon icon={Appointment01Icon} strokeWidth={2} />,
    label: "Solicitudes",
  },
  {
    href: "/dashboard/users",
    icon: () => <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} />,
    label: "Usuarios",
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
  role?: string
  pathname: string
  onNavigate: () => void
}

function NavMenu({ role, pathname, onNavigate }: NavMenuProps) {
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
              render={<Link to={href} />}
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
  const pathname = useLocation({
    select: (location) => location.pathname,
  })
  const { user } = useRouteContext({
    from: "/_authed",
  })
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
                role={user.user.role ?? undefined}
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
