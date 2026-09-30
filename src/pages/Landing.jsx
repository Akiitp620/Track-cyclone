import { ArrowRight, ChevronRight, Shield, Satellite, Brain } from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";

export default function Landing({ onLaunch, onSignIn }) {
    return (
        <main className="min-h-screen bg-[#F8FAFC] text-[#111827] dark:bg-[#0B1220] dark:text-[#F8FAFC]">
            <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
                <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#2563EB] text-white">
                        <Shield size={19} />
                    </div>
                    <span className="text-lg font-semibold tracking-tight">CycloneShield AI</span>
                </button>

                <div className="hidden items-center gap-8 text-sm text-[#64748B] dark:text-[#94A3B8] md:flex">
                    <a href="#platform" className="hover:text-[#111827] dark:hover:text-[#F8FAFC]">Platform</a>
                    <a href="#workflow" className="hover:text-[#111827] dark:hover:text-[#F8FAFC]">How it works</a>
                    <button onClick={onSignIn} className="hover:text-[#111827] dark:hover:text-[#F8FAFC]">Sign in</button>
                </div>

                <div className="flex items-center gap-3">
                    <ThemeToggle />
                    <button
                        onClick={onLaunch}
                        className="flex items-center gap-2 rounded-lg bg-[#111827] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1F2937] dark:bg-[#F8FAFC] dark:text-[#111827] dark:hover:bg-[#E2E8F0]"
                    >
                        Launch Simulator
                        <ArrowRight size={15} />
                    </button>
                </div>
            </nav>

            <section className="mx-auto grid max-w-7xl items-center gap-14 px-6 pb-24 pt-20 lg:grid-cols-[1.05fr_.95fr]">
                <div>
                    <p className="mb-5 text-xs font-semibold uppercase tracking-[0.18em] text-[#2563EB]">
                        AI-powered disaster decision support
                    </p>

                    <h1 className="max-w-3xl text-5xl font-semibold leading-[1.05] tracking-[-0.04em] sm:text-6xl">
                        Understand cyclone impact before it reaches the ground.
                    </h1>

                    <p className="mt-6 max-w-xl text-lg leading-8 text-[#64748B] dark:text-[#94A3B8]">
                        Simulate cyclone scenarios, identify exposed infrastructure,
                        and turn risk signals into pre-landfall action plans.
                    </p>

                    <div className="mt-8 flex flex-wrap gap-3">
                        <button
                            onClick={onLaunch}
                            className="flex items-center gap-2 rounded-lg bg-[#2563EB] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1D4ED8]"
                        >
                            Launch Simulator
                            <ArrowRight size={16} />
                        </button>

                        <a
                            href="#workflow"
                            className="rounded-lg border border-[#CBD5E1] bg-white px-5 py-3 text-sm font-semibold text-[#111827] hover:bg-[#F1F5F9] dark:border-[#263244] dark:bg-[#111827] dark:text-[#F8FAFC] dark:hover:bg-[#172033]"
                        >
                            Explore platform
                        </a>
                    </div>
                </div>

                <div className="rounded-2xl border border-[#CBD5E1] bg-[#0B1220] p-5 shadow-xl dark:border-[#263244]">
                    <div className="mb-4 flex items-center justify-between text-xs text-[#94A3B8]">
                        <span>LIVE SCENARIO</span>
                        <span className="rounded-full bg-[#16A34A]/15 px-2 py-1 text-[#4ADE80]">SIMULATION</span>
                    </div>

                    <div className="relative h-[360px] overflow-hidden rounded-xl bg-[#111827]">
                        <div className="absolute inset-0 opacity-20"
                            style={{
                                backgroundImage:
                                    "linear-gradient(#64748B 1px, transparent 1px), linear-gradient(90deg, #64748B 1px, transparent 1px)",
                                backgroundSize: "40px 40px"
                            }}
                        />

                        <div className="absolute left-[25%] top-[58%] h-40 w-40 rounded-full border border-[#DC2626]/50 bg-[#DC2626]/10" />
                        <div className="absolute left-[42%] top-[43%] h-3 w-3 rounded-full bg-[#DC2626] shadow-[0_0_20px_#DC2626]" />
                        <div className="absolute left-[45%] top-[45%] h-32 w-1 rotate-[48deg] bg-[#F59E0B]/60" />

                        <div className="absolute bottom-5 left-5 rounded-lg border border-white/10 bg-[#0B1220]/90 p-3 text-xs">
                            <div className="text-[#94A3B8]">Infrastructure exposure</div>
                            <div className="mt-1 text-lg font-semibold text-white">18 critical assets</div>
                        </div>
                    </div>
                </div>
            </section>

            <section id="platform" className="border-y border-[#E2E8F0] bg-white dark:border-[#263244] dark:bg-[#111827]">
                <div className="mx-auto grid max-w-7xl gap-px bg-[#E2E8F0] md:grid-cols-3 dark:bg-[#263244]">
                    {[
                        [Satellite, "Scenario Simulation", "Change cyclone intensity, rainfall and track to evaluate impact."],
                        [Shield, "Infrastructure Risk", "Map critical assets and quantify exposure using a deterministic risk engine."],
                        [Brain, "AI Operational Briefing", "Convert validated risk signals into clear pre-landfall actions."]
                    ].map(([Icon, title, description]) => (
                        <article key={title} className="bg-white p-8 dark:bg-[#111827]">
                            <Icon size={21} className="text-[#2563EB]" />
                            <h2 className="mt-5 text-lg font-semibold">{title}</h2>
                            <p className="mt-2 text-sm leading-6 text-[#64748B] dark:text-[#94A3B8]">{description}</p>
                        </article>
                    ))}
                </div>
            </section>

            <section id="workflow" className="mx-auto max-w-7xl px-6 py-24">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#64748B] dark:text-[#94A3B8]">Decision workflow</p>
                <div className="mt-8 flex flex-wrap items-center gap-3 text-sm font-medium">
                    {["Cyclone scenario", "Hazard model", "Infrastructure exposure", "Risk assessment", "Action plan"].map((item, index) => (
                        <div key={item} className="flex items-center gap-3">
                            <span className="rounded-lg border border-[#CBD5E1] bg-white px-4 py-3 dark:border-[#263244] dark:bg-[#111827]">{item}</span>
                            {index < 4 && <ChevronRight size={16} className="text-[#94A3B8]" />}
                        </div>
                    ))}
                </div>
            </section>

            <footer className="border-t border-[#E2E8F0] bg-[#0B1220] px-6 py-10 text-sm text-[#94A3B8] dark:border-[#263244]">
                <div className="mx-auto flex max-w-7xl flex-col justify-between gap-3 sm:flex-row">
                    <span className="font-medium text-white">CycloneShield AI</span>
                    <span>Gemini · Earth Engine · BigQuery · Vertex AI</span>
                </div>
            </footer>
        </main>
    );
}