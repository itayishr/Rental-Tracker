const PASSWORD_STORAGE_KEY = 'apartment_hunter_password';
const PASSWORD_HEADER = 'x-app-password';

export const getSavedPassword = () => {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(PASSWORD_STORAGE_KEY) || '';
};

export const setSavedPassword = (value) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(PASSWORD_STORAGE_KEY, value);
};

export const clearSavedPassword = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(PASSWORD_STORAGE_KEY);
};

export const apiFetch = async (input, init = {}) => {
  const headers = new Headers(init.headers || {});
  const savedPassword = getSavedPassword();
  if (savedPassword) {
    headers.set(PASSWORD_HEADER, savedPassword);
  }

  const response = await fetch(input, {
    ...init,
    headers
  });

  if (response.status === 401) {
    clearSavedPassword();
  }

  return response;
};
