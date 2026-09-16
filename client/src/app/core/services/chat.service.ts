import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { ApiResponse, PagedResult } from '../models/api-response.model';
import { ChatMessage } from '../models/message.model';
import { DirectoryUser } from '../models/chat-user.model';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private socket: Socket | null = null;

  readonly directory = signal<DirectoryUser[]>([]);
  readonly onlineUserIds = signal<Set<string>>(new Set());
  readonly activeUserId = signal<string | null>(null);
  readonly messages = signal<ChatMessage[]>([]);

  connect(): void {
    if (this.socket) return;
    const token = this.auth.getToken();
    if (!token) return;

    this.socket = io(environment.socketUrl, { auth: { token } });

    this.socket.on('online-users', (ids: string[]) => {
      this.onlineUserIds.set(new Set(ids));
    });

    this.socket.on('new-message', (message: ChatMessage) => {
      const me = this.auth.currentUser()?._id;
      const active = this.activeUserId();
      const belongsToActiveConversation =
        !!active &&
        ((message.from === active && message.to === me) || (message.to === active && message.from === me));

      if (belongsToActiveConversation) {
        this.messages.set([...this.messages(), message]);
      }
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.onlineUserIds.set(new Set());
    this.activeUserId.set(null);
    this.messages.set([]);
  }

  loadDirectory() {
    return this.http.get<ApiResponse<{ users: DirectoryUser[] }>>(`${environment.apiUrl}/users/directory`);
  }

  openConversation(userId: string) {
    this.activeUserId.set(userId);
    this.messages.set([]);
    return this.http.get<ApiResponse<{ messages: ChatMessage[] } & PagedResult>>(
      `${environment.apiUrl}/messages/${userId}?limit=50`
    );
  }

  closeConversation(): void {
    this.activeUserId.set(null);
    this.messages.set([]);
  }

  sendMessage(text: string): void {
    const to = this.activeUserId();
    const trimmed = text.trim();
    if (!to || !trimmed || !this.socket) return;

    this.socket.emit('send-message', { to, text: trimmed }, (res: { error?: string }) => {
      if (res?.error) {
        console.error('Message failed:', res.error);
      }
    });
  }
}
