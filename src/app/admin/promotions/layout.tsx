// File: app/promotions/layout.tsx
'use client'

import React, { ReactNode } from 'react'

type Props = { children: ReactNode }

export default function PromotionsLayout({ children }: Props) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-10">{children}</div>
    </div>
  )
}
