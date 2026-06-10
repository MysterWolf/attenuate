import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import { RC_API_KEY_ANDROID, ENTITLEMENT_PRO, ENTITLEMENT_AI } from '../constants/config';

export { ENTITLEMENT_PRO, ENTITLEMENT_AI };

export type Tier = 'free' | 'pro' | 'ai';

export async function initPurchases(): Promise<void> {
  Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  await Purchases.configure({ apiKey: RC_API_KEY_ANDROID });
}

export async function getCurrentTier(): Promise<Tier> {
  const info = await Purchases.getCustomerInfo();
  if (info.entitlements.active[ENTITLEMENT_AI]) return 'ai';
  if (info.entitlements.active[ENTITLEMENT_PRO]) return 'pro';
  return 'free';
}

export async function checkEntitlement(id: string): Promise<boolean> {
  const info = await Purchases.getCustomerInfo();
  return info.entitlements.active[id] !== undefined;
}

export async function getOfferings() {
  return Purchases.getOfferings();
}

// 3 tiers:
//   free  — Free / PWYW (no IAP required)
//   pro   — Attenuate Pro, one-time $4.99  (product: attenuate_pro)
//   ai    — Attenuate AI,  $2.99/mo        (product: attenuate_ai_monthly)
export async function purchasePro(): Promise<void> {
  const offerings = await getOfferings();
  const pkg = offerings.current?.availablePackages.find(p => p.identifier === '$rc_lifetime');
  if (!pkg) throw new Error('Pro package not found — configure in RevenueCat dashboard');
  await Purchases.purchasePackage(pkg);
}

export async function purchaseAI(): Promise<void> {
  const offerings = await getOfferings();
  const pkg = offerings.current?.availablePackages.find(p => p.identifier === '$rc_monthly');
  if (!pkg) throw new Error('AI subscription package not found — configure in RevenueCat dashboard');
  await Purchases.purchasePackage(pkg);
}

export async function restorePurchases(): Promise<void> {
  await Purchases.restorePurchases();
}
