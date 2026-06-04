import { useCallback, useEffect, useState } from "react";
import { clearHqSession, fetchHqMe, HQ_ACCESS_TOKEN_KEY, readHqSession } from "../../lib/hqAdminApi.js";
import HqControlDesk from "./HqControlDesk.jsx";
import HqMasterLogin from "./HqMasterLogin.jsx";

export default function SuperAdminHqApp() {
  const [user, setUser] = useState(() => readHqSession());
  const [checking, setChecking] = useState(Boolean(localStorage.getItem(HQ_ACCESS_TOKEN_KEY)));

  const logout = useCallback(() => {
    clearHqSession();
    setUser(null);
  }, []);

  useEffect(() => {
    if (!localStorage.getItem(HQ_ACCESS_TOKEN_KEY)) {
      setChecking(false);
      return;
    }
    fetchHqMe()
      .then((data) => {
        if (data.role !== "SUPER_ADMIN") {
          clearHqSession();
          setUser(null);
          return;
        }
        setUser({
          userId: data.userId,
          legalName: data.legalName,
          publicHandle: data.publicHandle,
          role: data.role
        });
      })
      .catch(() => {
        clearHqSession();
        setUser(null);
      })
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-white text-[16px] font-bold text-slate-600">
        SUPER_ADMIN 세션 확인 중…
      </div>
    );
  }

  if (!user?.role) {
    return (
      <HqMasterLogin
        onSuccess={(data) =>
          setUser({
            userId: data.userId,
            legalName: data.legalName,
            publicHandle: data.publicHandle,
            role: data.role
          })
        }
      />
    );
  }

  return <HqControlDesk user={user} onLogout={logout} />;
}
