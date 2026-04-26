export const environment = {
  apiBaseUrl: 'http://localhost:8080',
  accountEndpoints: {
    orders: '/api/orders/me',
    addresses: '/api/addresses/me'
  },
  socialAuthUrls: {
    google: 'http://localhost:8080/auth/google',
    facebook: 'http://localhost:8080/auth/facebook',
    apple: 'http://localhost:8080/auth/apple'
  }
};
