// The app only runs in the browser (no server-rendered pages), so we can read the real
// dark or light setting straight away. This avoids a light flash while the page loads.
export { useColorScheme } from 'react-native';
