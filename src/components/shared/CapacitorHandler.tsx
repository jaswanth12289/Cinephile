"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSessionRestore } from "@/hooks/useSessionRestore";

export function CapacitorHandler() {
  const pathname = usePathname();
  const router = useRouter();

  // Run the session restore priority manager
  useSessionRestore();

  useEffect(() => {
    let AppPlugin: any = null;
    let lastTime = 0;

    const init = async () => {
      // Safely register capacitor back button listener on client
      if (typeof window !== "undefined" && (window as any).Capacitor) {
        try {
          const { App } = await import("@capacitor/app");
          AppPlugin = App;

          await App.addListener("backButton", (data) => {
            const currentPathname = window.location.pathname;
            const isMainPage = 
              currentPathname === "/" || 
              currentPathname === "/feed" || 
              currentPathname === "/discover" || 
              currentPathname === "/lists";

            const hasBackHistory = 
              window.history.state && 
              typeof window.history.state.idx === "number" && 
              window.history.state.idx > 0;

            if (currentPathname === "/register") {
              if (hasBackHistory) {
                router.back();
              } else {
                router.push("/login");
              }
            } else if (currentPathname === "/login") {
              if (hasBackHistory) {
                router.back();
              } else {
                router.push("/");
              }
            } else if (isMainPage && !hasBackHistory) {
              const now = Date.now();
              if (now - lastTime < 2000) {
                App.exitApp();
              } else {
                lastTime = now;
                showToast();
              }
            } else {
              if (hasBackHistory) {
                router.back();
              } else {
                router.push("/feed");
              }
            }
          });
        } catch (e) {
          console.warn("[CapacitorHandler] Failed to register back button listener:", e);
        }
      }
    };

    const showToast = () => {
      if (typeof document === "undefined") return;
      
      const toast = document.createElement("div");
      toast.innerText = "Press back again to exit";
      toast.style.position = "fixed";
      toast.style.bottom = "80px";
      toast.style.left = "50%";
      toast.style.transform = "translateX(-50%)";
      toast.style.backgroundColor = "rgba(9, 9, 15, 0.95)";
      toast.style.color = "#FFFFFF";
      toast.style.border = "1px solid rgba(255, 255, 255, 0.1)";
      toast.style.padding = "10px 20px";
      toast.style.borderRadius = "9999px";
      toast.style.fontSize = "12px";
      toast.style.fontWeight = "bold";
      toast.style.zIndex = "99999";
      toast.style.fontFamily = "var(--font-sans), sans-serif";
      toast.style.boxShadow = "0 8px 30px rgba(0, 0, 0, 0.5)";
      toast.style.transition = "opacity 0.25s ease";
      toast.style.pointerEvents = "none";
      
      document.body.appendChild(toast);

      // Fade out and remove
      setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => {
          if (toast.parentNode) {
            document.body.removeChild(toast);
          }
        }, 250);
      }, 1500);
    };

    const initPushNotifications = async () => {
      if (typeof window !== "undefined" && (window as any).Capacitor && (window as any).Capacitor.isNative) {
        try {
          const { PushNotifications } = await import("@capacitor/push-notifications");
          
          let permStatus = await PushNotifications.checkPermissions();
          if (permStatus.receive === 'prompt') {
            permStatus = await PushNotifications.requestPermissions();
          }

          if (permStatus.receive !== 'granted') {
            return;
          }

          await PushNotifications.register();

          PushNotifications.addListener('registration', (token) => {
            console.log('Push registration success, token: ' + token.value);
            // Here we would normally send the token to the server
            // e.g. updateFcmToken(token.value)
          });

          PushNotifications.addListener('registrationError', (error: any) => {
            console.warn('Error on registration: ' + JSON.stringify(error));
          });

          PushNotifications.addListener('pushNotificationReceived', (notification) => {
            console.log('Push received: ' + JSON.stringify(notification));
          });

          PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
            console.log('Push action performed: ' + JSON.stringify(notification));
            // e.g. router.push(notification.notification.data.url)
          });
        } catch (e) {
          console.warn("[CapacitorHandler] Failed to init push notifications:", e);
        }
      }
    };

    init();
    initPushNotifications();

    return () => {
      if (AppPlugin) {
        AppPlugin.removeAllListeners();
      }
    };
  }, [router]);

  return null;
}
