# Terms Appendix: Checkbox and Exposure Scope

## Purpose
This appendix tracks all consent checkboxes and their operational effect so they can be reflected in legal terms and UI copy consistently.

## Checkbox/Consent Inventory
- Category exposure enabled
  - Effect: Post is eligible for category-search main exposure.
  - Requirement: Location-based exposure consent must be checked.
- Location-based exposure consent
  - Effect: Allows location-oriented listing and discovery exposure.
  - Revocation: New exposure stops; existing entries are updated progressively.
- Auto upload to feed (making)
  - Effect: Sent coupon/promo content can be uploaded to feed automatically.
- Audience scope controls (all/subscribe/friends/exclude)
  - Effect: Delivery scope for making assets.
- Also show on store page
  - Effect: Feed content can be shown in store-facing surface simultaneously.

## Scope and Rights
- Visibility scope and search scope are user-configurable via in-app toggles.
- Rights grant/revoke is reflected immediately for new content and progressively for existing indexed exposure.
- Platform may restrict/revoke rights for policy, legal, abuse, or security reasons.

## Implementation Notes
- Terms canonical source: `src/legal/vlueTermsArticles.js` (Article 7 added).
- Product should keep checkbox labels and terms wording aligned.
