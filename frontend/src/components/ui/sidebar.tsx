import { NavLink } from "react-router-dom"
import { Home, CreditCard, User, Menu } from "lucide-react"

export function AppSidebar() {
  const links = [
    { name: "Home", path: "/", icon: <Home className="w-5 h-5" /> },
    { name: "Cashier", path: "/cashier", icon: <CreditCard className="w-5 h-5" /> },
    { name: "Kiosk", path: "/kiosk", icon: <Menu className="w-5 h-5" /> },
    { name: "Manager", path: "/manager", icon: <User className="w-5 h-5" /> },
    { name: "Menu Board", path: "/menuboards", icon: <Menu className="w-5 h-5" /> },
  ]

  return (
    <aside className="w-64 min-h-screen bg-gray-800 text-white flex flex-col">
      {/* Logo / Brand */}
      <div className="h-20 flex items-center justify-center border-b border-gray-700">
        <span className="text-xl font-bold">KioskApp</span>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 mt-4">
        {links.map((link) => (
          <NavLink
            key={link.name}
            to={link.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-6 py-3 hover:bg-gray-700 transition-colors ${
                isActive ? "bg-gray-700 font-semibold" : ""
              }`
            }
          >
            {link.icon}
            <span>{link.name}</span>
          </NavLink>
        ))}
      </nav>

      {/* Optional footer / settings */}
      <div className="h-16 flex items-center justify-center border-t border-gray-700">
        <span className="text-sm">v1.0</span>
      </div>
    </aside>
  )
}
