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

const NAV_ITEMS = [
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

type Props = {
  tenant: Tenant
}

export function AppSidebar({ tenant }: Readonly<Props>) {
  const pathname = usePathname()
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
      <SidebarHeader>
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
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
                const isActive =
                  href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname === href || pathname.startsWith(`${href}/`)

                return (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton
                      isActive={isActive}
                      render={<Link href={href} />}
                      onClick={toggleSidebar}
                    >
                      <Icon />
                      <span>{label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
