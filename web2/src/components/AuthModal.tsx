import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/components/AuthModal.tsx");import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=4b28e2bb"; const Fragment = __vite__cjsImport0_react_jsxDevRuntime["Fragment"]; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
import RefreshRuntime from "/@react-refresh";
const inWebWorker = typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope;
let prevRefreshReg;
let prevRefreshSig;
if (import.meta.hot && !inWebWorker) {
  if (!window.__vite_plugin_react_preamble_installed__) {
    throw new Error("@vitejs/plugin-react can't detect preamble. Something is wrong. See https://github.com/vitejs/vite-plugin-react/pull/11#discussion_r430879201");
  }
  prevRefreshReg = window.$RefreshReg$;
  prevRefreshSig = window.$RefreshSig$;
  window.$RefreshReg$ = (type, id) => {
    RefreshRuntime.register(type, "/home/project/src/components/AuthModal.tsx " + id);
  };
  window.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;
}
var _s = $RefreshSig$();
import __vite__cjsImport3_react from "/node_modules/.vite/deps/react.js?v=4b28e2bb"; const useState = __vite__cjsImport3_react["useState"];
import { X, Eye, EyeOff, Shield, Loader, Smartphone, CheckCircle, ChevronRight, Lock } from "/node_modules/lucide-react/dist/esm/lucide-react.js?v=4b28e2bb";
import { supabase, isSupabaseAvailable } from "/src/lib/supabase.ts";
const SOCIAL = [
  { id: "kakao", label: "카카오 로그인", color: "#FEE500", textColor: "#000", icon: "💬" },
  { id: "naver", label: "네이버 로그인", color: "#03C75A", textColor: "#fff", icon: "N" },
  { id: "google", label: "Google 로그인", color: "#fff", textColor: "#374151", icon: "G", border: true }
];
export default function AuthModal({ onClose, onSuccess }) {
  _s();
  const [mode, setMode] = useState("login");
  const [step, setStep] = useState("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpSent, setOtpSent] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const reset = () => {
    setError("");
    setEmail("");
    setPassword("");
    setConfirmPw("");
    setOtp(["", "", "", "", "", ""]);
    setStep("credentials");
    setOtpSent(false);
  };
  const handleOtpChange = (idx, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[idx] = val;
    setOtp(next);
    if (val && idx < 5) {
      document.getElementById(`otp-${idx + 1}`)?.focus();
    }
  };
  const handleOtpKeyDown = (idx, e) => {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) {
      document.getElementById(`otp-${idx - 1}`)?.focus();
    }
  };
  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const isSignup2 = mode === "signup" || mode === "signup_certified";
    if (!email || !password) {
      setError("이메일과 비밀번호를 입력해 주세요.");
      return;
    }
    if (isSignup2 && password !== confirmPw) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    if (password.length < 6) {
      setError("비밀번호는 최소 6자 이상이어야 합니다.");
      return;
    }
    setLoading(true);
    try {
      if (!isSupabaseAvailable) {
        await new Promise((r) => setTimeout(r, 500));
      } else if (mode === "login") {
        const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) throw authError;
        if (!data.user) throw new Error("로그인 실패");
      } else {
        const { data, error: authError } = await supabase.auth.signUp({ email, password });
        if (authError) throw authError;
        if (!data.user) throw new Error("가입 실패");
      }
      setPendingEmail(email);
      setOtpSent(true);
      setStep("otp");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("Invalid login credentials")) setError("이메일 또는 비밀번호가 올바르지 않습니다.");
      else if (msg.includes("User already registered")) setError("이미 등록된 이메일입니다. 로그인해 주세요.");
      else
        setError("서버 연결에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  };
  const handleOtpVerify = async (e) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length < 6) {
      setError("6자리 인증 코드를 입력해 주세요.");
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 700));
    setLoading(false);
    onSuccess({ email: pendingEmail, grade: mode === "signup_certified" ? "certified" : "basic" });
  };
  const handleSocialLogin = async (provider) => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    setLoading(false);
    setPendingEmail(`${provider}@vlue.kr`);
    setOtpSent(true);
    setStep("otp");
  };
  const isSignup = mode === "signup" || mode === "signup_certified";
  return /* @__PURE__ */ jsxDEV("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-4", children: [
    /* @__PURE__ */ jsxDEV("div", { className: "absolute inset-0 bg-black/50 backdrop-blur-sm", onClick: onClose }, void 0, false, {
      fileName: "/home/project/src/components/AuthModal.tsx",
      lineNumber: 115,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(
      "div",
      {
        className: "relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden",
        style: { animation: "authModalIn 0.2s cubic-bezier(0.34,1.56,0.64,1)" },
        children: [
          /* @__PURE__ */ jsxDEV("style", { children: `
          @keyframes authModalIn {
            from { opacity: 0; transform: scale(0.9) translateY(16px); }
            to   { opacity: 1; transform: scale(1) translateY(0); }
          }
        ` }, void 0, false, {
            fileName: "/home/project/src/components/AuthModal.tsx",
            lineNumber: 120,
            columnNumber: 9
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "bg-gradient-to-br from-primary-600 to-blue-700 px-6 pt-6 pb-8 relative overflow-hidden", children: [
            /* @__PURE__ */ jsxDEV("div", { className: "absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/5" }, void 0, false, {
              fileName: "/home/project/src/components/AuthModal.tsx",
              lineNumber: 128,
              columnNumber: 11
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-white/5" }, void 0, false, {
              fileName: "/home/project/src/components/AuthModal.tsx",
              lineNumber: 129,
              columnNumber: 11
            }, this),
            /* @__PURE__ */ jsxDEV("button", { onClick: onClose, className: "absolute top-4 right-4 p-1.5 text-white/70 hover:text-white hover:bg-white/15 rounded-xl transition-all", children: /* @__PURE__ */ jsxDEV(X, { className: "w-4 h-4" }, void 0, false, {
              fileName: "/home/project/src/components/AuthModal.tsx",
              lineNumber: 131,
              columnNumber: 13
            }, this) }, void 0, false, {
              fileName: "/home/project/src/components/AuthModal.tsx",
              lineNumber: 130,
              columnNumber: 11
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2.5 mb-3 relative z-10", children: [
              /* @__PURE__ */ jsxDEV("div", { className: "w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center", children: /* @__PURE__ */ jsxDEV(Shield, { className: "w-5 h-5 text-white" }, void 0, false, {
                fileName: "/home/project/src/components/AuthModal.tsx",
                lineNumber: 135,
                columnNumber: 15
              }, this) }, void 0, false, {
                fileName: "/home/project/src/components/AuthModal.tsx",
                lineNumber: 134,
                columnNumber: 13
              }, this),
              /* @__PURE__ */ jsxDEV("span", { className: "text-2xl font-black text-white", style: { letterSpacing: "-0.04em" }, children: "VLUE" }, void 0, false, {
                fileName: "/home/project/src/components/AuthModal.tsx",
                lineNumber: 137,
                columnNumber: 13
              }, this)
            ] }, void 0, true, {
              fileName: "/home/project/src/components/AuthModal.tsx",
              lineNumber: 133,
              columnNumber: 11
            }, this),
            /* @__PURE__ */ jsxDEV("h2", { className: "text-white text-lg font-bold relative z-10", style: { wordBreak: "keep-all" }, children: step === "otp" ? "2차 보안 인증" : mode === "login" ? "로그인" : mode === "signup_certified" ? "[신뢰인증] 회원가입" : "일반 회원가입" }, void 0, false, {
              fileName: "/home/project/src/components/AuthModal.tsx",
              lineNumber: 139,
              columnNumber: 11
            }, this),
            /* @__PURE__ */ jsxDEV("p", { className: "text-white/70 text-sm mt-1 relative z-10", style: { wordBreak: "keep-all" }, children: step === "otp" ? `${pendingEmail}으로 발송된 6자리 코드를 입력하세요` : mode === "login" ? "보이스피싱 예방 통합 플랫폼" : mode === "signup_certified" ? "본인 인증 후 신뢰인증 회원으로 가입합니다" : "VLUE 서비스를 자유롭게 이용해보세요" }, void 0, false, {
              fileName: "/home/project/src/components/AuthModal.tsx",
              lineNumber: 142,
              columnNumber: 11
            }, this),
            step === "otp" && /* @__PURE__ */ jsxDEV("div", { className: "mt-3 flex items-center gap-2 relative z-10", children: [
              /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-1.5 px-3 py-1 bg-white/15 rounded-full", children: [
                /* @__PURE__ */ jsxDEV(CheckCircle, { className: "w-3 h-3 text-white/80" }, void 0, false, {
                  fileName: "/home/project/src/components/AuthModal.tsx",
                  lineNumber: 154,
                  columnNumber: 17
                }, this),
                /* @__PURE__ */ jsxDEV("span", { className: "text-white/80 text-xs", children: "1단계 완료" }, void 0, false, {
                  fileName: "/home/project/src/components/AuthModal.tsx",
                  lineNumber: 155,
                  columnNumber: 17
                }, this)
              ] }, void 0, true, {
                fileName: "/home/project/src/components/AuthModal.tsx",
                lineNumber: 153,
                columnNumber: 15
              }, this),
              /* @__PURE__ */ jsxDEV(ChevronRight, { className: "w-3 h-3 text-white/50" }, void 0, false, {
                fileName: "/home/project/src/components/AuthModal.tsx",
                lineNumber: 157,
                columnNumber: 15
              }, this),
              /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-1.5 px-3 py-1 bg-white/25 rounded-full border border-white/30", children: [
                /* @__PURE__ */ jsxDEV(Smartphone, { className: "w-3 h-3 text-white" }, void 0, false, {
                  fileName: "/home/project/src/components/AuthModal.tsx",
                  lineNumber: 159,
                  columnNumber: 17
                }, this),
                /* @__PURE__ */ jsxDEV("span", { className: "text-white text-xs font-semibold", children: "2차 인증 중" }, void 0, false, {
                  fileName: "/home/project/src/components/AuthModal.tsx",
                  lineNumber: 160,
                  columnNumber: 17
                }, this)
              ] }, void 0, true, {
                fileName: "/home/project/src/components/AuthModal.tsx",
                lineNumber: 158,
                columnNumber: 15
              }, this)
            ] }, void 0, true, {
              fileName: "/home/project/src/components/AuthModal.tsx",
              lineNumber: 152,
              columnNumber: 11
            }, this)
          ] }, void 0, true, {
            fileName: "/home/project/src/components/AuthModal.tsx",
            lineNumber: 127,
            columnNumber: 9
          }, this),
          step === "credentials" && /* @__PURE__ */ jsxDEV(Fragment, { children: [
            /* @__PURE__ */ jsxDEV("div", { className: "flex border-b border-gray-100", children: ["login", "signup", "signup_certified"].map(
              (m) => /* @__PURE__ */ jsxDEV(
                "button",
                {
                  onClick: () => {
                    reset();
                    setMode(m);
                  },
                  className: `flex-1 py-2.5 text-xs font-semibold transition-colors ${mode === m ? "text-primary-600 border-b-2 border-primary-600 bg-primary-50/40" : "text-gray-400 hover:text-gray-600"}`,
                  children: m === "login" ? "로그인" : m === "signup" ? "일반가입" : "신뢰인증 가입"
                },
                m,
                false,
                {
                  fileName: "/home/project/src/components/AuthModal.tsx",
                  lineNumber: 170,
                  columnNumber: 13
                },
                this
              )
            ) }, void 0, false, {
              fileName: "/home/project/src/components/AuthModal.tsx",
              lineNumber: 168,
              columnNumber: 13
            }, this),
            mode === "signup_certified" && /* @__PURE__ */ jsxDEV("div", { className: "mx-5 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5", children: [
              /* @__PURE__ */ jsxDEV(Lock, { className: "w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" }, void 0, false, {
                fileName: "/home/project/src/components/AuthModal.tsx",
                lineNumber: 184,
                columnNumber: 17
              }, this),
              /* @__PURE__ */ jsxDEV("p", { className: "text-xs text-amber-700 leading-relaxed", style: { wordBreak: "keep-all" }, children: [
                /* @__PURE__ */ jsxDEV("strong", { children: "[신뢰인증] 회원" }, void 0, false, {
                  fileName: "/home/project/src/components/AuthModal.tsx",
                  lineNumber: 186,
                  columnNumber: 19
                }, this),
                "은 가입 후 AI 본인 검증(5~10일) 과정을 거칩니다. 검토 중에도 ",
                /* @__PURE__ */ jsxDEV("strong", { children: "일반 회원 권한" }, void 0, false, {
                  fileName: "/home/project/src/components/AuthModal.tsx",
                  lineNumber: 186,
                  columnNumber: 85
                }, this),
                "으로 모든 서비스를 이용할 수 있습니다."
              ] }, void 0, true, {
                fileName: "/home/project/src/components/AuthModal.tsx",
                lineNumber: 185,
                columnNumber: 17
              }, this)
            ] }, void 0, true, {
              fileName: "/home/project/src/components/AuthModal.tsx",
              lineNumber: 183,
              columnNumber: 11
            }, this),
            /* @__PURE__ */ jsxDEV("form", { onSubmit: handleCredentialsSubmit, className: "px-5 py-4 space-y-3", children: [
              error && /* @__PURE__ */ jsxDEV("div", { className: "px-3 py-2.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-600", children: error }, void 0, false, {
                fileName: "/home/project/src/components/AuthModal.tsx",
                lineNumber: 193,
                columnNumber: 13
              }, this),
              /* @__PURE__ */ jsxDEV("div", { children: [
                /* @__PURE__ */ jsxDEV("label", { className: "block text-xs font-semibold text-gray-700 mb-1.5", children: "이메일" }, void 0, false, {
                  fileName: "/home/project/src/components/AuthModal.tsx",
                  lineNumber: 198,
                  columnNumber: 17
                }, this),
                /* @__PURE__ */ jsxDEV(
                  "input",
                  {
                    type: "email",
                    value: email,
                    onChange: (e) => setEmail(e.target.value),
                    placeholder: "example@vlue.kr",
                    className: "input-field",
                    autoComplete: "email"
                  },
                  void 0,
                  false,
                  {
                    fileName: "/home/project/src/components/AuthModal.tsx",
                    lineNumber: 199,
                    columnNumber: 17
                  },
                  this
                )
              ] }, void 0, true, {
                fileName: "/home/project/src/components/AuthModal.tsx",
                lineNumber: 197,
                columnNumber: 15
              }, this),
              /* @__PURE__ */ jsxDEV("div", { children: [
                /* @__PURE__ */ jsxDEV("label", { className: "block text-xs font-semibold text-gray-700 mb-1.5", children: "비밀번호" }, void 0, false, {
                  fileName: "/home/project/src/components/AuthModal.tsx",
                  lineNumber: 209,
                  columnNumber: 17
                }, this),
                /* @__PURE__ */ jsxDEV("div", { className: "relative", children: [
                  /* @__PURE__ */ jsxDEV(
                    "input",
                    {
                      type: showPw ? "text" : "password",
                      value: password,
                      onChange: (e) => setPassword(e.target.value),
                      placeholder: "최소 6자 이상",
                      className: "input-field pr-10",
                      autoComplete: mode === "login" ? "current-password" : "new-password"
                    },
                    void 0,
                    false,
                    {
                      fileName: "/home/project/src/components/AuthModal.tsx",
                      lineNumber: 211,
                      columnNumber: 19
                    },
                    this
                  ),
                  /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => setShowPw(!showPw), className: "absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600", children: showPw ? /* @__PURE__ */ jsxDEV(EyeOff, { className: "w-4 h-4" }, void 0, false, {
                    fileName: "/home/project/src/components/AuthModal.tsx",
                    lineNumber: 220,
                    columnNumber: 31
                  }, this) : /* @__PURE__ */ jsxDEV(Eye, { className: "w-4 h-4" }, void 0, false, {
                    fileName: "/home/project/src/components/AuthModal.tsx",
                    lineNumber: 220,
                    columnNumber: 64
                  }, this) }, void 0, false, {
                    fileName: "/home/project/src/components/AuthModal.tsx",
                    lineNumber: 219,
                    columnNumber: 19
                  }, this)
                ] }, void 0, true, {
                  fileName: "/home/project/src/components/AuthModal.tsx",
                  lineNumber: 210,
                  columnNumber: 17
                }, this)
              ] }, void 0, true, {
                fileName: "/home/project/src/components/AuthModal.tsx",
                lineNumber: 208,
                columnNumber: 15
              }, this),
              isSignup && /* @__PURE__ */ jsxDEV("div", { children: [
                /* @__PURE__ */ jsxDEV("label", { className: "block text-xs font-semibold text-gray-700 mb-1.5", children: "비밀번호 확인" }, void 0, false, {
                  fileName: "/home/project/src/components/AuthModal.tsx",
                  lineNumber: 226,
                  columnNumber: 19
                }, this),
                /* @__PURE__ */ jsxDEV(
                  "input",
                  {
                    type: showPw ? "text" : "password",
                    value: confirmPw,
                    onChange: (e) => setConfirmPw(e.target.value),
                    placeholder: "비밀번호를 다시 입력해 주세요",
                    className: "input-field",
                    autoComplete: "new-password"
                  },
                  void 0,
                  false,
                  {
                    fileName: "/home/project/src/components/AuthModal.tsx",
                    lineNumber: 227,
                    columnNumber: 19
                  },
                  this
                )
              ] }, void 0, true, {
                fileName: "/home/project/src/components/AuthModal.tsx",
                lineNumber: 225,
                columnNumber: 13
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "submit", disabled: loading, className: "btn-primary w-full justify-center", children: [
                loading ? /* @__PURE__ */ jsxDEV(Loader, { className: "w-4 h-4 animate-spin" }, void 0, false, {
                  fileName: "/home/project/src/components/AuthModal.tsx",
                  lineNumber: 238,
                  columnNumber: 28
                }, this) : null,
                loading ? "처리 중..." : mode === "login" ? "로그인 후 2차 인증" : "가입 후 2차 인증"
              ] }, void 0, true, {
                fileName: "/home/project/src/components/AuthModal.tsx",
                lineNumber: 237,
                columnNumber: 15
              }, this)
            ] }, void 0, true, {
              fileName: "/home/project/src/components/AuthModal.tsx",
              lineNumber: 191,
              columnNumber: 13
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "px-5 pb-5 space-y-2", children: [
              /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ jsxDEV("div", { className: "flex-1 h-px bg-gray-100" }, void 0, false, {
                  fileName: "/home/project/src/components/AuthModal.tsx",
                  lineNumber: 245,
                  columnNumber: 17
                }, this),
                /* @__PURE__ */ jsxDEV("span", { className: "text-xs text-gray-400 font-medium", children: "간편 로그인" }, void 0, false, {
                  fileName: "/home/project/src/components/AuthModal.tsx",
                  lineNumber: 246,
                  columnNumber: 17
                }, this),
                /* @__PURE__ */ jsxDEV("div", { className: "flex-1 h-px bg-gray-100" }, void 0, false, {
                  fileName: "/home/project/src/components/AuthModal.tsx",
                  lineNumber: 247,
                  columnNumber: 17
                }, this)
              ] }, void 0, true, {
                fileName: "/home/project/src/components/AuthModal.tsx",
                lineNumber: 244,
                columnNumber: 15
              }, this),
              /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col gap-2", children: SOCIAL.map(
                (s) => /* @__PURE__ */ jsxDEV(
                  "button",
                  {
                    onClick: () => handleSocialLogin(s.id),
                    disabled: loading,
                    className: "w-full flex items-center justify-center gap-2.5 py-2.5 rounded-2xl text-sm font-semibold transition-all hover:opacity-90",
                    style: {
                      background: s.color,
                      color: s.textColor,
                      border: s.border ? "1.5px solid #E5E7EB" : "none"
                    },
                    children: [
                      /* @__PURE__ */ jsxDEV("span", { className: "w-5 h-5 flex items-center justify-center text-sm leading-none", children: s.icon }, void 0, false, {
                        fileName: "/home/project/src/components/AuthModal.tsx",
                        lineNumber: 262,
                        columnNumber: 21
                      }, this),
                      s.label
                    ]
                  },
                  s.id,
                  true,
                  {
                    fileName: "/home/project/src/components/AuthModal.tsx",
                    lineNumber: 251,
                    columnNumber: 15
                  },
                  this
                )
              ) }, void 0, false, {
                fileName: "/home/project/src/components/AuthModal.tsx",
                lineNumber: 249,
                columnNumber: 15
              }, this),
              /* @__PURE__ */ jsxDEV("p", { className: "text-center text-xs text-gray-400 pt-1", children: [
                "간편 로그인 후에도 ",
                /* @__PURE__ */ jsxDEV("strong", { children: "동일한 2차 인증" }, void 0, false, {
                  fileName: "/home/project/src/components/AuthModal.tsx",
                  lineNumber: 268,
                  columnNumber: 28
                }, this),
                " 과정이 진행됩니다"
              ] }, void 0, true, {
                fileName: "/home/project/src/components/AuthModal.tsx",
                lineNumber: 267,
                columnNumber: 15
              }, this)
            ] }, void 0, true, {
              fileName: "/home/project/src/components/AuthModal.tsx",
              lineNumber: 243,
              columnNumber: 13
            }, this)
          ] }, void 0, true, {
            fileName: "/home/project/src/components/AuthModal.tsx",
            lineNumber: 167,
            columnNumber: 9
          }, this),
          step === "otp" && /* @__PURE__ */ jsxDEV("form", { onSubmit: handleOtpVerify, className: "px-5 py-6 space-y-5", children: [
            error && /* @__PURE__ */ jsxDEV("div", { className: "px-3 py-2.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-600", children: error }, void 0, false, {
              fileName: "/home/project/src/components/AuthModal.tsx",
              lineNumber: 277,
              columnNumber: 11
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "text-center", children: [
              /* @__PURE__ */ jsxDEV("div", { className: "w-14 h-14 rounded-2xl bg-primary-50 border border-primary-100 flex items-center justify-center mx-auto mb-3", children: /* @__PURE__ */ jsxDEV(Smartphone, { className: "w-7 h-7 text-primary-500" }, void 0, false, {
                fileName: "/home/project/src/components/AuthModal.tsx",
                lineNumber: 283,
                columnNumber: 17
              }, this) }, void 0, false, {
                fileName: "/home/project/src/components/AuthModal.tsx",
                lineNumber: 282,
                columnNumber: 15
              }, this),
              /* @__PURE__ */ jsxDEV("p", { className: "text-sm font-semibold text-gray-800", style: { wordBreak: "keep-all" }, children: [
                "휴대폰으로 발송된 6자리",
                /* @__PURE__ */ jsxDEV("br", {}, void 0, false, {
                  fileName: "/home/project/src/components/AuthModal.tsx",
                  lineNumber: 286,
                  columnNumber: 30
                }, this),
                "인증 코드를 입력하세요"
              ] }, void 0, true, {
                fileName: "/home/project/src/components/AuthModal.tsx",
                lineNumber: 285,
                columnNumber: 15
              }, this),
              otpSent && /* @__PURE__ */ jsxDEV("p", { className: "text-xs text-primary-500 mt-1 font-medium", children: "인증 코드가 발송되었습니다" }, void 0, false, {
                fileName: "/home/project/src/components/AuthModal.tsx",
                lineNumber: 289,
                columnNumber: 13
              }, this)
            ] }, void 0, true, {
              fileName: "/home/project/src/components/AuthModal.tsx",
              lineNumber: 281,
              columnNumber: 13
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "flex justify-center gap-2", children: otp.map(
              (digit, idx) => /* @__PURE__ */ jsxDEV(
                "input",
                {
                  id: `otp-${idx}`,
                  type: "text",
                  inputMode: "numeric",
                  maxLength: 1,
                  value: digit,
                  onChange: (e) => handleOtpChange(idx, e.target.value),
                  onKeyDown: (e) => handleOtpKeyDown(idx, e),
                  className: "w-11 h-12 text-center text-lg font-black text-gray-900 border-2 rounded-2xl focus:outline-none transition-colors",
                  style: { borderColor: digit ? "#3182F6" : "#E5E7EB", background: digit ? "#EBF3FF" : "#fff" }
                },
                idx,
                false,
                {
                  fileName: "/home/project/src/components/AuthModal.tsx",
                  lineNumber: 295,
                  columnNumber: 13
                },
                this
              )
            ) }, void 0, false, {
              fileName: "/home/project/src/components/AuthModal.tsx",
              lineNumber: 293,
              columnNumber: 13
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "text-center", children: /* @__PURE__ */ jsxDEV("p", { className: "text-xs text-gray-400", children: [
              "코드를 받지 못하셨나요?",
              " ",
              /* @__PURE__ */ jsxDEV("button", { type: "button", className: "text-primary-600 font-semibold hover:underline", children: "재발송" }, void 0, false, {
                fileName: "/home/project/src/components/AuthModal.tsx",
                lineNumber: 313,
                columnNumber: 17
              }, this)
            ] }, void 0, true, {
              fileName: "/home/project/src/components/AuthModal.tsx",
              lineNumber: 311,
              columnNumber: 15
            }, this) }, void 0, false, {
              fileName: "/home/project/src/components/AuthModal.tsx",
              lineNumber: 310,
              columnNumber: 13
            }, this),
            /* @__PURE__ */ jsxDEV(
              "button",
              {
                type: "submit",
                disabled: loading || otp.join("").length < 6,
                className: "btn-primary w-full justify-center disabled:opacity-40 disabled:cursor-not-allowed",
                children: [
                  loading ? /* @__PURE__ */ jsxDEV(Loader, { className: "w-4 h-4 animate-spin" }, void 0, false, {
                    fileName: "/home/project/src/components/AuthModal.tsx",
                    lineNumber: 322,
                    columnNumber: 26
                  }, this) : /* @__PURE__ */ jsxDEV(CheckCircle, { className: "w-4 h-4" }, void 0, false, {
                    fileName: "/home/project/src/components/AuthModal.tsx",
                    lineNumber: 322,
                    columnNumber: 72
                  }, this),
                  loading ? "인증 중..." : "인증 완료"
                ]
              },
              void 0,
              true,
              {
                fileName: "/home/project/src/components/AuthModal.tsx",
                lineNumber: 317,
                columnNumber: 13
              },
              this
            ),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => {
              setStep("credentials");
              setError("");
            }, className: "w-full text-xs text-gray-400 hover:text-gray-600 py-1", children: "이전 단계로" }, void 0, false, {
              fileName: "/home/project/src/components/AuthModal.tsx",
              lineNumber: 326,
              columnNumber: 13
            }, this)
          ] }, void 0, true, {
            fileName: "/home/project/src/components/AuthModal.tsx",
            lineNumber: 275,
            columnNumber: 9
          }, this)
        ]
      },
      void 0,
      true,
      {
        fileName: "/home/project/src/components/AuthModal.tsx",
        lineNumber: 116,
        columnNumber: 7
      },
      this
    )
  ] }, void 0, true, {
    fileName: "/home/project/src/components/AuthModal.tsx",
    lineNumber: 114,
    columnNumber: 5
  }, this);
}
_s(AuthModal, "ictlxoJwW1YaFOVgyDwuOCJLukg=");
_c = AuthModal;
var _c;
$RefreshReg$(_c, "AuthModal");
if (import.meta.hot && !inWebWorker) {
  window.$RefreshReg$ = prevRefreshReg;
  window.$RefreshSig$ = prevRefreshSig;
}
if (import.meta.hot && !inWebWorker) {
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("/home/project/src/components/AuthModal.tsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("/home/project/src/components/AuthModal.tsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}

//# sourceMappingURL=data:application/json;base64,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TSx1QkFBQyxlQUFZLFdBQVUsYUFBdkI7QUFBQTtBQUFBO0FBQUE7QUFBQSx5QkFBZ0M7QUFBQSxrQkFDeEZBLFVBQVUsWUFBWTtBQUFBO0FBQUE7QUFBQSxjQU56QjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsWUFPQTtBQUFBLFlBRUEsdUJBQUMsWUFBTyxNQUFLLFVBQVMsU0FBUyxNQUFNO0FBQUVULHNCQUFRLGFBQWE7QUFBR1ksdUJBQVMsRUFBRTtBQUFBLFlBQUcsR0FBRyxXQUFVLHlEQUF1RCxzQkFBako7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFFQTtBQUFBLGVBckRGO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBc0RBO0FBQUE7QUFBQTtBQUFBLE1Bck5KO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxJQXVOQTtBQUFBLE9Bek5GO0FBQUE7QUFBQTtBQUFBO0FBQUEsU0EwTkE7QUFFSjtBQUFDakIsR0EzVHVCSCxXQUFTO0FBQUEwRSxLQUFUMUU7QUFBUyxJQUFBMEU7QUFBQUMsYUFBQUQsSUFBQSIsIm5hbWVzIjpbIlgiLCJFeWUiLCJFeWVPZmYiLCJTaGllbGQiLCJMb2FkZXIiLCJTbWFydHBob25lIiwiQ2hlY2tDaXJjbGUiLCJDaGV2cm9uUmlnaHQiLCJMb2NrIiwic3VwYWJhc2UiLCJpc1N1cGFiYXNlQXZhaWxhYmxlIiwiU09DSUFMIiwiaWQiLCJsYWJlbCIsImNvbG9yIiwidGV4dENvbG9yIiwiaWNvbiIsImJvcmRlciIsIkF1dGhNb2RhbCIsIm9uQ2xvc2UiLCJvblN1Y2Nlc3MiLCJfcyIsIm1vZGUiLCJzZXRNb2RlIiwidXNlU3RhdGUiLCJzdGVwIiwic2V0U3RlcCIsImVtYWlsIiwic2V0RW1haWwiLCJwYXNzd29yZCIsInNldFBhc3N3b3JkIiwiY29uZmlybVB3Iiwic2V0Q29uZmlybVB3Iiwic2hvd1B3Iiwic2V0U2hvd1B3IiwibG9hZGluZyIsInNldExvYWRpbmciLCJlcnJvciIsInNldEVycm9yIiwib3RwIiwic2V0T3RwIiwib3RwU2VudCIsInNldE90cFNlbnQiLCJwZW5kaW5nRW1haWwiLCJzZXRQZW5kaW5nRW1haWwiLCJyZXNldCIsImhhbmRsZU90cENoYW5nZSIsImlkeCIsInZhbCIsInRlc3QiLCJuZXh0IiwiZG9jdW1lbnQiLCJnZXRFbGVtZW50QnlJZCIsImZvY3VzIiwiaGFuZGxlT3RwS2V5RG93biIsImUiLCJrZXkiLCJoYW5kbGVDcmVkZW50aWFsc1N1Ym1pdCIsInByZXZlbnREZWZhdWx0IiwiaXNTaWdudXAiLCJsZW5ndGgiLCJQcm9taXNlIiwiciIsInNldFRpbWVvdXQiLCJkYXRhIiwiYXV0aEVycm9yIiwiYXV0aCIsInNpZ25JbldpdGhQYXNzd29yZCIsInVzZXIiLCJFcnJvciIsInNpZ25VcCIsImVyciIsIm1zZyIsIm1lc3NhZ2UiLCJpbmNsdWRlcyIsImhhbmRsZU90cFZlcmlmeSIsImNvZGUiLCJqb2luIiwiZ3JhZGUiLCJoYW5kbGVTb2NpYWxMb2dpbiIsInByb3ZpZGVyIiwiYW5pbWF0aW9uIiwibGV0dGVyU3BhY2luZyIsIndvcmRCcmVhayIsIm1hcCIsIm0iLCJ0YXJnZXQiLCJ2YWx1ZSIsInMiLCJiYWNrZ3JvdW5kIiwiZGlnaXQiLCJib3JkZXJDb2xvciIsIl9jIiwiJFJlZnJlc2hSZWckIl0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VzIjpbIkF1dGhNb2RhbC50c3giXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgdXNlU3RhdGUgfSBmcm9tICdyZWFjdCc7XG5pbXBvcnQgeyBYLCBFeWUsIEV5ZU9mZiwgU2hpZWxkLCBMb2FkZXIsIFNtYXJ0cGhvbmUsIENoZWNrQ2lyY2xlLCBDaGV2cm9uUmlnaHQsIExvY2sgfSBmcm9tICdsdWNpZGUtcmVhY3QnO1xuaW1wb3J0IHsgc3VwYWJhc2UsIGlzU3VwYWJhc2VBdmFpbGFibGUgfSBmcm9tICcuLi9saWIvc3VwYWJhc2UnO1xuXG5pbnRlcmZhY2UgQXV0aE1vZGFsUHJvcHMge1xuICBvbkNsb3NlOiAoKSA9PiB2b2lkO1xuICBvblN1Y2Nlc3M6ICh1c2VyOiB7IGVtYWlsOiBzdHJpbmc7IGdyYWRlPzogJ2Jhc2ljJyB8ICdjZXJ0aWZpZWQnIH0pID0+IHZvaWQ7XG59XG5cbnR5cGUgTW9kZSA9ICdsb2dpbicgfCAnc2lnbnVwJyB8ICdzaWdudXBfY2VydGlmaWVkJztcbnR5cGUgU3RlcCA9ICdjcmVkZW50aWFscycgfCAnb3RwJztcblxuY29uc3QgU09DSUFMID0gW1xuICB7IGlkOiAna2FrYW8nLCBsYWJlbDogJ+y5tOy5tOyYpCDroZzqt7jsnbgnLCBjb2xvcjogJyNGRUU1MDAnLCB0ZXh0Q29sb3I6ICcjMDAwJywgaWNvbjogJ/CfkqwnIH0sXG4gIHsgaWQ6ICduYXZlcicsIGxhYmVsOiAn64Sk7J2067KEIOuhnOq3uOyduCcsIGNvbG9yOiAnIzAzQzc1QScsIHRleHRDb2xvcjogJyNmZmYnLCBpY29uOiAnTicgfSxcbiAgeyBpZDogJ2dvb2dsZScsIGxhYmVsOiAnR29vZ2xlIOuhnOq3uOyduCcsIGNvbG9yOiAnI2ZmZicsIHRleHRDb2xvcjogJyMzNzQxNTEnLCBpY29uOiAnRycsIGJvcmRlcjogdHJ1ZSB9LFxuXTtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gQXV0aE1vZGFsKHsgb25DbG9zZSwgb25TdWNjZXNzIH06IEF1dGhNb2RhbFByb3BzKSB7XG4gIGNvbnN0IFttb2RlLCBzZXRNb2RlXSA9IHVzZVN0YXRlPE1vZGU+KCdsb2dpbicpO1xuICBjb25zdCBbc3RlcCwgc2V0U3RlcF0gPSB1c2VTdGF0ZTxTdGVwPignY3JlZGVudGlhbHMnKTtcbiAgY29uc3QgW2VtYWlsLCBzZXRFbWFpbF0gPSB1c2VTdGF0ZSgnJyk7XG4gIGNvbnN0IFtwYXNzd29yZCwgc2V0UGFzc3dvcmRdID0gdXNlU3RhdGUoJycpO1xuICBjb25zdCBbY29uZmlybVB3LCBzZXRDb25maXJtUHddID0gdXNlU3RhdGUoJycpO1xuICBjb25zdCBbc2hvd1B3LCBzZXRTaG93UHddID0gdXNlU3RhdGUoZmFsc2UpO1xuICBjb25zdCBbbG9hZGluZywgc2V0TG9hZGluZ10gPSB1c2VTdGF0ZShmYWxzZSk7XG4gIGNvbnN0IFtlcnJvciwgc2V0RXJyb3JdID0gdXNlU3RhdGUoJycpO1xuICBjb25zdCBbb3RwLCBzZXRPdHBdID0gdXNlU3RhdGUoWycnLCAnJywgJycsICcnLCAnJywgJyddKTtcbiAgY29uc3QgW290cFNlbnQsIHNldE90cFNlbnRdID0gdXNlU3RhdGUoZmFsc2UpO1xuICBjb25zdCBbcGVuZGluZ0VtYWlsLCBzZXRQZW5kaW5nRW1haWxdID0gdXNlU3RhdGUoJycpO1xuXG4gIGNvbnN0IHJlc2V0ID0gKCkgPT4ge1xuICAgIHNldEVycm9yKCcnKTtcbiAgICBzZXRFbWFpbCgnJyk7XG4gICAgc2V0UGFzc3dvcmQoJycpO1xuICAgIHNldENvbmZpcm1QdygnJyk7XG4gICAgc2V0T3RwKFsnJywgJycsICcnLCAnJywgJycsICcnXSk7XG4gICAgc2V0U3RlcCgnY3JlZGVudGlhbHMnKTtcbiAgICBzZXRPdHBTZW50KGZhbHNlKTtcbiAgfTtcblxuICBjb25zdCBoYW5kbGVPdHBDaGFuZ2UgPSAoaWR4OiBudW1iZXIsIHZhbDogc3RyaW5nKSA9PiB7XG4gICAgaWYgKCEvXlxcZD8kLy50ZXN0KHZhbCkpIHJldHVybjtcbiAgICBjb25zdCBuZXh0ID0gWy4uLm90cF07XG4gICAgbmV4dFtpZHhdID0gdmFsO1xuICAgIHNldE90cChuZXh0KTtcbiAgICBpZiAodmFsICYmIGlkeCA8IDUpIHtcbiAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGBvdHAtJHtpZHggKyAxfWApPy5mb2N1cygpO1xuICAgIH1cbiAgfTtcblxuICBjb25zdCBoYW5kbGVPdHBLZXlEb3duID0gKGlkeDogbnVtYmVyLCBlOiBSZWFjdC5LZXlib2FyZEV2ZW50KSA9PiB7XG4gICAgaWYgKGUua2V5ID09PSAnQmFja3NwYWNlJyAmJiAhb3RwW2lkeF0gJiYgaWR4ID4gMCkge1xuICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoYG90cC0ke2lkeCAtIDF9YCk/LmZvY3VzKCk7XG4gICAgfVxuICB9O1xuXG4gIGNvbnN0IGhhbmRsZUNyZWRlbnRpYWxzU3VibWl0ID0gYXN5bmMgKGU6IFJlYWN0LkZvcm1FdmVudCkgPT4ge1xuICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICBzZXRFcnJvcignJyk7XG4gICAgY29uc3QgaXNTaWdudXAgPSBtb2RlID09PSAnc2lnbnVwJyB8fCBtb2RlID09PSAnc2lnbnVwX2NlcnRpZmllZCc7XG4gICAgaWYgKCFlbWFpbCB8fCAhcGFzc3dvcmQpIHsgc2V0RXJyb3IoJ+ydtOuplOydvOqzvCDruYTrsIDrsojtmLjrpbwg7J6F66Cl7ZW0IOyjvOyEuOyalC4nKTsgcmV0dXJuOyB9XG4gICAgaWYgKGlzU2lnbnVwICYmIHBhc3N3b3JkICE9PSBjb25maXJtUHcpIHsgc2V0RXJyb3IoJ+u5hOuwgOuyiO2YuOqwgCDsnbzsuZjtlZjsp4Ag7JWK7Iq164uI64ukLicpOyByZXR1cm47IH1cbiAgICBpZiAocGFzc3dvcmQubGVuZ3RoIDwgNikgeyBzZXRFcnJvcign67mE67CA67KI7Zi464qUIOy1nOyGjCA27J6QIOydtOyDgeydtOyWtOyVvCDtlanri4jri6QuJyk7IHJldHVybjsgfVxuXG4gICAgc2V0TG9hZGluZyh0cnVlKTtcbiAgICB0cnkge1xuICAgICAgaWYgKCFpc1N1cGFiYXNlQXZhaWxhYmxlKSB7XG4gICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKChyKSA9PiBzZXRUaW1lb3V0KHIsIDUwMCkpO1xuICAgICAgfSBlbHNlIGlmIChtb2RlID09PSAnbG9naW4nKSB7XG4gICAgICAgIGNvbnN0IHsgZGF0YSwgZXJyb3I6IGF1dGhFcnJvciB9ID0gYXdhaXQgc3VwYWJhc2UuYXV0aC5zaWduSW5XaXRoUGFzc3dvcmQoeyBlbWFpbCwgcGFzc3dvcmQgfSk7XG4gICAgICAgIGlmIChhdXRoRXJyb3IpIHRocm93IGF1dGhFcnJvcjtcbiAgICAgICAgaWYgKCFkYXRhLnVzZXIpIHRocm93IG5ldyBFcnJvcign66Gc6re47J24IOyLpO2MqCcpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgeyBkYXRhLCBlcnJvcjogYXV0aEVycm9yIH0gPSBhd2FpdCBzdXBhYmFzZS5hdXRoLnNpZ25VcCh7IGVtYWlsLCBwYXNzd29yZCB9KTtcbiAgICAgICAgaWYgKGF1dGhFcnJvcikgdGhyb3cgYXV0aEVycm9yO1xuICAgICAgICBpZiAoIWRhdGEudXNlcikgdGhyb3cgbmV3IEVycm9yKCfqsIDsnoUg7Iuk7YyoJyk7XG4gICAgICB9XG4gICAgICBzZXRQZW5kaW5nRW1haWwoZW1haWwpO1xuICAgICAgc2V0T3RwU2VudCh0cnVlKTtcbiAgICAgIHNldFN0ZXAoJ290cCcpO1xuICAgIH0gY2F0Y2ggKGVycjogdW5rbm93bikge1xuICAgICAgY29uc3QgbXNnID0gZXJyIGluc3RhbmNlb2YgRXJyb3IgPyBlcnIubWVzc2FnZSA6ICcnO1xuICAgICAgaWYgKG1zZy5pbmNsdWRlcygnSW52YWxpZCBsb2dpbiBjcmVkZW50aWFscycpKSBzZXRFcnJvcign7J2066mU7J28IOuYkOuKlCDruYTrsIDrsojtmLjqsIAg7Jis67CU66W07KeAIOyViuyKteuLiOuLpC4nKTtcbiAgICAgIGVsc2UgaWYgKG1zZy5pbmNsdWRlcygnVXNlciBhbHJlYWR5IHJlZ2lzdGVyZWQnKSkgc2V0RXJyb3IoJ+ydtOuvuCDrk7HroZ3rkJwg7J2066mU7J287J6F64uI64ukLiDroZzqt7jsnbjtlbQg7KO87IS47JqULicpO1xuICAgICAgZWxzZSBzZXRFcnJvcign7ISc67KEIOyXsOqysOyXkCDsi6TtjKjtlojsirXri4jri6QuIOyeoOyLnCDtm4Qg64uk7IucIOyLnOuPhO2VtCDso7zshLjsmpQuJyk7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIHNldExvYWRpbmcoZmFsc2UpO1xuICAgIH1cbiAgfTtcblxuICBjb25zdCBoYW5kbGVPdHBWZXJpZnkgPSBhc3luYyAoZTogUmVhY3QuRm9ybUV2ZW50KSA9PiB7XG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIGNvbnN0IGNvZGUgPSBvdHAuam9pbignJyk7XG4gICAgaWYgKGNvZGUubGVuZ3RoIDwgNikgeyBzZXRFcnJvcignNuyekOumrCDsnbjspp0g7L2U65Oc66W8IOyeheugpe2VtCDso7zshLjsmpQuJyk7IHJldHVybjsgfVxuICAgIHNldExvYWRpbmcodHJ1ZSk7XG4gICAgYXdhaXQgbmV3IFByb21pc2UoKHIpID0+IHNldFRpbWVvdXQociwgNzAwKSk7XG4gICAgc2V0TG9hZGluZyhmYWxzZSk7XG4gICAgb25TdWNjZXNzKHsgZW1haWw6IHBlbmRpbmdFbWFpbCwgZ3JhZGU6IG1vZGUgPT09ICdzaWdudXBfY2VydGlmaWVkJyA/ICdjZXJ0aWZpZWQnIDogJ2Jhc2ljJyB9KTtcbiAgfTtcblxuICBjb25zdCBoYW5kbGVTb2NpYWxMb2dpbiA9IGFzeW5jIChwcm92aWRlcjogc3RyaW5nKSA9PiB7XG4gICAgc2V0TG9hZGluZyh0cnVlKTtcbiAgICBhd2FpdCBuZXcgUHJvbWlzZSgocikgPT4gc2V0VGltZW91dChyLCA2MDApKTtcbiAgICBzZXRMb2FkaW5nKGZhbHNlKTtcbiAgICBzZXRQZW5kaW5nRW1haWwoYCR7cHJvdmlkZXJ9QHZsdWUua3JgKTtcbiAgICBzZXRPdHBTZW50KHRydWUpO1xuICAgIHNldFN0ZXAoJ290cCcpO1xuICB9O1xuXG4gIGNvbnN0IGlzU2lnbnVwID0gbW9kZSA9PT0gJ3NpZ251cCcgfHwgbW9kZSA9PT0gJ3NpZ251cF9jZXJ0aWZpZWQnO1xuXG4gIHJldHVybiAoXG4gICAgPGRpdiBjbGFzc05hbWU9XCJmaXhlZCBpbnNldC0wIHotNTAgZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgcC00XCI+XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cImFic29sdXRlIGluc2V0LTAgYmctYmxhY2svNTAgYmFja2Ryb3AtYmx1ci1zbVwiIG9uQ2xpY2s9e29uQ2xvc2V9IC8+XG4gICAgICA8ZGl2XG4gICAgICAgIGNsYXNzTmFtZT1cInJlbGF0aXZlIGJnLXdoaXRlIHJvdW5kZWQtM3hsIHNoYWRvdy0yeGwgdy1mdWxsIG1heC13LW1kIG92ZXJmbG93LWhpZGRlblwiXG4gICAgICAgIHN0eWxlPXt7IGFuaW1hdGlvbjogJ2F1dGhNb2RhbEluIDAuMnMgY3ViaWMtYmV6aWVyKDAuMzQsMS41NiwwLjY0LDEpJyB9fVxuICAgICAgPlxuICAgICAgICA8c3R5bGU+e2BcbiAgICAgICAgICBAa2V5ZnJhbWVzIGF1dGhNb2RhbEluIHtcbiAgICAgICAgICAgIGZyb20geyBvcGFjaXR5OiAwOyB0cmFuc2Zvcm06IHNjYWxlKDAuOSkgdHJhbnNsYXRlWSgxNnB4KTsgfVxuICAgICAgICAgICAgdG8gICB7IG9wYWNpdHk6IDE7IHRyYW5zZm9ybTogc2NhbGUoMSkgdHJhbnNsYXRlWSgwKTsgfVxuICAgICAgICAgIH1cbiAgICAgICAgYH08L3N0eWxlPlxuXG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYmctZ3JhZGllbnQtdG8tYnIgZnJvbS1wcmltYXJ5LTYwMCB0by1ibHVlLTcwMCBweC02IHB0LTYgcGItOCByZWxhdGl2ZSBvdmVyZmxvdy1oaWRkZW5cIj5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFic29sdXRlIC10b3AtOCAtcmlnaHQtOCB3LTMyIGgtMzIgcm91bmRlZC1mdWxsIGJnLXdoaXRlLzVcIiAvPlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJzb2x1dGUgLWJvdHRvbS00IC1sZWZ0LTQgdy0yMCBoLTIwIHJvdW5kZWQtZnVsbCBiZy13aGl0ZS81XCIgLz5cbiAgICAgICAgICA8YnV0dG9uIG9uQ2xpY2s9e29uQ2xvc2V9IGNsYXNzTmFtZT1cImFic29sdXRlIHRvcC00IHJpZ2h0LTQgcC0xLjUgdGV4dC13aGl0ZS83MCBob3Zlcjp0ZXh0LXdoaXRlIGhvdmVyOmJnLXdoaXRlLzE1IHJvdW5kZWQteGwgdHJhbnNpdGlvbi1hbGxcIj5cbiAgICAgICAgICAgIDxYIGNsYXNzTmFtZT1cInctNCBoLTRcIiAvPlxuICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIuNSBtYi0zIHJlbGF0aXZlIHotMTBcIj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidy0xMCBoLTEwIHJvdW5kZWQtMnhsIGJnLXdoaXRlLzIwIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyXCI+XG4gICAgICAgICAgICAgIDxTaGllbGQgY2xhc3NOYW1lPVwidy01IGgtNSB0ZXh0LXdoaXRlXCIgLz5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC0yeGwgZm9udC1ibGFjayB0ZXh0LXdoaXRlXCIgc3R5bGU9e3sgbGV0dGVyU3BhY2luZzogJy0wLjA0ZW0nIH19PlZMVUU8L3NwYW4+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPGgyIGNsYXNzTmFtZT1cInRleHQtd2hpdGUgdGV4dC1sZyBmb250LWJvbGQgcmVsYXRpdmUgei0xMFwiIHN0eWxlPXt7IHdvcmRCcmVhazogJ2tlZXAtYWxsJyB9fT5cbiAgICAgICAgICAgIHtzdGVwID09PSAnb3RwJyA/ICcy7LCoIOuztOyViCDsnbjspp0nIDogbW9kZSA9PT0gJ2xvZ2luJyA/ICfroZzqt7jsnbgnIDogbW9kZSA9PT0gJ3NpZ251cF9jZXJ0aWZpZWQnID8gJ1vsi6DrorDsnbjspp1dIO2ajOybkOqwgOyehScgOiAn7J2867CYIO2ajOybkOqwgOyehSd9XG4gICAgICAgICAgPC9oMj5cbiAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LXdoaXRlLzcwIHRleHQtc20gbXQtMSByZWxhdGl2ZSB6LTEwXCIgc3R5bGU9e3sgd29yZEJyZWFrOiAna2VlcC1hbGwnIH19PlxuICAgICAgICAgICAge3N0ZXAgPT09ICdvdHAnXG4gICAgICAgICAgICAgID8gYCR7cGVuZGluZ0VtYWlsfeycvOuhnCDrsJzshqHrkJwgNuyekOumrCDsvZTrk5zrpbwg7J6F66Cl7ZWY7IS47JqUYFxuICAgICAgICAgICAgICA6IG1vZGUgPT09ICdsb2dpbidcbiAgICAgICAgICAgICAgPyAn67O07J207Iqk7ZS87IuxIOyYiOuwqSDthrXtlakg7ZSM656r7Y+8J1xuICAgICAgICAgICAgICA6IG1vZGUgPT09ICdzaWdudXBfY2VydGlmaWVkJ1xuICAgICAgICAgICAgICA/ICfrs7jsnbgg7J247KadIO2bhCDsi6DrorDsnbjspp0g7ZqM7JuQ7Jy866GcIOqwgOyehe2VqeuLiOuLpCdcbiAgICAgICAgICAgICAgOiAnVkxVRSDshJzruYTsiqTrpbwg7J6Q7Jyg66Gt6rKMIOydtOyaqe2VtOuztOyEuOyalCd9XG4gICAgICAgICAgPC9wPlxuICAgICAgICAgIHtzdGVwID09PSAnb3RwJyAmJiAoXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm10LTMgZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIgcmVsYXRpdmUgei0xMFwiPlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0xLjUgcHgtMyBweS0xIGJnLXdoaXRlLzE1IHJvdW5kZWQtZnVsbFwiPlxuICAgICAgICAgICAgICAgIDxDaGVja0NpcmNsZSBjbGFzc05hbWU9XCJ3LTMgaC0zIHRleHQtd2hpdGUvODBcIiAvPlxuICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtd2hpdGUvODAgdGV4dC14c1wiPjHri6jqs4Qg7JmE66OMPC9zcGFuPlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgPENoZXZyb25SaWdodCBjbGFzc05hbWU9XCJ3LTMgaC0zIHRleHQtd2hpdGUvNTBcIiAvPlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0xLjUgcHgtMyBweS0xIGJnLXdoaXRlLzI1IHJvdW5kZWQtZnVsbCBib3JkZXIgYm9yZGVyLXdoaXRlLzMwXCI+XG4gICAgICAgICAgICAgICAgPFNtYXJ0cGhvbmUgY2xhc3NOYW1lPVwidy0zIGgtMyB0ZXh0LXdoaXRlXCIgLz5cbiAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LXdoaXRlIHRleHQteHMgZm9udC1zZW1pYm9sZFwiPjLssKgg7J247KadIOykkTwvc3Bhbj5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICApfVxuICAgICAgICA8L2Rpdj5cblxuICAgICAgICB7c3RlcCA9PT0gJ2NyZWRlbnRpYWxzJyAmJiAoXG4gICAgICAgICAgPD5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBib3JkZXItYiBib3JkZXItZ3JheS0xMDBcIj5cbiAgICAgICAgICAgICAgeyhbJ2xvZ2luJywgJ3NpZ251cCcsICdzaWdudXBfY2VydGlmaWVkJ10gYXMgTW9kZVtdKS5tYXAoKG0pID0+IChcbiAgICAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAgICBrZXk9e219XG4gICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiB7IHJlc2V0KCk7IHNldE1vZGUobSk7IH19XG4gICAgICAgICAgICAgICAgICBjbGFzc05hbWU9e2BmbGV4LTEgcHktMi41IHRleHQteHMgZm9udC1zZW1pYm9sZCB0cmFuc2l0aW9uLWNvbG9ycyAke1xuICAgICAgICAgICAgICAgICAgICBtb2RlID09PSBtID8gJ3RleHQtcHJpbWFyeS02MDAgYm9yZGVyLWItMiBib3JkZXItcHJpbWFyeS02MDAgYmctcHJpbWFyeS01MC80MCcgOiAndGV4dC1ncmF5LTQwMCBob3Zlcjp0ZXh0LWdyYXktNjAwJ1xuICAgICAgICAgICAgICAgICAgfWB9XG4gICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAge20gPT09ICdsb2dpbicgPyAn66Gc6re47J24JyA6IG0gPT09ICdzaWdudXAnID8gJ+ydvOuwmOqwgOyehScgOiAn7Iug66Kw7J247KadIOqwgOyehSd9XG4gICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICkpfVxuICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgIHttb2RlID09PSAnc2lnbnVwX2NlcnRpZmllZCcgJiYgKFxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm14LTUgbXQtNCBwLTMgYmctYW1iZXItNTAgYm9yZGVyIGJvcmRlci1hbWJlci0yMDAgcm91bmRlZC0yeGwgZmxleCBpdGVtcy1zdGFydCBnYXAtMi41XCI+XG4gICAgICAgICAgICAgICAgPExvY2sgY2xhc3NOYW1lPVwidy00IGgtNCB0ZXh0LWFtYmVyLTYwMCBmbGV4LXNocmluay0wIG10LTAuNVwiIC8+XG4gICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC14cyB0ZXh0LWFtYmVyLTcwMCBsZWFkaW5nLXJlbGF4ZWRcIiBzdHlsZT17eyB3b3JkQnJlYWs6ICdrZWVwLWFsbCcgfX0+XG4gICAgICAgICAgICAgICAgICA8c3Ryb25nPlvsi6DrorDsnbjspp1dIO2ajOybkDwvc3Ryb25nPuydgCDqsIDsnoUg7ZuEIEFJIOuzuOyduCDqsoDspp0oNX4xMOydvCkg6rO87KCV7J2EIOqxsOy5qeuLiOuLpC4g6rKA7YagIOykkeyXkOuPhCA8c3Ryb25nPuydvOuwmCDtmozsm5Ag6raM7ZWcPC9zdHJvbmc+7Jy866GcIOuqqOuToCDshJzruYTsiqTrpbwg7J207Jqp7ZWgIOyImCDsnojsirXri4jri6QuXG4gICAgICAgICAgICAgICAgPC9wPlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICl9XG5cbiAgICAgICAgICAgIDxmb3JtIG9uU3VibWl0PXtoYW5kbGVDcmVkZW50aWFsc1N1Ym1pdH0gY2xhc3NOYW1lPVwicHgtNSBweS00IHNwYWNlLXktM1wiPlxuICAgICAgICAgICAgICB7ZXJyb3IgJiYgKFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicHgtMyBweS0yLjUgYmctcmVkLTUwIGJvcmRlciBib3JkZXItcmVkLTIwMCByb3VuZGVkLTJ4bCB0ZXh0LXhzIHRleHQtcmVkLTYwMFwiPlxuICAgICAgICAgICAgICAgICAge2Vycm9yfVxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICApfVxuICAgICAgICAgICAgICA8ZGl2PlxuICAgICAgICAgICAgICAgIDxsYWJlbCBjbGFzc05hbWU9XCJibG9jayB0ZXh0LXhzIGZvbnQtc2VtaWJvbGQgdGV4dC1ncmF5LTcwMCBtYi0xLjVcIj7snbTrqZTsnbw8L2xhYmVsPlxuICAgICAgICAgICAgICAgIDxpbnB1dFxuICAgICAgICAgICAgICAgICAgdHlwZT1cImVtYWlsXCJcbiAgICAgICAgICAgICAgICAgIHZhbHVlPXtlbWFpbH1cbiAgICAgICAgICAgICAgICAgIG9uQ2hhbmdlPXsoZSkgPT4gc2V0RW1haWwoZS50YXJnZXQudmFsdWUpfVxuICAgICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI9XCJleGFtcGxlQHZsdWUua3JcIlxuICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwiaW5wdXQtZmllbGRcIlxuICAgICAgICAgICAgICAgICAgYXV0b0NvbXBsZXRlPVwiZW1haWxcIlxuICAgICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICA8ZGl2PlxuICAgICAgICAgICAgICAgIDxsYWJlbCBjbGFzc05hbWU9XCJibG9jayB0ZXh0LXhzIGZvbnQtc2VtaWJvbGQgdGV4dC1ncmF5LTcwMCBtYi0xLjVcIj7ruYTrsIDrsojtmLg8L2xhYmVsPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicmVsYXRpdmVcIj5cbiAgICAgICAgICAgICAgICAgIDxpbnB1dFxuICAgICAgICAgICAgICAgICAgICB0eXBlPXtzaG93UHcgPyAndGV4dCcgOiAncGFzc3dvcmQnfVxuICAgICAgICAgICAgICAgICAgICB2YWx1ZT17cGFzc3dvcmR9XG4gICAgICAgICAgICAgICAgICAgIG9uQ2hhbmdlPXsoZSkgPT4gc2V0UGFzc3dvcmQoZS50YXJnZXQudmFsdWUpfVxuICAgICAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcj1cIuy1nOyGjCA27J6QIOydtOyDgVwiXG4gICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cImlucHV0LWZpZWxkIHByLTEwXCJcbiAgICAgICAgICAgICAgICAgICAgYXV0b0NvbXBsZXRlPXttb2RlID09PSAnbG9naW4nID8gJ2N1cnJlbnQtcGFzc3dvcmQnIDogJ25ldy1wYXNzd29yZCd9XG4gICAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17KCkgPT4gc2V0U2hvd1B3KCFzaG93UHcpfSBjbGFzc05hbWU9XCJhYnNvbHV0ZSByaWdodC0zIHRvcC0xLzIgLXRyYW5zbGF0ZS15LTEvMiB0ZXh0LWdyYXktNDAwIGhvdmVyOnRleHQtZ3JheS02MDBcIj5cbiAgICAgICAgICAgICAgICAgICAge3Nob3dQdyA/IDxFeWVPZmYgY2xhc3NOYW1lPVwidy00IGgtNFwiIC8+IDogPEV5ZSBjbGFzc05hbWU9XCJ3LTQgaC00XCIgLz59XG4gICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgIHtpc1NpZ251cCAmJiAoXG4gICAgICAgICAgICAgICAgPGRpdj5cbiAgICAgICAgICAgICAgICAgIDxsYWJlbCBjbGFzc05hbWU9XCJibG9jayB0ZXh0LXhzIGZvbnQtc2VtaWJvbGQgdGV4dC1ncmF5LTcwMCBtYi0xLjVcIj7ruYTrsIDrsojtmLgg7ZmV7J24PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgIDxpbnB1dFxuICAgICAgICAgICAgICAgICAgICB0eXBlPXtzaG93UHcgPyAndGV4dCcgOiAncGFzc3dvcmQnfVxuICAgICAgICAgICAgICAgICAgICB2YWx1ZT17Y29uZmlybVB3fVxuICAgICAgICAgICAgICAgICAgICBvbkNoYW5nZT17KGUpID0+IHNldENvbmZpcm1QdyhlLnRhcmdldC52YWx1ZSl9XG4gICAgICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyPVwi67mE67CA67KI7Zi466W8IOuLpOyLnCDsnoXroKXtlbQg7KO87IS47JqUXCJcbiAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwiaW5wdXQtZmllbGRcIlxuICAgICAgICAgICAgICAgICAgICBhdXRvQ29tcGxldGU9XCJuZXctcGFzc3dvcmRcIlxuICAgICAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgKX1cbiAgICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPVwic3VibWl0XCIgZGlzYWJsZWQ9e2xvYWRpbmd9IGNsYXNzTmFtZT1cImJ0bi1wcmltYXJ5IHctZnVsbCBqdXN0aWZ5LWNlbnRlclwiPlxuICAgICAgICAgICAgICAgIHtsb2FkaW5nID8gPExvYWRlciBjbGFzc05hbWU9XCJ3LTQgaC00IGFuaW1hdGUtc3BpblwiIC8+IDogbnVsbH1cbiAgICAgICAgICAgICAgICB7bG9hZGluZyA/ICfsspjrpqwg7KSRLi4uJyA6IG1vZGUgPT09ICdsb2dpbicgPyAn66Gc6re47J24IO2bhCAy7LCoIOyduOymnScgOiAn6rCA7J6FIO2bhCAy7LCoIOyduOymnSd9XG4gICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgPC9mb3JtPlxuXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInB4LTUgcGItNSBzcGFjZS15LTJcIj5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMlwiPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleC0xIGgtcHggYmctZ3JheS0xMDBcIiAvPlxuICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQteHMgdGV4dC1ncmF5LTQwMCBmb250LW1lZGl1bVwiPuqwhO2OuCDroZzqt7jsnbg8L3NwYW4+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4LTEgaC1weCBiZy1ncmF5LTEwMFwiIC8+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggZmxleC1jb2wgZ2FwLTJcIj5cbiAgICAgICAgICAgICAgICB7U09DSUFMLm1hcCgocykgPT4gKFxuICAgICAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgICAgICBrZXk9e3MuaWR9XG4gICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IGhhbmRsZVNvY2lhbExvZ2luKHMuaWQpfVxuICAgICAgICAgICAgICAgICAgICBkaXNhYmxlZD17bG9hZGluZ31cbiAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwidy1mdWxsIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGdhcC0yLjUgcHktMi41IHJvdW5kZWQtMnhsIHRleHQtc20gZm9udC1zZW1pYm9sZCB0cmFuc2l0aW9uLWFsbCBob3ZlcjpvcGFjaXR5LTkwXCJcbiAgICAgICAgICAgICAgICAgICAgc3R5bGU9e3tcbiAgICAgICAgICAgICAgICAgICAgICBiYWNrZ3JvdW5kOiBzLmNvbG9yLFxuICAgICAgICAgICAgICAgICAgICAgIGNvbG9yOiBzLnRleHRDb2xvcixcbiAgICAgICAgICAgICAgICAgICAgICBib3JkZXI6IHMuYm9yZGVyID8gJzEuNXB4IHNvbGlkICNFNUU3RUInIDogJ25vbmUnLFxuICAgICAgICAgICAgICAgICAgICB9fVxuICAgICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ3LTUgaC01IGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIHRleHQtc20gbGVhZGluZy1ub25lXCI+e3MuaWNvbn08L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgIHtzLmxhYmVsfVxuICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgKSl9XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LWNlbnRlciB0ZXh0LXhzIHRleHQtZ3JheS00MDAgcHQtMVwiPlxuICAgICAgICAgICAgICAgIOqwhO2OuCDroZzqt7jsnbgg7ZuE7JeQ64+EIDxzdHJvbmc+64+Z7J287ZWcIDLssKgg7J247KadPC9zdHJvbmc+IOqzvOygleydtCDsp4TtlonrkKnri4jri6RcbiAgICAgICAgICAgICAgPC9wPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPC8+XG4gICAgICAgICl9XG5cbiAgICAgICAge3N0ZXAgPT09ICdvdHAnICYmIChcbiAgICAgICAgICA8Zm9ybSBvblN1Ym1pdD17aGFuZGxlT3RwVmVyaWZ5fSBjbGFzc05hbWU9XCJweC01IHB5LTYgc3BhY2UteS01XCI+XG4gICAgICAgICAgICB7ZXJyb3IgJiYgKFxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInB4LTMgcHktMi41IGJnLXJlZC01MCBib3JkZXIgYm9yZGVyLXJlZC0yMDAgcm91bmRlZC0yeGwgdGV4dC14cyB0ZXh0LXJlZC02MDBcIj5cbiAgICAgICAgICAgICAgICB7ZXJyb3J9XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgKX1cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidGV4dC1jZW50ZXJcIj5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ3LTE0IGgtMTQgcm91bmRlZC0yeGwgYmctcHJpbWFyeS01MCBib3JkZXIgYm9yZGVyLXByaW1hcnktMTAwIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIG14LWF1dG8gbWItM1wiPlxuICAgICAgICAgICAgICAgIDxTbWFydHBob25lIGNsYXNzTmFtZT1cInctNyBoLTcgdGV4dC1wcmltYXJ5LTUwMFwiIC8+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LXNtIGZvbnQtc2VtaWJvbGQgdGV4dC1ncmF5LTgwMFwiIHN0eWxlPXt7IHdvcmRCcmVhazogJ2tlZXAtYWxsJyB9fT5cbiAgICAgICAgICAgICAgICDtnLTrjIDtj7DsnLzroZwg67Cc7Iah65CcIDbsnpDrpqw8YnIgLz7snbjspp0g7L2U65Oc66W8IOyeheugpe2VmOyEuOyalFxuICAgICAgICAgICAgICA8L3A+XG4gICAgICAgICAgICAgIHtvdHBTZW50ICYmIChcbiAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LXhzIHRleHQtcHJpbWFyeS01MDAgbXQtMSBmb250LW1lZGl1bVwiPuyduOymnSDsvZTrk5zqsIAg67Cc7Iah65CY7JeI7Iq164uI64ukPC9wPlxuICAgICAgICAgICAgICApfVxuICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBqdXN0aWZ5LWNlbnRlciBnYXAtMlwiPlxuICAgICAgICAgICAgICB7b3RwLm1hcCgoZGlnaXQsIGlkeCkgPT4gKFxuICAgICAgICAgICAgICAgIDxpbnB1dFxuICAgICAgICAgICAgICAgICAga2V5PXtpZHh9XG4gICAgICAgICAgICAgICAgICBpZD17YG90cC0ke2lkeH1gfVxuICAgICAgICAgICAgICAgICAgdHlwZT1cInRleHRcIlxuICAgICAgICAgICAgICAgICAgaW5wdXRNb2RlPVwibnVtZXJpY1wiXG4gICAgICAgICAgICAgICAgICBtYXhMZW5ndGg9ezF9XG4gICAgICAgICAgICAgICAgICB2YWx1ZT17ZGlnaXR9XG4gICAgICAgICAgICAgICAgICBvbkNoYW5nZT17KGUpID0+IGhhbmRsZU90cENoYW5nZShpZHgsIGUudGFyZ2V0LnZhbHVlKX1cbiAgICAgICAgICAgICAgICAgIG9uS2V5RG93bj17KGUpID0+IGhhbmRsZU90cEtleURvd24oaWR4LCBlKX1cbiAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cInctMTEgaC0xMiB0ZXh0LWNlbnRlciB0ZXh0LWxnIGZvbnQtYmxhY2sgdGV4dC1ncmF5LTkwMCBib3JkZXItMiByb3VuZGVkLTJ4bCBmb2N1czpvdXRsaW5lLW5vbmUgdHJhbnNpdGlvbi1jb2xvcnNcIlxuICAgICAgICAgICAgICAgICAgc3R5bGU9e3sgYm9yZGVyQ29sb3I6IGRpZ2l0ID8gJyMzMTgyRjYnIDogJyNFNUU3RUInLCBiYWNrZ3JvdW5kOiBkaWdpdCA/ICcjRUJGM0ZGJyA6ICcjZmZmJyB9fVxuICAgICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICAgICkpfVxuICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidGV4dC1jZW50ZXJcIj5cbiAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC14cyB0ZXh0LWdyYXktNDAwXCI+XG4gICAgICAgICAgICAgICAg7L2U65Oc66W8IOuwm+yngCDrqrvtlZjshajrgpjsmpQ/eycgJ31cbiAgICAgICAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzc05hbWU9XCJ0ZXh0LXByaW1hcnktNjAwIGZvbnQtc2VtaWJvbGQgaG92ZXI6dW5kZXJsaW5lXCI+7J6s67Cc7IahPC9idXR0b24+XG4gICAgICAgICAgICAgIDwvcD5cbiAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgIHR5cGU9XCJzdWJtaXRcIlxuICAgICAgICAgICAgICBkaXNhYmxlZD17bG9hZGluZyB8fCBvdHAuam9pbignJykubGVuZ3RoIDwgNn1cbiAgICAgICAgICAgICAgY2xhc3NOYW1lPVwiYnRuLXByaW1hcnkgdy1mdWxsIGp1c3RpZnktY2VudGVyIGRpc2FibGVkOm9wYWNpdHktNDAgZGlzYWJsZWQ6Y3Vyc29yLW5vdC1hbGxvd2VkXCJcbiAgICAgICAgICAgID5cbiAgICAgICAgICAgICAge2xvYWRpbmcgPyA8TG9hZGVyIGNsYXNzTmFtZT1cInctNCBoLTQgYW5pbWF0ZS1zcGluXCIgLz4gOiA8Q2hlY2tDaXJjbGUgY2xhc3NOYW1lPVwidy00IGgtNFwiIC8+fVxuICAgICAgICAgICAgICB7bG9hZGluZyA/ICfsnbjspp0g7KSRLi4uJyA6ICfsnbjspp0g7JmE66OMJ31cbiAgICAgICAgICAgIDwvYnV0dG9uPlxuXG4gICAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBvbkNsaWNrPXsoKSA9PiB7IHNldFN0ZXAoJ2NyZWRlbnRpYWxzJyk7IHNldEVycm9yKCcnKTsgfX0gY2xhc3NOYW1lPVwidy1mdWxsIHRleHQteHMgdGV4dC1ncmF5LTQwMCBob3Zlcjp0ZXh0LWdyYXktNjAwIHB5LTFcIj5cbiAgICAgICAgICAgICAg7J207KCEIOuLqOqzhOuhnFxuICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgPC9mb3JtPlxuICAgICAgICApfVxuICAgICAgPC9kaXY+XG4gICAgPC9kaXY+XG4gICk7XG59XG4iXSwiZmlsZSI6Ii9ob21lL3Byb2plY3Qvc3JjL2NvbXBvbmVudHMvQXV0aE1vZGFsLnRzeCJ9