/* Editorial catalogue for the Australia-only redesign.
   Headlines are editorial questions, not causal claims.
   `data` describes where a verified Australian series lives (or that none exists yet).
   No prices are written here: all figures are read at runtime from data files. */
(function (root) {
  'use strict';
  const CATEGORIES = [
    {id: 'all', label: 'All'},
    {id: 'transport', label: 'Transport'},
    {id: 'tech', label: 'Tech'},
    {id: 'food', label: 'Food & Drink'},
    {id: 'sports', label: 'Sports & Lifestyle'},
    {id: 'living', label: 'Living'}
  ];

  const PRODUCTS = [
    {
      id: 'petrol', name: 'Petrol', category: 'transport',
      headline: 'How did a war thousands of kilometres away reach Australian petrol stations?',
      summary: 'Conflict in the Middle East disrupted oil shipping from late February. The ACCC has tracked what followed at the bowser every week since.',
      theme: 'Middle East conflict and global energy supply',
      disc: 'assets/products/petrol-disc.webp', photo: 'assets/products/petrol-photo.webp',
      alt: 'Petrol station forecourt at dusk with a red canopy',
      data: {kind: 'story', file: 'data/stories/petrol.json'},
      storyReady: true
    },
    {
      id: 'airfares', name: 'Airfares', category: 'transport',
      headline: 'Why is it costing more to fly home for the holidays?',
      summary: 'Jet fuel is one of an airline\'s largest costs. Qantas said in November it would keep raising fares as fuel costs climb.',
      theme: 'Rising aviation fuel costs and airline pricing',
      disc: 'assets/products/airfares-disc.webp', alt: 'Aircraft wing above the clouds at sunset',
      data: {kind: 'none', note: 'BITRE domestic airfare indices are the planned source. Not yet imported.'}
    },
    {
      id: 'ram', name: 'RAM', category: 'tech',
      headline: 'Why are AI data centres making your next laptop upgrade dearer?',
      summary: 'Memory makers are steering production toward high-bandwidth chips for AI servers, which can tighten supply of everyday DRAM.',
      theme: 'AI data centre demand and memory chip shortages',
      disc: 'assets/products/ram-disc.webp', alt: 'Close-up of a memory module with black chips',
      data: {kind: 'none', note: 'Licensed DRAM contract price history requires membership and redistribution permission. No Australian retail series verified.'}
    },
    {
      id: 'shuttlecocks', name: 'Shuttlecocks', category: 'sports',
      headline: 'How did a bird flu outbreak make badminton more expensive in Australia?',
      summary: 'Feather shuttlecocks depend on goose and duck feathers. Fewer birds can mean fewer usable feathers and dearer tubes.',
      theme: 'Bird flu, goose-feather shortages and badminton costs',
      disc: 'assets/products/shuttlecocks-disc.webp', hero: 'assets/products/shuttlecocks-hero.webp',
      alt: 'A feather shuttlecock resting on a dark badminton court line',
      data: {kind: 'none', note: 'Existing Australian quotes are a range and a lower bound, not exact historical observations.'}
    },
    {
      id: 'chocolate', name: 'Chocolate', category: 'food',
      headline: 'What does a bad harvest in West Africa mean for a block of chocolate here?',
      summary: 'Most of the world\'s cocoa comes from Côte d\'Ivoire and Ghana. When harvests fail, the cost reaches supermarket shelves months later.',
      theme: 'West African cocoa supply disruptions',
      disc: 'assets/products/chocolate-disc.webp', alt: 'Broken pieces of dark chocolate',
      data: {kind: 'none', note: 'No product-specific Australian price series verified yet.'}
    },
    {
      id: 'coffee', name: 'Coffee', category: 'food',
      headline: 'How does a drought in Brazil end up in your morning flat white?',
      summary: 'Extreme weather in major growing regions moves world bean prices. Cafés pass those costs on unevenly and with a delay.',
      theme: 'Extreme weather and global coffee production',
      disc: 'assets/products/coffee-disc.webp', alt: 'Roasted coffee beans',
      data: {kind: 'none', note: 'Arabica and Robusta world benchmarks are held as background context only. No Australian coffee price series verified.'}
    },
    {
      id: 'beef', name: 'Beef', category: 'food',
      headline: 'Why does American demand change what Australians pay for steak?',
      summary: 'The US buys large volumes of Australian lean beef. Strong export demand can lift the price of cattle and cuts at home.',
      theme: 'US beef demand and Australian exports',
      disc: 'assets/products/beef-disc.webp', alt: 'Marbled raw beef steak',
      data: {kind: 'index', seriesId: 'abs-sydney-beef'}
    },
    {
      id: 'bananas', name: 'Bananas', category: 'food',
      headline: 'What happens to banana prices when a cyclone crosses North Queensland?',
      summary: 'Most Australian bananas grow in a small area of tropical Queensland, so one severe storm can cut national supply.',
      theme: 'Australian cyclones and agricultural supply',
      disc: 'assets/products/bananas-disc.webp', alt: 'A bunch of ripe yellow bananas',
      data: {kind: 'none', note: 'No verified Australian banana price series imported yet.'}
    },
    {
      id: 'electricity', name: 'Electricity', category: 'living',
      headline: 'Who decides what your power bill costs?',
      summary: 'Regulators set default market offers each year, while wholesale costs, networks and the energy transition shape what retailers charge.',
      theme: 'Electricity pricing policies and energy transition',
      disc: 'assets/products/electricity-disc.webp', alt: 'Electricity transmission tower against an orange sky',
      data: {kind: 'none', note: 'AER default market offers and ABS electricity CPI are planned sources. Not yet imported.'}
    },
    {
      id: 'rent', name: 'Rent', category: 'living',
      headline: 'Why is finding an affordable room in Australia so hard?',
      summary: 'Rents respond to how many homes are built, how many people arrive and how many rentals sit vacant.',
      theme: 'Housing supply and the rental market',
      disc: 'assets/products/rent-disc.webp', alt: 'Apartment building with lit windows at dusk',
      data: {kind: 'none', note: 'ABS rents CPI and state bond-lodgement data are planned sources. Not yet imported.'}
    }
  ];

  root.Catalogue = {CATEGORIES, PRODUCTS};
})(window);
