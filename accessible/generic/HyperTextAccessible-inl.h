/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_a11y_HyperTextAccessible_inl_h__
#define mozilla_a11y_HyperTextAccessible_inl_h__

#include "HyperTextAccessible.h"

#include "nsAccUtils.h"

#include "nsIClipboard.h"
#include "nsFrameSelection.h"

#include "mozilla/CaretAssociationHint.h"
#include "mozilla/EditorBase.h"

namespace mozilla::a11y {

inline already_AddRefed<nsFrameSelection> HyperTextAccessible::FrameSelection()
    const {
  nsIFrame* frame = GetFrame();
  return frame ? frame->GetFrameSelection() : nullptr;
}

inline dom::Selection* HyperTextAccessible::DOMSelection() const {
  RefPtr<nsFrameSelection> frameSelection = FrameSelection();
  return frameSelection ? &frameSelection->NormalSelection() : nullptr;
}

}  // namespace mozilla::a11y

#endif
