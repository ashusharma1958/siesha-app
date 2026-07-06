export const environment = {
  apiBaseUrl: 'http://localhost:8080',
  paymentEndpoints: {
    razorpayCreateOrder: '/api/payment/razorpay/create-order',
    razorpayVerify: '/api/payment/razorpay/verify'
  },
  accountEndpoints: {
    orders: '/api/orders/me',
    addresses: '/api/addresses/me'
  },
  socialAuthUrls: {
    google: 'http://localhost:8080/auth/google'
  }
};
