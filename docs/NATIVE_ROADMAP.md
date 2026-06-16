# Cinephile Native APK Roadmap (Capacitor Migration Guide)

This roadmap documents the transition checklist for transforming the Cinephile Web App into a premium Native Android/iOS APK using Capacitor. To provide a high-fidelity mobile experience (similar to Letterboxd or IMDb), standard web browser APIs and third-party Web SDKs should be replaced with native Capacitor plugins.

---

## 1. Storage & Persistence (`@capacitor/preferences`)

Currently, authentication state and temporary cache items are stored in standard `window.localStorage`. On Android WebViews, localStorage can be cleared arbitrarily by the OS to reclaim storage space.

### Migration Action
Replace `localStorage` with `@capacitor/preferences`.
```bash
npm install @capacitor/preferences
npx cap sync
```

### Implementation Example
```ts
import { Preferences } from '@capacitor/preferences';

export async function setCachedData(key: string, value: string) {
  await Preferences.set({ key, value });
}

export async function getCachedData(key: string): Promise<string | null> {
  const { value } = await Preferences.get({ key });
  return value;
}
```

---

## 2. Authentication Flow (`@capacitor-community/google-auth`)

Web-based OAuth popups and redirects (`signInWithPopup`/`signInWithRedirect`) fail inside native Android WebViews due to security sandboxing.

### Migration Action
Install `@capacitor-community/google-auth` to trigger native Google Auth dialog sheets on the device, returning an ID Token to authenticate with Firebase client-side.
```bash
npm install @capacitor-community/google-auth
npx cap sync
```

### Implementation Example
```ts
import { GoogleAuth } from '@capacitor-community/google-auth';
import { signInWithCredential, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';

export async function signInWithGoogleNative() {
  const googleUser = await GoogleAuth.signIn();
  const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken);
  return signInWithCredential(auth, credential);
}
```

---

## 3. Native Sharing Sheet (`@capacitor/share`)

Standard web sharing (`navigator.share`) has limited browser support and does not consistently integrate with native messaging sheets on Android.

### Migration Action
Leverage native device sharing overlays.
```bash
npm install @capacitor/share
npx cap sync
```

### Implementation Example
```ts
import { Share } from '@capacitor/share';

export async function shareMovie(title: string, text: string, url: string) {
  await Share.share({
    title,
    text,
    url,
    dialogTitle: 'Share this film with friends',
  });
}
```

---

## 4. Push Notifications (`@capacitor/push-notifications`)

Web Push notifications rely on Service Workers which are highly unreliable or entirely disabled inside native WebViews.

### Migration Action
Register device tokens with FCM (Firebase Cloud Messaging) and receive push notifications natively.
```bash
npm install @capacitor/push-notifications
npx cap sync
```

### Registration Flow
```ts
import { PushNotifications } from '@capacitor/push-notifications';

export async function registerPush() {
  let perm = await PushNotifications.checkPermissions();
  if (perm.receive !== 'granted') {
    perm = await PushNotifications.requestPermissions();
  }
  if (perm.receive === 'granted') {
    await PushNotifications.register();
  }
}
```

---

## 5. Mobile UX Polish Plugins

To elevate the app's overall quality and make it feel truly premium, integrate the following Capacitor systems:

### A. Capacitor Haptics (`@capacitor/haptics`)

Provide physical haptic feedback to the user on specific interactions to make the app feel tactile and native.

- **Install**:
  ```bash
  npm install @capacitor/haptics
  npx cap sync
  ```

- **Unified Client Helper (`src/lib/haptics.ts`)**:
  ```ts
  import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
  import { Capacitor } from '@capacitor/core';

  export const triggerHaptic = {
    light: async () => {
      if (Capacitor.isNativePlatform()) {
        await Haptics.impact({ style: ImpactStyle.Light });
      }
    },
    medium: async () => {
      if (Capacitor.isNativePlatform()) {
        await Haptics.impact({ style: ImpactStyle.Medium });
      }
    },
    success: async () => {
      if (Capacitor.isNativePlatform()) {
        await Haptics.notification({ type: NotificationType.Success });
      }
    }
  };
  ```

- **Integration Checklist**:
  1. **Like Button / Favorites Toggle**: Trigger `triggerHaptic.light()` when users toggle heart icons.
  2. **Watchlist Button**: Trigger `triggerHaptic.light()` when users toggle watch statuses.
  3. **Ratings Selector**: Trigger `triggerHaptic.medium()` when selecting a star rating.
  4. **Pull-to-Refresh Completion**: Trigger `triggerHaptic.success()` when pages finish reloading.

