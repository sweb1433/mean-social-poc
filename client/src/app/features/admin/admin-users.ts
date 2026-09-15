import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { User } from '../../core/models/user.model';

const PAGE_SIZE = 10;

@Component({
  selector: 'app-admin-users',
  imports: [FormsModule, ReactiveFormsModule, DatePipe],
  templateUrl: './admin-users.html',
  styleUrl: './admin-users.css',
})
export class AdminUsers implements OnInit {
  private fb = inject(FormBuilder);
  private userService = inject(UserService);
  auth = inject(AuthService);

  users = signal<User[]>([]);
  page = signal(1);
  totalPages = signal(1);
  total = signal(0);
  search = '';
  loading = signal(false);
  listError = signal<string | null>(null);

  showCreateForm = signal(false);
  creating = signal(false);
  createError = signal<string | null>(null);
  createForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    role: ['user' as 'user' | 'admin', [Validators.required]],
  });

  editingUserId = signal<string | null>(null);
  saving = signal(false);
  editError = signal<string | null>(null);
  editForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email]],
    role: ['user' as 'user' | 'admin', [Validators.required]],
  });

  deletingId = signal<string | null>(null);

  private searchDebounce?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.loadUsers(1);
  }

  loadUsers(page: number): void {
    this.loading.set(true);
    this.listError.set(null);

    this.userService.listUsers({ page, limit: PAGE_SIZE, search: this.search.trim() }).subscribe({
      next: (res) => {
        this.users.set(res.data.users);
        this.page.set(res.data.page);
        this.totalPages.set(res.data.totalPages);
        this.total.set(res.data.total);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.listError.set(err.error?.message ?? 'Failed to load users');
      },
    });
  }

  onSearchChange(): void {
    clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => this.loadUsers(1), 350);
  }

  prevPage(): void {
    if (this.page() > 1) this.loadUsers(this.page() - 1);
  }

  nextPage(): void {
    if (this.page() < this.totalPages()) this.loadUsers(this.page() + 1);
  }

  toggleCreateForm(): void {
    this.showCreateForm.set(!this.showCreateForm());
    this.createError.set(null);
    this.createForm.reset({ name: '', email: '', password: '', role: 'user' });
  }

  submitCreate(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    this.creating.set(true);
    this.createError.set(null);

    this.userService.createUser(this.createForm.getRawValue()).subscribe({
      next: () => {
        this.creating.set(false);
        this.showCreateForm.set(false);
        this.loadUsers(1);
      },
      error: (err: HttpErrorResponse) => {
        this.creating.set(false);
        this.createError.set(err.error?.message ?? 'Failed to create user');
      },
    });
  }

  startEdit(user: User): void {
    this.editingUserId.set(user._id);
    this.editError.set(null);
    this.editForm.reset({ name: user.name, email: user.email, role: user.role });
  }

  cancelEdit(): void {
    this.editingUserId.set(null);
  }

  submitEdit(userId: string): void {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.editError.set(null);

    this.userService.updateUser(userId, this.editForm.getRawValue()).subscribe({
      next: (res) => {
        this.users.set(this.users().map((u) => (u._id === userId ? res.data.user : u)));
        this.saving.set(false);
        this.editingUserId.set(null);
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.editError.set(err.error?.message ?? 'Failed to update user');
      },
    });
  }

  deleteUser(user: User): void {
    if (!confirm(`Delete ${user.name}? This also deletes their posts and files.`)) return;

    this.deletingId.set(user._id);
    this.userService.deleteUser(user._id).subscribe({
      next: () => {
        this.users.set(this.users().filter((u) => u._id !== user._id));
        this.total.set(this.total() - 1);
        this.deletingId.set(null);
      },
      error: () => this.deletingId.set(null),
    });
  }

  isSelf(user: User): boolean {
    return this.auth.currentUser()?._id === user._id;
  }
}
