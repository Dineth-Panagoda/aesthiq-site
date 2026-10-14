// PostHog for aesthiq.app — same project as the iOS app, separated by the
// `platform: "web"` super property (and PostHog's own $lib = "web").
//
// Cookieless: persistence is in memory only, so nothing is written to the
// visitor's device and no consent banner is needed. The trade-off is that a
// visitor counts as new on each full page load.
//
// Runs only on the live domain, so local previews never pollute the data.
// Add ?analytics=debug to a local URL to send events anyway (tagged is_local).
(function () {
  var live = /(^|\.)aesthiq\.app$/.test(location.hostname);
  var debug = /[?&]analytics=debug\b/.test(location.search);

  window.aqTrack = function (event, props) {
    if (window.console) console.debug("[analytics]", event, props || {});
  };
  if (!live && !debug) return;

  !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group identify setPersonProperties".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);

  posthog.init("phc_xwBkQufRUc9j2PdHw3Zhxgf5WYYu3CdzDgdXprZ3hNdD", {
    api_host: "https://us.i.posthog.com",
    persistence: "memory",
    person_profiles: "identified_only",
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: true,
    disable_session_recording: true,
    debug: debug
  });
  posthog.register({ platform: "web", is_local: !live });

  window.aqTrack = function (event, props) {
    // Beacon transport so clicks that leave the page (App Store links) still send.
    posthog.capture(event, props || {}, { transport: "sendBeacon" });
  };
})();
