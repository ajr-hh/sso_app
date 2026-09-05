import { getRoutes } from "expo-router/build/getRoutes";

import { SOS_PATH, SOS_TAB_NAME, TAB_SCREENS } from "./tabs";

// This project types only Jest globals, so the CommonJS test scope needs local
// declarations for the file system helpers that read the route files.
declare const __dirname: string;

type Dirent = { name: string; isDirectory: () => boolean };

const { readdirSync } = jest.requireActual("fs") as {
  readdirSync: (path: string, options: { withFileTypes: true }) => Dirent[];
};
const { join, relative } = jest.requireActual("path") as {
  join: (...segments: string[]) => string;
  relative: (from: string, to: string) => string;
};

const APP_DIR = join(__dirname, "..", "..", "app");

type Node = { route: string; children?: Node[] };

const routeFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return routeFiles(full);
    return entry.name.endsWith(".tsx") ? [`./${relative(APP_DIR, full)}`] : [];
  });

// Mirrors the Metro context module Expo Router builds from the app directory,
// so these assertions run against the real route files.
const buildRouteTree = (): Node => {
  const keys = routeFiles(APP_DIR);
  const context = Object.assign(() => ({ default: () => null }), {
    keys: () => keys,
    resolve: (key: string) => key,
    id: "app",
  });

  return getRoutes(context as never, {
    platform: "ios",
    sitemap: false,
    notFound: false,
    internal_stripLoadRoute: true,
  }) as unknown as Node;
};

const childRoutes = (node: Node | undefined) =>
  (node?.children ?? []).map((child) => child.route).sort();

const childNamed = (node: Node | undefined, route: string) =>
  node?.children?.find((child) => child.route === route);

describe("route tree", () => {
  const tree = buildRouteTree();
  const app = childNamed(tree, "(app)");
  const tabs = childNamed(app, "(tabs)");

  test("keeps SOS inside the tab navigator so tab presses only switch tabs", () => {
    expect(childRoutes(tabs)).toEqual(
      [...TAB_SCREENS.map((screen) => screen.name), SOS_TAB_NAME].sort(),
    );
    expect(SOS_PATH).toBe(`/(app)/(tabs)/${SOS_TAB_NAME}`);
  });

  test("keeps the SOS support screens above the tabs so they can go back", () => {
    const stackRoutes = childRoutes(app);

    expect(stackRoutes).toContain("sos/rails");
    expect(stackRoutes).toContain("sos/planned");
    // A second /sos route here would stack a copy of the tabs over the tab
    // navigator, which is what made tab presses rebuild the whole app.
    expect(stackRoutes).not.toContain("sos");
    expect(stackRoutes).not.toContain("sos/index");
  });
});
