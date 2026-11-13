import { useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import './AndroidUpdateChecker.css'

const RELEASES_URL = 'https://api.github.com/repos/Royatvand/FileVido/releases/latest'
const CURRENT_VERSION_CODE = Number(import.meta.env.VITE_ANDROID_VERSION_CODE || 1)

function versionCodeFromTag(tagName) {
  const match = tagName.match(/^app-v(\d+)\.(\d+)\.(\d+)$/)
  if (!match) return null

  const [, major, minor, patch] = match
  return Number(major) * 1_000_000 + Number(minor) * 1_000 + Number(patch)
}

export default function AndroidUpdateChecker() {
  const [release, setRelease] = useState(null)

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return

    let cancelled = false

    const checkForUpdate = async () => {
      try {
        const response = await fetch(RELEASES_URL, {
          headers: { Accept: 'application/vnd.github+json' },
          cache: 'no-store',
        })

        if (!response.ok) return

        const latestRelease = await response.json()
        const latestVersionCode = versionCodeFromTag(latestRelease.tag_name)
        const apkAsset = latestRelease.assets?.find((asset) =>
          asset.name.toLowerCase().endsWith('.apk'),
        )

        if (
          !cancelled &&
          latestVersionCode &&
          latestVersionCode > CURRENT_VERSION_CODE &&
          apkAsset
        ) {
          setRelease({
            version: latestRelease.tag_name.replace(/^app-v/, ''),
            url: latestRelease.html_url,
          })
        }
      } catch {
        // بررسی آپدیت نباید مانع بازشدن یا استفاده از اپ شود.
      }
    }

    checkForUpdate()
    window.addEventListener('focus', checkForUpdate)

    return () => {
      cancelled = true
      window.removeEventListener('focus', checkForUpdate)
    }
  }, [])

  if (!release) return null

  return (
    <aside className="android-update-notice" dir="rtl" role="status">
      <div className="android-update-copy">
        <strong>نسخه جدید چارت مسترز آماده است</strong>
        <span>نسخه {release.version} منتشر شده؛ برای دریافت آن اقدام کن.</span>
      </div>
      <a href={release.url} target="_blank" rel="noopener noreferrer">
        دریافت آپدیت
      </a>
    </aside>
  )
}
