export const environment = {
  // Set this to your production backend URL, for example: https://api.siesha.com
  apiBaseUrl: 'https://api.your-domain.com',
  paymentEndpoints: {
    razorpayCreateOrder: '/api/payments/razorpay/order',
    razorpayVerify: '/api/payments/razorpay/verify',
    razorpayKeyId: ''
  },
  accountEndpoints: {
    orders: '/api/orders/me',
    addresses: '/api/addresses/me'
  },
  socialAuthUrls: {
    google: 'https://api.your-domain.com/auth/google'
  }
};