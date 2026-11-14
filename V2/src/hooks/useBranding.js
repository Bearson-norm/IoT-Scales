import { useState, useEffect } from 'react'
import defaultLogo from '../assets/logo-km.jpeg'

const API_BASE = typeof window !== 'undefined' && window.__API_BASE_URL__
  ? window.__API_BASE_URL__.replace(/\/api\/?$/, '')
  : (typeof import.meta !== 'undefined' && import.meta.env?.DEV
    ? 'http://localhost:3001'
    : '')

export function useBranding() {
  const [branding, setBranding] = useState({
    companyName: 'KMI',
    appTitle: 'Manufacturing Weighing System',
    logoUrl: null,
    loading: true
  })

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const base = API_BASE || window.location.origin
        const resp = await fetch(`${base}/api/branding`)
        if (resp.ok) {
          const json = await resp.json()
          if (!cancelled && json.success) {
            setBranding({ ...json.data, loading: false })
            if (json.data.faviconUrl) {
              let link = document.querySelector("link[rel='icon']")
              if (!link) {
                link = document.createElement('link')
                link.rel = 'icon'
                document.head.appendChild(link)
              }
              link.href = `${base}${json.data.faviconUrl}`
            }
            if (json.data.companyName) {
              document.title = `${json.data.companyName} - Manufacturing Weighing System`
            }
            return
          }
        }
      } catch (e) {
        console.warn('Branding load failed, using defaults', e)
      }
      if (!cancelled) setBranding(prev => ({ ...prev, loading: false }))
    }
    load()
    return () => { cancelled = true }
  }, [])

  const logoSrc = branding.logoUrl
    ? `${API_BASE || window.location.origin}${branding.logoUrl}`
    : defaultLogo

  return { ...branding, logoSrc }
}

export default useBranding
