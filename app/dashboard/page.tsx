"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { Leaf, Activity, X, Info, Sprout, ShieldCheck, User, Bell } from "lucide-react"
import { useApp } from "@/context/AppContext"
import { user as userApi } from "@/lib/api"
import { ThemeToggle } from "@/components/ThemeToggle"

/* ─── Plant colour palette (illustration only, not page chrome) ─── */
const C = {
  sage300: "#7FC27F", sage400: "#5CB05C",
  sage500: "#3D8F3D", sage600: "#2E732E",
}

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
  return {r,g,b}
}
function toHex(r:number,g:number,b:number) {
  return "#"+[r,g,b].map(v=>Math.min(255,Math.max(0,Math.round(v))).toString(16).padStart(2,"0")).join("")
}
function lighten(hex:string,pct:number){const{r,g,b}=hexToRgb(hex);const f=pct/100;return toHex(r+(255-r)*f,g+(255-g)*f,b+(255-b)*f)}
function darken(hex:string,pct:number){const{r,g,b}=hexToRgb(hex);const f=pct/100;return toHex(r*(1-f),g*(1-f),b*(1-f))}

const CROP_DATA = [
  { id:"apple",      name:"Apple",      pot:"#c1440e", plant:"#4a9e3f", leaf:"#6dbf5a", fruit:"#e8372a", fruitShape:"round",
    brief:"A hardy deciduous tree producing versatile, crunchy fruit.",
    howToPlant:"Plant in full sun with well-drained soil. Requires a second variety nearby for cross-pollination.",
    diseases:["Apple Scab","Black Rot","Cedar Apple Rust","Healthy"] },
  { id:"cherry",     name:"Cherry",     pot:"#8b6343", plant:"#3d8c38", leaf:"#52b045", fruit:"#c0152a", fruitShape:"small-round",
    brief:"Stone fruits known for beautiful spring blossoms and sweet harvests.",
    howToPlant:"Requires deep, well-drained soil and good air circulation.",
    diseases:["Powdery Mildew","Healthy"] },
  { id:"corn",       name:"Corn",       pot:"#b07d3a", plant:"#5aaa40", leaf:"#70cc50", fruit:"#e8c832", fruitShape:"tall",
    brief:"A tall annual cereal grass — a heavy feeder that needs space and nutrients.",
    howToPlant:"Sow seeds 1 inch deep in blocks (at least 4 rows) for wind pollination.",
    diseases:["Cercospora / Gray Leaf Spot","Common Rust","Northern Leaf Blight","Healthy"] },
  { id:"crape_jasmine", name:"Crape Jasmine", pot:"#7a8c6a", plant:"#3a7a50", leaf:"#50a868", fruit:"#f0f0e0", fruitShape:"none",
    brief:"An ornamental tropical shrub with pinwheel-shaped white flowers and glossy dark leaves.",
    howToPlant:"Plant in partial to full sun in moist, well-drained soil. Thrives in warm, humid climates.",
    diseases:["Insect Bite","YLD","Healthy"] },
  { id:"grape",      name:"Grape",      pot:"#7a5c3a", plant:"#3a7a30", leaf:"#4fa840", fruit:"#7b3fa0", fruitShape:"cluster",
    brief:"Vining plants for fresh eating, juice, or wine. Require sturdy support.",
    howToPlant:"Plant vines in early spring. Provide a trellis. Prune heavily each year.",
    diseases:["Black Rot","Esca (Black Measles)","Leaf Blight (Isariopsis)","Healthy"] },
  { id:"guava",      name:"Guava",      pot:"#8a7040", plant:"#4a9040", leaf:"#62b850", fruit:"#f0d060", fruitShape:"round",
    brief:"A tropical fruit tree prized for its sweet, fragrant fruit rich in vitamin C.",
    howToPlant:"Plant in full sun with good drainage. Tolerates a range of soils but prefers slightly acidic conditions.",
    diseases:["Anthracnose","Insect Bite","Multiple","Scorch","YLD","Healthy"] },
  { id:"hibiscus",   name:"Hibiscus",   pot:"#b03060", plant:"#3a8040", leaf:"#50aa50", fruit:"#e83060", fruitShape:"none",
    brief:"A tropical flowering shrub renowned for its large, showy blooms and herbal uses.",
    howToPlant:"Plant in full sun with moist, well-drained soil. Water regularly and feed monthly during growing season.",
    diseases:["Blight","Death Leaf","Scorch","Healthy"] },
  { id:"night_jasmine", name:"Night Jasmine", pot:"#6a7a5a", plant:"#3a7848", leaf:"#52a860", fruit:"#fff8dc", fruitShape:"none",
    brief:"A fragrant flowering shrub whose small white blooms release an intense scent after sunset.",
    howToPlant:"Grow in well-drained soil with full sun to partial shade. Prune after flowering to maintain shape.",
    diseases:["Early Blight","Red Spot","Healthy"] },
  { id:"orange",     name:"Orange",     pot:"#c17a2a", plant:"#4a9e3f", leaf:"#5cb84e", fruit:"#e87820", fruitShape:"round",
    brief:"Evergreen citrus trees that thrive in warm climates.",
    howToPlant:"Needs 8–12 hours of sun daily. Use sandy, well-drained soil.",
    diseases:["Haunglongbing (Citrus Greening)","Healthy"] },
  { id:"peach",      name:"Peach",      pot:"#c06a3a", plant:"#4a9e3f", leaf:"#62bf52", fruit:"#e8a060", fruitShape:"round",
    brief:"Fuzzy-skinned stone fruits that love heat.",
    howToPlant:"Plant in a sheltered, sunny spot. Thin fruit to prevent branch breakage.",
    diseases:["Bacterial Spot","Healthy"] },
  { id:"pepper",     name:"Pepper",     pot:"#5a6e4a", plant:"#3a8c32", leaf:"#50b040", fruit:"#d83820", fruitShape:"bell",
    brief:"Warm-season crops from sweet bells to spicy chilies.",
    howToPlant:"Start indoors 8 weeks before frost. Transplant when soil is warm.",
    diseases:["Bacterial Spot","Healthy"] },
  { id:"potato",     name:"Potato",     pot:"#7a6a4a", plant:"#4a9040", leaf:"#5cb050", fruit:"#d4b860", fruitShape:"none",
    brief:"A starchy tuberous crop — a staple of many global diets.",
    howToPlant:"Plant 'seed potato' pieces with at least two eyes.",
    diseases:["Early Blight","Late Blight","Healthy"] },
  { id:"rose",       name:"Rose",       pot:"#a04060", plant:"#4a8040", leaf:"#5ab050", fruit:"#e82060", fruitShape:"none",
    brief:"The world's most beloved ornamental shrub, celebrated for its fragrant blooms and symbolic significance.",
    howToPlant:"Plant in full sun with at least 6 hours of direct light. Use rich, well-drained soil and water at the base to prevent disease.",
    diseases:["Blight","Healthy"] },
  { id:"strawberry", name:"Strawberry", pot:"#a04030", plant:"#3a8c38", leaf:"#4aaa42", fruit:"#d82030", fruitShape:"berry",
    brief:"Low-growing perennials that produce sweet red fruits.",
    howToPlant:"Plant so the 'crown' is at soil level. Use mulch to retain moisture.",
    diseases:["Leaf Scorch","Healthy"] },
  { id:"tomato",     name:"Tomato",     pot:"#b05030", plant:"#4a9e3f", leaf:"#5cb84e", fruit:"#e82a1a", fruitShape:"round",
    brief:"The most popular home garden crop.",
    howToPlant:"Plant deeply — bury the stem up to the first set of leaves.",
    diseases:["Bacterial Spot","Early Blight","Late Blight","Leaf Mold","Septoria Leaf Spot","Spider Mites","Target Spot","Tomato Mosaic Virus","Yellow Leaf Curl Virus","Healthy"] },
]

