import { ArrowLeft, Eye, EyeOff, Shield } from "lucide-react";
import { useState } from "react";
import ThemeToggle from "../components/ThemeToggle";
import { auth } from "../firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";

export default function Register({ onBack, onLogin, onSuccess }) {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    
    const [name, setName] = useState("");
    const [org, setOrg] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const submit = async (event) => {
        event.preventDefault();
        setError("");
        
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        
        setLoading(true);
        try {
            await createUserWithEmailAndPassword(auth, email, password);
            // In a real app we might want to store name and org in Firestore here.
            onSuccess();
        } catch (err) {
            console.error("Registration error:", err);
            if (err.code === "auth/email-already-in-use") {
                setError("Email is already registered.");
            } else if (err.code === "auth/weak-password") {
                setError("Password is too weak. Please use at least 6 characters.");
            } else if (err.code === "auth/invalid-email") {
                setError("Please enter a valid email address.");
            } else {
                setError("Failed to create account. Please try again.");
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

            <div className="mx-auto flex max-w-md items-center py-10">
                <div className="w-full">
                    <div className="mb-7 text-center">
                        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[#2563EB] text-white">
                            <Shield size={21} />
                        </div>
                        <h1 className="mt-5 text-2xl font-semibold tracking-tight">Create your account</h1>
                        <p className="mt-2 text-sm text-[#64748B] dark:text-[#94A3B8]">
                            Set up your CycloneShield workspace.
                        </p>
                    </div>

                    <form onSubmit={submit} className="rounded-2xl border border-[#E2E8F0] bg-white p-7 shadow-sm dark:border-[#263244] dark:bg-[#111827]">
                        {error && (
                            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
                                {error}
                            </div>
                        )}
                        <label className="block text-sm font-medium">Full name</label>
                        <input
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Your name"
                            className="mt-2 h-11 w-full rounded-lg border border-[#CBD5E1] bg-white px-3 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 dark:border-[#263244] dark:bg-[#172033] dark:text-[#F8FAFC] dark:placeholder-[#64748B]"
                        />

                        <label className="mt-5 block text-sm font-medium">Organization</label>
                        <input
                            required
                            value={org}
                            onChange={(e) => setOrg(e.target.value)}
                            placeholder="Organization or institution"
                            className="mt-2 h-11 w-full rounded-lg border border-[#CBD5E1] bg-white px-3 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 dark:border-[#263244] dark:bg-[#172033] dark:text-[#F8FAFC] dark:placeholder-[#64748B]"
                        />

                        <label className="mt-5 block text-sm font-medium">Email</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            className="mt-2 h-11 w-full rounded-lg border border-[#CBD5E1] bg-white px-3 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 dark:border-[#263244] dark:bg-[#172033] dark:text-[#F8FAFC] dark:placeholder-[#64748B]"
                        />

                        <label className="mt-5 block text-sm font-medium">Password</label>
                        <div className="relative mt-2">
                            <input
                                type={showPassword ? "text" : "password"}
                                required
                                minLength={8}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Minimum 8 characters"
                                className="h-11 w-full rounded-lg border border-[#CBD5E1] bg-white px-3 pr-11 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 dark:border-[#263244] dark:bg-[#172033] dark:text-[#F8FAFC] dark:placeholder-[#64748B]"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((value) => !value)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B]"
                            >
                                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                            </button>
                        </div>

                        <label className="mt-5 block text-sm font-medium">Confirm password</label>
                        <div className="relative mt-2">
                            <input
                                type={showConfirm ? "text" : "password"}
                                required
                                minLength={8}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Repeat your password"
                                className="h-11 w-full rounded-lg border border-[#CBD5E1] bg-white px-3 pr-11 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 dark:border-[#263244] dark:bg-[#172033] dark:text-[#F8FAFC] dark:placeholder-[#64748B]"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirm((value) => !value)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B]"
                            >
                                {showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
                            </button>
                        </div>

                        <label className="mt-5 flex items-start gap-2 text-xs leading-5 text-[#64748B] dark:text-[#94A3B8]">
                            <input required type="checkbox" className="mt-1 rounded border-[#CBD5E1] dark:border-[#263244] dark:bg-[#172033]" />
                            <span>I agree to the CycloneShield terms and responsible-use guidelines.</span>
                        </label>

                        <button
                            type="submit"
                            disabled={loading}
                            className="mt-6 h-11 w-full rounded-lg bg-[#2563EB] text-sm font-semibold text-white hover:bg-[#1D4ED8] disabled:opacity-50"
                        >
                            {loading ? "Creating account..." : "Create account"}
                        </button>

                        <p className="mt-6 text-center text-sm text-[#64748B] dark:text-[#94A3B8]">
                            Already have an account?{" "}
                            <button type="button" onClick={onLogin} className="font-semibold text-[#2563EB] hover:underline">
                                Sign in
                            </button>
                        </p>
                    </form>
                </div>
            </div>
        </main>
    );
}