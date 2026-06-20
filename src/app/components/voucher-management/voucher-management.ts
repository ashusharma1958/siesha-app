import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Navigation } from '../navigation/navigation';
import { Footer } from '../footer/footer';
import { ApiVoucher, VoucherService } from '../../services/voucher.service';

interface Voucher {
  id: string | number;
  code: string;
  percentageDiscount: number;
  minimumCartValue: number;
  status: 'active' | 'inactive';
}

interface VoucherStats {
  totalVouchers: number;
  activeVouchers: number;
  inactiveVouchers: number;
}

@Component({
  selector: 'app-voucher-management',
  templateUrl: './voucher-management.html',
  styleUrls: ['./voucher-management.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, Navigation, Footer]
})
export class VoucherManagementComponent implements OnInit {
  vouchers: Voucher[] = [];
  readonly discountOptions: number[] = Array.from({ length: 10 }, (_, index) => (index + 1) * 5);

  stats: VoucherStats = {
    totalVouchers: 0,
    activeVouchers: 0,
    inactiveVouchers: 0
  };

  selectedStatus: string = 'All';
  statusOptions: string[] = ['All', 'Active', 'Inactive'];
  filteredVouchers: Voucher[] = [];
  editingId: string | number | null = null;
  editingVoucher: Voucher | null = null;
  isUpdating: boolean = false;
  isAddingNew: boolean = false;
  isLoading: boolean = false;
  errorMessage: string = '';
  newVoucher: Voucher = {
    id: '',
    code: '',
    percentageDiscount: 5,
    minimumCartValue: 0,
    status: 'active'
  };

  constructor(
    private voucherService: VoucherService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadVouchers();
  }

  calculateStats(): void {
    this.stats.totalVouchers = this.vouchers.length;
    this.stats.activeVouchers = this.vouchers.filter(v => v.status === 'active').length;
    this.stats.inactiveVouchers = this.vouchers.filter(v => v.status === 'inactive').length;
  }

  onStatusFilterChange(): void {
    if (this.selectedStatus === 'All') {
      this.filteredVouchers = [...this.vouchers];
    } else if (this.selectedStatus === 'Active') {
      this.filteredVouchers = this.vouchers.filter(v => v.status === 'active');
    } else if (this.selectedStatus === 'Inactive') {
      this.filteredVouchers = this.vouchers.filter(v => v.status === 'inactive');
    }
  }

  toggleStatus(voucher: Voucher): void {
    if (this.isUpdating) {
      return;
    }

    this.isUpdating = true;
    this.errorMessage = '';

    const payload = this.toVoucherPayload({
      ...voucher,
      status: voucher.status === 'active' ? 'inactive' : 'active'
    });

    this.voucherService.updateVoucher(voucher.id, payload).subscribe({
      next: () => {
        this.isUpdating = false;
        this.loadVouchers();
        this.loadStats();
        this.cdr.detectChanges();
      },
      error: () => {
        this.isUpdating = false;
        this.errorMessage = 'Unable to update voucher status. Please try again.';
        this.cdr.detectChanges();
      }
    });
  }

  startEdit(voucher: Voucher): void {
    this.editingId = voucher.id;
    this.editingVoucher = {
      ...voucher,
      code: this.normalizeVoucherCode(voucher.code)
    };
  }

  cancelEdit(): void {
    this.editingId = null;
    this.editingVoucher = null;
  }

  saveVoucher(voucher: Voucher): void {
    if (!this.editingVoucher) return;

    this.isUpdating = true;
    this.errorMessage = '';

    const normalizedVoucher = {
      ...this.editingVoucher,
      code: this.normalizeVoucherCode(this.editingVoucher.code)
    };

    this.voucherService
      .updateVoucher(voucher.id, this.toVoucherPayload(normalizedVoucher))
      .subscribe({
        next: () => {
          this.editingId = null;
          this.editingVoucher = null;
          this.isUpdating = false;
          this.loadVouchers();
          this.loadStats();
          this.cdr.detectChanges();
        },
        error: () => {
          this.isUpdating = false;
          this.errorMessage = 'Unable to save voucher. Please try again.';
          this.cdr.detectChanges();
        }
      });
  }

  startAddNew(): void {
    this.isAddingNew = true;
    this.newVoucher = {
      id: '',
      code: '',
      percentageDiscount: 5,
      minimumCartValue: 0,
      status: 'active'
    };
  }

  cancelAddNew(): void {
    this.isAddingNew = false;
    this.newVoucher = {
      id: '',
      code: '',
      percentageDiscount: 5,
      minimumCartValue: 0,
      status: 'active'
    };
  }

  addNewVoucher(): void {
    if (!this.newVoucher.code || this.newVoucher.percentageDiscount <= 0 || this.newVoucher.minimumCartValue < 0) {
      alert('Please fill all required fields correctly');
      return;
    }

    this.isUpdating = true;
    this.errorMessage = '';

    const normalizedVoucher = {
      ...this.newVoucher,
      code: this.normalizeVoucherCode(this.newVoucher.code)
    };

    if (!normalizedVoucher.code) {
      alert('Voucher code can only contain letters and numbers');
      this.isUpdating = false;
      return;
    }

    this.voucherService.createVoucher(this.toVoucherPayload(normalizedVoucher)).subscribe({
      next: () => {
        this.isAddingNew = false;
        this.newVoucher = {
          id: '',
          code: '',
          percentageDiscount: 5,
          minimumCartValue: 0,
          status: 'active'
        };
        this.isUpdating = false;
        this.loadVouchers();
        this.loadStats();
        this.cdr.detectChanges();
      },
      error: () => {
        this.isUpdating = false;
        this.errorMessage = 'Unable to create voucher. Please try again.';
        this.cdr.detectChanges();
      }
    });
  }

  private loadVouchers(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.voucherService.getVouchers().subscribe({
      next: (response) => {
        const vouchers = this.extractVoucherList(response);
        this.vouchers = vouchers.map((item) => this.toUiVoucher(item));
        this.calculateStats();
        this.onStatusFilterChange();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.vouchers = [];
        this.filteredVouchers = [];
        this.calculateStats();
        this.isLoading = false;
        this.errorMessage = 'Unable to fetch vouchers right now. Please try again.';
        this.cdr.detectChanges();
      }
    });
  }

  private loadStats(): void {
    this.voucherService.getAdminStats().subscribe({
      next: (response) => {
        const stats = this.extractStats(response);
        const total = Number(stats.totalVouchers ?? 0);
        const active = Number(stats.activeVouchers ?? 0);

        this.stats.totalVouchers = total;
        this.stats.activeVouchers = active;
        this.stats.inactiveVouchers = Math.max(total - active, 0);
        this.cdr.detectChanges();
      },
      error: () => {
        this.calculateStats();
        this.cdr.detectChanges();
      }
    });
  }

  private toUiVoucher(voucher: ApiVoucher): Voucher {
    const normalizedActive = this.readBoolean(voucher, ['isActive'], ['active'], ['status']);

    return {
      id: voucher.id,
      code: voucher.code,
      percentageDiscount: Number(voucher.discountPercentage ?? 0),
      minimumCartValue: Number(voucher.minimumCartValue ?? 0),
      status: normalizedActive ? 'active' : 'inactive'
    };
  }

  private extractVoucherList(response: unknown): ApiVoucher[] {
    if (Array.isArray(response)) {
      return response as ApiVoucher[];
    }

    if (response && typeof response === 'object') {
      const rawResponse = response as Record<string, unknown>;
      if (Array.isArray(rawResponse['body'])) {
        return rawResponse['body'] as ApiVoucher[];
      }
    }

    return [];
  }

  private extractStats(response: unknown): VoucherStats {
    if (response && typeof response === 'object' && !Array.isArray(response)) {
      const rawResponse = response as Record<string, unknown>;
      if (rawResponse['body'] && typeof rawResponse['body'] === 'object' && !Array.isArray(rawResponse['body'])) {
        return this.normalizeStats(rawResponse['body'] as Record<string, unknown>);
      }

      return this.normalizeStats(rawResponse);
    }

    return {
      totalVouchers: 0,
      activeVouchers: 0,
      inactiveVouchers: 0
    };
  }

  private readBoolean(source: Record<string, unknown>, ...paths: string[][]): boolean {
    for (const path of paths) {
      const value = this.readNestedValue(source, path);
      if (value == null) {
        continue;
      }

      if (typeof value === 'boolean') {
        return value;
      }

      if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (['true', '1', 'active', 'yes', 'y'].includes(normalized)) {
          return true;
        }

        if (['false', '0', 'inactive', 'no', 'n'].includes(normalized)) {
          return false;
        }
      }
    }

    return false;
  }

  private normalizeStats(source: Record<string, unknown>): VoucherStats {
    const total = Number(source['totalVouchers'] ?? source['total'] ?? 0);
    const active = Number(source['activeVouchers'] ?? source['active'] ?? 0);
    const inactive = Number(source['inactiveVouchers'] ?? source['inactive'] ?? Math.max(total - active, 0));

    return {
      totalVouchers: total,
      activeVouchers: active,
      inactiveVouchers: inactive
    };
  }

  private toVoucherPayload(voucher: Voucher): {
    code: string;
    discountPercentage: number;
    minimumCartValue: number;
    isActive: boolean;
  } {
    return {
      code: this.normalizeVoucherCode(voucher.code),
      discountPercentage: Number(voucher.percentageDiscount),
      minimumCartValue: Number(voucher.minimumCartValue),
      isActive: voucher.status === 'active'
    };
  }

  onVoucherCodeInput(target: 'new' | 'edit', value: string): void {
    const normalizedValue = this.normalizeVoucherCode(value);

    if (target === 'new') {
      this.newVoucher.code = normalizedValue;
      return;
    }

    if (this.editingVoucher) {
      this.editingVoucher.code = normalizedValue;
    }
  }

  private normalizeVoucherCode(value: string): string {
    return String(value ?? '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
  }

  private readNestedValue(source: Record<string, unknown>, path: string[]): unknown {
    let current: unknown = source;

    for (const segment of path) {
      if (!current || typeof current !== 'object') {
        return null;
      }

      current = (current as Record<string, unknown>)[segment];
    }

    return current;
  }
}
