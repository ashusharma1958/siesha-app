import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, finalize, timeout } from 'rxjs/operators';
import { of } from 'rxjs';
import { AddAddressRequest, AuthService, ProfileAddress } from '../../services/auth.service';
import { CreateOrderRequest, OrderService } from '../../services/order.service';
import { PaymentService } from '../../services/payment.service';
import { CartItem, CartService } from '../../services/cart.service';
import { ApiVoucher, VoucherService } from '../../services/voucher.service';
import { Footer } from '../footer/footer';
import { Navigation } from '../navigation/navigation';

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (eventName: string, callback: (response: unknown) => void) => void;
    };
  }
}

type PolicyKey = 'refund' | 'shipping' | 'privacy' | 'terms' | 'contact';

type PolicySection = {
  heading?: string;
  paragraphs?: string[];
  items?: string[];
};

type CheckoutPolicy = {
  title: string;
  updatedAt?: string;
  intro?: string[];
  sections: PolicySection[];
};

const CHECKOUT_POLICIES: Record<PolicyKey, CheckoutPolicy> = {
  refund: {
    title: 'Refund Policy',
    intro: [
      'At Siesha, every candle is hand-poured in small batches with care and intention. As a small business, we do not offer returns or exchanges for personal preferences or a change of mind.',
      'Not sure about a scent? Feel free to reach out to us on Instagram @sieshaofficial. We are happy to help you choose the right one.'
    ],
    sections: [
      {
        heading: 'We offer exchanges only if',
        items: [
          'Your product arrived damaged or broken. Report the issue within 24 hours of delivery via WhatsApp on +91 8373991643.',
          'You received the wrong item, or an item is missing from your order. Report the issue within 24 hours of delivery via WhatsApp on +91 8373991643.'
        ]
      },
      {
        heading: 'To request an exchange',
        items: [
          'Share an unboxing video starting from the sealed package.',
          'Report the issue within 24 hours of delivery via WhatsApp on +91 8373991643.',
          'Ensure the product is unused and in original condition.',
          'Return shipping costs will be borne by the customer.'
        ]
      },
      {
        heading: 'We offer cancellations only if',
        items: [
          'Orders can be cancelled within 12 hours of placement or before production begins, whichever is earlier. You can contact us for cancellation via WhatsApp on +91 8373991643.',
          'Once production has started, orders cannot be cancelled.',
          'Customised or personalised orders cannot be cancelled once confirmed.',
          'If SIESHA is unable to fulfil your order for any reason, you will receive a full refund to your original payment method.',
          'Approved refunds for cancelled orders will be processed within 5-7 business days, depending on your payment provider.'
        ]
      },
      {
        paragraphs: [
          'We truly appreciate your support. Every order helps keep the ritual of Siesha alive. Thank you for being a part of our journey.'
        ]
      }
    ]
  },
  shipping: {
    title: 'Shipping',
    intro: [
      'At SIESHA, every candle is thoughtfully handcrafted with care. To ensure you receive the best quality, out of stock candles are made fresh to order and cured before dispatch.'
    ],
    sections: [
      {
        heading: 'Order Processing',
        paragraphs: [
          'In-Stock Products: If your selected candle is available in stock, your order will be processed and dispatched within 2-3 business days, subject to current order volume.',
          'Made-to-Order Products: If a product is out of stock, we prepare a fresh batch specifically for your order. Since soy candles require proper curing for the best fragrance performance, please allow up to 7 business days for production and curing. Your order will be dispatched immediately after the curing process is complete.'
        ]
      },
      {
        heading: 'Delivery Timeline',
        items: [
          'Metro and major cities: 3-5 business days.',
          'Most locations across India: 3-7 business days.',
          'Remote and difficult-to-service areas, including parts of Jammu and Kashmir, Himachal Pradesh, North-East India, Ladakh, and certain rural locations: 7-10 business days or longer, depending on courier availability.'
        ]
      },
      {
        paragraphs: [
          'Delivery timelines are estimates and may vary due to weather conditions, public holidays, courier delays, or unforeseen circumstances.',
          'Once your order has been shipped, you will receive a tracking link via email or WhatsApp, where applicable, to monitor your shipment.',
          'Please ensure your shipping address and contact details are accurate while placing your order. SIESHA is not responsible for delays, missed delivery due to customer unavailability, or additional shipping charges resulting from incorrect or incomplete address or contact information.',
          'If you have any questions regarding your order or shipping timeline, feel free to contact us. We are always happy to help.'
        ]
      }
    ]
  },
  privacy: {
    title: 'Privacy Policy',
    updatedAt: 'Last Updated: June 29, 2026',
    intro: [
      'At SIESHA, we value your privacy and are committed to protecting your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or place an order with us.',
      'By using our website, you agree to the terms of this Privacy Policy.'
    ],
    sections: [
      {
        heading: '1. Information We Collect',
        items: [
          'Personal information such as full name, email address, phone number, shipping and billing address, and payment information processed securely through third-party payment providers. We do not store your card details.',
          'Automatically collected information such as IP address, browser type and device information, pages visited, and website usage data through cookies and analytics tools.'
        ]
      },
      {
        heading: '2. How We Use Your Information',
        items: [
          'Process and fulfil your orders.',
          'Deliver your purchases.',
          'Communicate order updates.',
          'Respond to customer support requests.',
          'Improve our website and customer experience.',
          'Send promotional emails or messages only if you have opted in.',
          'Prevent fraud and maintain website security.',
          'Comply with legal obligations.'
        ]
      },
      {
        heading: '3. Payment Security',
        paragraphs: [
          'All online payments are processed through trusted third-party payment gateways. We do not collect or store your debit card, credit card, UPI PIN, CVV, or banking credentials.'
        ]
      },
      {
        heading: '4. Sharing Your Information',
        paragraphs: [
          'We do not sell, rent, or trade your personal information.',
          'We may share your information only with trusted service providers necessary to operate our business, including payment processors, shipping and logistics partners, website hosting providers, and analytics and marketing service providers.'
        ]
      },
      {
        heading: '5. Cookies',
        paragraphs: [
          'Our website may use cookies to remember your preferences, improve website functionality, analyze website traffic, and enhance your shopping experience.',
          'You can disable cookies through your browser settings, although some website features may not function properly.'
        ]
      },
      {
        heading: '6. Data Retention',
        paragraphs: [
          'We retain your information only for as long as necessary to fulfil your orders, comply with legal requirements, resolve disputes, and maintain our business records.'
        ]
      },
      {
        heading: '7. Your Rights',
        items: [
          'Access the personal information we hold about you.',
          'Correct inaccurate information.',
          'Update your contact details.',
          'Request deletion of your personal information, subject to applicable legal obligations.'
        ]
      },
      {
        heading: '8. Data Security',
        paragraphs: [
          'We implement reasonable technical and organizational measures to protect your personal information from unauthorized access, misuse, alteration, or disclosure. While we strive to protect your data, no method of internet transmission or electronic storage is completely secure.'
        ]
      },
      {
        heading: '9. Third-Party Links',
        paragraphs: [
          'Our website may contain links to third-party websites. We are not responsible for the privacy practices or content of those external websites.'
        ]
      },
      {
        heading: '10. Children\'s Privacy',
        paragraphs: [
          'Our website is not intended for children under the age of 18. We do not knowingly collect personal information from children.'
        ]
      },
      {
        heading: '11. Changes to This Privacy Policy',
        paragraphs: [
          'We may update this Privacy Policy from time to time. Any changes will be posted on this page with the revised last updated date.'
        ]
      },
      {
        heading: '12. Contact Us',
        items: [
          'Email: sieshaofficial@gmail.com',
          'Phone: 8373991643, 9811124285',
          'Business Hours: Monday - Saturday | 10:00 AM - 6:00 PM IST'
        ]
      }
    ]
  },
  terms: {
    title: 'Terms of Service',
    updatedAt: 'Last Updated: June 29, 2026',
    intro: [
      'Welcome to SIESHA. These Terms of Service govern your use of our website and the purchase of products from us. By accessing our website or placing an order, you agree to be bound by these Terms.'
    ],
    sections: [
      {
        heading: '1. General',
        paragraphs: [
          'SIESHA reserves the right to update, modify, or replace these Terms at any time without prior notice. Continued use of our website constitutes acceptance of the revised Terms.',
          'By using this website, you confirm that you are at least 18 years of age or are using the website under the supervision of a parent or legal guardian.'
        ]
      },
      {
        heading: '2. Products',
        paragraphs: [
          'All products sold by SIESHA are handcrafted. As a result, slight variations in colour, finish, fragrance intensity, wax texture, labels, and overall appearance may occur. These natural variations are part of the handcrafted process and do not constitute defects.',
          'Product images are intended for illustrative purposes only. While we strive to accurately represent colours and finishes, actual products may vary slightly due to lighting, photography, screen settings, and the handmade nature of our products.'
        ]
      },
      {
        heading: '3. Pricing',
        paragraphs: [
          'All prices are listed in Indian Rupees and are inclusive of applicable taxes unless stated otherwise.',
          'SIESHA reserves the right to modify prices, discontinue products, or correct pricing errors at any time without prior notice.'
        ]
      },
      {
        heading: '4. Orders',
        items: [
          'All orders are subject to acceptance and availability.',
          'We reserve the right to cancel or refuse any order due to product unavailability, incorrect pricing, payment issues, suspected fraudulent activity, or any other legitimate business reason.',
          'If payment has already been received for a cancelled order, an appropriate refund will be initiated.'
        ]
      },
      {
        heading: '5. Made-to-Order Products',
        paragraphs: [
          'Many of our candles are handcrafted after an order is placed to ensure optimal quality.',
          'Production and dispatch timelines may therefore vary depending on product availability, curing requirements, and order volume.',
          'Estimated timelines are provided in our Shipping Policy and should not be considered guaranteed delivery dates.'
        ]
      },
      {
        heading: '6. Shipping and Delivery',
        paragraphs: [
          'Orders are dispatched according to our Shipping Policy.',
          'Delivery timelines are estimates only and may vary due to courier delays, weather conditions, public holidays, remote delivery locations, and events beyond our reasonable control.',
          'SIESHA shall not be liable for delays caused by third-party courier partners.',
          'Risk of loss and ownership of products pass to the customer upon successful delivery.'
        ]
      },
      {
        heading: '7. Returns, Refunds and Cancellations',
        paragraphs: [
          'Please refer to our Return and Refund Policy for complete details.',
          'Personalised or customised products are non-returnable and non-refundable once production has begun.',
          'Refunds or replacements may be offered only where products arrive damaged, defective, or incorrect.'
        ]
      },
      {
        heading: '8. Candle Care and Safe Usage',
        items: [
          'Never leave a burning candle unattended.',
          'Keep candles away from children and pets.',
          'Place candles on a heat-resistant surface.',
          'Keep away from curtains and flammable materials.',
          'Trim the wick before each use.',
          'Do not burn beyond the recommended duration.'
        ]
      },
      {
        heading: '9. Limitation of Liability',
        paragraphs: [
          'To the maximum extent permitted by applicable law, SIESHA shall not be liable for any direct, indirect, incidental, consequential, or special damages arising from improper use of products, failure to follow candle care instructions, delayed deliveries, product misuse, allergic reactions or sensitivities to fragrances, or circumstances beyond our reasonable control.',
          'Our total liability for any claim shall not exceed the amount paid by the customer for the relevant product or products.'
        ]
      },
      {
        heading: '10. Product Performance',
        paragraphs: [
          'Burn times provided are approximate and may vary depending on environmental conditions, wick maintenance, room temperature, airflow, and burning practices.',
          'Fragrance performance is subjective and may differ from person to person.'
        ]
      },
      {
        heading: '11. Intellectual Property',
        paragraphs: [
          'All content on this website, including photographs, logos, branding, product names, graphics, text, and designs, is the property of SIESHA unless otherwise stated.',
          'No content may be copied, reproduced, distributed, or used without prior written permission.'
        ]
      },
      {
        heading: '12. Custom Orders',
        paragraphs: [
          'Customers placing customised or personalised orders are responsible for ensuring that all names, spellings, artwork, logos, and other submitted content are accurate before approval.',
          'Once production has commenced, customised orders cannot be modified or cancelled.'
        ]
      },
      {
        heading: '13. Privacy',
        paragraphs: [
          'Your use of this website is also governed by our Privacy Policy, which explains how we collect, use, and protect your personal information.'
        ]
      },
      {
        heading: '14. Force Majeure',
        paragraphs: [
          'SIESHA shall not be held liable for any delay or failure to perform its obligations where such delay or failure results from circumstances beyond our reasonable control, including natural disasters, floods, pandemics, government actions, strikes, transportation disruptions, power failures, or courier service interruptions.'
        ]
      },
      {
        heading: '15. Governing Law',
        paragraphs: [
          'These Terms shall be governed by and construed in accordance with the laws of India.',
          'Any disputes arising out of or relating to these Terms shall be subject to the exclusive jurisdiction of the courts located in Delhi, India.'
        ]
      },
      {
        heading: '16. Contact Us',
        items: [
          'Email: sieshaofficial@gmail.com',
          'Phone: 8373991643, 9811124285',
          'Business Hours: Monday - Saturday | 10:00 AM - 6:00 PM IST'
        ]
      }
    ]
  },
  contact: {
    title: 'Contact',
    sections: [
      {
        items: [
          'Address: Ambica Vihar, Paschim Vihar, Delhi-110087',
          'Contact: 8373991643, 9811124285',
          'Gmail: sieshaofficial@gmail.com'
        ]
      }
    ]
  }
};

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule, Navigation, Footer, RouterLink],
  templateUrl: './checkout.html',
  styleUrls: ['./checkout.css']
})
export class CheckoutComponent implements OnInit {
  readonly policyContent = CHECKOUT_POLICIES;
  selectedPolicyKey: PolicyKey | null = null;
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
  availableVouchers: ApiVoucher[] = [];
  vouchersLoading = false;
  vouchersLoadError = '';

