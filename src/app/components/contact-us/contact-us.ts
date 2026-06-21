import { Component } from '@angular/core';
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
export class ContactUs {
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

  constructor(private http: HttpClient) {}

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
}
