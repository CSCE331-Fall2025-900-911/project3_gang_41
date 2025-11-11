import { Calendar, Home, Inbox, Search, Settings } from "lucide-react"


import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar"
import { useNavigate } from "react-router-dom"

// Menu items.
const items = [
  {
    title: "Home",
    url: "",
    icon: Home,
  },
  {
    title: "All Items",
    url: "all",
    icon: Inbox,
  },
  {
    title: "Milk Tea",
    url: "milktea",
    icon: Calendar,
  },
  {
    title: "Fruit Tea",
    url: "fruity",
    icon: Search,
  },
  {
    title: "Coffee",
    url: "coffee",
    icon: Settings,
  },
  {
    title: "Smoothies",
    url: "smoothies",
    icon: Settings,
  },
  {
    title: "Seasonal",
    url: "seasonal",
    icon: Settings,
  },
]

export function AppSidebar() {
  const navigate = useNavigate()
  return (
    <Sidebar>
      <SidebarHeader>
        this is my sidebar lil bro
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
    
  )
}