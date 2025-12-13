import { useState, useEffect } from "react";
import { getToken, removeToken } from "@/utils/auth";
import { useRouter } from "next/navigation";

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    if (token) setIsAuthenticated(true);
  }, []);

  const logout = () => {
    removeToken();
    setIsAuthenticated(false);
    router.push("/login");
  };

  return { isAuthenticated, logout };
};
