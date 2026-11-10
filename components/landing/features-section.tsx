import { Camera, Brain, LineChart, History, MessageCircle, Shield } from "lucide-react";

const features = [
  {
    icon: Camera,
    title: "AI Disease Detection",
    description:
      "Scan images with YOLOv8 to identify pathogens like Early Blight with high confidence and instant results.",
    tag: "Core feature",
    num: "01",
    featured: true,
  },
  {
    icon: LineChart,
    title: "Spread Analysis",
    description:
      "Upload up to 4 images for multi-angle assessment of disease stage and affected area.",
    num: "02",
    tall: true,
  },
  {
    icon: Brain,
    title: "Seasonal Care Tips",
    description:
      "AI-generated monthly advice tailored to current weather and your plant species.",
    num: "03",
  },
  {
    icon: History,
    title: "Care Scheduling",
    description:
      "Manage watering, fertilizing, and pruning with auto-calculated due dates.",
    num: "04",
  },
  {
    icon: MessageCircle,
    title: "Contextual AI Chat",
    description:
      "Expert plant advice that automatically knows your scan results for smarter answers.",
    num: "05",
  },
  {
    icon: Shield,
    title: "Smart Notifications",
    description:
      "Real-time alerts for health declines, care reminders, and weekly progress reports.",
    num: "06",
  },
];

function ScanMockup() {
  return (
    <div className="mt-6 flex flex-1 flex-col gap-2 rounded-xl border border-[rgba(74,140,92,0.1)] bg-gradient-to-br from-[rgba(74,140,92,0.07)] to-[rgba(166,231,207,0.12)] p-4">
      <div className="h-[7px] w-[90%] rounded-full bg-[rgba(74,140,92,0.45)]" />
      <div className="h-[7px] w-[70%] rounded-full bg-[rgba(74,140,92,0.45)]" />
      <div className="h-[7px] w-[55%] rounded-full bg-[rgba(74,140,92,0.18)]" />
      <div className="mt-1 rounded-lg border-l-[2.5px] border-[#3d7a52] bg-[rgba(166,231,207,0.2)] px-3 py-2">
        <p className="text-[11px] font-medium text-[#3d7a52]">Early Blight — 92%</p>
        <p className="mt-0.5 text-[10px] text-[#6b7a6e]">Stage 2 · 14% area affected</p>
      </div>
    </div>
  );
}

export function FeaturesSection() {
  const [featured, ...rest] = features;
  const tall = rest[0];
  const small = rest.slice(1);

  return (
    <section id="features" className="bg-[#E0ECDE] px-12 py-20">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-14">
          <div className="mb-4 flex items-center gap-2">
            <span className="h-[1.5px] w-6 bg-[#3d7a52]" />
            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#3d7a52]">
              Features
            </span>
          </div>
          <h2
            className="max-w-[480px] font-serif text-[clamp(1.9rem,4vw,2.8rem)] font-bold leading-[1.18] text-[#0e2a1e]"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Everything to protect your{" "}
            <em className="italic text-[#3d7a52]">plants</em>
          </h2>
          <p className="mt-3 max-w-[420px] text-[14px] leading-[1.65] text-[#6b7a6e]">
            From instant detection to personalised care plans — all in one place.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-3 grid-rows-2 gap-[14px]">

          {/* Featured wide card */}
          <div className="relative col-span-2 flex items-center gap-8 overflow-hidden rounded-[20px] border border-[#0e2a1e] bg-[#0e2a1e] p-7 transition-all duration-300 hover:-translate-y-[3px] hover:shadow-xl">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[rgba(166,231,207,0.15)]">
              <featured.icon className="h-[22px] w-[22px] stroke-[#a6e7cf]" strokeWidth={1.8} />
            </div>
            <div>
              <span className="mb-2 inline-block rounded-full bg-[rgba(166,231,207,0.15)] px-3 py-[3px] text-[10px] font-medium uppercase tracking-[0.06em] text-[#a6e7cf]">
                {featured.tag}
              </span>
              <h3 className="mb-1.5 text-[15px] font-medium text-white">{featured.title}</h3>
              <p className="text-[13px] leading-[1.65] text-[rgba(255, 255, 255, 0.55)]">
                {featured.description}
              </p>
            </div>
            <span
              className="pointer-events-none absolute right-6 top-5 text-[3.5rem] font-bold leading-none text-[rgba(166,231,207,0.08)]"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              {featured.num}
            </span>
          </div>

          {/* Tall card — spans 2 rows */}
          <div className="relative row-span-2 flex flex-col overflow-hidden rounded-[20px] border border-[rgba(61,122,82,0.14)] bg-white p-7 transition-all duration-300 hover:-translate-y-[3px] hover:shadow-md">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[rgba(74,140,92,0.1)]">
              <tall.icon className="h-[22px] w-[22px] stroke-[#3d7a52]" strokeWidth={1.8} />
            </div>
            <h3 className="mb-2 mt-4 text-[15px] font-medium text-[#0e2a1e]">{tall.title}</h3>
            <p className="text-[13px] leading-[1.65] text-[#6b7a6e]">{tall.description}</p>
            <ScanMockup />
            <span
              className="pointer-events-none absolute right-6 top-5 text-[3.5rem] font-bold leading-none text-[rgba(74,140,92,0.12)]"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              {tall.num}
            </span>
          </div>

          {/* 4 small cards */}
          {small.map((f) => (
            <div
              key={f.num}
              className="relative overflow-hidden rounded-[20px] border border-[rgba(61,122,82,0.14)] bg-white p-7 transition-all duration-300 hover:-translate-y-[3px] hover:shadow-md"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[rgba(74,140,92,0.1)]">
                <f.icon className="h-[22px] w-[22px] stroke-[#3d7a52]" strokeWidth={1.8} />
              </div>
              <h3 className="mb-2 text-[15px] font-medium text-[#0e2a1e]">{f.title}</h3>
              <p className="text-[13px] leading-[1.65] text-[#6b7a6e]">{f.description}</p>
              <span
                className="pointer-events-none absolute right-6 top-5 text-[3.5rem] font-bold leading-none text-[rgba(74,140,92,0.12)]"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {f.num}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}