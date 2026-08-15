import { useMemo } from "react";
import { ADMIN_EMAILS } from "../lib/supabaseClient";

export const useAdmin = (user) => {
 const isAdmin = useMemo(() => {
 if (!user?.email) return false;
 return ADMIN_EMAILS.includes(user.email.toLowerCase());
 }, [user?.email]);

 return { isAdmin };
};
