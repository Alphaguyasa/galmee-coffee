import { GalmeeMark } from "@/components/galmee/brand";

/** The app logo tile: the shared Galmee mark on this app's trade colour. */
export function Logo({ className, inverse = false }: { className?: string; inverse?: boolean }) {
  return <GalmeeMark className={className} inverse={inverse} />;
}