### B. Device Back Button & App Lifecycle (`@capacitor/app`)
Manage native Android physical back button presses to prevent the app from closing when exiting detail pages.
- **Install**: `npm install @capacitor/app`
- **Use**: 
  ```ts
  App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) { window.history.back(); } 
    else { App.exitApp(); }
  });
  ```

### C. Status Bar Styling (`@capacitor/status-bar`)
Force the device's system status bar to use dark themes matching Cinephile's `#0F0F1A` aesthetic.
- **Install**: `npm install @capacitor/status-bar`
- **Use**: `StatusBar.setStyle({ style: StatusBarStyle.Dark })` and `StatusBar.setBackgroundColor({ color: '#0F0F1A' })`

### D. Native Splash Screen (`@capacitor/splash-screen`)
Coordinate splash screens to hide only after the Next.js hydration completes, preventing the initial white web view flash.
- **Install**: `npm install @capacitor/splash-screen`
- **Use**: `SplashScreen.hide()` inside root `useEffect`

### E. Keyboard Layout Adjustments (`@capacitor/keyboard`)
Configure WebView resizing options when the keyboard opens to prevent pushing fixed bottom navigation bars into the center of the viewport.
- **Install**: `npm install @capacitor/keyboard`
- **Use**: `Keyboard.setAccessoryBarVisible({ visible: false })`

---

## 6. Feed List Virtualization (`@tanstack/react-virtual`)

As the community activity feed timeline grows, rendering hundreds of complex feed card elements inside a single mobile WebView will cause scroll stuttering and heavy memory usage. 

### Why Virtualization is Necessary
Virtualization ensures that only the items visible in the device viewport are rendered in the DOM, while offscreen elements are recycled. This maintains a solid **60 FPS scrolling speed** on budget Android devices.

### Recommended Tool
Leverage `@tanstack/react-virtual` for virtualizing window and element scrolls.

- **Install**:
  ```bash
  npm install @tanstack/react-virtual
  ```

- **Implementation Concept (`src/app/(main)/feed/FeedTimeline.tsx`)**:
  ```tsx
  "use client";

  import React, { useRef } from "react";
  import { useVirtualizer } from "@tanstack/react-virtual";
  import { FeedCard } from "@/components/shared/FeedCard";

  export function FeedTimeline({ activities }: { activities: any[] }) {
    const parentRef = useRef<HTMLDivElement>(null);

    const rowVirtualizer = useVirtualizer({
      count: activities.length,
      getScrollElement: () => parentRef.current,
      estimateSize: () => 180, // Estimated height of a FeedCard
      overscan: 5,
    });

    return (
      <div
        ref={parentRef}
        className="h-screen overflow-auto"
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualItem) => {
            const act = activities[virtualItem.index];
            return (
              <div
                key={act.id}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${virtualItem.size}px`,
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <FeedCard activity={act} />
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  ```

---

## 7. Production Release Signing & APK Optimization

Before uploading your app to the Google Play Store, the APK/AAB package must be cryptographically signed with a private release key.

### A. Generate Release Keystore
Run the following command in your terminal. Ensure you store the keystore file securely—losing it prevents you from releasing updates to your app.

```bash
keytool -genkeypair -v -keystore cinephile-release.keystore -alias cinephile-alias -keyalg RSA -keysize 2048 -validity 10000
```

### B. Configure Android Gradle Signing (`android/app/build.gradle`)
Copy the `cinephile-release.keystore` file to `android/app/`, then configure signing credentials in your gradle file. Do not commit key passwords to git (use environment variables or system properties for production).

```gradle
android {
    ...
    signingConfigs {
        release {
            storeFile file("cinephile-release.keystore")
            storePassword System.getenv("CINEPHILE_KEYSTORE_PASSWORD") ?: "YOUR_LOCAL_PASSWORD"
            keyAlias "cinephile-alias"
            keyPassword System.getenv("CINEPHILE_KEY_PASSWORD") ?: "YOUR_LOCAL_PASSWORD"
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            
            // APK Size Budget Optimization (< 30 MB)
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

### C. Compile signed APK or App Bundle (AAB)
Run the compilation tasks inside the `android/` directory:

* **Compile APK (Testing)**: `./gradlew assembleRelease`
* **Compile Google Play Bundle (AAB)**: `./gradlew bundleRelease`

