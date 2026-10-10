import { Redirect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

// Some Android browsers deliver the Google sign-in return link to the app as a
// normal deep link. Let the waiting browser session finish, then leave this screen.
WebBrowser.maybeCompleteAuthSession();

export default function GoogleOAuthReturn() {
  return <Redirect href="/" />;
}
