import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';

import { Navigation } from '../navigation/navigation';
import { Footer } from '../footer/footer';
import { ContactQuery, ContactQueryService } from '../../services/contact-query.service';

@Component({
  selector: 'app-admin-queries',
  standalone: true,
  imports: [CommonModule, Navigation, Footer],
  templateUrl: './admin-queries.html',
  styleUrls: ['./admin-queries.css']
})
export class AdminQueriesComponent implements OnInit {
  queries: ContactQuery[] = [];
  isLoading = false;
  errorMessage = '';

  constructor(
    private contactQueryService: ContactQueryService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (!this.isAdminUser()) {
      void this.router.navigate(['/home']);
      return;
    }

    this.loadQueries();
  }

  formatDate(value: string | undefined): string {
    if (!value) {
      return '-';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return parsed.toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private loadQueries(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.contactQueryService.getAdminQueries().subscribe({
      next: (response) => {
        this.queries = this.normalizeQueries(response.body);
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error: unknown) => {
        this.queries = [];
        this.isLoading = false;
        this.errorMessage = this.resolveErrorMessage(error);
        this.cdr.detectChanges();
      }
    });
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 403) {
        return 'Access denied. Please sign in with an admin account to view queries.';
      }

      if (error.status === 401) {
        return 'Session expired. Please sign in again.';
      }
    }

    return 'Unable to fetch contact queries right now. Please try again.';
  }

  private normalizeQueries(raw: unknown): ContactQuery[] {
    if (!Array.isArray(raw)) {
      return [];
    }

    return raw
      .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
      .map((item) => ({
        id: item['id'] as number | string | undefined,
        name: this.readText(item, ['name'], ['fullName'], ['customerName']),
        email: this.readText(item, ['email']),
        phoneNumber: this.readText(item, ['phoneNumber'], ['phone'], ['mobile'], ['phone_number']),
        message: this.readText(item, ['message'], ['query'], ['content']),
        notificationConsent: this.readBoolean(
          item,
          ['notificationConsent'],
          ['consent'],
          ['notification_consent']
        ),
        createdAt: this.readText(
          item,
          ['createdAt'],
          ['created_at'],
          ['submittedAt'],
          ['timestamp']
        )
      }))
      .filter((query) => query.name !== '-' || query.email !== '-' || query.message !== '-');
  }

  private readText(source: Record<string, unknown>, ...paths: string[][]): string {
    for (const path of paths) {
      const value = this.readNestedValue(source, path);
      if (value == null) {
        continue;
      }

      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed) {
          return trimmed;
        }
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
      }
    }

    return '-';
  }

  private readBoolean(source: Record<string, unknown>, ...paths: string[][]): boolean {
    for (const path of paths) {
      const value = this.readNestedValue(source, path);
      if (typeof value === 'boolean') {
        return value;
      }

      if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (normalized === 'true') {
          return true;
        }

        if (normalized === 'false') {
          return false;
        }
      }
    }

    return false;
  }

  private readNestedValue(source: Record<string, unknown>, path: string[]): unknown {
    let cursor: unknown = source;

    for (const key of path) {
      if (!cursor || typeof cursor !== 'object') {
        return undefined;
      }

      cursor = (cursor as Record<string, unknown>)[key];
    }

    return cursor;
  }

  private isAdminUser(): boolean {
    const rawUser = localStorage.getItem('auth.user');
    if (rawUser) {
      try {
        const parsed = JSON.parse(rawUser) as { role?: unknown; roles?: unknown; authorities?: unknown };
        if (this.extractRole(parsed, parsed.role, parsed.roles, parsed.authorities) === 'ADMIN') {
          return true;
        }
      } catch {
        // Ignore invalid payload.
      }
    }

    const tokenCandidates = [
      localStorage.getItem('auth.accessToken'),
      localStorage.getItem('auth.idToken')
    ];

    for (const token of tokenCandidates) {
      if (!token) {
        continue;
      }

      const parts = token.split('.');
      if (parts.length < 2) {
        continue;
      }

      try {
        const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const decoded = atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, '='));
        const claims = JSON.parse(decoded) as Record<string, unknown>;
        if (
          this.extractRole(
            claims['role'],
            claims['roles'],
            claims['authorities'],
            claims['scope'],
            claims['scp'],
            this.readNestedValue(claims, ['realm_access', 'roles'])
          ) === 'ADMIN'
        ) {
          return true;
        }
      } catch {
        // Try next token candidate.
      }
    }

    return false;
  }

  private extractRole(...sources: unknown[]): string | null {
    const normalizedValues: string[] = [];

    for (const source of sources) {
      this.collectRoleValues(source, normalizedValues);
    }

    if (normalizedValues.includes('ADMIN') || normalizedValues.includes('ROLE_ADMIN')) {
      return 'ADMIN';
    }

    if (normalizedValues.includes('USER') || normalizedValues.includes('ROLE_USER')) {
      return 'USER';
    }

    return null;
  }

  private collectRoleValues(source: unknown, target: string[]): void {
    if (!source) {
      return;
    }

    if (typeof source === 'string') {
      const separator = source.includes(' ') ? /\s+/ : /,/;
      target.push(...source.split(separator).map((value) => value.trim().toUpperCase()).filter(Boolean));
      return;
    }

    if (Array.isArray(source)) {
      for (const value of source) {
        this.collectRoleValues(value, target);
      }
      return;
    }

    if (typeof source === 'object') {
      const objectValue = source as Record<string, unknown>;
      this.collectRoleValues(objectValue['role'], target);
      this.collectRoleValues(objectValue['roles'], target);
      this.collectRoleValues(objectValue['authority'], target);
      this.collectRoleValues(objectValue['authorities'], target);
      this.collectRoleValues(objectValue['name'], target);
    }
  }
}
