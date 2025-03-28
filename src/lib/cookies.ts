import Cookies from 'js-cookie';

export const AUTH_COOKIE_NAME = 'auth_token';

export const setCookie = (name: string, value: string) => {
  Cookies.set(name, value, {
    expires: 7, // 7 days
    path: '/',
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
  });
};

export const getCookie = (name: string) => {
  return Cookies.get(name);
};

export const removeCookie = (name: string) => {
  Cookies.remove(name, { path: '/' });
};
