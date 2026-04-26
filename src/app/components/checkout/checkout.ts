import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, finalize, timeout } from 'rxjs/operators';
import { of } from 'rxjs';
import { AddAddressRequest, AuthService, ProfileAddress } from '../../services/auth.service';
import { CreateOrderRequest, OrderService } from '../../services/order.service';
import { CartItem, CartService } from '../../services/cart.service';
import { Footer } from '../footer/footer';
import { Navigation } from '../navigation/navigation';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule, Navigation, Footer, RouterLink],
  templateUrl: './checkout.html',
  styleUrls: ['./checkout.css']
})
export class CheckoutComponent implements OnInit {
  isAddressMode = false;
  isEditMode = false;
  editAddressId: number | string | null = null;
  isSavingAddress = false;
  addressSaveError = '';

  savedAddresses: ProfileAddress[] = [];
  addressesLoading = false;
  selectedAddressId: number | string | null = null;
  showNewAddressForm = false;
  isSavingInlineAddress = false;
  inlineAddressSaveError = '';

  shippingIsSameBilling = true;
  selectedShippingAddressId: number | string | null = null;
  shippingForm = {
    firstName: '',
    lastName: '',
    line1: '',
    line2: '',
    city: '',
    state: 'Delhi',
    postalCode: '',
    country: 'India',
    phone: ''
  };

  discountCode = '';
  discountPercent = 0;
  discountApplied = false;
  discountError = '';

  isPlacingOrder = false;
  orderError = '';

  get cartItems(): CartItem[] {
    return this.cartService.items;
  }

  get subtotal(): number {
    return this.cartService.getTotal();
  }

  get discountAmount(): number {
    return Math.round((this.subtotal * this.discountPercent / 100) * 100) / 100;
  }

  get total(): number {
    return this.subtotal - this.discountAmount;
  }

  applyDiscount(): void {
    const code = this.discountCode.trim().toLowerCase();
    this.discountError = '';
    this.discountApplied = false;
    this.discountPercent = 0;

    if (!code) {
      this.discountError = 'Please enter a discount code.';
      return;
    }

    if (code === 'firstorder') {
      this.discountPercent = 20;
      this.discountApplied = true;
    } else {
      this.discountError = 'Invalid discount code.';
    }
  }

