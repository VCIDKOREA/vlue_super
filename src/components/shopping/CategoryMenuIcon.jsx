const ICON_TYPE = {
  전체: "all",
  실시간: "live",
  "문구·사무": "office",
  "유아·아동": "baby",
  "이벤트·할인": "tag",
  "티켓·상품권": "ticket",
  "가구·인테리어": "home",
  "건강 · 식품": "food",
  전자기기: "device",
  "생활·주방": "kitchen",
  반려용품: "pet",
  "스포츠·레저": "sport",
  자동차용품: "car",
  "패션·잡화": "fashion",
  "미용·뷰티": "beauty",
  해외직구: "globe",
  공동구매: "group"
};

export default function CategoryMenuIcon({ categoryName, className = "h-[17px] w-[17px]" }) {
  const type = ICON_TYPE[categoryName] || "all";
  const p = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className,
    "aria-hidden": true
  };

  switch (type) {
    case "live":
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />
        </svg>
      );
    case "office":
      return (
        <svg {...p}>
          <path d="M9 5H7a2 2 0 0 0-2 2v12h12V7a2 2 0 0 0-2-2h-2" />
          <path d="M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v0M9 11h6M9 15h4" />
        </svg>
      );
    case "baby":
      return (
        <svg {...p}>
          <circle cx="12" cy="10" r="4" />
          <path d="M8 20c.8-3 2.2-4.5 4-4.5s3.2 1.5 4 4.5" />
        </svg>
      );
    case "tag":
      return (
        <svg {...p}>
          <path d="m8 4 10 10-4 4-10-10 4-4Z" />
          <circle cx="9.5" cy="9.5" r="1.2" fill="currentColor" stroke="none" />
        </svg>
      );
    case "ticket":
      return (
        <svg {...p}>
          <path d="M5 8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1a2 2 0 0 0 0 4v1a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-1a2 2 0 0 0 0-4V8Z" />
          <path d="M12 8v8" />
        </svg>
      );
    case "home":
      return (
        <svg {...p}>
          <path d="M4 11 12 5l8 6v8a1 1 0 0 1-1 1h-4v-5H9v5H5a1 1 0 0 1-1-1v-8Z" />
        </svg>
      );
    case "food":
      return (
        <svg {...p}>
          <path d="M12 3c-2.5 3.5-4 5.5-4 8.5a4 4 0 0 0 8 0C16 8.5 14.5 6.5 12 3Z" />
          <path d="M12 14v7" />
        </svg>
      );
    case "device":
      return (
        <svg {...p}>
          <rect x="7" y="3" width="10" height="18" rx="2" />
          <path d="M10 18h4" />
        </svg>
      );
    case "kitchen":
      return (
        <svg {...p}>
          <path d="M6 4v6a2 2 0 0 0 2 2h0" />
          <path d="M18 4v6a2 2 0 0 1-2 2h0" />
          <path d="M8 20h8M10 12v8M14 12v8" />
        </svg>
      );
    case "pet":
      return (
        <svg {...p}>
          <circle cx="8.5" cy="9" r="1.3" fill="currentColor" stroke="none" />
          <circle cx="15.5" cy="9" r="1.3" fill="currentColor" stroke="none" />
          <path d="M6 14.5c1.2-2.2 3-3 6-3s4.8.8 6 3" />
        </svg>
      );
    case "health":
      return (
        <svg {...p}>
          <rect x="5" y="5" width="14" height="14" rx="3" />
          <path d="M12 8v8M8 12h8" />
        </svg>
      );
    case "sport":
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 4a12 12 0 0 1 0 16M12 4a12 12 0 0 0 0 16M4 12h16" />
        </svg>
      );
    case "car":
      return (
        <svg {...p}>
          <path d="M5 14h14l-1.5-5.5a2 2 0 0 0-1.9-1.5H8.4a2 2 0 0 0-1.9 1.5L5 14Z" />
          <circle cx="8" cy="16" r="1.5" />
          <circle cx="16" cy="16" r="1.5" />
        </svg>
      );
    case "fashion":
      return (
        <svg {...p}>
          <path d="M8 4 6 9h12l-2-5M6 9l-2 11h16L18 9" />
        </svg>
      );
    case "beauty":
      return (
        <svg {...p}>
          <path d="M9 4h6v6a3 3 0 0 1-6 0V4Z" />
          <path d="M10 20h4M12 13v7" />
        </svg>
      );
    case "globe":
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="8" />
          <path d="M4 12h16M12 4a14 14 0 0 1 0 16M12 4a14 14 0 0 0 0 16" />
        </svg>
      );
    case "group":
      return (
        <svg {...p}>
          <circle cx="9" cy="9" r="2.5" />
          <circle cx="16" cy="10" r="2" />
          <path d="M4 19v-1a3 3 0 0 1 3-3h2M14 19v-1a3 3 0 0 1 3-3h1" />
        </svg>
      );
    case "all":
    default:
      return (
        <svg {...p}>
          <rect x="4" y="4" width="7" height="7" rx="1.5" />
          <rect x="13" y="4" width="7" height="7" rx="1.5" />
          <rect x="4" y="13" width="7" height="7" rx="1.5" />
          <rect x="13" y="13" width="7" height="7" rx="1.5" />
        </svg>
      );
  }
}
