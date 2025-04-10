import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import Index from '@/pages/Index'

export default function HomePage() {
  return (
    <Suspense 
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      }
    >
      <Index />
    </Suspense>
  )
} 