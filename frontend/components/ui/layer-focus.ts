// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
"use client"

export function blurActiveLayerTrigger() {
  if (typeof document === "undefined") return

  const activeElement = document.activeElement
  if (!(activeElement instanceof HTMLElement)) return
  if (activeElement === document.body) return

  activeElement.blur()
}
