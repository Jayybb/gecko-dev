// |reftest| shell-option(--enable-temporal) skip-if(!this.hasOwnProperty('Temporal')||!xulRuntime.shell) -- Temporal is not enabled unconditionally, requires shell-options
// Copyright (C) 2022 Igalia, S.L. All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

/*---
esid: sec-temporal.plaindatetime.prototype.since
description: Plain objects are accepted as an argument
includes: [temporalHelpers.js]
features: [Temporal]
---*/

const dt = new Temporal.PlainDateTime(1976, 11, 18, 15, 23, 30, 123, 456, 789);

TemporalHelpers.assertDuration(
  dt.since({ year: 2019, month: 10, day: 29, hour: 10 }),
  0, 0, 0, -15684, -18, -36, -29, -876, -543, -211,
  "casts argument (plain object)"
);

reportCompare(0, 0);
