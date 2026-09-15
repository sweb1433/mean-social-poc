import { Component, ElementRef, OnInit, ViewChild, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { PostService } from '../../core/services/post.service';
import { Post } from '../../core/models/post.model';
import { PostCard } from './post-card/post-card';

const PAGE_SIZE = 10;
const MAX_ATTACHMENT_MB = 5;
const ALLOWED_ATTACHMENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

@Component({
  selector: 'app-timeline',
  imports: [FormsModule, PostCard],
  templateUrl: './timeline.html',
  styleUrl: './timeline.css',
})
export class Timeline implements OnInit {
  private postService = inject(PostService);
  auth = inject(AuthService);

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  posts = signal<Post[]>([]);
  page = signal(1);
  totalPages = signal(1);
  loadingPosts = signal(false);
  loadingMore = signal(false);

  postText = '';
  attachment = signal<File | null>(null);
  attachmentPreviewUrl = signal<string | null>(null);
  attachmentError = signal<string | null>(null);

  posting = signal(false);
  postError = signal<string | null>(null);

  get hasMore(): boolean {
    return this.page() < this.totalPages();
  }

  ngOnInit(): void {
    this.loadPage(1, false);
  }

  loadPage(page: number, append: boolean): void {
    const loadingSignal = append ? this.loadingMore : this.loadingPosts;
    loadingSignal.set(true);

    this.postService.getTimeline(page, PAGE_SIZE).subscribe({
      next: (res) => {
        this.posts.set(append ? [...this.posts(), ...res.data.posts] : res.data.posts);
        this.page.set(res.data.page);
        this.totalPages.set(res.data.totalPages);
        loadingSignal.set(false);
      },
      error: () => loadingSignal.set(false),
    });
  }

  loadMore(): void {
    if (this.hasMore && !this.loadingMore()) {
      this.loadPage(this.page() + 1, true);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.attachmentError.set(null);

    if (!file) {
      this.attachment.set(null);
      this.attachmentPreviewUrl.set(null);
      return;
    }

    if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
      this.attachmentError.set('Only JPG/PNG/WEBP images or PDF/DOC/DOCX files are allowed');
      this.clearAttachment();
      return;
    }

    if (file.size > MAX_ATTACHMENT_MB * 1024 * 1024) {
      this.attachmentError.set(`File must be ${MAX_ATTACHMENT_MB}MB or smaller`);
      this.clearAttachment();
      return;
    }

    this.attachment.set(file);
    this.attachmentPreviewUrl.set(file.type.startsWith('image/') ? URL.createObjectURL(file) : null);
  }

  clearAttachment(): void {
    this.attachment.set(null);
    this.attachmentPreviewUrl.set(null);
    if (this.fileInput) this.fileInput.nativeElement.value = '';
  }

  submitPost(): void {
    const text = this.postText.trim();
    const file = this.attachment();

    if (!text && !file) {
      this.postError.set('Write something or attach a file first');
      return;
    }

    this.posting.set(true);
    this.postError.set(null);

    this.postService.createPost(text, file).subscribe({
      next: (res) => {
        this.posts.set([res.data.post, ...this.posts()]);
        this.postText = '';
        this.clearAttachment();
        this.posting.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.posting.set(false);
        this.postError.set(err.error?.message ?? 'Could not create post');
      },
    });
  }

  deletePost(id: string): void {
    const previous = this.posts();
    this.posts.set(previous.filter((p) => p._id !== id));

    this.postService.deletePost(id).subscribe({
      error: () => {
        // restore on failure so the UI doesn't silently lose the post
        this.posts.set(previous);
      },
    });
  }

  canDelete(post: Post): boolean {
    const user = this.auth.currentUser();
    if (!user) return false;
    return user.role === 'admin' || post.author._id === user._id;
  }
}
