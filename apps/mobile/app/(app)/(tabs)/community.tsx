import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { ErrorBanner } from "../../../components/ErrorBanner";
import {
  createPost,
  deletePost,
  fetchPosts,
  type CommunityPost,
} from "../../../src/data/community";
import { explainError } from "../../../src/lib/errors";
import { getSession } from "../../../src/lib/session";
import { colors } from "../../../src/theme/colors";

export default function CommunityScreen() {
  const [posts, setPosts] = useState<CommunityPost[] | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextPosts, session] = await Promise.all([
        fetchPosts(),
        getSession(),
      ]);
      setPosts(nextPosts);
      setCurrentUserId(session?.user.id ?? null);
    } catch (caughtError) {
      setError(explainError(caughtError));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const runAction = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      setPosts(await fetchPosts());
    } catch (caughtError) {
      setError(explainError(caughtError));
    } finally {
      setBusy(false);
    }
  };

  if (loading && !posts) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.ember} size="large" />
        <Text style={styles.body}>Loading the community…</Text>
      </View>
    );
  }

  if (!posts) {
    return (
      <View style={styles.centered}>
        {error ? <ErrorBanner message={error} /> : null}
        <Button label="Try again" onPress={load} />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.screen}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.eyebrow}>MEMBERS SUPPORTING MEMBERS</Text>
      <Text style={styles.title}>Community</Text>
      <Text style={styles.body}>
        Share encouragement and celebrate the next right choice.
      </Text>

      {error ? <ErrorBanner message={error} /> : null}
      {loading ? <ActivityIndicator color={colors.ember} /> : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Share with the community</Text>
        <TextInput
          accessibilityLabel="Community post"
          multiline
          onChangeText={setBody}
          placeholder="What encouragement would you like to share?"
          style={styles.input}
          textAlignVertical="top"
          value={body}
        />
        <Button
          disabled={!body.trim() || busy}
          label={busy ? "Posting…" : "Post encouragement"}
          onPress={() =>
            runAction(async () => {
              await createPost(body.trim());
              setBody("");
            })
          }
        />
      </View>

      <View style={styles.feedHeading}>
        <Text style={styles.sectionTitle}>Latest encouragement</Text>
        <Text style={styles.postCount}>{posts.length}</Text>
      </View>

      {posts.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.body}>
            Be the first to share some encouragement.
          </Text>
        </View>
      ) : (
        posts.map((post) => (
          <View key={post.id} style={styles.card}>
            <PostHeading
              busy={busy}
              canDelete={post.user_id === currentUserId}
              onDelete={() => runAction(() => deletePost(post.id))}
              post={post}
            />
            <Text style={styles.body}>{post.body}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

function PostHeading({
  busy,
  canDelete,
  onDelete,
  post,
}: {
  busy: boolean;
  canDelete: boolean;
  onDelete: () => void;
  post: CommunityPost;
}) {
  return (
    <View style={styles.postHeading}>
      <Text style={styles.postCount}>{post.initials}</Text>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.sectionTitle}>{post.display_name}</Text>
        <Text style={styles.body}>
          {new Date(post.created_at).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })}
        </Text>
      </View>
      {canDelete ? (
        <Pressable
          accessibilityLabel={`Delete post by ${post.display_name}`}
          accessibilityRole="button"
          disabled={busy}
          onPress={onDelete}
        >
          <Text style={{ color: "#A43B2A", fontWeight: "700" }}>Delete</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function Button({
  disabled = false,
  label,
  onPress,
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, disabled && styles.disabled]}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.canvas,
    gap: 16,
    padding: 24,
    paddingBottom: 48,
  },
  centered: {
    alignItems: "center",
    backgroundColor: colors.canvas,
    flex: 1,
    gap: 16,
    justifyContent: "center",
    padding: 24,
  },
  eyebrow: {
    color: colors.ember,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  title: {
    color: colors.ink,
    fontSize: 36,
    fontWeight: "800",
  },
  body: {
    color: colors.body,
    fontSize: 16,
    lineHeight: 22,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    gap: 14,
    padding: 18,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 21,
    fontWeight: "800",
  },
  input: {
    backgroundColor: colors.canvas,
    borderColor: "#D7D9D9",
    borderRadius: 12,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 16,
    minHeight: 110,
    padding: 14,
  },
  button: {
    alignItems: "center",
    backgroundColor: colors.ember,
    borderRadius: 12,
    justifyContent: "center",
    minHeight: 50,
    paddingHorizontal: 18,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  disabled: {
    opacity: 0.45,
  },
  feedHeading: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  postCount: {
    backgroundColor: colors.emberTint,
    borderRadius: 999,
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800",
    minWidth: 30,
    padding: 6,
    textAlign: "center",
  },
  postHeading: {
    alignItems: "center",
    flexDirection: "row",
    gap: 11,
  },
});
