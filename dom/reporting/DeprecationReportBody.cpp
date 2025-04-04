/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/DeprecationReportBody.h"
#include "mozilla/dom/ReportingBinding.h"
#include "mozilla/JSONWriter.h"
#include "js/Date.h"

namespace mozilla::dom {

DeprecationReportBody::DeprecationReportBody(
    nsIGlobalObject* aGlobal, const nsAString& aId,
    const Nullable<uint64_t>& aDate, const nsAString& aMessage,
    const nsACString& aSourceFile, const Nullable<uint32_t>& aLineNumber,
    const Nullable<uint32_t>& aColumnNumber)
    : ReportBody(aGlobal),
      mId(aId),
      mDate(aDate),
      mMessage(aMessage),
      mSourceFile(aSourceFile),
      mLineNumber(aLineNumber),
      mColumnNumber(aColumnNumber) {
  MOZ_ASSERT(aGlobal);
}

DeprecationReportBody::~DeprecationReportBody() = default;

JSObject* DeprecationReportBody::WrapObject(JSContext* aCx,
                                            JS::Handle<JSObject*> aGivenProto) {
  return DeprecationReportBody_Binding::Wrap(aCx, this, aGivenProto);
}

void DeprecationReportBody::GetId(nsAString& aId) const { aId = mId; }

void DeprecationReportBody::GetAnticipatedRemoval(
    JSContext* aCx, JS::MutableHandle<JSObject*> aResult) const {
  if (!mDate.IsNull()) {
    JSObject* date = JS::NewDateObject(aCx, JS::TimeClip(mDate.Value()));
    aResult.set(date);
  }
}

void DeprecationReportBody::GetMessage(nsAString& aMessage) const {
  aMessage = mMessage;
}

void DeprecationReportBody::GetSourceFile(nsACString& aSourceFile) const {
  aSourceFile = mSourceFile;
}

Nullable<uint32_t> DeprecationReportBody::GetLineNumber() const {
  return mLineNumber;
}

Nullable<uint32_t> DeprecationReportBody::GetColumnNumber() const {
  return mColumnNumber;
}

void DeprecationReportBody::ToJSON(JSONWriter& aWriter) const {
  aWriter.StringProperty("id", NS_ConvertUTF16toUTF8(mId));
  // TODO: anticipatedRemoval? https://github.com/w3c/reporting/issues/132
  aWriter.StringProperty("message", NS_ConvertUTF16toUTF8(mMessage));

  if (mSourceFile.IsEmpty()) {
    aWriter.NullProperty("sourceFile");
  } else {
    aWriter.StringProperty("sourceFile", mSourceFile);
  }

  if (mLineNumber.IsNull()) {
    aWriter.NullProperty("lineNumber");
  } else {
    aWriter.IntProperty("lineNumber", mLineNumber.Value());
  }

  if (mColumnNumber.IsNull()) {
    aWriter.NullProperty("columnNumber");
  } else {
    aWriter.IntProperty("columnNumber", mColumnNumber.Value());
  }
}

}  // namespace mozilla::dom
