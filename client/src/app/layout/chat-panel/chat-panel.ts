import { Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ChatService } from '../../core/services/chat.service';
import { DirectoryUser } from '../../core/models/chat-user.model';

@Component({
  selector: 'app-chat-panel',
  imports: [FormsModule],
  templateUrl: './chat-panel.html',
  styleUrl: './chat-panel.css',
})
export class ChatPanel {
  auth = inject(AuthService);
  chat = inject(ChatService);

  open = signal(false);
  draftText = '';

  private scrollAnchor = viewChild<ElementRef<HTMLDivElement>>('scrollAnchor');

  activeUser = computed<DirectoryUser | undefined>(() => {
    const id = this.chat.activeUserId();
    return this.chat.directory().find((u) => u._id === id);
  });

  constructor() {
    // Keep the message list scrolled to the newest message.
    effect(() => {
      this.chat.messages();
      queueMicrotask(() => this.scrollAnchor()?.nativeElement.scrollIntoView({ block: 'end' }));
    });
  }

  toggle(): void {
    this.open.set(!this.open());
  }

  selectUser(user: DirectoryUser): void {
    this.chat.openConversation(user._id).subscribe((res) => {
      this.chat.messages.set(res.data.messages);
    });
  }

  back(): void {
    this.chat.closeConversation();
  }

  send(): void {
    if (!this.draftText.trim()) return;
    this.chat.sendMessage(this.draftText);
    this.draftText = '';
  }

  isOnline(userId: string): boolean {
    return this.chat.onlineUserIds().has(userId);
  }

  hasUnread(userId: string): boolean {
    return this.chat.unreadUserIds().has(userId);
  }

  initials(name: string): string {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');
  }
}
