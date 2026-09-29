# App Store Review Notes — Relay (com.runrelay.relay)

**Demo account:** test@test.com / test123

**1. Screen recording:** Physical device, latest iOS. Cold launch → sign in → create/open race → Prep → grant Location → short run → Race Memory → Profile → Delete account. No IAP/subscriptions. No ATT. Supporters send messages via web invite link (not in-app social feed). Recording attached separately.

**2. Tested on:** iPhone 14 Pro Max, iPhone SE, iPhone 13, iPhone 14 (physical devices; latest iOS available at test time). Also Simulator during development.

**3. App / audience:** Relay helps runners receive timed encouragement (voice, text, song) from friends/family at a GPS mile or elapsed time. Create races, share invite link, track run, deliver messages live, save Race Memory, manage profile/delete account. Audience: recreational runners and their supporters. Value: encouragement when it matters—not training analytics.

**4. How to review:** Sign in with demo account above (or Sign in with Apple). Races tab → open/create race → Prep → Start. Allow Location for mile delivery (time-based works without continuous GPS). Supporter link opens in Safari to add messages. Delete account: Profile → Delete account. Legal: https://runrelay.org/privacy · https://runrelay.org/terms · https://runrelay.org/support

**5. External services:** Firebase Auth (email/Apple/Google), Firestore, Storage, Hosting (supporter web form + legal). Expo/React Native. Apple Music/iTunes Search for song preview metadata only. APNs where configured. No payment processors, StoreKit subscriptions, ATT analytics, or AI services.

**6. Regions:** Same features worldwide. English UI only. No geo-restricted content or regional pricing.

**7. Regulated / licensed material:** N/A. Consumer fitness app. Song previews via public metadata APIs; no full-track redistribution. Supporter messages are personal to the race owner.

**Permissions:** Location (run tracking / mile delivery), Photos (avatar), audio playback for messages. Sign in with Apple available. No ATT prompt.
