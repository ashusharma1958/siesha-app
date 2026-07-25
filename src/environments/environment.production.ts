export const environment = {
  // Use nginx reverse proxy on same origin
  apiBaseUrl: '',
  paymentEndpoints: {
    razorpayCreateOrder: '/api/payment/razorpay/create-order',
    razorpayVerify: '/api/payment/razorpay/verify',
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