  addressForm = {
    label: 'Home',
    line1: '',
    line2: '',
    city: '',
    state: 'Delhi',
    postalCode: '',
    country: 'India',
    phone: ''
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private cartService: CartService,
    private orderService: OrderService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const mode = params.get('mode');
      const id = params.get('id');

      this.isAddressMode = mode === 'address';
      this.isEditMode = !!id;
      this.editAddressId = id;
      this.addressSaveError = '';

      if (this.isEditMode && this.editAddressId) {
        this.loadAddressForEdit(this.editAddressId);
      }

      if (this.isSignedIn && !this.isAddressMode) {
        this.loadSavedAddresses();
      }
    });
  }

  loadSavedAddresses(): void {
    this.addressesLoading = true;
    this.authService.getMyAddresses().pipe(
      timeout(8000),
      catchError(() => of({ statusCode: 200, message: '', body: [] as ProfileAddress[] })),
      finalize(() => {
        this.addressesLoading = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: (response) => {
        this.savedAddresses = Array.isArray(response.body) ? response.body : [];
        if (this.savedAddresses.length > 0 && !this.selectedAddressId) {
          this.selectedAddressId = this.savedAddresses[0].id ?? null;
        }
      }
    });
  }

  toggleNewAddressForm(): void {
    this.showNewAddressForm = !this.showNewAddressForm;
    if (this.showNewAddressForm) {
      this.addressForm = {
        label: 'Home',
        line1: '',
        line2: '',
        city: '',
        state: 'Delhi',
        postalCode: '',
        country: 'India',
        phone: ''
      };
      this.inlineAddressSaveError = '';
    }
  }

  saveInlineAddress(): void {
    if (this.isSavingInlineAddress) return;

    this.inlineAddressSaveError = '';

    const line1 = this.addressForm.line1.trim();
    const city = this.addressForm.city.trim();
    const state = this.addressForm.state.trim();
    const postalCode = this.addressForm.postalCode.trim().replace(/\D/g, '');
    const country = this.addressForm.country.trim();
    const phone = this.addressForm.phone.trim().replace(/\D/g, '');
    const label = this.addressForm.label.trim() || 'Home';

    if (!line1 || !city || !state || !postalCode || !country) {
      this.inlineAddressSaveError = 'Please fill in all required address fields.';
      return;
    }

    if (!/^[A-Za-z ]+$/.test(city)) {
      this.inlineAddressSaveError = 'City can contain letters only.';
      return;
    }

    if (!/^\d{6}$/.test(postalCode)) {
      this.inlineAddressSaveError = 'Please enter a valid 6-digit PIN code.';
      return;
    }

    if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
      this.inlineAddressSaveError = 'Please enter a valid 10-digit phone number.';
      return;
    }

    const payload: AddAddressRequest = {
      label,
      line1,
      line2: this.addressForm.line2.trim() || undefined,
      city,
      state,
      postalCode,
      country,
      phone: phone || undefined,
      isDefault: false
    };

    this.isSavingInlineAddress = true;
    this.authService.addAddress(payload).subscribe({
      next: () => {
        this.isSavingInlineAddress = false;
        this.showNewAddressForm = false;
        this.loadSavedAddresses();
      },
      error: () => {
        this.isSavingInlineAddress = false;
        this.inlineAddressSaveError = 'Unable to save address. Please try again.';
      }
    });
  }

  private loadAddressForEdit(id: number | string): void {
    this.authService.getAddressById(id).subscribe({
      next: (response) => {
        const existing = this.extractAddress(response);
        if (existing) {
          this.addressForm = {
            label: existing.label || 'Home',
            line1: existing.line1 || '',
            line2: existing.line2 || '',
            city: existing.city || '',
            state: existing.state || 'Delhi',
            postalCode: existing.postalCode || '',
            country: existing.country || 'India',
            phone: existing.phone || ''
          };
        } else {
          this.addressSaveError = 'Address details could not be loaded.';
        }
      },
      error: () => {
        this.addressSaveError = 'Failed to load address for editing.';
      }
    });
  }

  private extractAddress(response: unknown): ProfileAddress | null {
    if (!response) {
      return null;
    }

    if (Array.isArray(response)) {
      return (response[0] as ProfileAddress | undefined) ?? null;
    }

    if (typeof response === 'string') {
      try {
        return this.extractAddress(JSON.parse(response));
      } catch {
        return null;
      }
    }

    const payload = response as { body?: unknown; data?: unknown; address?: unknown };

    if (payload.body && !Array.isArray(payload.body)) {
      return payload.body as ProfileAddress;
    }

    if (Array.isArray(payload.body)) {
      return (payload.body[0] as ProfileAddress | undefined) ?? null;
    }

    if (payload.data && !Array.isArray(payload.data)) {
      return payload.data as ProfileAddress;
    }

    if (Array.isArray(payload.data)) {
      return (payload.data[0] as ProfileAddress | undefined) ?? null;
    }

    if (payload.address && !Array.isArray(payload.address)) {
      return payload.address as ProfileAddress;
    }

    if (typeof payload.body === 'string') {
      return this.extractAddress(payload.body);
    }

    if (typeof payload.data === 'string') {
      return this.extractAddress(payload.data);
    }

    return response as ProfileAddress;
  }

  get isSignedIn(): boolean {
    return !!localStorage.getItem('auth.accessToken');
  }

  get selectedBillingAddress(): ProfileAddress | null {
    if (this.isSignedIn) {
      return this.savedAddresses.find(a => a.id === this.selectedAddressId) ?? null;
    }
    const f = this.addressForm;
    if (!f.line1.trim()) return null;
    return {
      label: f.label || 'Billing',
      line1: f.line1,
      line2: f.line2 || null,
      city: f.city,
      state: f.state,
      postalCode: f.postalCode,
      country: f.country,
      phone: f.phone
    };
  }

  toggleBilling(show: boolean) {
    const form = document.getElementById('billingForm');
    if (form) {
      if (show) {
        form.classList.remove('d-none');
      } else {
        form.classList.add('d-none');
      }
    }
  }

  onPhoneChange(value: string): void {
    this.addressForm.phone = value.replace(/\D/g, '').slice(0, 10);
  }

  onCityChange(value: string): void {
    this.addressForm.city = value.replace(/[^a-zA-Z ]/g, '').slice(0, 50);
  }

  restrictCityInput(event: KeyboardEvent): void {
    const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'];

    if (allowedKeys.includes(event.key)) {
      return;
    }

    if (!/^[a-zA-Z ]$/.test(event.key)) {
      event.preventDefault();
    }
  }

  onCityPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const clipboardText = event.clipboardData?.getData('text') ?? '';
    this.addressForm.city = clipboardText.replace(/[^a-zA-Z ]/g, '').slice(0, 50);
  }

  onPostalCodeChange(value: string): void {
    this.addressForm.postalCode = value.replace(/\D/g, '').slice(0, 6);
  }

  restrictPostalCodeInput(event: KeyboardEvent): void {
    const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'];

    if (allowedKeys.includes(event.key)) {
      return;
    }

    if (!/^[0-9]$/.test(event.key)) {
      event.preventDefault();
    }
  }

  onPostalCodePaste(event: ClipboardEvent): void {
    event.preventDefault();
    const clipboardText = event.clipboardData?.getData('text') ?? '';
    this.addressForm.postalCode = clipboardText.replace(/\D/g, '').slice(0, 6);
  }

  restrictPhoneInput(event: KeyboardEvent): void {
    const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'];

    if (allowedKeys.includes(event.key)) {
      return;
    }

    if (!/^[0-9]$/.test(event.key)) {
      event.preventDefault();
    }
  }

  onPhonePaste(event: ClipboardEvent): void {
    event.preventDefault();
    const clipboardText = event.clipboardData?.getData('text') ?? '';
    this.addressForm.phone = clipboardText.replace(/\D/g, '').slice(0, 10);
  }

  placeOrder(): void {
    if (this.isPlacingOrder) return;

    this.orderError = '';

    const billing = this.selectedBillingAddress;
    if (!billing) {
      this.orderError = 'Please select or fill in a billing address.';
      return;
    }

    if (this.cartItems.length === 0) {
      this.orderError = 'Your cart is empty.';
      return;
    }

    const shippingAddr = this.shippingIsSameBilling
      ? billing
      : (this.isSignedIn
          ? (this.savedAddresses.find(a => a.id === this.selectedShippingAddressId) ?? null)
          : {
              label: 'Shipping',
              line1: this.shippingForm.line1,
              line2: this.shippingForm.line2 || null,
              city: this.shippingForm.city,
              state: this.shippingForm.state,
              postalCode: this.shippingForm.postalCode,
              country: this.shippingForm.country,
              phone: this.shippingForm.phone
            });

    if (!shippingAddr) {
      this.orderError = 'Please select or fill in a shipping address.';
      return;
    }

    const TAX_RATE = 0.09; // 9%
    const shippingCharge = 0;
    const discountedSubtotal = this.total;
    const taxAmount = Math.round(discountedSubtotal * TAX_RATE * 100) / 100;
    const grandTotal = Math.round((discountedSubtotal + taxAmount + shippingCharge) * 100) / 100;

    const rawUserId = localStorage.getItem('auth.userId');
    const parsedUserId = rawUserId && /^\d+$/.test(rawUserId) ? Number(rawUserId) : null;

    const payload: CreateOrderRequest = {
      customer: {
        userId: parsedUserId,
        guest: !this.isSignedIn
      },
      billingAddress: {
        id: (billing as ProfileAddress).id ?? null
      },
      shippingAddress: {
        id: (shippingAddr as ProfileAddress).id ?? null,
        sameAsBilling: this.shippingIsSameBilling
      },
      items: this.cartItems.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        unitPrice: item.product.salePrice ?? item.product.price ?? 0,
        totalPrice: (item.product.salePrice ?? item.product.price ?? 0) * item.quantity
      })),
      pricing: {
        subtotal: this.subtotal,
        discountCode: this.discountApplied ? this.discountCode.trim().toUpperCase() : null,
        discountPercent: this.discountPercent,
        discountAmount: this.discountAmount,
        shippingCharge,
        taxAmount,
        total: grandTotal
      },
      payment: {
        method: 'PHONEPE',
        status: 'PENDING',
        transactionId: null
      },
      orderStatus: 'PLACED',
      createdAt: new Date().toISOString()
    };

    this.isPlacingOrder = true;
    this.orderService.createOrder(payload).subscribe({
      next: () => {
        this.isPlacingOrder = false;
        this.cartService.clearCart();
        void this.router.navigate(['/order-tracking']);
      },
      error: () => {
        this.isPlacingOrder = false;
        this.orderError = 'Unable to place order. Please try again.';
      }
    });
  }

  saveAddress(): void {
    if (!this.isAddressMode || this.isSavingAddress) {
      return;
    }

    this.addressSaveError = '';

    const line1 = this.addressForm.line1.trim();
    const city = this.addressForm.city.trim();
    const state = this.addressForm.state.trim();
    const postalCode = this.addressForm.postalCode.trim().replace(/\D/g, '');
    const country = this.addressForm.country.trim();
    const phone = this.addressForm.phone.trim().replace(/\D/g, '');
    const label = this.addressForm.label.trim() || 'Home';

    if (!line1 || !city || !state || !postalCode || !country) {
      this.addressSaveError = 'Please fill in all required address fields.';
      return;
    }

    if (!/^[A-Za-z ]+$/.test(city)) {
      this.addressSaveError = 'City can contain letters only.';
      return;
    }

    if (!/^\d{6}$/.test(postalCode)) {
      this.addressSaveError = 'Please enter a valid 6-digit PIN code.';
      return;
    }

    // Basic Indian contact number validation: 10 digits, starts with 6-9.
    if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
      this.addressSaveError = 'Please enter a valid 10-digit phone number.';
      return;
    }

    const payload: AddAddressRequest = {
      label,
      line1,
      line2: this.addressForm.line2.trim() || undefined,
      city,
      state,
      postalCode,
      country,
      phone: phone || undefined,
      isDefault: true
    };

    this.isSavingAddress = true;

    const saveCall = this.isEditMode && this.editAddressId
      ? this.authService.updateAddress(this.editAddressId, payload)
      : this.authService.addAddress(payload);

    saveCall.subscribe({
      next: () => {
        this.isSavingAddress = false;
        void this.router.navigate(['/profile']);
      },
      error: () => {
        this.isSavingAddress = false;
        this.addressSaveError = this.isEditMode
          ? 'Unable to update address right now. Please try again.'
          : 'Unable to save address right now. Please try again.';
      }
    });
  }
}
