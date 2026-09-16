import { Component, effect, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from './layout/navbar/navbar';
import { ChatPanel } from './layout/chat-panel/chat-panel';
import { AuthService } from './core/services/auth.service';
import { ChatService } from './core/services/chat.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar, ChatPanel],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  auth = inject(AuthService);
  private chat = inject(ChatService);

  constructor() {
    effect(() => {
      if (this.auth.isLoggedIn()) {
        this.chat.connect();
        if (this.chat.directory().length === 0) {
          this.chat.loadDirectory().subscribe((res) => this.chat.directory.set(res.data.users));
        }
      } else {
        this.chat.disconnect();
      }
    });
  }
}
