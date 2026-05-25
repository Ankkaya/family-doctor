<template>
  <n-icon
    v-if="iconComponent"
    :size="size"
    :color="color"
    class="align-middle"
  >
    <component :is="iconComponent" />
  </n-icon>
  <img
    v-else-if="resolvedIconUrl && !useMask"
    :src="resolvedIconUrl"
    :alt="altText"
    :style="imageStyle"
    class="inline-block object-contain align-middle"
  />
  <span
    v-else-if="resolvedIconUrl && useMask"
    :aria-label="altText"
    :style="renderStyle"
    class="inline-block align-middle"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NIcon } from 'naive-ui'
import * as Ionicons from '@vicons/ionicons5'

const props = withDefaults(defineProps<{
  icon?: string | null
  iconUrl?: string | null
  size?: number | string
  alt?: string
  useMask?: boolean
  color?: string
}>(), {
  icon: '',
  iconUrl: '',
  size: 18,
  alt: '',
  useMask: false,
  color: 'currentColor',
})

const iconModules = Ionicons as Record<string, any>
const legacyIconAliasMap: Record<string, string> = {
  setting: 'material-symbols:settings-outline',
  user: 'material-symbols:person-outline',
  peoples: 'material-symbols:groups-outline',
  menu: 'material-symbols:menu',
  'print-template': 'material-symbols:print-outline',
  printer: 'material-symbols:print-outline',
  'printer-config': 'material-symbols:print-connect-outline',
  database: 'material-symbols:database-outline',
  measurement: 'material-symbols:straighten-outline',
  category: 'material-symbols:category-outline',
  brand: 'material-symbols:bookmark-outline',
  warehouse: 'mdi:warehouse',
  supplier: 'material-symbols:local-shipping-outline',
  customer: 'material-symbols:person-pin-circle-outline',
  shopping: 'material-symbols:shopping-bag-outline',
  goods: 'material-symbols:inventory-2-outline',
  inventory: 'material-symbols:inventory-2-outline',
  'inventory-2': 'material-symbols:inventory-2-outline',
  order: 'material-symbols:receipt-long-outline',
  inbound: 'material-symbols:move-to-inbox-outline',
  return: 'material-symbols:assignment-return-outline',
  shipment: 'material-symbols:local-shipping-outline',
  transfer: 'mdi:swap-horizontal-bold',
  adjust: 'material-symbols:tune',
  wallet: 'material-symbols:account-balance-wallet-outline',
  log: 'material-symbols:history-rounded',
  'shopping-cart': 'material-symbols:shopping-cart-outline',
  cart: 'material-symbols:shopping-cart-outline',
  storefront: 'material-symbols:storefront-outline',
  slideshow: 'material-symbols:view-carousel-outline',
  home: 'material-symbols:home-outline',
  coupon: 'material-symbols:local-activity-outline',
  redeem: 'material-symbols:redeem',
  upload: 'material-symbols:cloud-upload',
  'mdi:folder-cloud-outline': 'mdi:folder-outline',
}

const normalizeLegacyIcon = (icon: string) => {
  const lowerCased = icon.toLowerCase()
  if (legacyIconAliasMap[lowerCased]) {
    return legacyIconAliasMap[lowerCased]
  }

  if (/^[A-Z][A-Za-z0-9]+$/.test(icon)) {
    return `ion:${icon
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .replace(/([A-Z]+)([A-Z][a-z0-9]+)/g, '$1-$2')
      .toLowerCase()}`
  }

  return icon
}

const parsedIcon = computed(() => {
  const rawIcon = props.icon?.trim()
  if (!rawIcon) {
    return null
  }

  const normalized = normalizeLegacyIcon(rawIcon)
  const parts = normalized.split(':')
  if (parts.length !== 2) {
    return null
  }

  const [collection, name] = parts
  if (!collection || !name) {
    return null
  }

  return {
    collection: collection.toLowerCase(),
    name: name.toLowerCase(),
  }
})

const iconComponent = computed(() => {
  const rawIcon = props.icon?.trim()
  if (!rawIcon || rawIcon.includes(':')) {
    return undefined
  }

  return iconModules[rawIcon]
})

const resolvedIconUrl = computed(() => {
  if (props.iconUrl) {
    return props.iconUrl
  }

  if (!parsedIcon.value) {
    return ''
  }

  const { collection, name } = parsedIcon.value
  return `https://api.iconify.design/${collection}:${name}.svg`
})

const imageStyle = computed(() => {
  const size = typeof props.size === 'number' ? `${props.size}px` : props.size
  return {
    width: size,
    height: size,
  }
})

const renderStyle = computed(() => {
  return {
    ...imageStyle.value,
    backgroundColor: props.color,
    maskImage: `url(${resolvedIconUrl.value})`,
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    maskPosition: 'center',
    WebkitMaskImage: `url(${resolvedIconUrl.value})`,
    WebkitMaskSize: 'contain',
    WebkitMaskRepeat: 'no-repeat',
    WebkitMaskPosition: 'center',
  }
})

const altText = computed(() => props.alt || props.icon || 'icon')
</script>
