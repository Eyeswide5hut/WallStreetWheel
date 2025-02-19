
import { useEffect } from 'react'
import { useNavigate } from 'wouter'

export function useShortcuts() {
  const navigate = useNavigate()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch(e.key) {
          case 't':
            e.preventDefault()
            navigate('/trade-entry')
            break
          case 'd':
            e.preventDefault()
            navigate('/')
            break
        }
      }
    }
    
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [navigate])
}
