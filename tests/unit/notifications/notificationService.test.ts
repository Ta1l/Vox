import { describe, expect, it } from "vitest";
import { isAllowedPushEndpoint } from "@/lib/domain/notifications/notificationService";

describe("notification security", () => {
  it("allows only known push service origins", () => {
    expect(isAllowedPushEndpoint("https://fcm.googleapis.com/fcm/send/abc")).toBe(true);
    expect(isAllowedPushEndpoint("https://updates.push.services.mozilla.com/wpush/v2/abc")).toBe(true);
    expect(isAllowedPushEndpoint("https://evil.example/fcm.googleapis.com")).toBe(false);
    expect(isAllowedPushEndpoint("http://fcm.googleapis.com/send")).toBe(false);
    expect(isAllowedPushEndpoint("not a url")).toBe(false);
  });
});
