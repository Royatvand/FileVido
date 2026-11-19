import { useEffect, useState } from 'react'
import { userAuth, userLearning } from '../lib/supabase'
import { applyAccountFont } from '../lib/siteFont'

// منطق مشترک احراز هویت، دریافت اطلاعات داشبورد و خروج از حساب
export default function useUserDashboard() {
  const [user, setUser] = useState(null)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadDashboard() {
      try {
        const session = await userAuth.getValidSession()
        if (!active) return

        if (!session?.user) {
          window.location.replace('/login?next=' + encodeURIComponent(window.location.pathname))
          return
        }

        let currentUser = session.user
        try {
          currentUser = await userAuth.fetchCurrentUser() || currentUser
        } catch {
          // نشست ذخیره‌شده کافی است؛ فونت همان انتخاب قبلی دستگاه می‌ماند.
        }
        if (!active) return
        applyAccountFont(currentUser?.user_metadata)
        setUser(currentUser)
        const dashboardData = await userLearning.getDashboardData()
        if (active) setData(dashboardData)
      } catch (err) {
        if (active) setError(err.message || 'دریافت اطلاعات داشبورد انجام نشد.')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadDashboard()
    return () => { active = false }
  }, [])

  async function signOut() {
    await userAuth.signOut()
    window.location.replace('/')
  }

  return { user, setUser, data, setData, loading, error, setError, signOut }
}