function PlantCrown({cx,cy,leaf,leafGrad,fruitShape,fruit,fruitGrad,s}:{cx:number;cy:number;leaf:string;leafGrad:string;fruitShape:string;fruit:string;fruitGrad:string;s:number}) {
  const r=s*0.22, fr=s*0.07
  if (fruitShape==="tall"||fruitShape==="stalks") return (
    <g>{[[-0.7,0.9],[0.7,0.9],[-0.4,0.5],[0.4,0.5],[0,0.1]].map(([dx,dy],i)=>(
      <ellipse key={i} cx={cx+dx!*r*0.9} cy={cy+dy!*r*0.6} rx={r*0.55} ry={r*0.22} fill={`url(#${leafGrad})`} transform={`rotate(${dx!*35},${cx+dx!*r*0.9},${cy+dy!*r*0.6})`}/>
    ))}{fruitShape==="stalks"&&<ellipse cx={cx} cy={cy-r*0.3} rx={r*0.2} ry={r*0.5} fill={`url(#${fruitGrad})`}/>}</g>
  )
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx={r} ry={r*0.82} fill={`url(#${leafGrad})`}/>
      <ellipse cx={cx-r*0.55} cy={cy+r*0.3} rx={r*0.55} ry={r*0.45} fill={leaf} opacity={0.75}/>
      <ellipse cx={cx+r*0.55} cy={cy+r*0.3} rx={r*0.55} ry={r*0.45} fill={leaf} opacity={0.75}/>
      {fruitShape!=="none"&&<>
        <circle cx={cx-r*0.3} cy={cy+r*0.15} r={fr} fill={`url(#${fruitGrad})`}/>
        <circle cx={cx+r*0.35} cy={cy+r*0.25} r={fr*0.85} fill={`url(#${fruitGrad})`}/>
        <circle cx={cx} cy={cy+r*0.4} r={fr*0.9} fill={`url(#${fruitGrad})`}/>
      </>}
    </g>
  )
}

