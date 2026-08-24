-- 가족(형제·배우자 등) 알림 전용 분류
ALTER TYPE "FamilyRelation" ADD VALUE IF NOT EXISTS 'relative';
ALTER TYPE "FamilyWardRole" ADD VALUE IF NOT EXISTS 'observer';
