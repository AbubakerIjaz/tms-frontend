import { useCallback, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  parseFeatureSettings,
  type ShopModuleSettings,
} from '../lib/shopSettings'
import type { Shop } from '../types'

export function useShopFeatures() {
  const { user } = useAuth()
  const shop = user?.shop

  const features = useMemo(() => parseFeatureSettings(shop), [shop])

  const isModuleEnabled = useCallback(
    (key: keyof ShopModuleSettings): boolean => features.modules[key],
    [features.modules],
  )

  return {
    shop,
    shopType: shop?.type ?? 'tailor',
    modules: features.modules,
    email: features.email,
    showUrduLabels: features.urduLabels,
    listCardColors: features.listCardColors,
    measurementCardColors: features.measurementCardColors,
    isModuleEnabled,
  }
}

export function shopTypeLabel(type: Shop['type']): string {
  switch (type) {
    case 'boutique':
      return 'Boutique'
    case 'both':
      return 'Tailor & Boutique'
    default:
      return 'Tailor'
  }
}

export function shopTypeLabelUr(type: Shop['type']): string {
  switch (type) {
    case 'boutique':
      return 'بوتیک'
    case 'both':
      return 'درزی اور بوتیک'
    default:
      return 'درزی'
  }
}
