"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart, HeartOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  slug: string;
  initialFollowing: boolean;
};

export function GroupFollowButton({ slug, initialFollowing }: Props) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, startTransition] = useTransition();
  const [hover, setHover] = useState(false);

  const handleClick = () => {
    const next = !following;
    setFollowing(next);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/groups/${slug}/follow`, {
          method: next ? "POST" : "DELETE",
        });
        if (!res.ok) {
          // ロールバック
          setFollowing(!next);
        } else {
          router.refresh();
        }
      } catch {
        setFollowing(!next);
      }
    });
  };

  const label = pending
    ? "..."
    : following
    ? hover
      ? "フォロー解除"
      : "フォロー中"
    : "フォローする";

  return (
    <Button
      onClick={handleClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      disabled={pending}
      size="sm"
      variant={following ? "outline" : "default"}
      className={`rounded-full min-w-[120px] ${
        following ? "" : "bg-[#C26A4A] text-white hover:bg-[#A85535]"
      }`}
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : following ? (
        hover ? (
          <HeartOff className="h-3.5 w-3.5" />
        ) : (
          <Heart className="h-3.5 w-3.5 fill-current" />
        )
      ) : (
        <Heart className="h-3.5 w-3.5" />
      )}
      <span>{label}</span>
    </Button>
  );
}
