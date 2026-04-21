---
name: merchant-system
description: Merchant onboarding, ad slots, payment review, and Nearby Takeaway section
type: feature
---
- Tables: merchants (status: pending/active/rejected/expired, ad_expires_at), merchant_products, merchant_payments
- Pricing: 30 RMB minimum, 1 RMB = 1 day of ad slot. Renewals extend from current expiry if still active, else from now.
- Workflow: merchant fills form → submits → upsert merchant + replace products → payment dialog with QR code (src/assets/payment-qr.jpg) → uploads screenshot → admin manually reviews in /admin → on approve, status=active and ad_expires_at extended.
- Display: only merchants with status='active' AND ad_expires_at > now() show in "附近外卖" home section and /nearby list and /merchant/:id detail page.
- Storage bucket: merchant-assets (public).
- Admin: 1176997420@qq.com seeded as admin via user_roles. Ban feature is placeholder (needs Edge Function).
