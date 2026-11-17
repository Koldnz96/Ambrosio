// NOTE: THIS FILE IS NOT USED by the app as it is set up now. app.json has web.output = "single",
// and then Expo builds the page from public/index.html instead. Change public/index.html.
// (This file would only be used if the app switched to web.output = "static".)
// The page shell the browser gets BEFORE any JavaScript runs.
// The colors are written straight into the HTML so a refresh never flashes white.
import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

// Keep this color the same as Colors.light.background in src/constants/theme.ts.
const backgroundCss = `
html, body, #root { background-color: #F0D5BC; }

/* The page must never be wider than the screen, or a phone zooms out and the page can be
   dragged sideways. Inputs have a built-in minimum width, so let them shrink to fit. */
html, body { max-width: 100%; overflow-x: hidden; }
input, textarea, select { min-width: 0; max-width: 100%; box-sizing: border-box; }
img { max-width: 100%; }

/* Hide the scroll bar everywhere; scrolling still works (wheel, trackpad, touch, keys). */
* { scrollbar-width: none; -ms-overflow-style: none; }
html, body { scrollbar-width: none; -ms-overflow-style: none; }
html::-webkit-scrollbar, body::-webkit-scrollbar, *::-webkit-scrollbar { display: none; width: 0; height: 0; }
`;

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, shrink-to-fit=no, viewport-fit=cover" />
        {/* So the site can be added to the phone's home screen and opens like an app. */}
        <meta name="theme-color" content="#F0D5BC" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Ambrósio" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="color-scheme" content="light" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: backgroundCss }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
