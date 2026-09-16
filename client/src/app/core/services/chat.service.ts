import { Injectable, computed, inject, signal } from '@angular/core';
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
  private audioCtx: AudioContext | null = null;

  readonly directory = signal<DirectoryUser[]>([]);
  readonly onlineUserIds = signal<Set<string>>(new Set());
  readonly activeUserId = signal<string | null>(null);
  readonly messages = signal<ChatMessage[]>([]);
  readonly unreadUserIds = signal<Set<string>>(new Set());
  readonly totalUnread = computed(() => this.unreadUserIds().size);

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

      // Only react to messages someone else sent TO me (skip the echo of my own sends).
      const isIncomingToMe = message.to === me && message.from !== me;
      if (isIncomingToMe) {
        this.playNotificationSound();
        if (!belongsToActiveConversation) {
          this.unreadUserIds.update((set) => new Set(set).add(message.from));
        }
      }
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.onlineUserIds.set(new Set());
    this.activeUserId.set(null);
    this.messages.set([]);
    this.unreadUserIds.set(new Set());
  }

  loadDirectory() {
    return this.http.get<ApiResponse<{ users: DirectoryUser[] }>>(`${environment.apiUrl}/users/directory`);
  }

  openConversation(userId: string) {
    this.activeUserId.set(userId);
    this.messages.set([]);
    this.unreadUserIds.update((set) => {
      if (!set.has(userId)) return set;
      const next = new Set(set);
      next.delete(userId);
      return next;
    });
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

  // Short synthesized beep - no audio file to bundle/host. Silently no-ops if
  // the browser blocks audio before a user gesture has happened yet.
  private playNotificationSound(): void {
    try {
      this.audioCtx ??= new AudioContext();
      const ctx = this.audioCtx;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.value = 880;
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.25);
    } catch {
      // Audio is a nice-to-have, never worth breaking chat over.
    }
  }
}