function PlantIllustration({pot,plant,leaf,fruit,fruitShape,size=120}:{pot:string;plant:string;leaf:string;fruit:string;fruitShape:string;size?:number}) {
  const s=size,cx=s/2
  const potTopW=s*0.52,potBotW=s*0.38,potH=s*0.28,potY=s*0.62
  const potTopX=cx-potTopW/2,potBotX=cx-potBotW/2
  const pedY=potY+potH,pedRx=s*0.28,pedRy=s*0.06
  const soilRx=potTopW/2-2,stemX=cx,stemY1=potY+4,stemY2=potY-s*0.18
  const hlX=potTopX+potTopW*0.15,hlW=potTopW*0.12,hlH=potH*0.55
  return (
    <svg viewBox={`0 0 ${s} ${s}`} width={s} height={s} style={{overflow:"visible",display:"block"}} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id={`pg-${pot}`} cx="35%" cy="30%" r="70%"><stop offset="0%" stopColor={lighten(pot,30)}/><stop offset="100%" stopColor={darken(pot,20)}/></radialGradient>
        <radialGradient id={`ped-${plant}`} cx="50%" cy="40%" r="70%"><stop offset="0%" stopColor={lighten(plant,25)}/><stop offset="100%" stopColor={darken(plant,15)}/></radialGradient>
        <radialGradient id={`leaf-${leaf}`} cx="40%" cy="30%" r="70%"><stop offset="0%" stopColor={lighten(leaf,25)}/><stop offset="100%" stopColor={darken(leaf,20)}/></radialGradient>
        <radialGradient id={`fruit-${fruit}`} cx="35%" cy="30%" r="70%"><stop offset="0%" stopColor={lighten(fruit,30)}/><stop offset="100%" stopColor={darken(fruit,20)}/></radialGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="rgba(0,0,0,0.18)"/></filter>
      </defs>
      <ellipse cx={cx} cy={pedY+pedRy} rx={pedRx} ry={pedRy} fill={`url(#ped-${plant})`} filter="url(#shadow)"/>
      <rect x={cx-pedRx} y={pedY} width={pedRx*2} height={pedRy*1.2} fill={plant} rx={2}/>
      <ellipse cx={cx} cy={pedY} rx={pedRx} ry={pedRy} fill={lighten(plant,18)}/>
      <polygon points={`${potTopX},${potY} ${potTopX+potTopW},${potY} ${potBotX+potBotW},${potY+potH} ${potBotX},${potY+potH}`} fill={`url(#pg-${pot})`} filter="url(#shadow)"/>
      <ellipse cx={cx} cy={potY} rx={potTopW/2} ry={s*0.035} fill={lighten(pot,22)}/>
      <rect x={hlX} y={potY+potH*0.12} width={hlW} height={hlH} rx={hlW/2} fill="rgba(255,255,255,0.18)"/>
      <ellipse cx={cx} cy={potY+2} rx={soilRx} ry={s*0.04} fill={darken(pot,30)}/>
      <line x1={stemX} y1={stemY1} x2={stemX} y2={stemY2} stroke={darken(plant,10)} strokeWidth={s*0.025} strokeLinecap="round"/>
      <PlantCrown cx={cx} cy={stemY2} leaf={leaf} leafGrad={`leaf-${leaf}`} fruitShape={fruitShape} fruit={fruit} fruitGrad={`fruit-${fruit}`} s={s}/>
    </svg>
  )
}

