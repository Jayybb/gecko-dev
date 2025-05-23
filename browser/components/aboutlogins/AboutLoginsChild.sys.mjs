/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { LoginHelper } from "resource://gre/modules/LoginHelper.sys.mjs";

import { XPCOMUtils } from "resource://gre/modules/XPCOMUtils.sys.mjs";

const lazy = {};

XPCOMUtils.defineLazyServiceGetter(
  lazy,
  "ClipboardHelper",
  "@mozilla.org/widget/clipboardhelper;1",
  "nsIClipboardHelper"
);

const TELEMETRY_MIN_MS_BETWEEN_OPEN_MANAGEMENT = 5000;

let gLastOpenManagementBrowserId = null;
let gLastOpenManagementEventTime = Number.NEGATIVE_INFINITY;
let gPrimaryPasswordPromise;

function recordTelemetryEvent(event) {
  try {
    let { name, extra = {}, value = null } = event;
    if (value) {
      extra.value = value;
    }
    Glean.pwmgr[name].record(extra);
  } catch (ex) {
    console.error("AboutLoginsChild: error recording telemetry event:", ex);
  }
}

export class AboutLoginsChild extends JSWindowActorChild {
  handleEvent(event) {
    switch (event.type) {
      case "AboutLoginsInit": {
        this.#aboutLoginsInit();
        break;
      }
      case "AboutLoginsImportReportInit": {
        this.#aboutLoginsImportReportInit();
        break;
      }
      case "AboutLoginsCopyLoginDetail": {
        this.#aboutLoginsCopyLoginDetail(event.detail);
        break;
      }
      case "AboutLoginsCreateLogin": {
        this.#aboutLoginsCreateLogin(event.detail);
        break;
      }
      case "AboutLoginsDeleteLogin": {
        this.#aboutLoginsDeleteLogin(event.detail);
        break;
      }
      case "AboutLoginsExportPasswords": {
        this.#aboutLoginsExportPasswords();
        break;
      }
      case "AboutLoginsGetHelp": {
        this.#aboutLoginsGetHelp();
        break;
      }
      case "AboutLoginsImportFromBrowser": {
        this.#aboutLoginsImportFromBrowser();
        break;
      }
      case "AboutLoginsImportFromFile": {
        this.#aboutLoginsImportFromFile();
        break;
      }
      case "AboutLoginsOpenPreferences": {
        this.#aboutLoginsOpenPreferences();
        break;
      }
      case "AboutLoginsRecordTelemetryEvent": {
        this.#aboutLoginsRecordTelemetryEvent(event);
        break;
      }
      case "AboutLoginsRemoveAllLogins": {
        this.#aboutLoginsRemoveAllLogins();
        break;
      }
      case "AboutLoginsSortChanged": {
        this.#aboutLoginsSortChanged(event.detail);
        break;
      }
      case "AboutLoginsSyncEnable": {
        this.#aboutLoginsSyncEnable();
        break;
      }
      case "AboutLoginsUpdateLogin": {
        this.#aboutLoginsUpdateLogin(event.detail);
        break;
      }
    }
  }

  #aboutLoginsInit() {
    this.sendAsyncMessage("AboutLogins:Subscribe");

