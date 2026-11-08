/* Hash routing keeps every view working on GitHub Pages project paths. */
(function (root) {
  'use strict';
  const views = {home: 'home', story: 'story', sources: 'sources'};
  let lastHomeScroll = 0;

  function route() {
    const hash = location.hash || '#/';
    const m = hash.match(/^#\/story\/([a-z-]+)(?:#(.+))?/);
    const leavingHome = document.body.dataset.view === 'home';
    if (leavingHome) lastHomeScroll = scrollY;
    let view = 'home';
    if (m) view = 'story';
    else if (hash.startsWith('#/sources')) view = 'sources';
    for (const v of Object.keys(views)) document.getElementById(v).hidden = v !== view;
    document.body.dataset.view = view;
    if (view === 'story') {
      root.Story.render(m[1]).then(() => {
        const target = m[2] && document.getElementById(m[2]);
        if (target) target.scrollIntoView(); else scrollTo(0, 0);
      });
      return;
    }
    if (view === 'sources') { root.Story.renderSources(); scrollTo(0, 0); return; }
    document.title = 'The News Behind Price';
    scrollTo(0, leavingHome ? scrollY : lastHomeScroll);
  }

  function init() {
    root.Home.init();
    addEventListener('hashchange', route);
    route();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(window);
