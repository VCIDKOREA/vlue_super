import { Component } from "react";

/**
 * 가입 온보딩 렌더 오류 시 빈 화면 대신 안내 표시
 */
export default class SignupErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("[VLUE 가입 화면 오류]", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          className="fixed inset-0 z-[1000003] flex flex-col items-center justify-center bg-[#eef2f7] px-6 text-center"
          role="alert"
        >
          <p className="text-[16px] font-black text-slate-900">가입 화면을 불러오지 못했습니다</p>
          <p className="mt-2 max-w-sm text-[12px] leading-relaxed text-slate-600">
            {this.state.error?.message || String(this.state.error)}
          </p>
          <button
            type="button"
            onClick={() => {
              this.setState({ error: null });
              this.props.onCancel?.();
            }}
            className="mt-6 rounded-xl bg-slate-900 px-6 py-3 text-[14px] font-black text-white"
          >
            로그인 화면으로
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
