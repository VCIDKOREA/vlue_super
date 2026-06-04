import { Component } from "react";

/** 앱 루트 렌더 오류 시 빈 화면 대신 안내 */
export default class AppRootErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("[VLUE 앱 오류]", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          className="flex min-h-[100dvh] flex-col items-center justify-center bg-slate-100 px-6 text-center"
          role="alert"
        >
          <p className="text-[17px] font-black text-slate-900">화면을 불러오지 못했습니다</p>
          <p className="mt-2 max-w-md text-[12px] leading-relaxed text-slate-600">
            {this.state.error?.message || String(this.state.error)}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 rounded-xl bg-slate-900 px-6 py-3 text-[14px] font-black text-white"
          >
            새로고침
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
