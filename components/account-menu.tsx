'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { LayoutDashboard, LogOut, Package, Settings, UserPlus, UserRound, LogIn } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Me = { user: { email: string; name: string } | null; isStaff: boolean }

const fetcher = async (url: string): Promise<Me> => (await fetch(url)).json()

export function AccountMenu({ onSignIn, onRegister }: { onSignIn: () => void; onRegister: () => void }) {
  const [open, setOpen] = useState(false)
  const wrapper = useRef<HTMLDivElement>(null)
  const { data, mutate } = useSWR<Me>('/api/account/me', fetcher, { revalidateOnFocus: true })
  const user = data?.user ?? null

  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => { if (!wrapper.current?.contains(event.target as Node)) setOpen(false) }
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('pointerdown', onPointer); document.removeEventListener('keydown', onKey) }
  }, [open])

  async function signOut() {
    setOpen(false)
    await createClient().auth.signOut()
    await mutate({ user: null, isStaff: false }, { revalidate: true })
  }

  const pick = (action: () => void) => () => { setOpen(false); action() }

  return (
    <div className="account-menu" ref={wrapper}>
      <button className="account-trigger" aria-haspopup="menu" aria-expanded={open} aria-label={user ? 'Account menu' : 'Sign in or create account'} onClick={() => setOpen(!open)}>
        <UserRound size={19} /><span>Account</span>
      </button>
      {open && (
        <div className="account-dropdown" role="menu">
          {user ? (
            <>
              <div className="account-dropdown-head"><strong>{user.name || 'Welcome back'}</strong><small>{user.email}</small></div>
              <Link role="menuitem" href="/account" onClick={() => setOpen(false)}><UserRound size={16} />My profile</Link>
              <Link role="menuitem" href="/account" onClick={() => setOpen(false)}><Package size={16} />My orders</Link>
              <Link role="menuitem" href="/account/settings" onClick={() => setOpen(false)}><Settings size={16} />Settings</Link>
              {data?.isStaff && <Link role="menuitem" href="/admin" onClick={() => setOpen(false)}><LayoutDashboard size={16} />Dashboard</Link>}
              <button role="menuitem" onClick={signOut}><LogOut size={16} />Sign out</button>
            </>
          ) : (
            <>
              <button role="menuitem" onClick={pick(onSignIn)}><LogIn size={16} />Sign in</button>
              <button role="menuitem" onClick={pick(onRegister)}><UserPlus size={16} />Create account</button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
