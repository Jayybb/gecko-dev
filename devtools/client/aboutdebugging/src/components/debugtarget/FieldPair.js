/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
/* file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const {
  PureComponent,
} = require("resource://devtools/client/shared/vendor/react.mjs");
const dom = require("resource://devtools/client/shared/vendor/react-dom-factories.js");
const PropTypes = require("resource://devtools/client/shared/vendor/react-prop-types.mjs");

/* Renders a pair of `<dt>` (label) + `<dd>` (value) field. */
class FieldPair extends PureComponent {
  static get propTypes() {
    return {
      className: PropTypes.string,
      label: PropTypes.node.isRequired,
      value: PropTypes.node,
    };
  }

  render() {
    const { label, value } = this.props;
    return dom.div(
      {
        className: "fieldpair",
      },
      dom.dt(
        {
          className:
            "fieldpair__title " +
            (this.props.className ? this.props.className : ""),
        },
        label
      ),
      value
        ? dom.dd(
            {
              className: "fieldpair__description ellipsis-text",
            },
            value
          )
        : null
    );
  }
}

module.exports = FieldPair;
