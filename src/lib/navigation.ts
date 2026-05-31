export const APP_NAV_ITEMS = [
  {
    href: "/",
    label: "Resumen",
    description: "Vista general y alertas",
    superadminOnly: false,
  },
  {
    href: "/nuevo-link",
    label: "Nuevo link",
    description: "Crear un cobro nuevo",
    superadminOnly: false,
  },
  {
    href: "/historial",
    label: "Historial",
    description: "Links y estados guardados",
    superadminOnly: false,
  },
  {
    href: "/usuarios",
    label: "Usuarios",
    description: "Altas, jerarquías y accesos",
    superadminOnly: true,
  },
  {
    href: "/configuracion",
    label: "Configuración",
    description: "MONEI, SMTP y ajustes",
    superadminOnly: true,
  },
] as const;
