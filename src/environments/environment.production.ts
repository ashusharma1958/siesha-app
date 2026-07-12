export const environment = {
  // Use nginx reverse proxy on same origin
  apiBaseUrl: '',
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
    google: '/auth/google'
  }
};