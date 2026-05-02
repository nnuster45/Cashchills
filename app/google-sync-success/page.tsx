'use client'

import React, { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function GoogleSyncSuccessPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center">
      <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mb-8 border border-emerald-100">
        <svg className="w-12 h-12 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h1 className="text-3xl font-extrabold text-slate-800 mb-6 tracking-tight">Sync เมลสำเร็จ!</h1>
      <p className="text-slate-500 max-w-[300px] text-lg leading-relaxed font-medium">
        ระบบเชื่อมต่อข้อมูลเรียบร้อยแล้ว
        <br/><br/>
        ท่านสามารถ<strong className="text-slate-800 font-bold">ปิดเบราว์เซอร์นี้</strong> และกลับไปใช้งานที่แอป LINE ต่อได้เลยครับ
      </p>
    </div>
  )
}
