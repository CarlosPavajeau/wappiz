"use client"

import {
  Appointment01Icon,
  ResourcesAddIcon,
  ServiceIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { LayoutDashboard, Package, Users } from "lucide-react"
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

export function AppSidebar() {
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
        <Link
          aria-label="Go to home"
          className="inline-flex size-8 items-center justify-center rounded-md border border-border bg-accent text-xs font-semibold text-foreground"
          href="/dashboard"
        >
          W
        </Link>
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
