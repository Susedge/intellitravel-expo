import { Redirect } from 'expo-router';

export default function Index() {
  // This redirects from the root to the tabs
  return <Redirect href="/(tabs)/map" />;
}
