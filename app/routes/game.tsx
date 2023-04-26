import type { LoaderArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useFetcher, useLoaderData, useSearchParams } from "@remix-run/react";
import { useEffect, useState } from "react";

import { getPosts } from "~/models/post.server";
import ConfirmModal from "~/components/ConfirmModal";
import Game from "~/components/Game";
import Results from "~/components/Results";
import GameOver from "~/components/GameOver";
import Error from "~/components/Error";
import YourStats from "~/components/YourStats";

const PAGE_SIZE = 10;

type Undecided = 0;
type Decision = -1 | 1;

/**
 * Remix loader function.
 *
 * @param args - loader arguments
 * @returns - loader data
 */
export async function loader({ request }: LoaderArgs) {
  const url = new URL(request.url);
  let page = url.searchParams.get("page") || 1;
  if (typeof page == "string") {
    page = parseInt(page, 10);
  }

  const response = await getPosts(page, PAGE_SIZE);
  return json(response);
}

export function ErrorBoundary() {
  return <Error />;
}

export default function GamePage() {
  const [qs] = useSearchParams();

  const smasherAndPasser = useFetcher();
  const fetcher = useFetcher();
  let response = useLoaderData<typeof loader>();

  const [decision, setDecision] = useState<Decision | Undecided>(0); // TODO: Load last index from session
  const [index, setIndex] = useState(0); // TODO: Load last index from session
  const [posts, setPosts] = useState(response.posts);
  const [page, setPage] = useState(response.page);
  const [total] = useState(response.total);

  // Game state
  const defaultShowGame = (qs.get("showGame") ?? "yes") === "yes";
  const defaultShowConfirm = (qs.get("showConfirm") ?? "no") === "yes";
  const defaultShowResults = (qs.get("showResults") ?? "no") === "yes";
  const defaultShowYourStats = (qs.get("showYourStats") ?? "no") === "yes";
  const defaultShowGameOver = (qs.get("gameOver") ?? "no") === "yes";

  const [showGame, setShowGame] = useState(
    defaultShowGame && !defaultShowGameOver
  );
  const [showConfirm, setShowConfirm] = useState(defaultShowConfirm);
  const [showResults, setShowResults] = useState(defaultShowResults);
  const [showYourStats, setShowYourStats] = useState(defaultShowYourStats);
  const [showGameOver, setShowGameOver] = useState(defaultShowGameOver);

  /**
   * Fetch the next page of posts from the server.
   * Updates the fetcher.
   */
  async function fetchMorePosts() {
    if (fetcher.state !== "loading") {
      console.log("FETCHING MORE POSTS");
      const query = `/game?&page=${page + 1}`;
      fetcher.load(query);
    }
  }

  // When the fetcher updates, update the posts
  useEffect(() => {
    if (!fetcher.data || fetcher.state === "loading") {
      return;
    }

    // If we have new data - append it
    if (fetcher.data) {
      const newItems = fetcher.data;
      setPosts((posts) => posts.concat(newItems.posts));
      setPage(newItems.page);
    }
  }, [fetcher.data, fetcher.state]);

  function onDecisionMade(decision: Decision) {
    setDecision(decision);
    setShowConfirm(true);
  }

  function onCloseYourStats() {
    setShowYourStats(false);

    // TODO: This has issues
    const isGameOver = index >= total - 1;
    if (isGameOver) {
      setShowGameOver(true);
    } else {
      setShowResults(true);
    }
  }

  function onConfirmed(confirmed: boolean) {
    setShowConfirm(false);

    if (!confirmed) {
      return;
    }

    // fetch more posts if needed
    if (index >= posts.length - 2) {
      fetchMorePosts();
    }

    // record smash/pass
    const postId = posts[index].id;
    const action = decision === 1 ? `/smash/${postId}` : `/pass/${postId}`;
    smasherAndPasser.submit(
      {},
      {
        method: "patch",
        action,
      }
    );

    // Update post stats
    post.totalVotes++;
    if (decision === 1) {
      post.smashes++;
    } else {
      post.passes++;
    }

    setShowGame(false);
    setShowResults(true);
  }

  function onGoNext() {
    setShowResults(false);
    setIndex(index + 1);

    const isGameOver = index + 1 >= total - 1;
    if (isGameOver) {
      setShowGameOver(true);
    } else {
      setShowGame(true);
    }
  }

  function onShowYourStats() {
    setShowGameOver(false);
    setShowResults(false);
    setShowYourStats(true);
  }

  function onShowGlobalStats() {
    // TODO: Show global stats
  }

  const isLoading = fetcher.state === "loading" && index >= posts.length;
  const post = posts[index];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <ConfirmModal
        open={showConfirm}
        onConfirmed={onConfirmed}
        decision={decision}
        post={post}
      />

      {showGameOver && (
        <GameOver
          onShowYourStats={onShowYourStats}
          onShowGlobalStats={onShowGlobalStats}
        />
      )}

      {showYourStats && <YourStats onContinue={onCloseYourStats} />}

      {showResults && (
        <Results
          onGoNext={onGoNext}
          onShowYourStats={onShowYourStats}
          decision={decision}
          post={post}
        />
      )}

      {showGame && (
        <Game
          isLoading={isLoading}
          index={index}
          total={total}
          onDecisionMade={onDecisionMade}
          post={post}
        />
      )}
    </div>
  );
}
