'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { ArrowRight, ArrowUpRight, Check, ChevronDown, Heart, Leaf, MapPin, Menu, Minus, PackageCheck, Plus, Search, ShieldCheck, ShoppingBag, Sparkles, Truck, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { AccountModal } from '@/components/account-modal'
import { CheckoutModal } from '@/components/checkout-modal'

type Product = {
  id: string
  name: string
  slug?: string
  description?: string
  price_ghs: number
  compare_at_price_ghs?: number | null
  image_url: string
  category: string
  stock?: number
  featured?: boolean
}

type CartLine = { product: Product; quantity: number }

const showcaseProducts: Product[] = [
  { id: 'shito', name: 'Grandma’s Shito', description: 'Slow-cooked pepper sauce with a deep, smoky finish.', price_ghs: 48, compare_at_price_ghs: 58, image_url: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=900&q=85', category: 'Pantry', featured: true },
  { id: 'shea', name: 'Raw Shea Butter', description: 'Unrefined, hand-crafted shea from Northern Ghana.', price_ghs: 65, image_url: 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=900&q=85', category: 'Beauty', featured: true },
  { id: 'kente', name: 'Kente Table Runner', description: 'A handwoven splash of colour for your everyday table.', price_ghs: 185, image_url: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=900&q=85', category: 'Home', featured: true },
  { id: 'cocoa', name: '100% Ghana Cocoa', description: 'Single-origin dark chocolate, made in small batches.', price_ghs: 72, compare_at_price_ghs: 85, image_url: 'https://images.unsplash.com/photo-1548907040-4d42f7f9f4f7?auto=format&fit=crop&w=900&q=85', category: 'Pantry', featured: true },
  { id: 'basket', name: 'Bolga Market Basket', description: 'Traditional elephant grass weave, made to last.', price_ghs: 240, image_url: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=900&q=85', category: 'Home' },
  { id: 'blacksoap', name: 'African Black Soap', description: 'A gentle, time-honoured daily skin ritual.', price_ghs: 38, image_url: 'https://images.unsplash.com/photo-1600428853876-fb5a850b444f?auto=format&fit=crop&w=900&q=85', category: 'Beauty' },
  { id: 'ginger', name: 'Ginger & Hibiscus Tea', description: 'A bright, warming cup made with Ghanaian botanicals.', price_ghs: 54, image_url: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=900&q=85', category: 'Pantry' },
  { id: 'beads', name: 'Krobo Glass Beads', description: 'Recycled glass beads, shaped and finished by hand.', price_ghs: 120, image_url: 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=900&q=85', category: 'Accessories' },
]

const categoryItems = [
  { name: 'Pantry', caption: 'Good things for your kitchen', image: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=720&q=85', tone: 'sage' },
  { name: 'Beauty', caption: 'Rooted in a better ritual', image: 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=720&q=85', tone: 'peach' },
  { name: 'Home', caption: 'A little more soul at home', image: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=720&q=85', tone: 'sand' },
  { name: 'Accessories', caption: 'Made to be kept close', image: 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=720&q=85', tone: 'lavender' },
]

const currency = (value: number) => new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS', maximumFractionDigits: 2 }).format(value)

async function getProducts() {
  try {
    const supabase = createClient()
    const { data, error } = await supabase.from('products').select('id,name,slug,description,price_ghs,compare_at_price_ghs,image_url,category,stock,featured').eq('active', true).order('featured', { ascending: false }).limit(24)
    if (error) throw error
    return data?.length ? data as Product[] : showcaseProducts
  } catch {
    return showcaseProducts
  }
}

function Logo() {
  return <a href="#top" className="brand" aria-label="Afro Superstore home"><img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo-BntWL9FJ4tCF0xmRtGmE95PGUW6bZl.png" alt="" className="brand-logo" /></a>
}

function ProductCard({ product, addToCart }: { product: Product; addToCart: (product: Product) => void }) {
  const [saved, setSaved] = useState(false)
  return (
    <article className="product-card">
      <div className="product-image-wrap">
        <img src={product.image_url || '/placeholder.svg'} alt={product.name} className="product-image" loading="lazy" />
        {product.compare_at_price_ghs && <span className="product-tag">Bestseller</span>}
        <button className={`save-button ${saved ? 'is-saved' : ''}`} aria-label={saved ? `Remove ${product.name} from favourites` : `Save ${product.name} to favourites`} onClick={() => setSaved(!saved)}><Heart size={17} fill={saved ? 'currentColor' : 'none'} /></button>
        <button className="quick-add" onClick={() => addToCart(product)}><Plus size={15} /> Add to bag</button>
      </div>
      <div className="product-info"><div className="product-title-line"><h3>{product.name}</h3><span className="product-price">{currency(product.price_ghs)}</span></div><p>{product.description || product.category}</p><span className="product-category">{product.category}</span></div>
    </article>
  )
}

export function Storefront() {
  const { data: products = showcaseProducts } = useSWR('store-products', getProducts, { revalidateOnFocus: false })
  const [cart, setCart] = useState<CartLine[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [notice, setNotice] = useState('')

  const filteredProducts = useMemo(() => products.filter((item) => (activeCategory === 'All' || item.category === activeCategory) && `${item.name} ${item.category} ${item.description}`.toLowerCase().includes(search.toLowerCase())), [products, activeCategory, search])
  const cartCount = cart.reduce((total, line) => total + line.quantity, 0)
  const subtotal = cart.reduce((total, line) => total + line.product.price_ghs * line.quantity, 0)

  function addToCart(product: Product) {
    setCart((current) => {
      const existing = current.find((line) => line.product.id === product.id)
      return existing ? current.map((line) => line.product.id === product.id ? { ...line, quantity: line.quantity + 1 } : line) : [...current, { product, quantity: 1 }]
    })
    setNotice(`${product.name} added to your bag`)
    window.setTimeout(() => setNotice(''), 2400)
  }

  function updateQuantity(productId: string, delta: number) {
    setCart((current) => current.map((line) => line.product.id === productId ? { ...line, quantity: Math.max(0, line.quantity + delta) } : line).filter((line) => line.quantity > 0))
  }

  function chooseCategory(category: string) {
    setActiveCategory(category)
    document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <main id="top" className="storefront">
      <div className="announcement"><Sparkles size={13} /><span>From Ghana, with love. Free delivery in Accra over GH₵300.</span><a href="#shop">Shop now <ArrowRight size={13} /></a></div>
      <header className="site-header">
        <button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMobileOpen(!mobileOpen)}><Menu size={21} /></button>
        <Logo />
        <nav className={`main-nav ${mobileOpen ? 'nav-open' : ''}`} aria-label="Main navigation">
          <button onClick={() => chooseCategory('All')}>Shop all</button><button onClick={() => chooseCategory('Pantry')}>Pantry</button><button onClick={() => chooseCategory('Beauty')}>Beauty</button><button onClick={() => chooseCategory('Home')}>Home & living</button><button onClick={() => chooseCategory('Accessories')}>Accessories</button>
        </nav>
        <div className="header-actions"><button className="icon-button search-toggle" aria-label="Search products" onClick={() => setSearchOpen(!searchOpen)}><Search size={19} /></button><button className="account-link" onClick={() => setAccountOpen(true)}>Account</button><button className="bag-button" onClick={() => setCartOpen(true)} aria-label={`Shopping bag with ${cartCount} items`}><ShoppingBag size={19} /><span>Bag</span><b>{cartCount}</b></button></div>
        {searchOpen && <form className="search-panel" onSubmit={(event) => { event.preventDefault(); document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' }) }}><Search size={18} /><input autoFocus aria-label="Search products" placeholder="What are you looking for?" value={search} onChange={(event) => setSearch(event.target.value)} /><button type="button" aria-label="Close search" onClick={() => { setSearchOpen(false); setSearch('') }}><X size={18} /></button></form>}
      </header>

      <section className="hero" aria-labelledby="hero-title">
        <img className="hero-photo" src="/afro-hero.png" alt="A home cook preparing a meal with Ghanaian pantry staples" />
        <div className="hero-shade" />
        <div className="hero-copy"><span className="eyebrow light-eyebrow"><span /> THE GOOD STUFF, FROM HOME</span><h1 id="hero-title">A little more<br /><em>Ghana</em> in your day.</h1><p>Thoughtful goods, bold flavours and beautiful finds — made or sourced with care across Ghana.</p><a className="button-primary hero-cta" href="#shop">Shop the collection <ArrowRight size={16} /></a><div className="hero-proof"><div className="proof-avatars"><span>AK</span><span>YM</span><span>NA</span></div><span>Loved by <strong>2,000+</strong> happy homes</span></div></div>
        <div className="hero-note"><span className="note-star">✳</span><span>Rooted here.<br /><strong>Made for everywhere.</strong></span></div>
        <div className="hero-count"><span>01</span><i /> 03</div>
      </section>

      <section className="trust-strip" aria-label="Our promises"><div><span className="trust-icon"><Leaf size={18} /></span><span><strong>Made with meaning</strong><small>Good people, good craft</small></span></div><div><span className="trust-icon"><MapPin size={18} /></span><span><strong>Local first</strong><small>Proudly rooted in Ghana</small></span></div><div><span className="trust-icon"><ShieldCheck size={18} /></span><span><strong>Easy, joyful shopping</strong><small>Secure checkout, always</small></span></div><div><span className="trust-icon"><PackageCheck size={18} /></span><span><strong>Thoughtful delivery</strong><small>Across Accra and beyond</small></span></div></section>

      <section className="category-section content-width" aria-labelledby="category-title"><div className="section-heading"><div><span className="eyebrow">A GOOD PLACE TO START</span><h2 id="category-title">Find your kind of <em>good.</em></h2></div><button className="text-link" onClick={() => chooseCategory('All')}>Explore all categories <ArrowUpRight size={16} /></button></div><div className="category-grid">{categoryItems.map((category, index) => <button key={category.name} className={`category-card category-${category.tone}`} onClick={() => chooseCategory(category.name)}><img src={category.image} alt="" loading="lazy" /><span className="category-index">0{index + 1}</span><span className="category-copy"><strong>{category.name}</strong><small>{category.caption}</small></span><span className="category-arrow"><ArrowUpRight size={18} /></span></button>)}</div></section>

      <section className="products-section" id="shop" aria-labelledby="shop-title"><div className="content-width"><div className="section-heading products-heading"><div><span className="eyebrow">THE AFRO EDIT</span><h2 id="shop-title">Good things, <em>gathered.</em></h2><p className="section-subtitle">A few favourites to make your everyday feel a little more special.</p></div><a className="text-link desktop-link" href="#shop">Shop all products <ArrowUpRight size={16} /></a></div><div className="filters-row"><div className="category-filters" aria-label="Filter by category">{['All', 'Pantry', 'Beauty', 'Home', 'Accessories'].map((category) => <button key={category} className={activeCategory === category ? 'filter-active' : ''} onClick={() => setActiveCategory(category)}>{category}</button>)}</div><button className="sort-button">Featured <ChevronDown size={15} /></button></div><div className="product-grid">{filteredProducts.slice(0, 8).map((product) => <ProductCard key={product.id} product={product} addToCart={addToCart} />)}</div>{filteredProducts.length === 0 && <div className="no-results"><Search size={22} /><strong>No good things found just yet.</strong><span>Try another search or browse all products.</span><button onClick={() => { setSearch(''); setActiveCategory('All') }}>Clear filters</button></div>}<div className="mobile-all"><button className="button-outline" onClick={() => { setActiveCategory('All'); setSearch('') }}>Explore all products <ArrowRight size={15} /></button></div></div></section>

      <section className="story-section content-width"><div className="story-photo"><img src="https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=1200&q=85" alt="A welcoming table set with food to share" loading="lazy" /><div className="story-sticker"><span>From</span><strong>Ghana</strong><small>with love</small></div></div><div className="story-copy"><span className="eyebrow">A LITTLE ABOUT US</span><h2>Good things grow<br />when we <em>grow together.</em></h2><p>We bring together the makers, growers and small businesses shaping modern Ghana — so you can discover their work, wherever home is.</p><a className="text-link" href="#our-story">Get to know us <ArrowUpRight size={16} /></a><div className="story-stats"><div><strong>100<span>+</span></strong><small>local makers</small></div><div><strong>16</strong><small>regions, one home</small></div><div><strong>2k<span>+</span></strong><small>happy customers</small></div></div></div></section>

      <section className="newsletter"><div className="newsletter-pattern" /><div className="newsletter-content"><span className="eyebrow light-eyebrow">A NOTE FROM HOME</span><h2>Good things in your<br /><em>inbox.</em></h2><p>New finds, maker stories and the occasional little surprise.</p><form onSubmit={(event) => { event.preventDefault(); setNotice('You’re on the list. Watch your inbox for a little Ghana.'); (event.currentTarget as HTMLFormElement).reset() }}><label className="sr-only" htmlFor="newsletter-email">Email address</label><input id="newsletter-email" type="email" placeholder="Your email address" required /><button type="submit" aria-label="Subscribe to our newsletter"><ArrowRight size={18} /></button></form><small>By subscribing, you agree to receive emails from Afro Superstore.</small></div><div className="newsletter-mark">A<span>+</span></div></section>

      <footer className="site-footer"><div className="footer-top"><div className="footer-brand"><Logo /><p>Good things from Ghana,<br />for everywhere you call home.</p><span className="social-links"><a href="#instagram" aria-label="Instagram">ig</a><a href="#tiktok" aria-label="TikTok">tk</a><a href="#facebook" aria-label="Facebook">f</a></span></div><div className="footer-col"><strong>Explore</strong><a href="#shop">Shop all</a><a href="#shop">New arrivals</a><a href="#shop">Best sellers</a><a href="#our-story">Our story</a></div><div className="footer-col"><strong>Help & info</strong><a href="#delivery">Delivery & returns</a><a href="#faq">FAQs</a><a href="#contact">Contact us</a><a href="#track">Track your order</a></div><div className="footer-contact"><span>GOOD THINGS, GOOD PEOPLE</span><strong>Akwaaba.<br />You&apos;re always welcome.</strong><a href="mailto:hello@afrosuperstore.com">hello@afrosuperstore.com <ArrowUpRight size={15} /></a></div></div><div className="footer-bottom"><span>© 2025 Afro Superstore Ghana</span><span>Made with care in Ghana <span className="ghana-colors"><i /><i /><i /></span></span><div><a href="#privacy">Privacy</a><a href="#terms">Terms</a><span>GHS ₵</span></div></div></footer>

      {notice && <div className="toast-message" role="status"><Check size={17} />{notice}<button aria-label="Dismiss" onClick={() => setNotice('')}><X size={15} /></button></div>}
      {accountOpen && <AccountModal onClose={() => setAccountOpen(false)} />}
      {checkoutOpen && <CheckoutModal items={cart.map(({ product, quantity }) => ({ product_id: product.id, quantity }))} total={subtotal} onClose={() => setCheckoutOpen(false)} onAuthRequired={() => { setCheckoutOpen(false); setAccountOpen(true) }} />}
      {cartOpen && <div className="overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setCartOpen(false) }}><aside className="cart-drawer" aria-label="Shopping bag"><div className="cart-head"><div><span className="eyebrow">YOUR GOOD THINGS</span><h2>Your bag <span>({cartCount})</span></h2></div><button className="icon-button" aria-label="Close bag" onClick={() => setCartOpen(false)}><X size={20} /></button></div>{cart.length ? <><div className="cart-lines">{cart.map(({ product, quantity }) => <div className="cart-line" key={product.id}><img src={product.image_url} alt="" /><div className="cart-line-copy"><strong>{product.name}</strong><span>{currency(product.price_ghs)}</span><div className="quantity-control"><button aria-label={`Remove one ${product.name}`} onClick={() => updateQuantity(product.id, -1)}><Minus size={13} /></button><span>{quantity}</span><button aria-label={`Add one ${product.name}`} onClick={() => updateQuantity(product.id, 1)}><Plus size={13} /></button></div></div><button className="remove-line" aria-label={`Remove ${product.name}`} onClick={() => setCart((current) => current.filter((line) => line.product.id !== product.id))}><X size={16} /></button></div>)}</div><div className="cart-foot"><p><span>Subtotal</span><strong>{currency(subtotal)}</strong></p><small>Shipping calculated at checkout.</small><button className="button-primary checkout-button" onClick={() => { setCartOpen(false); setCheckoutOpen(true) }}>Continue to checkout <ArrowRight size={16} /></button><button className="continue-shopping" onClick={() => setCartOpen(false)}>Keep on exploring</button></div></> : <div className="empty-cart"><span className="empty-bag"><ShoppingBag size={26} /></span><h3>Your bag is taking a little rest.</h3><p>Find something made with care and bring it home.</p><button className="button-primary" onClick={() => setCartOpen(false)}>Explore good things <ArrowRight size={16} /></button></div>}</aside></div>}
    </main>
  )
}
