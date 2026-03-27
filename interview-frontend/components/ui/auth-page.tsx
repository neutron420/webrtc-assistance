'use client';
import { Logo } from '../hero-section-1';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from './input';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/api-client';
import { Button } from './button';
import { useRouter } from 'next/navigation';

import {
	AtSign,
	ChevronLeft,
	Grid2x2Plus,
	Lock,
	User,
	Loader2,
} from 'lucide-react';

interface AuthPageProps {
	mode?: 'login' | 'signup';
}

export function AuthPage({ mode: initialMode = 'login' }: AuthPageProps) {
	const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const router = useRouter();

	const [formData, setFormData] = useState({
		name: '',
		email: '',
		password: '',
	});

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);
		setError(null);

		const endpoint = mode === 'login' ? '/user/login' : '/user/register';

		try {
			const body = mode === 'login' 
				? { email: formData.email, password: formData.password }
				: { name: formData.name, email: formData.email, password: formData.password };

			const data = await apiFetch(endpoint, {
				method: 'POST',
				body: JSON.stringify(body),
			});

			localStorage.setItem('user', JSON.stringify(data));
			router.push('/dashboard');
		} catch (err: any) {
			setError(err.message);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<main className="relative min-h-screen flex flex-col justify-center items-center bg-white text-zinc-900">
			{/* Background Decoration */}
			<div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none">
				<FloatingPaths position={1} />
				<FloatingPaths position={-1} />
			</div>

			<Button variant="ghost" className="absolute top-8 left-8 hover:bg-zinc-100 transition-all group text-zinc-600" asChild>
				<a href="/">
					<ChevronLeft className='size-4 me-2 group-hover:-translate-x-1 transition-transform' />
					Back to Home
				</a>
			</Button>

			<div className="relative z-10 w-full max-w-[400px] px-8 py-12 space-y-8 bg-white/80 backdrop-blur-sm rounded-2xl">
				<div className="flex flex-col items-center gap-4 mb-4">
					<div className="p-3 bg-white rounded-xl border border-zinc-200 shadow-sm">
						<Logo className="h-6 w-auto" />
					</div>
				</div>

				<div className="flex flex-col space-y-2 text-center">
					<h1 className="text-3xl font-bold tracking-tight text-zinc-900">
						{mode === 'login' ? 'Welcome Back' : 'Create Account'}
					</h1>
					<p className="text-zinc-500 text-sm">
						{mode === 'login' 
							? 'Enter your credentials to access your account' 
							: 'Join us and start your AI-powered interview prep today'}
					</p>
				</div>

				<div className="space-y-3">
					<Button type="button" className="w-full py-6 flex items-center justify-center gap-3 h-auto bg-white hover:bg-zinc-50 text-zinc-900 border border-zinc-200 transition-all active:scale-[0.98]">
						<GoogleIcon className="size-5" />
						<span className="font-semibold">Continue with Google</span>
					</Button>
					<Button type="button" className="w-full py-6 flex items-center justify-center gap-3 h-auto bg-white hover:bg-zinc-50 text-zinc-900 border border-zinc-200 transition-all active:scale-[0.98]">
						<GithubIcon className="size-5" />
						<span className="font-semibold">Continue with GitHub</span>
					</Button>
				</div>

				<AuthSeparator />

				<form onSubmit={handleSubmit} className="space-y-5">
					{error && (
						<div className="bg-red-50 border border-red-100 text-red-600 text-sm p-3 rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
							<span className="size-1.5 rounded-full bg-red-600" />
							{error}
						</div>
					)}

					<div className="space-y-4">
						<AnimatePresence mode="popLayout">
							{mode === 'signup' && (
								<motion.div 
									initial={{ opacity: 0, height: 0, y: -10 }}
									animate={{ opacity: 1, height: 'auto', y: 0 }}
									exit={{ opacity: 0, height: 0, y: -10 }}
									className="space-y-2"
								>
									<label className="text-sm font-medium leading-none text-zinc-700">
										Full Name
									</label>
									<div className="relative">
										<Input
											placeholder="John Doe"
											className="ps-10 h-11 bg-zinc-50 border-zinc-200 focus:bg-white text-zinc-900 placeholder:text-zinc-400 transition-all"
											required
											value={formData.name}
											onChange={(e) => setFormData({...formData, name: e.target.value})}
										/>
										<div className="text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2">
											<User className="size-4" />
										</div>
									</div>
								</motion.div>
							)}
						</AnimatePresence>

						<div className="space-y-2">
							<label className="text-sm font-medium leading-none text-zinc-700">
								Email Address
							</label>
							<div className="relative">
								<Input
									placeholder="name@example.com"
									className="ps-10 h-11 bg-zinc-50 border-zinc-200 focus:bg-white text-zinc-900 placeholder:text-zinc-400 transition-all"
									type="email"
									required
									value={formData.email}
									onChange={(e) => setFormData({...formData, email: e.target.value})}
								/>
								<div className="text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2">
									<AtSign className="size-4" />
								</div>
							</div>
						</div>

						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<label className="text-sm font-medium leading-none text-zinc-700">
									Password
								</label>
								{mode === 'login' && (
									<a href="#" className="text-xs text-zinc-500 hover:text-zinc-900 hover:underline font-medium">
										Forgot password?
									</a>
								)}
							</div>
							<div className="relative">
								<Input
									placeholder="••••••••"
									className="ps-10 h-11 bg-zinc-50 border-zinc-200 focus:bg-white text-zinc-900 placeholder:text-zinc-400 transition-all"
									type="password"
									required
									value={formData.password}
									onChange={(e) => setFormData({...formData, password: e.target.value})}
								/>
								<div className="text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2">
									<Lock className="size-4" />
								</div>
							</div>
						</div>
					</div>

					<Button type="submit" className="w-full h-11 text-base font-semibold bg-zinc-900 text-white hover:bg-zinc-800 shadow-xl shadow-zinc-200 active:scale-[0.98] transition-all" disabled={isLoading}>
						{isLoading ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Please wait
							</>
						) : (
							mode === 'login' ? 'Sign In' : 'Create Account'
						)}
					</Button>
				</form>

				<div className="text-center space-y-4">
					<p className="text-sm text-zinc-500">
						{mode === 'login' ? "Don't have an account?" : "Already have an account?"}{' '}
						<button 
							onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
							className="text-zinc-900 hover:underline font-semibold"
						>
							{mode === 'login' ? 'Sign up' : 'Log in'}
						</button>
					</p>
					
					<p className="text-xs text-zinc-400 tracking-wide leading-relaxed">
						By continuing, you agree to our{' '}
						<a href="#" className="hover:text-zinc-900 transition-colors">Terms</a>
						{' '}&{' '} 
						<a href="#" className="hover:text-zinc-900 transition-colors">Privacy</a>
					</p>
				</div>
			</div>
		</main>
	);
}