export default function DashboardPage() {
  const [selectedCrop, setSelectedCrop] = useState<(typeof CROP_DATA)[0]|null>(null)
  const router = useRouter()
  const { currentUser } = useApp()
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  const [tip, setTip] = useState<string|null>(null)
  const [tipLoading, setTipLoading] = useState(false)

  useEffect(() => {
    if (!currentUser?.city && !currentUser?.country) return
    setTipLoading(true)
    userApi.getSeasonalTip({ city: currentUser.city, country: currentUser.country })
      .then(res => setTip(res.tip))
      .catch(() => setTip(null))
      .finally(() => setTipLoading(false))
  }, [currentUser?.city, currentUser?.country])

  const tipText = tipLoading
    ? "Loading your seasonal tip…"
    : tip ?? (currentUser?.city || currentUser?.country
        ? "Could not load tip. Please try again later."
        : "Add your city and country in your profile to get a personalised seasonal tip.")

  return (
    <div className="min-h-screen bg-background text-foreground" style={{ fontFamily: "'DM Sans',sans-serif" }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Cormorant+Garamond:ital,wght@0,600;1,500&display=swap');
        .pc{cursor:pointer;position:relative;transition:transform .38s cubic-bezier(.34,1.45,.64,1)}
        .pc:hover{transform:translateY(-10px)}
        .pc:hover .pc-plant{transform:translateX(-50%) scale(1.07) translateY(-4px)!important}
        .pc-plant{transition:transform .42s cubic-bezier(.34,1.3,.64,1)}
        .pc:hover .pc-body{box-shadow:0 20px 52px rgba(31,83,31,0.2)!important}
        @keyframes si{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)}}
        ${Array.from({length:12},(_,i)=>`.s${i+1}{animation:si .55s ease both ${i*55}ms}`).join("\n")}
        @keyframes mi{from{opacity:0;transform:scale(.93) translateY(20px)}to{opacity:1;transform:scale(1) translateY(0)}}
        .modal-in{animation:mi .3s cubic-bezier(.34,1.2,.64,1) both}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-thumb{background:var(--primary);border-radius:99px}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
        .tip-loading{animation:pulse 1.4s ease-in-out infinite}
      `}</style>

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 28px 72px", width: "100%" }}>

        {/* ── Top nav ── */}
        <nav className="flex items-center justify-between mb-9">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--primary)" }}>
              <Leaf size={16} color="#fff" />
            </div>
            <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em" }}
              className="text-foreground">
              Plant Guard
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/dashboard/notifications")}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:bg-muted"
              style={{ border: "1px solid var(--border)" }}
            >
              <Bell size={18} className="text-muted-foreground" />
            </button>
            <ThemeToggle />
            <button
              onClick={() => router.push("/dashboard/profile")}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:bg-muted"
              style={{ border: "1px solid var(--border)" }}
            >
              <User size={18} className="text-muted-foreground" />
            </button>
          </div>
        </nav>

        {/* ── Seasonal tip ── */}
        <div className="rounded-2xl p-5 mb-7" style={{
          background: "linear-gradient(135deg, var(--primary), var(--accent))",
          boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
        }}>
          <div className="flex gap-3.5 items-start">
            <div className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ background: "rgba(255,255,255,0.2)" }}>
              <Leaf size={15} color="#fff" />
            </div>
            <div className="flex-1">
              <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.8)", margin: "0 0 4px" }}>
                Seasonal Tip
                {(currentUser?.city || currentUser?.country) && (
                  <span style={{ marginLeft: 8, opacity: 0.7, fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>
                    · {[currentUser.city, currentUser.country].filter(Boolean).join(", ")}
                  </span>
                )}
              </p>
              <p className={tipLoading ? "tip-loading" : ""}
                style={{ fontSize: 14, lineHeight: 1.65, color: "rgba(255,255,255,0.96)", fontFamily: "'Cormorant Garamond',serif", fontStyle: "italic", margin: 0 }}>
                {tipText}
              </p>
            </div>
          </div>
        </div>

        {/* ── Hero banner ── */}
        <div className="relative rounded-3xl overflow-hidden mb-14" style={{
          aspectRatio: "16/6", minHeight: 180,
          background: isDark
            ? "linear-gradient(135deg, rgba(15,31,24,0.95), rgba(22,42,32,0.95))"
            : "linear-gradient(135deg, rgba(212,237,226,0.6), rgba(230,242,236,0.8))",
          border: "1px solid var(--border)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.12)",
        }}>
          <div style={{ position: "absolute", right: -40, bottom: -20, opacity: 0.1, pointerEvents: "none" }}>
            <svg width="320" height="260" viewBox="0 0 320 260" fill="none">
              <ellipse cx="180" cy="130" rx="160" ry="78" fill="var(--primary)" transform="rotate(-28 180 130)"/>
              <ellipse cx="180" cy="130" rx="140" ry="65" fill="var(--accent)" opacity="0.7" transform="rotate(-42 180 130)"/>
              <line x1="180" y1="40" x2="180" y2="220" stroke="var(--primary)" strokeWidth="3"/>
            </svg>
          </div>
          <div className="relative z-10 h-full flex flex-col justify-between p-6 lg:p-9">
            <span className="text-[11px] font-medium uppercase tracking-widest" style={{ color: "var(--primary)" }}>
              AI Detection
            </span>
            <div style={{ maxWidth: "54%" }}>
              <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "clamp(20px,3.6vw,38px)", fontWeight: 600, lineHeight: 1.15, margin: "0 0 10px" }}
                className="text-foreground">
                Because Every Plant Deserves<br />to Thrive
              </h2>
              <p className="text-muted-foreground" style={{ fontSize: "clamp(11px,1.2vw,13px)", fontWeight: 300, lineHeight: 1.7, margin: 0 }}>
                Advanced detection technology identifies plant diseases with pinpoint accuracy.
              </p>
            </div>
          </div>
        </div>

        {/* ── Section header ── */}
        <div className="mb-12">
          <div className="flex items-center gap-2.5 mb-2">
            <span className="block w-7 h-px" style={{ background: "var(--primary)" }} />
            <span className="text-[11px] font-medium tracking-widest uppercase" style={{ color: "var(--primary)" }}>
              Knowledge Base
            </span>
          </div>
          <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 34, fontWeight: 600, letterSpacing: "-0.02em", margin: "0 0 6px" }}
            className="text-foreground">
            Plant Knowledge Base
          </h2>
          <p className="text-muted-foreground text-[13px]">
            Explore cultivation secrets and detection capabilities.
          </p>
        </div>

        {/* ── Plant grid ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(155px,1fr))", gap: "52px 16px" }}>
          {CROP_DATA.map((crop, i) => (
            <div key={crop.id} className={`pc s${i+1}`} onClick={() => setSelectedCrop(crop)} style={{ paddingTop: 72 }}>
              <div className="pc-plant" style={{ position: "absolute", top: -8, left: "50%", transform: "translateX(-50%)", zIndex: 10, pointerEvents: "none", filter: "drop-shadow(0 8px 20px rgba(0,0,0,0.2))" }}>
                <PlantIllustration pot={crop.pot} plant={crop.plant} leaf={crop.leaf} fruit={crop.fruit} fruitShape={crop.fruitShape} size={130}/>
              </div>
              <div className="pc-body rounded-2xl text-center transition-all duration-200" style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                boxShadow: "0 8px 28px rgba(0,0,0,0.07)",
                padding: "64px 14px 16px",
              }}>
                <p className="text-[13px] font-semibold text-card-foreground mb-1.5">{crop.name}</p>
                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full" style={{
                  background: "var(--muted)", border: "1px solid var(--border)",
                }}>
                  <ShieldCheck style={{ width: 9, height: 9, color: "var(--primary)" }} />
                  <span className="text-[9px] font-semibold text-muted-foreground">{crop.diseases.length - 1} conditions</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Modal ── */}
      {selectedCrop && (
        <div
          onClick={e => e.target === e.currentTarget && setSelectedCrop(null)}
          className="fixed inset-0 z-60 flex items-center justify-center p-5"
          style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(12px)" }}
        >
          <div className="modal-in w-full rounded-3xl overflow-hidden" style={{
            maxWidth: 620,
            background: "var(--card)",
            border: "1px solid var(--border)",
            boxShadow: "0 40px 100px rgba(0,0,0,0.3)",
            maxHeight: "88vh", overflowY: "auto",
          }}>
            <div className="flex justify-between items-center px-6 py-4" style={{
              borderBottom: "1px solid var(--border)",
              background: "var(--muted)",
            }}>
              <div className="flex items-center gap-3">
                <div style={{ width: 46, height: 46 }}>
                  <PlantIllustration pot={selectedCrop.pot} plant={selectedCrop.plant} leaf={selectedCrop.leaf} fruit={selectedCrop.fruit} fruitShape={selectedCrop.fruitShape} size={46}/>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 22, fontFamily: "'Cormorant Garamond',serif", fontWeight: 600 }} className="text-foreground">
                    {selectedCrop.name}
                  </h3>
                  <p className="text-muted-foreground" style={{ margin: "2px 0 0", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                    Crop Profile
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedCrop(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                style={{ background: "none", border: "none", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              <div className="flex gap-2 flex-wrap mb-6">
                {[
                  { icon: <Sprout size={11} style={{ color: "var(--primary)" }} />, label: "7+ years" },
                  { icon: <Activity size={11} style={{ color: "var(--primary)" }} />, label: `${selectedCrop.diseases.length} diagnoses` },
                ].map((b, i) => (
                  <div key={i} className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] text-foreground"
                    style={{ background: "var(--muted)", border: "1px solid var(--border)" }}>
                    {b.icon} {b.label}
                  </div>
                ))}
              </div>

              <div className="mb-6">
                <h4 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--primary)" }}>
                  <Info size={12} /> At a Glance
                </h4>
                <p className="text-[14px] leading-relaxed text-foreground">{selectedCrop.brief}</p>
              </div>

              <div className="rounded-2xl p-4 mb-6" style={{ background: "var(--muted)", border: "1px solid var(--border)" }}>
                <h4 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--primary)" }}>
                  <Sprout size={12} /> How to Plant
                </h4>
                <p className="text-[14px] leading-relaxed text-foreground">{selectedCrop.howToPlant}</p>
              </div>

              <div>
                <h4 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--primary)" }}>
                  <ShieldCheck size={12} /> Disease & Pest Monitoring
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedCrop.diseases.map((d, idx) => (
                    <span key={idx} className="rounded-full px-3.5 py-1 text-[12px] font-medium"
                      style={d === "Healthy"
                        ? { background: "rgba(46,158,104,0.12)", border: "1px solid rgba(46,158,104,0.35)", color: "var(--primary)" }
                        : { background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.25)", color: "var(--destructive)" }
                      }>
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
