'use client'

import React, { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function GoogleSyncSuccessPage() {
  useEffect(() => {
    // Attempt to close the window automatically
    const timer = setTimeout(() => {
      window.close()
    }, 3000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
        <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-slate-800 mb-2">เชื่อมต่อสำเร็จ!</h1>
      <p className="text-slate-500 mb-8 max-w-[280px]">
        ระบบได้เชื่อมต่อบัญชี Gmail ของคุณเรียบร้อยแล้ว กรุณากลับไปที่แอป LINE เพื่อดำเนินการต่อ
      </p>
      
      <div className="flex flex-col gap-3 w-full max-w-[280px]">
        <Button 
          onClick={() => window.close()}
          className="w-full bg-[#06C755] hover:bg-[#05b34c] text-white h-12 rounded-xl font-bold text-base shadow-[0_4px_14px_rgba(6,199,85,0.4)]"
        >
          ปิดหน้านี้เพื่อกลับไปที่ LINE
        </Button>
      </div>
    </div>
  )
}