function FloatingPaths({ position }: { position: number }) {
	const [mounted, setMounted] = React.useState(false);

	React.useEffect(() => {
		setMounted(true);
	}, []);

	const paths = Array.from({ length: 36 }, (_, i) => ({
		id: i,
		d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${
			380 - i * 5 * position
		} -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${
			152 - i * 5 * position
		} ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${
			684 - i * 5 * position
		} ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
		color: `rgba(255,255,255,${0.05 + i * 0.01})`,
		width: 0.5 + i * 0.03,
		duration: 20 + Math.random() * 10,
	}));

	if (!mounted) {
		return <div className="pointer-events-none absolute inset-0" aria-hidden="true" />;
	}

	return (
		<div className="pointer-events-none absolute inset-0">
			<svg
				className="h-full w-full text-white"
				viewBox="0 0 696 316"
				fill="none"
			>
				<title>Background Paths</title>
				{paths.map((path) => (
					<motion.path
						key={path.id}
						d={path.d}
						stroke="currentColor"
						strokeWidth={path.width}
						strokeOpacity={0.1 + path.id * 0.03}
						initial={{ pathLength: 0.3, opacity: 0.6 }}
						animate={{
							pathLength: 1,
							opacity: [0.3, 0.6, 0.3],
							pathOffset: [0, 1, 0],
						}}
						transition={{
							duration: path.duration,
							repeat: Number.POSITIVE_INFINITY,
							ease: 'linear',
						}}
					/>
				))}
			</svg>
		</div>
	);
}

const GoogleIcon = (props: React.ComponentProps<'svg'>) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		fill="currentColor"
		{...props}
	>
		<g>
			<path d="M12.479,14.265v-3.279h11.049c0.108,0.571,0.164,1.247,0.164,1.979c0,2.46-0.672,5.502-2.84,7.669   C18.744,22.829,16.051,24,12.483,24C5.869,24,0.308,18.613,0.308,12S5.869,0,12.483,0c3.659,0,6.265,1.436,8.223,3.307L18.392,5.62   c-1.404-1.317-3.307-2.341-5.913-2.341C7.65,3.279,3.873,7.171,3.873,12s3.777,8.721,8.606,8.721c3.132,0,4.916-1.258,6.059-2.401   c0.927-0.927,1.537-2.251,1.777-4.059L12.479,14.265z" />
		</g>
	</svg>
);

const GithubIcon = (props: React.ComponentProps<'svg'>) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		{...props}
	>
		<path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.28 1.15-.28 2.35 0 3.5-.73 1.02-1.08 2.25-1 3.5 0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
		<path d="M9 18c-4.51 2-5-2-7-2" />
	</svg>
);

const AppleIcon = (props: React.ComponentProps<'svg'>) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		{...props}
	>
		<path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z" />
		<path d="M10 2c1 .5 2 2 2 5" />
	</svg>
);

const AuthSeparator = () => {
	return (
		<div className="flex w-full items-center justify-center gap-4 py-2">
			<div className="bg-border h-px flex-1 opacity-50" />
			<span className="text-muted-foreground/60 text-[10px] font-bold uppercase tracking-widest">Or continue with</span>
			<div className="bg-border h-px flex-1 opacity-50" />
		</div>
	);
};
