import { SonicUnfurlLoader } from "@/components/loading-splash";

/** Post-auth loading state while the session and student profile are confirmed. */
export function SigningInScreen() {
  return (
    <div role="status" aria-live="polite">
      <SonicUnfurlLoader
        busy
        backgroundColor="var(--tf-black)"
        caption="Signing you in..."
      />
    </div>
  );
}
