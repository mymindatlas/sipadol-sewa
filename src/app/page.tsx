import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'

export default async function HomePage() {
  const supabase = await createClient()
  
  // Check if a user session exists
const { data: { user } } = await supabase.auth.getUser()
const isLoggedIn = !!user

  return (
    <div className="min-height-screen bg-slate-50 text-slate-900 font-sans">
      {/* Navigation Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-3 flex justify-between items-center" style={{ width: '375px' }}>
          <div className="font-bold text-blue-800 tracking-tight text-lg">
            सिपादोल सेवा
          </div>
          <div>
            {isLoggedIn ? (
              <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2.5 py-1 rounded-full">
                ✓ Resident Account
              </span>
            ) : (
              <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-blue-700">
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Container constrained to Mobile Viewport first */}
      <main className="max-w-md mx-auto px-4 py-6" style={{ width: '375px' }}>
        
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-blue-700 to-indigo-800 text-white p-6 rounded-2xl shadow-sm mb-6">
          <span className="text-xs font-bold uppercase tracking-widest text-blue-200">Sipadol Ward Office Portal</span>
          <h1 className="text-2xl font-bold mt-1 tracking-tight">Welcome to Sipadol Sewa</h1>
          <p className="text-sm text-blue-100 mt-2 leading-relaxed">
            Access essential civic ward updates, request document verifications, and stay connected with community updates.
          </p>
          
          {!isLoggedIn && (
            <div className="mt-5">
              <Link href="/signup" className="inline-block bg-white text-blue-800 text-sm font-semibold px-5 py-2.5 rounded-xl shadow-sm hover:bg-blue-50 transition-colors">
                Register as a Resident
              </Link>
            </div>
          )}
        </section>

        {/* Dynamic Section: Logged In vs Visitor */}
        {isLoggedIn ? (
          <section className="space-y-4">
            <h2 className="text-md font-bold text-slate-800 px-1">Your Resident Services</h2>
            
            {/* Service Action Blocks */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-blue-300 cursor-pointer">
                <div className="text-xl mb-1">📢</div>
                <div className="font-semibold text-sm">Notice Board</div>
                <div className="text-xs text-slate-500 mt-0.5">Read local alerts</div>
              </div>
              
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-blue-300 cursor-pointer">
                <div className="text-xl mb-1">📝</div>
                <div className="font-semibold text-sm">Sifaris Requests</div>
                <div className="text-xs text-slate-500 mt-0.5">Submit official forms</div>
              </div>
            </div>
          </section>
        ) : (
          <section className="bg-white border border-slate-200 rounded-2xl p-5 text-center">
            <div className="text-3xl mb-2">🔒</div>
            <h3 className="font-bold text-slate-800 text-base">Verified Resident Portal</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
              Log in to your account to access personalized citizen tracking tools, request digital certificates, and receive important structural civic notifications.
            </p>
            <div className="mt-4">
              <Link href="/login" className="inline-block w-full bg-slate-800 text-white text-sm font-medium py-2 rounded-xl hover:bg-slate-900 transition-colors">
                Sign In to Your Workspace
              </Link>
            </div>
          </section>
        )}

        {/* Static General Info Section */}
        <section className="mt-6 border-t border-slate-200 pt-5">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">Emergency Contacts</h2>
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-600 font-medium">Ward Office Direct</span>
              <span className="font-semibold text-blue-700">01-XXXXXXX</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 font-medium">Community Ambulance</span>
              <span className="font-semibold text-red-600">102</span>
            </div>
          </div>
        </section>

      </main>
    </div>
  )
}