  isPlacingOrder = false;
  paymentStatusMessage = '';
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

  get eligibleVouchers(): ApiVoucher[] {
    return this.availableVouchers.filter((voucher) => this.isVoucherEligible(voucher));
  }

  get selectedPolicy(): CheckoutPolicy | null {
    return this.selectedPolicyKey ? this.policyContent[this.selectedPolicyKey] : null;
  }

  openPolicy(policyKey: PolicyKey): void {
    this.selectedPolicyKey = policyKey;
  }

  closePolicy(): void {
    this.selectedPolicyKey = null;
  }

  applyDiscount(): void {
    const code = this.normalizeVoucherCode(this.discountCode);
    this.discountError = '';
    this.discountApplied = false;
    this.discountPercent = 0;

    if (!code) {
      this.discountError = 'Please enter a discount code.';
      return;
    }

    const matchedVoucher = this.availableVouchers.find(
      (voucher) => this.normalizeVoucherCode(voucher.code) === code
    );

    if (!matchedVoucher) {
      this.discountError = 'Invalid discount code.';
      return;
    }

    if (!this.isVoucherActive(matchedVoucher)) {
      this.discountError = 'This discount code is inactive.';
      return;
    }

    const minimumCartValue = Number(matchedVoucher.minimumCartValue ?? 0);
    if (this.subtotal < minimumCartValue) {
      this.discountError = `This code requires a minimum cart value of ₹${minimumCartValue.toFixed(2)}.`;
      return;
    }

    this.discountPercent = Number(matchedVoucher.discountPercentage ?? 0);
    this.discountCode = matchedVoucher.code;
    this.discountApplied = true;
  }

