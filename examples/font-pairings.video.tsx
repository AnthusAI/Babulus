import React from 'react';
import { defineVideo } from '../src/dsl/builder';

type FontCard = {
  eyebrow: string;
  headline: string;
  subhead: string;
  eyebrowFont: string;
  headlineFont: string;
  subheadFont: string;
};

// Font sets for A/B/C screens
const cardsA: FontCard[] = [
  { eyebrow: 'Classic News', headline: 'Helvetica Neue Bold', subhead: 'Clear, objective delivery.', eyebrowFont: 'Gill Sans, Arial, sans-serif', headlineFont: '"Helvetica Neue", Arial, sans-serif', subheadFont: 'Arial, sans-serif' },
  { eyebrow: 'Authority', headline: 'Impact Heavy', subhead: 'Punchy for urgent lower-thirds.', eyebrowFont: '"Franklin Gothic Medium", Arial, sans-serif', headlineFont: 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif', subheadFont: '"Trebuchet MS", sans-serif' },
  { eyebrow: 'Documentary', headline: 'Trebuchet MS', subhead: 'Friendly, legible narration.', eyebrowFont: '"Lucida Grande", sans-serif', headlineFont: '"Trebuchet MS", sans-serif', subheadFont: '"Gill Sans", sans-serif' },
  { eyebrow: 'Serif Accent', headline: 'Georgia Bold', subhead: 'Trustworthy editorial tone.', eyebrowFont: '"Helvetica Neue", Arial, sans-serif', headlineFont: 'Georgia, "Times New Roman", serif', subheadFont: '"Source Sans Pro", Arial, sans-serif' },
  { eyebrow: 'Headline+Caption', headline: 'Arial Black', subhead: 'Big caps, compact support.', eyebrowFont: '"Avenir Next", Arial, sans-serif', headlineFont: '"Arial Black", Gadget, sans-serif', subheadFont: '"Segoe UI", sans-serif' },
  { eyebrow: 'Sports Ticker', headline: 'Oswald Bold', subhead: 'Condensed, high-urgency.', eyebrowFont: '"Roboto Condensed", Arial, sans-serif', headlineFont: 'Oswald, "Arial Narrow", sans-serif', subheadFont: '"Inter", system-ui, sans-serif' },
  { eyebrow: 'Debate', headline: 'Verdana Bold', subhead: 'Neutral, screen-optimized.', eyebrowFont: '"Verdana", sans-serif', headlineFont: 'Verdana, Geneva, sans-serif', subheadFont: '"Lucida Sans", sans-serif' },
  { eyebrow: 'Magazine', headline: 'Bodoni Poster', subhead: 'Elegant with contrast.', eyebrowFont: '"Avenir Next", sans-serif', headlineFont: '"Didot", "Bodoni MT", serif', subheadFont: '"Helvetica Neue", Arial, sans-serif' },
  { eyebrow: 'Finance', headline: 'Futura Bold', subhead: 'Geometric clarity.', eyebrowFont: '"Gill Sans", sans-serif', headlineFont: 'Futura, "Century Gothic", sans-serif', subheadFont: '"Segoe UI", sans-serif' },
  { eyebrow: 'Weather', headline: 'Montserrat SemiBold', subhead: 'Rounded, inviting tone.', eyebrowFont: '"Nunito Sans", sans-serif', headlineFont: 'Montserrat, "Arial Rounded MT Bold", sans-serif', subheadFont: '"Open Sans", sans-serif' },
  { eyebrow: 'Ticker Serif', headline: 'Merriweather Bold', subhead: 'Broadcast + heritage.', eyebrowFont: '"Gill Sans", sans-serif', headlineFont: 'Merriweather, Georgia, serif', subheadFont: '"Source Sans Pro", Arial, sans-serif' },
  { eyebrow: 'Tech Desk', headline: 'SF Pro Display Bold', subhead: 'Modern system default.', eyebrowFont: '"SF Pro Text", system-ui, sans-serif', headlineFont: '"SF Pro Display", system-ui, sans-serif', subheadFont: 'system-ui, -apple-system, "Segoe UI", sans-serif' },
];

const cardsB: FontCard[] = [
  { eyebrow: 'Modern Grotesk', headline: 'Inter Black', subhead: 'UI-native for crisp overlays.', eyebrowFont: '"Inter", system-ui, sans-serif', headlineFont: '"Inter", system-ui, sans-serif', subheadFont: '"Inter", system-ui, sans-serif' },
  { eyebrow: 'Slab Partner', headline: 'Roboto Slab Bold', subhead: 'Pair with sans eyebrow.', eyebrowFont: '"Roboto", sans-serif', headlineFont: '"Roboto Slab", serif', subheadFont: '"Roboto", sans-serif' },
  { eyebrow: 'Humanist', headline: 'Segoe UI Bold', subhead: 'Warm, readable captions.', eyebrowFont: '"Segoe UI", sans-serif', headlineFont: '"Segoe UI", sans-serif', subheadFont: '"Segoe UI", sans-serif' },
  { eyebrow: 'Heritage', headline: 'Times Bold', subhead: 'Short quotes / chyrons.', eyebrowFont: '"Helvetica Neue", Arial, sans-serif', headlineFont: '"Times New Roman", serif', subheadFont: '"Arial", sans-serif' },
  { eyebrow: 'Condensed', headline: 'Arial Narrow Bold', subhead: 'Great for dense tickers.', eyebrowFont: '"Roboto Condensed", sans-serif', headlineFont: '"Arial Narrow Bold", sans-serif', subheadFont: '"Roboto", sans-serif' },
  { eyebrow: 'Display', headline: 'Gill Sans Ultra Bold', subhead: 'Poster feel for promos.', eyebrowFont: '"Gill Sans", sans-serif', headlineFont: '"Gill Sans Ultra Bold", sans-serif', subheadFont: '"Lucida Sans", sans-serif' },
  { eyebrow: 'Rounded', headline: 'Varela Round', subhead: 'Soft edges, friendly tone.', eyebrowFont: '"Nunito", sans-serif', headlineFont: '"Varela Round", "Arial Rounded MT Bold", sans-serif', subheadFont: '"Nunito Sans", sans-serif' },
  { eyebrow: 'Slate', headline: 'Avenir Heavy', subhead: 'Premium, balanced weight.', eyebrowFont: '"Avenir Next", sans-serif', headlineFont: 'Avenir, "Avenir Next", sans-serif', subheadFont: '"Avenir Next", sans-serif' },
  { eyebrow: 'Hybrid', headline: 'Playfair Display Bold', subhead: 'Elegant serif + sans body.', eyebrowFont: '"Montserrat", sans-serif', headlineFont: '"Playfair Display", serif', subheadFont: '"Montserrat", sans-serif' },
  { eyebrow: 'Geo Sans', headline: 'Poppins Bold', subhead: 'Perfect circles, clear caps.', eyebrowFont: '"Poppins", sans-serif', headlineFont: '"Poppins", sans-serif', subheadFont: '"Poppins", sans-serif' },
  { eyebrow: 'Slate Serif', headline: 'Charter Bold', subhead: 'Dense yet legible.', eyebrowFont: '"Inter", sans-serif', headlineFont: 'Charter, "Bookman", serif', subheadFont: '"Inter", sans-serif' },
  { eyebrow: 'Studio Default', headline: 'SF Pro Bold', subhead: 'Apple broadcast baseline.', eyebrowFont: '"SF Pro Text", system-ui, sans-serif', headlineFont: '"SF Pro Display", system-ui, sans-serif', subheadFont: 'system-ui, -apple-system, "Segoe UI", sans-serif' },
];

const cardsC: FontCard[] = [
  { eyebrow: 'History', headline: 'Garamond Bold', subhead: 'Classic film title energy.', eyebrowFont: '"Gill Sans", sans-serif', headlineFont: 'Garamond, "Adobe Garamond", serif', subheadFont: '"Helvetica Neue", Arial, sans-serif' },
  { eyebrow: 'Cinema', headline: 'Futura Extra Bold', subhead: 'Kubrick-esque authority.', eyebrowFont: '"Avenir Next", sans-serif', headlineFont: 'Futura, "Century Gothic", sans-serif', subheadFont: '"Avenir Next", sans-serif' },
  { eyebrow: 'Current Trend', headline: 'Neue Haas Grotesk', subhead: 'Swiss clarity, everywhere.', eyebrowFont: '"Helvetica Neue", Arial, sans-serif', headlineFont: '"Helvetica Neue", Arial, sans-serif', subheadFont: '"Helvetica Neue", Arial, sans-serif' },
  { eyebrow: 'Minimal Serif', headline: 'Canela Alt', subhead: 'Soft contrast, luxe feel.', eyebrowFont: '"Montserrat", sans-serif', headlineFont: '"Baskerville", "Times New Roman", serif', subheadFont: '"Inter", sans-serif' },
  { eyebrow: 'Broadcast Quote', headline: 'Quote Card', subhead: 'Pair with new QuoteCard layout.', eyebrowFont: '"Segoe UI", sans-serif', headlineFont: '"Merriweather", serif', subheadFont: '"Segoe UI", sans-serif' },
  { eyebrow: 'Lower Third', headline: 'Franklin Gothic Demi', subhead: 'Great for name keys.', eyebrowFont: '"Franklin Gothic Medium", Arial, sans-serif', headlineFont: '"Franklin Gothic Demi", Arial, sans-serif', subheadFont: '"Inter", sans-serif' },
  { eyebrow: 'Pop Culture', headline: 'Bebas Neue', subhead: 'Tall condensed for promos.', eyebrowFont: '"Montserrat", sans-serif', headlineFont: '"Bebas Neue", "Oswald", sans-serif', subheadFont: '"Open Sans", sans-serif' },
  { eyebrow: 'Luxury', headline: 'Trajan Pro', subhead: 'Movie trailer vibes.', eyebrowFont: '"Optima", serif', headlineFont: 'Trajan, "Times New Roman", serif', subheadFont: '"Garamond", serif' },
  { eyebrow: 'News Quote', headline: 'Serif Pull', subhead: 'Short pithy pull-quotes.', eyebrowFont: '"Gill Sans", sans-serif', headlineFont: '"Georgia", serif', subheadFont: '"Inter", sans-serif' },
  { eyebrow: 'Data Viz', headline: 'DIN Condensed Bold', subhead: 'Labels in charts/tickers.', eyebrowFont: '"DIN Alternate", sans-serif', headlineFont: '"DIN Condensed", sans-serif', subheadFont: '"Inter", sans-serif' },
  { eyebrow: 'Esports', headline: 'Russo One', subhead: 'Techno slab hybrid.', eyebrowFont: '"Orbitron", sans-serif', headlineFont: '"Russo One", sans-serif', subheadFont: '"Roboto", sans-serif' },
  { eyebrow: 'Lifestyle', headline: 'Recoleta Alt', subhead: 'Friendly curves.', eyebrowFont: '"Nunito", sans-serif', headlineFont: '"Recoleta", "Cooper Black", serif', subheadFont: '"Nunito Sans", sans-serif' },
];

export default defineVideo('Font Pairings Menu', { fps: 30, width: 1920, height: 1080 }, (c) => {
  c.voiceover({
    provider: 'openai',
    voice: 'alloy',
    pronunciations: { babulus: 'BAB-you-lus' },
  });
  const brandBackground = {
    variant: 'linear',
    gradient: {
      angle: 135,
      colors: ['#101010', '#1f2a44'],
    },
  };

  // Screen A
  c.scene('font-menu-A', (s) => {
    s.layer('bg', { zIndex: 0 }, (l) => {
      l.background(brandBackground);
    });
    s.layer('grid', {}, (l) => {
      l.component('font-grid-a', 'FontGrid', { label: 'A — Broadcast Classics', cards: cardsA });
    });
    s.cue('voice-a', (cue) => {
      cue.voice((v) => {
        v.say('Screen A shows twelve broadcast-friendly pairings. Big, neutral, Swiss-inspired mixes for headlines, names, and lower thirds.');
        v.pause(2.5);
      });
    });
  });

  // Screen B
  c.scene('font-menu-B', (s) => {
    s.layer('bg', { zIndex: 0 }, (l) => {
      l.background(brandBackground);
    });
    s.layer('grid', {}, (l) => {
      l.component('font-grid-b', 'FontGrid', { label: 'B — Modern Sans & Slab', cards: cardsB });
    });
    s.cue('voice-b', (cue) => {
      cue.voice((v) => {
        v.say('Screen B blends modern grotesks with slabs and rounded faces for friendlier storytelling and UI overlays.');
        v.pause(2.5);
      });
    });
  });

  // Screen C
  c.scene('font-menu-C', (s) => {
    s.layer('bg', { zIndex: 0 }, (l) => {
      l.background(brandBackground);
    });
    s.layer('grid', {}, (l) => {
      l.component('font-grid-c', 'FontGrid', { label: 'C — History, Trends, Best Practices', cards: cardsC });
    });
    s.cue('voice-c', (cue) => {
      cue.voice((v) => {
        v.say('Screen C mixes historical film faces, current Swiss trends, and pull quote-ready serif-sans blends for video storytelling.');
        v.pause(1.5);
      });
    });
  });
});
