// Crash reporting (Sentry). Tells us when the app crashes or hits an error, so
// problems get fixed before people have to report them.
//
// Private by design: no names, emails or IP addresses (sendDefaultPii off), no
// screen recordings, and nothing anyone writes. Reports contain the error, the
// screen it happened on and the device/app version.
//
// Off until EXPO_PUBLIC_SENTRY_DSN is set (in .env), and never in development.

import * as Sentry from '@sentry/react-native';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

export const crashReportingEnabled = !!dsn && !__DEV__;

if (crashReportingEnabled) {
  Sentry.init({
    dsn,
    sendDefaultPii: false,
    attachScreenshot: false,
    attachViewHierarchy: false,
    tracesSampleRate: 0,
    // Keep reports to what's needed to fix a bug: drop request bodies and any
    // console output, which could include what someone typed.
    beforeBreadcrumb: (breadcrumb) => (breadcrumb.category === 'console' ? null : breadcrumb),
    beforeSend: (event) => {
      if (event.request) delete event.request.data;
      delete event.user;
      return event;
    },
  });
}

export { Sentry };
