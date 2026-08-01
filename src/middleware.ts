import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_ROUTES = ['/login', '/cadastro', '/convite']
const ONBOARDING_ROUTE = '/onboarding'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  let response = NextResponse.next({ request: { headers: request.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request: { headers: request.headers } })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isPublic = PUBLIC_ROUTES.some((r) => pathname.startsWith(r))
  const isOnboarding = pathname.startsWith(ONBOARDING_ROUTE)

  // Sem sessão: só rotas públicas passam. Tudo mais (incluindo onboarding) vai pro login.
  if (!user) {
    if (isPublic) return response
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  const { data: perfil } = await supabase
    .from('perfis')
    .select('empresa_id')
    .eq('id', user.id)
    .single()

  const temEmpresa = Boolean(perfil?.empresa_id)

  // Com sessão, sem empresa: só onboarding passa. Login/cadastro e qualquer rota protegida vão pro onboarding.
  if (!temEmpresa) {
    if (isOnboarding) return response
    const url = request.nextUrl.clone()
    url.pathname = '/onboarding'
    return NextResponse.redirect(url)
  }

  // Com sessão e empresa: login/cadastro/onboarding redirecionam pro assistente. Tudo mais passa.
  if (isPublic || isOnboarding) {
    const url = request.nextUrl.clone()
    url.pathname = '/assistente'
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
