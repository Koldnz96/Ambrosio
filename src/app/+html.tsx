// The page shell the browser gets BEFORE any JavaScript runs.
// The colors are written straight into the HTML so a refresh never flashes white.
import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

// Keep this color the same as Colors.light.background in src/constants/theme.ts.
const backgroundCss = `
html, body, #root { background-color: #F0D5BC; }

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
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="color-scheme" content="light" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: backgroundCss }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
