"use client";

import { useState } from "react";
import { addCommunityPost } from "@/app/actions";
import { Icon } from "@/components/icon";
import { useDemo } from "@/components/providers";
import {
  Avatar,
  Button,
  Card,
  Eyebrow,
  IconBadge,
  Screen,
  ScreenSub,
  ScreenTitle,
} from "@/components/ui";

type Post = { id: string; authorName: string; initials: string; text: string };

export function CommunityView({
  posts,
  memberCount,
}: {
  posts: Post[];
  memberCount: number;
}) {
  const { showToast } = useDemo();
  const [items, setItems] = useState(posts);
  const [text, setText] = useState("");

  return (
    <Screen>
      <Eyebrow>You&rsquo;re not doing this alone</Eyebrow>
      <ScreenTitle>Humanaut community</ScreenTitle>
      <ScreenSub>People on the same road, cheering you on.</ScreenSub>

      {items.map((post) => (
        <Card key={post.id}>
          <div className="flex items-center gap-2.5">
            <Avatar initials={post.initials} />
            <div className="flex-1">
              <p className="text-[13.5px] font-bold">{post.authorName}</p>
              <p className="text-[12.5px] text-ink-70">&ldquo;{post.text}&rdquo;</p>
            </div>
          </div>
        </Card>
      ))}

      <Card>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Send a note to the group…"
          className="min-h-16 w-full resize-none rounded-xl bg-canvas p-3 text-[13px] outline-none placeholder:text-ink-70"
        />
        <Button
          className="mt-2"
          onClick={async () => {
            const result = await addCommunityPost(text);
            if (result.error || !result.post) {
              showToast(result.error ?? "Could not post.");
              return;
            }
            setItems((prev) => [result.post, ...prev]);
            setText("");
            showToast("Posted.");
          }}
        >
          Post encouragement
        </Button>
      </Card>

      <Card href="/challenge" className="bg-ink text-white">
        <div className="flex items-center gap-3">
          <IconBadge tone="ember-solid">
            <Icon name="emoji_events" className="text-[18px]" />
          </IconBadge>
          <div className="flex-1">
            <p className="text-sm font-bold">Join a weight-loss challenge</p>
            <p className="text-xs text-[#C7CBCC]">{memberCount} people in so far</p>
          </div>
          <Icon name="chevron_right" />
        </div>
      </Card>
    </Screen>
  );
}
