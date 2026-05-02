'use client'

import React, { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function GoogleSyncSuccessPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6 border border-emerald-100">
        <svg className="w-10 h-10 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-slate-800 mb-3">เชื่อมต่อสำเร็จ!</h1>
      <p className="text-slate-500 max-w-[280px] text-[15px] leading-relaxed">
        ระบบได้เชื่อมต่อบัญชี Google ของคุณเรียบร้อยแล้ว
        <br/><br/>
        ท่านสามารถ<strong className="text-slate-700">ปิดหน้าต่างนี้</strong> และกลับไปที่แอป LINE เพื่อใช้งานต่อได้เลยครับ
      </p>
    </div>
  )
}
