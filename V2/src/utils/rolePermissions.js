const PAGE_PERMISSIONS = {
  home: ['operator', 'qc', 'supervisor', 'admin'],
  history: ['qc', 'supervisor', 'admin'],
  'database-import': ['qc', 'admin'],
  database: ['admin'],
  settings: ['admin'],
  'weighing-receiver': ['admin'],
  'user-management': ['admin'],
}

const NAV_PAGES = [
  'home',
  'database',
  'database-import',
  'settings',
  'history',
  'weighing-receiver',
  'user-management',
]

export const normalizeRole = (role) => {
  if (!role || typeof role !== 'string') return ''
  return role.trim().toLowerCase()
}

export const resolvePageId = (page) => {
  if (!page || typeof page !== 'string') return 'home'
  if (page.startsWith('history-detail-')) return 'history'
  if (page.startsWith('weighing-receiver-detail-')) return 'weighing-receiver'
  return page
}

export const canAccessPage = (role, page) => {
  const pageId = resolvePageId(page)
  const allowedRoles = PAGE_PERMISSIONS[pageId]
  if (!allowedRoles) return false
  const normalizedRole = normalizeRole(role)
  if (!normalizedRole) return pageId === 'home'
  return allowedRoles.includes(normalizedRole)
}

export const getAccessibleNavPages = (role) =>
  NAV_PAGES.filter((pageId) => canAccessPage(role, pageId))