    let win = this.browsingContext.window;
    let waivedContent = Cu.waiveXrays(win);
    let that = this;
    let AboutLoginsUtils = {
      doLoginsMatch(loginA, loginB) {
        return LoginHelper.doLoginsMatch(loginA, loginB, {});
      },
      getLoginOrigin(uriString) {
        return LoginHelper.getLoginOrigin(uriString);
      },
      setFocus(element) {
        Services.focus.setFocus(element, Services.focus.FLAG_BYKEY);
      },
      /**
       * Shows the Primary Password prompt if enabled, or the
       * OS auth dialog otherwise.
       * @param resolve Callback that is called with result of authentication.
       * @param messageId The string ID that corresponds to a string stored in aboutLogins.ftl.
       *                  This string will be displayed only when the OS auth dialog is used.
       * @param reason The reason for requesting reauthentication, used for telemetry.
       */
      async promptForPrimaryPassword(resolve, messageId, reason) {
        gPrimaryPasswordPromise = {
          resolve,
        };

        that.sendAsyncMessage("AboutLogins:PrimaryPasswordRequest", {
          messageId,
          reason,
        });

        return gPrimaryPasswordPromise;
      },
      // Default to enabled just in case a search is attempted before we get a response.
      primaryPasswordEnabled: true,
      passwordRevealVisible: true,
    };
    waivedContent.AboutLoginsUtils = Cu.cloneInto(
      AboutLoginsUtils,
      waivedContent,
      {
        cloneFunctions: true,
      }
    );
  }

  #aboutLoginsImportReportInit() {
    this.sendAsyncMessage("AboutLogins:ImportReportInit");
  }

  #aboutLoginsCopyLoginDetail(detail) {
    lazy.ClipboardHelper.copyString(
      detail,
      this.windowContext,
      lazy.ClipboardHelper.Sensitive
    );
  }

  #aboutLoginsCreateLogin(login) {
    this.sendAsyncMessage("AboutLogins:CreateLogin", {
      login,
    });
  }

  #aboutLoginsDeleteLogin(login) {
    this.sendAsyncMessage("AboutLogins:DeleteLogin", {
      login,
    });
  }

  #aboutLoginsExportPasswords() {
    this.sendAsyncMessage("AboutLogins:ExportPasswords");
  }

  #aboutLoginsGetHelp() {
    this.sendAsyncMessage("AboutLogins:GetHelp");
  }

  #aboutLoginsImportFromBrowser() {
    this.sendAsyncMessage("AboutLogins:ImportFromBrowser");
    recordTelemetryEvent({
      name: "mgmtMenuItemUsedImportFromBrowser",
    });
  }

  #aboutLoginsImportFromFile() {
    this.sendAsyncMessage("AboutLogins:ImportFromFile");
    recordTelemetryEvent({
      name: "mgmtMenuItemUsedImportFromCsv",
    });
  }

  #aboutLoginsOpenPreferences() {
    this.sendAsyncMessage("AboutLogins:OpenPreferences");
    recordTelemetryEvent({
      name: "mgmtMenuItemUsedPreferences",
    });
  }

  #aboutLoginsRecordTelemetryEvent(event) {
    if (event.detail.name.startsWith("openManagement")) {
      let { docShell } = this.browsingContext;
      // Compare to the last time open_management was recorded for the same
      // outerWindowID to not double-count them due to a redirect to remove
      // the entryPoint query param (since replaceState isn't allowed for
      // about:). Don't use performance.now for the tab since you can't
      // compare that number between different tabs and this JSM is shared.
      let now = docShell.now();
      if (
        this.browsingContext.browserId == gLastOpenManagementBrowserId &&
        now - gLastOpenManagementEventTime <
          TELEMETRY_MIN_MS_BETWEEN_OPEN_MANAGEMENT
      ) {
        return;
      }
      gLastOpenManagementEventTime = now;
      gLastOpenManagementBrowserId = this.browsingContext.browserId;
    }
    recordTelemetryEvent(event.detail);
  }

  #aboutLoginsRemoveAllLogins() {
    this.sendAsyncMessage("AboutLogins:RemoveAllLogins");
  }

  #aboutLoginsSortChanged(detail) {
    this.sendAsyncMessage("AboutLogins:SortChanged", detail);
  }

  #aboutLoginsSyncEnable() {
    this.sendAsyncMessage("AboutLogins:SyncEnable");
  }

  #aboutLoginsUpdateLogin(login) {
    this.sendAsyncMessage("AboutLogins:UpdateLogin", {
      login,
    });
  }

  // eslint-disable-next-line consistent-return
  receiveMessage(message) {
    switch (message.name) {
      case "AboutLogins:ImportReportData":
        this.#importReportData(message.data);
        break;
      case "AboutLogins:PrimaryPasswordResponse":
        this.#primaryPasswordResponse(message.data);
        break;
      case "AboutLogins:RemaskPassword":
        this.#remaskPassword(message.data);
        break;
      case "AboutLogins:Setup":
        this.#setup(message.data);
        break;
      case "AboutLogins:WaitForFocus": {
        return new Promise(resolve => {
          if (!this.document.hasFocus()) {
            this.document.ownerGlobal.addEventListener(
              "focus",
              () => {
                resolve();
              },
              { once: true }
            );
          } else {
            resolve();
          }
        });
      }
      default:
        this.#passMessageDataToContent(message);
    }
  }

  #importReportData(data) {
    this.sendToContent("ImportReportData", data);
  }

  #primaryPasswordResponse(data) {
    if (gPrimaryPasswordPromise) {
      gPrimaryPasswordPromise.resolve(data.result);
      recordTelemetryEvent(data.telemetryEvent);
    }
  }

  #remaskPassword(data) {
    this.sendToContent("RemaskPassword", data);
  }

  #setup(data) {
    let utils = Cu.waiveXrays(this.browsingContext.window).AboutLoginsUtils;
    utils.primaryPasswordEnabled = data.primaryPasswordEnabled;
    utils.passwordRevealVisible = data.passwordRevealVisible;
    utils.importVisible = data.importVisible;
    utils.supportBaseURL = Services.urlFormatter.formatURLPref(
      "app.support.baseURL"
    );
    this.sendToContent("Setup", data);
  }

  #passMessageDataToContent(message) {
    this.sendToContent(message.name.replace("AboutLogins:", ""), message.data);
  }

  sendToContent(messageType, detail) {
    let win = this.document.defaultView;
    let message = Object.assign({ messageType }, { value: detail });
    let event = new win.CustomEvent("AboutLoginsChromeToContent", {
      detail: Cu.cloneInto(message, win),
    });
    win.dispatchEvent(event);
  }
}
