import type { LinksFunction, V2_MetaFunction } from "@remix-run/node";
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "@remix-run/react";
import type { LoaderFunction } from "@remix-run/node";

import type { Theme } from "./themeProvider";
import { getThemeSession } from "./theme.server";
import tailwindStylesheetUrl from "./styles/tailwind.css";
import {
  NonFlashOfWrongThemeEls,
  ThemeProvider,
  useTheme,
} from "./themeProvider";
import clsx from "clsx";

export type LoaderData = {
  theme: Theme | null;
};

export const loader: LoaderFunction = async ({ request }) => {
  const themeSession = await getThemeSession(request);

  const data: LoaderData = {
    theme: themeSession.getTheme(),
  };

  return data;
};

export const links: LinksFunction = () => {
  return [
    { rel: "stylesheet", href: tailwindStylesheetUrl },
    { rel: "preconnect", href: "https://fonts.gstatic.com" },
    {
      rel: "stylesheet",
      href: "https://fonts.googleapis.com/css?family=Poppins:400,500&display=swap",
    },
  ];
};

export const meta: V2_MetaFunction = () => [
  { charset: "utf-8" },
  { title: "Hookup or Lockup" },
  {
    name: "viewport",
    content: "width=device-width,initial-scale=1",
  },
];

function App() {
  const data = useLoaderData<LoaderData>();
  const [theme] = useTheme();

  return (
    <html lang="en" className={clsx("h-full", theme)}>
      <head>
        <Meta />
        <Links />
        <NonFlashOfWrongThemeEls ssrTheme={Boolean(data.theme)} />
      </head>
      <body className="h-full bg-red-dark font-sans text-pink dark:bg-black dark:text-blue-lighter">
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}

export default function AppWithProviders() {
  const data = useLoaderData<LoaderData>();

  return (
    <ThemeProvider specifiedTheme={data.theme}>
      <App />
    </ThemeProvider>
  );
}
