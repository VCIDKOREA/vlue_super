import { Component } from "react";

/** 자식 렌더 오류가 앱 전체 흰 화면을 덮지 않게 가둔다 */
export default class RenderErrorGuard extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("[VLUE render]", error, info);
  }

  render() {
    if (this.state.error) {
      const { fallback } = this.props;
      if (typeof fallback === "function") return fallback(this.state.error);
      return fallback || null;
    }
    return this.props.children;
  }
}
