/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import { cardContextTypes } from "../../Card/types.mjs";
import { SponsoredContentHighlight } from "../FeatureHighlight/SponsoredContentHighlight";
// eslint-disable-next-line no-shadow
import { CSSTransition, TransitionGroup } from "react-transition-group";
import { FluentOrText } from "../../FluentOrText/FluentOrText.jsx";
import React from "react";

// Animation time is mirrored in DSContextFooter.scss
const ANIMATION_DURATION = 3000;

export const DSMessageLabel = props => {
  const { context, context_type, mayHaveSectionsCards } = props;
  const { icon, fluentID } = cardContextTypes[context_type] || {};

  if (!context && context_type && !mayHaveSectionsCards) {
    return (
      <TransitionGroup component={null}>
        <CSSTransition
          key={fluentID}
          timeout={ANIMATION_DURATION}
          classNames="story-animate"
        >
          <StatusMessage icon={icon} fluentID={fluentID} />
        </CSSTransition>
      </TransitionGroup>
    );
  }

  return null;
};

export const StatusMessage = ({ icon, fluentID }) => (
  <div className="status-message">
    <span
      aria-haspopup="true"
      className={`story-badge-icon icon icon-${icon}`}
    />
    <div className="story-context-label" data-l10n-id={fluentID} />
  </div>
);

export const SponsorLabel = ({
  sponsored_by_override,
  sponsor,
  context,
  newSponsoredLabel,
}) => {
  const classList = `story-sponsored-label ${newSponsoredLabel || ""} clamp`;
  // If override is not false or an empty string.
  if (sponsored_by_override) {
    return <p className={classList}>{sponsored_by_override}</p>;
  } else if (sponsored_by_override === "") {
    // We specifically want to display nothing if the server returns an empty string.
    // So the server can turn off the label.
    // This is to support the use cases where the sponsored context is displayed elsewhere.
    return null;
  } else if (sponsor) {
    return (
      <p className={classList}>
        <FluentOrText
          message={{
            id: `newtab-label-sponsored-by`,
            values: { sponsor },
          }}
        />
      </p>
    );
  } else if (context) {
    return <p className={classList}>{context}</p>;
  }
  return null;
};

export class DSContextFooter extends React.PureComponent {
  render() {
    const {
      context,
      context_type,
      sponsor,
      sponsored_by_override,
      cta_button_variant,
      source,
      spocMessageVariant,
      dispatch,
      mayHaveSectionsCards,
    } = this.props;

    const sponsorLabel = SponsorLabel({
      sponsored_by_override,
      sponsor,
      context,
    });
    const dsMessageLabel = DSMessageLabel({
      context,
      context_type,
      mayHaveSectionsCards,
    });

    if (cta_button_variant === "variant-a") {
      return (
        <div className="story-footer">
          {/* this button is decorative only */}
          <button aria-hidden="true" className="story-cta-button">
            Shop Now
          </button>
          {sponsorLabel}
        </div>
      );
    }

    if (cta_button_variant === "variant-b") {
      return (
        <div className="story-footer">
          {sponsorLabel}
          <span className="source clamp cta-footer-source">{source}</span>
        </div>
      );
    }

    if (sponsorLabel || (dsMessageLabel && context_type !== "pocket")) {
      return (
        <div className="story-footer">
          {sponsorLabel}
          {sponsorLabel && spocMessageVariant === "variant-b" && (
            <SponsoredContentHighlight
              dispatch={dispatch}
              position="inset-block-end inset-inline-start"
            />
          )}
          {dsMessageLabel}
        </div>
      );
    }

    return null;
  }
}

export const DSMessageFooter = props => {
  const { context, context_type, saveToPocketCard } = props;

  const dsMessageLabel = DSMessageLabel({
    context,
    context_type,
  });

  // This case is specific and already displayed to the user elsewhere.
  if (!dsMessageLabel || (saveToPocketCard && context_type === "pocket")) {
    return null;
  }

  return <div className="story-footer">{dsMessageLabel}</div>;
};
