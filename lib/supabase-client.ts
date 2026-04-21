import { createClient } from '@supabase/supabase-js';

let browserSupabaseClient: ReturnType<typeof createClient> | null = null;
let missingEnvWarningShown = false;

function createUnavailableSupabaseClient(errorMessage: string) {
	const error = new Error(errorMessage);

	const unavailableResult = {
		data: null,
		error,
		count: null,
		status: 0,
		statusText: errorMessage,
	};

	const createChain = (): any => new Proxy(function unavailableSupabaseMethod() {}, {
		get(_target, property) {
			if (property === 'then') {
				return (resolve: (value: typeof unavailableResult) => void) => resolve(unavailableResult);
			}

			if (property === 'catch') {
				return () => createChain();
			}

			if (property === 'finally') {
				return (callback?: () => void) => {
					callback?.();
					return createChain();
				};
			}

			return createChain();
		},
		apply() {
			return createChain();
		},
	});

	return new Proxy({} as ReturnType<typeof createClient>, {
		get() {
			return createChain();
		},
	});
}

function getSupabaseClient() {
	if (browserSupabaseClient) {
		return browserSupabaseClient;
	}

	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

	if (!supabaseUrl || !supabaseKey) {
		if (!missingEnvWarningShown) {
			console.warn('Supabase browser environment variables are not set');
			missingEnvWarningShown = true;
		}

		return createUnavailableSupabaseClient('Supabase browser environment variables are not set');
	}

	browserSupabaseClient = createClient(supabaseUrl, supabaseKey);
	return browserSupabaseClient;
}

export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
	get(_target, property) {
		const client = getSupabaseClient() as Record<PropertyKey, unknown>;
		const value = client[property];
		return typeof value === 'function' ? value.bind(client) : value;
	},
});
