import { ArrowLeft, Eye, EyeOff, Shield } from "lucide-react";
import { useState } from "react";
import ThemeToggle from "../components/ThemeToggle";
import { auth } from "../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";

export default function Login({ onBack, onRegister, onSuccess }) {
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const submit = async (event) => {
        event.preventDefault();
        setError("");
        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            onSuccess();
        } catch (err) {
            console.error("Login error:", err);
            if (err.code === "auth/user-not-found" || err.code === "auth/invalid-credential" || err.code === "auth/wrong-password") {
                setError("Invalid email or password.");
            } else if (err.code === "auth/invalid-email") {
                setError("Please enter a valid email address.");
            } else {
                setError("Failed to sign in. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-[#F8FAFC] px-6 py-8 text-[#111827] dark:bg-[#0B1220] dark:text-[#F8FAFC]">
            <div className="flex items-center justify-between">
                <button onClick={onBack} className="flex items-center gap-2 text-sm text-[#64748B] hover:text-[#111827] dark:text-[#94A3B8] dark:hover:text-[#F8FAFC]">
                    <ArrowLeft size={16} /> Back
                </button>
                <ThemeToggle />
            </div>

            <div className="mx-auto flex min-h-[calc(100vh-100px)] max-w-md items-center">
                <div className="w-full">
                    <div className="mb-8 text-center">
                        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[#2563EB] text-white">
                            <Shield size={21} />
                        </div>
                        <h1 className="mt-5 text-2xl font-semibold tracking-tight">Sign in to CycloneShield</h1>
                        <p className="mt-2 text-sm text-[#64748B] dark:text-[#94A3B8]">
                            Access your disaster decision-support workspace.
                        </p>
                    </div>

                    <form onSubmit={submit} className="rounded-2xl border border-[#E2E8F0] bg-white p-7 shadow-sm dark:border-[#263244] dark:bg-[#111827]">
                        {error && (
                            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
                                {error}
                            </div>
                        )}
                        <label className="block text-sm font-medium">Email</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            className="mt-2 h-11 w-full rounded-lg border border-[#CBD5E1] bg-white px-3 text-sm outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 dark:border-[#263244] dark:bg-[#172033] dark:text-[#F8FAFC] dark:placeholder-[#64748B]"
                        />

                        <div className="mt-5 flex items-center justify-between">
                            <label className="text-sm font-medium">Password</label>
                            <button type="button" className="text-xs font-medium text-[#2563EB] hover:underline">
                                Forgot password?
                            </button>
                        </div>

                        <div className="relative mt-2">
                            <input
                                type={showPassword ? "text" : "password"}
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                className="h-11 w-full rounded-lg border border-[#CBD5E1] bg-white px-3 pr-11 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 dark:border-[#263244] dark:bg-[#172033] dark:text-[#F8FAFC] dark:placeholder-[#64748B]"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((value) => !value)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B]"
                                aria-label="Toggle password visibility"
                            >
                                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                            </button>
                        </div>

                        <label className="mt-5 flex items-center gap-2 text-sm text-[#64748B] dark:text-[#94A3B8]">
                            <input type="checkbox" className="rounded border-[#CBD5E1] dark:border-[#263244] dark:bg-[#172033]" />
                            Remember me
                        </label>

                        <button
                            type="submit"
                            disabled={loading}
                            className="mt-6 h-11 w-full rounded-lg bg-[#2563EB] text-sm font-semibold text-white hover:bg-[#1D4ED8] disabled:opacity-50"
                        >
                            {loading ? "Signing in..." : "Sign in"}
                        </button>

                        <p className="mt-6 text-center text-sm text-[#64748B] dark:text-[#94A3B8]">
                            Don't have an account?{" "}
                            <button type="button" onClick={onRegister} className="font-semibold text-[#2563EB] hover:underline">
                                Create account
                            </button>
                        </p>
                    </form>
                </div>
            </div>
        </main>
    );
}