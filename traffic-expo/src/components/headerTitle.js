// Builds the navigation header's title renderer: the ON-Time wordmark in the
// current theme colour. Used as a screen's `headerTitle` option, e.g.
//   headerTitle: headerTitle(colors)
import React from 'react';
import { Wordmark } from './Logo';

export function headerTitle(colors) {
  return () => <Wordmark color={colors.text} fontSize={22} />;
}
