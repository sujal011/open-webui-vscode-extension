import { EventEmitter } from 'node:events';
import { io, Socket } from 'socket.io-client';

export type OpenWebuiUser = {
	id: string;
	name: string;
	email: string;
	role: string;
	token?: string;
};

export type OpenWebuiModel = {
	id: string;
	name?: string;
	info?: {
		meta?: {
			capabilities?: Record<string, boolean>;
		};
		params?: Record<string, unknown>;
	};
	direct?: boolean;
};

export type OpenWebuiChatSummary = {
	id: string;
	title: string;
	updated_at?: number;
	created_at?: number;
};

export type ChatMessage = {
	id: string;
	role: 'system' | 'user' | 'assistant';
	content: string;
	parentId?: string | null;
	childrenIds?: string[];
	model?: string;
	done?: boolean;
	timestamp?: number;
	files?: unknown[];
};

export type ChatCompletionRequest = {
	stream?: boolean;
	model: string;
	messages?: Array<Record<string, unknown>>;
	chat_id?: string;
	id: string;
	parent_id: string | null;
	user_message: ChatMessage;
	session_id?: string;
	model_item?: OpenWebuiModel;
	features?: Record<string, unknown>;
	tool_servers?: unknown[];
	background_tasks?: Record<string, boolean>;
};

export type OpenWebuiSocketEvent = {
	chat_id: string;
	message_id: string;
	data: {
		type: string;
		data?: unknown;
	};
};

export class OpenWebuiClient extends EventEmitter {
	private socket: Socket | null = null;
	private heartbeat: NodeJS.Timeout | null = null;

	constructor(
		private readonly baseUrl: string,
		private token: string
	) {
		super();
	}

	get socketId(): string | undefined {
		return this.socket?.id;
	}

	setToken(token: string) {
		this.token = token;
	}

	async signIn(email: string, password: string): Promise<OpenWebuiUser> {
		const user = await this.request<OpenWebuiUser>('/api/v1/auths/signin', {
			method: 'POST',
			body: JSON.stringify({ email, password }),
			auth: false
		});
		if (user.token) {
			this.token = user.token;
		}
		return user;
	}

	async getSessionUser(): Promise<OpenWebuiUser> {
		return this.request<OpenWebuiUser>('/api/v1/auths/');
	}

	async getModels(): Promise<OpenWebuiModel[]> {
		const response = await this.request<{ data?: OpenWebuiModel[] } | OpenWebuiModel[]>('/api/models');
		return Array.isArray(response) ? response : response.data ?? [];
	}

	async getChats(page = 1): Promise<OpenWebuiChatSummary[]> {
		return this.request<OpenWebuiChatSummary[]>(`/api/v1/chats/?page=${page}`);
	}

	async sendChatCompletion(body: ChatCompletionRequest): Promise<Record<string, unknown>> {
		return this.request<Record<string, unknown>>('/api/chat/completions', {
			method: 'POST',
			body: JSON.stringify(body)
		});
	}

	connectSocket() {
		if (this.socket) {
			return;
		}

		this.socket = io(this.baseUrl, {
			reconnection: true,
			reconnectionDelay: 1000,
			reconnectionDelayMax: 5000,
			path: '/ws/socket.io',
			transports: ['websocket', 'polling'],
			auth: { token: this.token }
		});

		this.socket.on('connect', () => {
			this.emit('socket:connect', { socketId: this.socket?.id });
			this.startHeartbeat();
		});

		this.socket.on('disconnect', (reason) => {
			this.emit('socket:disconnect', { reason });
			this.stopHeartbeat();
		});

		this.socket.on('connect_error', (error) => {
			this.emit('socket:error', { message: error.message });
		});

		this.socket.on('events', (event: OpenWebuiSocketEvent) => {
			this.emit('event', event);
		});
	}

	disconnectSocket() {
		this.stopHeartbeat();
		this.socket?.disconnect();
		this.socket = null;
	}

	private startHeartbeat() {
		this.stopHeartbeat();
		this.heartbeat = setInterval(() => {
			if (this.socket?.connected) {
				this.socket.emit('heartbeat', {});
			}
		}, 30000);
	}

	private stopHeartbeat() {
		if (this.heartbeat) {
			clearInterval(this.heartbeat);
			this.heartbeat = null;
		}
	}

	private async request<T>(
		path: string,
		options: RequestInit & { auth?: boolean } = {}
	): Promise<T> {
		const headers = new Headers(options.headers);
		if (!headers.has('Content-Type') && options.body) {
			headers.set('Content-Type', 'application/json');
		}
		if (options.auth !== false && this.token) {
			headers.set('Authorization', `Bearer ${this.token}`);
		}

		const response = await fetch(`${this.baseUrl}${path}`, {
			...options,
			headers
		});

		if (!response.ok) {
			const payload = await response.json().catch(() => null);
			const detail = payload?.detail ?? payload?.error ?? response.statusText;
			throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
		}

		return response.json() as Promise<T>;
	}
}