  applySuggestedVoucher(voucher: ApiVoucher): void {
    this.discountCode = voucher.code;
    this.applyDiscount();
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
    private paymentService: PaymentService,
    private voucherService: VoucherService,
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

      if (!this.isAddressMode) {
        this.loadAvailableVouchers();
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

  private loadAvailableVouchers(): void {
    this.vouchersLoading = true;
    this.vouchersLoadError = '';

    this.voucherService.getVouchers().pipe(
      timeout(8000),
      catchError(() => {
        this.vouchersLoadError = 'Unable to load available vouchers right now.';
        return of([] as ApiVoucher[]);
      }),
      finalize(() => {
        this.vouchersLoading = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: (response) => {
        this.availableVouchers = this.extractVoucherList(response).filter((voucher) => this.isVoucherActive(voucher));
        this.cdr.markForCheck();
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

  private isVoucherEligible(voucher: ApiVoucher): boolean {
    return this.isVoucherActive(voucher) && this.subtotal >= Number(voucher.minimumCartValue ?? 0);
  }

  private isVoucherActive(voucher: ApiVoucher): boolean {
    const record = voucher as Record<string, unknown>;
    const activeValue = record['isActive'] ?? record['active'];
    return this.toBoolean(activeValue);
  }

  private normalizeVoucherCode(value: string): string {
    return String(value ?? '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
  }

  private extractVoucherList(response: unknown): ApiVoucher[] {
    if (Array.isArray(response)) {
      return response as ApiVoucher[];
    }

    if (response && typeof response === 'object') {
      const payload = response as Record<string, unknown>;
      if (Array.isArray(payload['body'])) {
        return payload['body'] as ApiVoucher[];
      }
    }

    return [];
  }

  private toBoolean(value: unknown): boolean {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      return ['true', '1', 'active', 'yes', 'y'].includes(normalized);
    }

    return false;
  }

  private buildOrderPayload(): CreateOrderRequest | null {
    const billing = this.selectedBillingAddress;
    if (!billing) {
      this.orderError = 'Please select or fill in a billing address.';
      return null;
    }

    if (this.cartItems.length === 0) {
      this.orderError = 'Your cart is empty.';
      return null;
    }

    const shippingAddr = this.shippingIsSameBilling
      ? billing
      : (this.isSignedIn
          ? (this.savedAddresses.find((a) => a.id === this.selectedShippingAddressId) ?? null)
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
      return null;
    }

    const TAX_RATE = 0.09;
    const shippingCharge = 0;
    const discountedSubtotal = this.total;
    const taxAmount = Math.round(discountedSubtotal * TAX_RATE * 100) / 100;
    const grandTotal = Math.round((discountedSubtotal + taxAmount + shippingCharge) * 100) / 100;
    const specialInstructions = this.cartService.specialInstructions.trim();

    if (specialInstructions.length > 500) {
      this.orderError = 'Special instructions must not exceed 500 characters.';
      return null;
    }

    const rawUserId = localStorage.getItem('auth.userId');
    const parsedUserId = rawUserId && /^\d+$/.test(rawUserId) ? Number(rawUserId) : null;

    return {
      customer: {
        userId: parsedUserId,
        guest: !this.isSignedIn
      },
      billingAddress: {
        label: billing.label || 'Home',
        line1: billing.line1,
        line2: billing.line2 ?? '',
        city: billing.city,
        state: billing.state,
        postalCode: billing.postalCode,
        country: billing.country,
        phone: billing.phone ?? '',
        isDefault: !!billing.isDefault
      },
      shippingAddress: {
        label: shippingAddr.label || 'Home',
        line1: shippingAddr.line1,
        line2: shippingAddr.line2 ?? '',
        city: shippingAddr.city,
        state: shippingAddr.state,
        postalCode: shippingAddr.postalCode,
        country: shippingAddr.country,
        phone: shippingAddr.phone ?? '',
        isDefault: !!shippingAddr.isDefault,
        sameAsBilling: this.shippingIsSameBilling
      },
      items: this.cartItems.map((item) => ({
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        unitPrice: item.product.salePrice ?? item.product.price ?? 0,
        totalPrice: (item.product.salePrice ?? item.product.price ?? 0) * item.quantity
      })),
      pricing: {
        subtotal: this.subtotal,
        discountCode: this.discountApplied ? this.discountCode.trim().toUpperCase() : null,
        discountPercent: this.discountApplied ? this.discountPercent : null,
        discountAmount: this.discountApplied ? this.discountAmount : null,
        shippingCharge,
        taxAmount,
        total: grandTotal
      },
      payment: {
        method: 'RAZORPAY',
        status: 'PENDING',
        transactionId: null
      },
      orderStatus: 'PLACED',
      createdAt: new Date().toISOString(),
      specialInstructions: specialInstructions || null
    };
  }

  placeOrder(): void {
    if (this.isPlacingOrder) return;

    this.orderError = '';
    this.paymentStatusMessage = 'Preparing secure payment...';

    const payload = this.buildOrderPayload();
    if (!payload) {
      this.paymentStatusMessage = '';
      return;
    }

    if (typeof window.Razorpay !== 'function') {
      this.paymentStatusMessage = '';
      this.orderError = 'Payment system is unavailable. Please refresh and try again.';
      return;
    }

    const RazorpayCtor = window.Razorpay;

    const payableAmount = Number(payload.pricing.total ?? 0);
    if (!Number.isFinite(payableAmount) || payableAmount <= 0) {
      this.paymentStatusMessage = '';
      this.orderError = 'Invalid payable amount. Please review your cart and try again.';
      return;
    }

    this.isPlacingOrder = true;
    this.paymentService.createRazorpayOrder({ amount: payableAmount, currency: 'INR' }).subscribe({
      next: (createOrderResponse) => {
        const createOrderBody = createOrderResponse.body;
        const razorpayOrderId = createOrderBody.razorpayOrderId ?? createOrderBody.orderId ?? '';
        const keyId = createOrderBody.keyId;

        if (!razorpayOrderId || !keyId) {
          this.isPlacingOrder = false;
          this.paymentStatusMessage = '';
          this.orderError = 'Unable to initialize payment. Please try again.';
          return;
        }

        this.paymentStatusMessage = 'Secure payment window opened...';

        const razorpay = new RazorpayCtor({
          key: keyId,
          amount: createOrderBody.amount,
          currency: createOrderBody.currency || 'INR',
          order_id: razorpayOrderId,
          name: 'SIESHA',
          description: 'Order Payment',
          handler: (handlerResponse: unknown) => {
            const gatewayPayload = handlerResponse as {
              razorpay_order_id?: string;
              razorpay_payment_id?: string;
              razorpay_signature?: string;
            };

            const receivedOrderId = gatewayPayload.razorpay_order_id ?? razorpayOrderId;
            const paymentId = gatewayPayload.razorpay_payment_id ?? '';
            const signature = gatewayPayload.razorpay_signature ?? '';

            if (!receivedOrderId || !paymentId || !signature) {
              this.isPlacingOrder = false;
              this.paymentStatusMessage = '';
              this.orderError = 'Payment confirmation is incomplete. Please contact support.';
              return;
            }

            this.paymentStatusMessage = 'Verifying payment securely...';

            this.paymentService.verifyRazorpayPayment({
              razorpayOrderId: receivedOrderId,
              razorpayPaymentId: paymentId,
              razorpaySignature: signature,
              orderRequest: payload
            }).pipe(
              finalize(() => {
                this.isPlacingOrder = false;
              })
            ).subscribe({
              next: () => {
                this.paymentStatusMessage = '';
                this.cartService.clearCart();
                void this.router.navigate(['/order-tracking']);
              },
              error: () => {
                this.paymentStatusMessage = '';
                this.orderError = 'Payment verification failed. Please contact support if amount was deducted.';
              }
            });
          },
          modal: {
            ondismiss: () => {
              this.isPlacingOrder = false;
              this.paymentStatusMessage = '';
              this.orderError = 'Payment was cancelled. You can try again.';
            }
          }
        });

        razorpay.on('payment.failed', () => {
          this.isPlacingOrder = false;
          this.paymentStatusMessage = '';
          this.orderError = 'Payment failed. Please try again.';
        });

        razorpay.open();
      },
      error: () => {
        this.isPlacingOrder = false;
        this.paymentStatusMessage = '';
        this.orderError = 'Unable to place order right now. Please try again.';
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
