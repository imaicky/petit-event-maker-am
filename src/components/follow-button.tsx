"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart, HeartOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  username: string;
  initialFollowing: boolean;
  isAuthed: boolean;
  isSelf: boolean;
};

export function FollowButton({
  username,
  initialFollowing,
  isAuthed,
  isSelf,
}: Props) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, startTransition] = useTransition();
  const [hover, setHover] = useState(false);

  if (isSelf) return null;

  const handleClick = () => {
    if (!isAuthed) {
      router.push(`/auth?redirect=${encodeURIComponent(`/${username}`)}`);
      return;
    }

    const next = !following;
    setFollowing(next);

    startTransition(async () => {
      const res = await fetch(`/api/profiles/${username}/follow`, {
        method: next ? "POST" : "DELETE",
      });
      if (!res.ok) {
        setFollowing(!next);
      } else {
        router.refresh();
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
      className="rounded-full min-w-[120px] transition-colors"
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
