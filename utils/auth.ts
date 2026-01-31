export const saveToken = (token: string) => {
  localStorage.setItem("token", token);
};

export const getToken = () => {
  return localStorage.getItem("token");
};

export const removeToken = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("me");
};

export const saveMe = (me: unknown) => {
  try {
    localStorage.setItem("me", JSON.stringify(me));
  } catch {
    // ignore
  }
};

export const getMe = <T = any>(): T | null => {
  try {
    const raw = localStorage.getItem("me");
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

export const removeMe = () => {
  localStorage.removeItem("me");
};
