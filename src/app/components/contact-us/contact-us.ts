import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { finalize } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { Navigation } from '../navigation/navigation';
import { Footer } from '../footer/footer';

type ContactUsRequest = {
  name: string;
  email: string;
  phoneNumber: string;
  message: string;
  notificationConsent: boolean;
};

type ApiResponse = {
  statusCode: number;
  message: string;
  body?: unknown;
  timestamp?: string;
};

@Component({
  selector: 'app-contact-us',
  imports: [CommonModule, FormsModule, Navigation, Footer],
  templateUrl: './contact-us.html',
  styleUrl: './contact-us.css',
})
export class ContactUs implements OnInit, OnDestroy {
  private readonly mainProductImages: string[] = [
    'https://raw.githubusercontent.com/ashusharma1958/static/main/image/products/Citrus Sundaze/Citrus Sundaze-Main.png',
    'https://raw.githubusercontent.com/ashusharma1958/static/main/image/products/Pink Heat/Pink Heat-Main.png',
    'https://raw.githubusercontent.com/ashusharma1958/static/main/image/products/Zesty Daydream/Zesty Daydream-Main.png',
    'https://raw.githubusercontent.com/ashusharma1958/static/main/image/products/vara/Vara-Main.png',
    'https://raw.githubusercontent.com/ashusharma1958/static/main/image/products/Nirvaan/Nirvaan-Main.png'
  ];

  private readonly leftPanelImages: string[] = [
    ...this.mainProductImages
  ];

  private readonly centerPanelImages: string[] = [
    ...this.mainProductImages
  ];

  private readonly rightPanelImages: string[] = [
    ...this.mainProductImages
  ];

  leftPanelBackground = '';
  centerPanelBackground = '';
  rightPanelBackground = '';

  private leftPanelIndex = 0;
  private centerPanelIndex = 0;
  private rightPanelIndex = 0;

  private leftPanelTimerId: ReturnType<typeof setInterval> | null = null;
  private centerPanelTimerId: ReturnType<typeof setInterval> | null = null;
  private rightPanelTimerId: ReturnType<typeof setInterval> | null = null;

  form: ContactUsRequest = {
    name: '',
    email: '',
    phoneNumber: '',
    message: '',
    notificationConsent: false
  };

  submitting = false;
  successMessage = '';
  errorMessage = '';

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.leftPanelIndex = 0;
    this.centerPanelIndex = 0;
    this.rightPanelIndex = 0;

    this.syncPanelBackgrounds();

    this.leftPanelTimerId = setInterval(() => {
      this.leftPanelIndex = (this.leftPanelIndex + 1) % this.leftPanelImages.length;
      this.leftPanelBackground = this.toBackgroundImage(this.leftPanelImages[this.leftPanelIndex]);
      this.cdr.detectChanges();
    }, 2600);

    this.centerPanelTimerId = setInterval(() => {
      this.centerPanelIndex = (this.centerPanelIndex + 1) % this.centerPanelImages.length;
      this.centerPanelBackground = this.toBackgroundImage(this.centerPanelImages[this.centerPanelIndex]);
      this.cdr.detectChanges();
    }, 3400);

    this.rightPanelTimerId = setInterval(() => {
      this.rightPanelIndex = (this.rightPanelIndex + 1) % this.rightPanelImages.length;
      this.rightPanelBackground = this.toBackgroundImage(this.rightPanelImages[this.rightPanelIndex]);
      this.cdr.detectChanges();
    }, 4300);
  }

  ngOnDestroy(): void {
    if (this.leftPanelTimerId) {
      clearInterval(this.leftPanelTimerId);
      this.leftPanelTimerId = null;
    }

    if (this.centerPanelTimerId) {
      clearInterval(this.centerPanelTimerId);
      this.centerPanelTimerId = null;
    }

    if (this.rightPanelTimerId) {
      clearInterval(this.rightPanelTimerId);
      this.rightPanelTimerId = null;
    }
  }

  submitContact(form: NgForm) {
    this.successMessage = '';
    this.errorMessage = '';

    if (form.invalid) {
      form.control.markAllAsTouched();
      this.errorMessage = 'Please fix the highlighted fields before submitting.';
      return;
    }

    const payload: ContactUsRequest = {
      name: this.form.name.trim(),
      email: this.form.email.trim(),
      phoneNumber: this.form.phoneNumber.trim(),
      message: this.form.message.trim(),
      notificationConsent: this.form.notificationConsent
    };

    this.submitting = true;

    this.http.post<ApiResponse>(`${environment.apiBaseUrl}/home-page/contact-us`, payload).subscribe({
      next: (response) => {
        this.successMessage = response.message || 'Thank you for reaching out. We will be reaching out to you shortly.';
        form.resetForm({
          name: '',
          email: '',
          phoneNumber: '',
          message: '',
          notificationConsent: false
        });
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'Unable to send your message right now. Please try again.';
      }
    }).add(() => {
      this.submitting = false;
    });
  }

  private syncPanelBackgrounds(): void {
    this.leftPanelBackground = this.toBackgroundImage(this.leftPanelImages[this.leftPanelIndex]);
    this.centerPanelBackground = this.toBackgroundImage(this.centerPanelImages[this.centerPanelIndex]);
    this.rightPanelBackground = this.toBackgroundImage(this.rightPanelImages[this.rightPanelIndex]);
  }

  private toBackgroundImage(path: string): string {
    const encodedPath = encodeURI(path);
    return `url("${encodedPath}")`;
  }
}
