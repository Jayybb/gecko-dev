// Copyright 2024 Mathias Bynens. All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

/*---
author: Mathias Bynens
description: >
  Unicode property escapes for `Script=Old_South_Arabian`
info: |
  Generated by https://github.com/mathiasbynens/unicode-property-escapes-tests
  Unicode v16.0.0
esid: sec-static-semantics-unicodematchproperty-p
features: [regexp-unicode-property-escapes]
includes: [regExpUtils.js]
---*/

const matchSymbols = buildString({
  loneCodePoints: [],
  ranges: [
    [0x010A60, 0x010A7F]
  ]
});
testPropertyEscapes(
  /^\p{Script=Old_South_Arabian}+$/u,
  matchSymbols,
  "\\p{Script=Old_South_Arabian}"
);
testPropertyEscapes(
  /^\p{Script=Sarb}+$/u,
  matchSymbols,
  "\\p{Script=Sarb}"
);
testPropertyEscapes(
  /^\p{sc=Old_South_Arabian}+$/u,
  matchSymbols,
  "\\p{sc=Old_South_Arabian}"
);
testPropertyEscapes(
  /^\p{sc=Sarb}+$/u,
  matchSymbols,
  "\\p{sc=Sarb}"
);

const nonMatchSymbols = buildString({
  loneCodePoints: [],
  ranges: [
    [0x00DC00, 0x00DFFF],
    [0x000000, 0x00DBFF],
    [0x00E000, 0x010A5F],
    [0x010A80, 0x10FFFF]
  ]
});
testPropertyEscapes(
  /^\P{Script=Old_South_Arabian}+$/u,
  nonMatchSymbols,
  "\\P{Script=Old_South_Arabian}"
);
testPropertyEscapes(
  /^\P{Script=Sarb}+$/u,
  nonMatchSymbols,
  "\\P{Script=Sarb}"
);
testPropertyEscapes(
  /^\P{sc=Old_South_Arabian}+$/u,
  nonMatchSymbols,
  "\\P{sc=Old_South_Arabian}"
);
testPropertyEscapes(
  /^\P{sc=Sarb}+$/u,
  nonMatchSymbols,
  "\\P{sc=Sarb}"
);

reportCompare(0, 0);
