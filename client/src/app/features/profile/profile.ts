import { Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';

const MAX_RESUMES = 3;
const MAX_PICTURE_MB = 3;
const MAX_RESUME_MB = 5;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const RESUME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

@Component({
  selector: 'app-profile',
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile {
  private fb = inject(FormBuilder);
  private userService = inject(UserService);
  auth = inject(AuthService);

  @ViewChild('pictureInput') pictureInput!: ElementRef<HTMLInputElement>;
  @ViewChild('resumeInput') resumeInput!: ElementRef<HTMLInputElement>;

  readonly maxResumes = MAX_RESUMES;

  nameForm = this.fb.nonNullable.group({
    name: [this.auth.currentUser()?.name ?? '', [Validators.required, Validators.maxLength(100)]],
  });
  savingName = signal(false);
  nameSaved = signal(false);

  pictureUploading = signal(false);
  pictureError = signal<string | null>(null);

  resumeUploading = signal(false);
  resumeError = signal<string | null>(null);
  deletingResumeId = signal<string | null>(null);

  saveName(): void {
    if (this.nameForm.invalid) {
      this.nameForm.markAllAsTouched();
      return;
    }

    this.savingName.set(true);
    this.nameSaved.set(false);

    this.userService.updateMe(this.nameForm.getRawValue()).subscribe({
      next: (res) => {
        this.auth.setCurrentUser(res.data.user);
        this.savingName.set(false);
        this.nameSaved.set(true);
      },
      error: () => this.savingName.set(false),
    });
  }

  onPictureSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    this.pictureError.set(null);
    if (!file) return;

    if (!IMAGE_TYPES.includes(file.type)) {
      this.pictureError.set('Only JPG/PNG/WEBP images are allowed');
      return;
    }
    if (file.size > MAX_PICTURE_MB * 1024 * 1024) {
      this.pictureError.set(`Image must be ${MAX_PICTURE_MB}MB or smaller`);
      return;
    }

    this.pictureUploading.set(true);
    this.userService.uploadProfilePicture(file).subscribe({
      next: (res) => {
        this.auth.setCurrentUser(res.data.user);
        this.pictureUploading.set(false);
        if (this.pictureInput) this.pictureInput.nativeElement.value = '';
      },
      error: (err: HttpErrorResponse) => {
        this.pictureUploading.set(false);
        this.pictureError.set(err.error?.message ?? 'Upload failed');
      },
    });
  }

  removePicture(): void {
    if (!confirm('Remove your profile picture?')) return;
    this.pictureUploading.set(true);
    this.userService.deleteProfilePicture().subscribe({
      next: (res) => {
        this.auth.setCurrentUser(res.data.user);
        this.pictureUploading.set(false);
      },
      error: () => this.pictureUploading.set(false),
    });
  }

  onResumeSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    this.resumeError.set(null);
    if (!file) return;

    if (!RESUME_TYPES.includes(file.type)) {
      this.resumeError.set('Only PDF/DOC/DOCX files are allowed');
      return;
    }
    if (file.size > MAX_RESUME_MB * 1024 * 1024) {
      this.resumeError.set(`File must be ${MAX_RESUME_MB}MB or smaller`);
      return;
    }

    this.resumeUploading.set(true);
    this.userService.uploadResume(file).subscribe({
      next: (res) => {
        this.auth.setCurrentUser(res.data.user);
        this.resumeUploading.set(false);
        if (this.resumeInput) this.resumeInput.nativeElement.value = '';
      },
      error: (err: HttpErrorResponse) => {
        this.resumeUploading.set(false);
        this.resumeError.set(err.error?.message ?? 'Upload failed');
      },
    });
  }

  deleteResume(resumeId: string): void {
    if (!confirm('Delete this resume?')) return;
    this.deletingResumeId.set(resumeId);
    this.userService.deleteResume(resumeId).subscribe({
      next: (res) => {
        this.auth.setCurrentUser(res.data.user);
        this.deletingResumeId.set(null);
      },
      error: () => this.deletingResumeId.set(null),
    });
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
