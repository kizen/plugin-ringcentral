const eventData = this.args.eventData;

if (!eventData?.type) {
  return;
}

const { type, call } = eventData;

function acknowledge(requestId) {
  this.communicate.sendMessageToOwnFrame({
    type: "rc-post-message-response",
    responseId: requestId,
    response: { data: "ok" },
  });
}

if (type === "rc-call-ring-notify" && call) {
  this.communicate.runFrameScript("dialer", "incoming", {
    phoneNumber: this.parsePhone(call.from),
  });
} else if (type === "rc-call-end-notify") {
  /* When a call is completed, clear the toasts. All other call
     logging logic is now handled by the custom log-to-kizen logger */

  this.clearToasts();
} else if (type === "rc-dialer-status-notify") {
  const ready = eventData.ready;
  if (ready) {
    this.communicate.runFrameScript("dialer", "ready");
  } else {
    this.communicate.runFrameScript("dialer", "notReady");
  }
} else if (type === "rc-route-changed-notify") {
  this.communicate.runFrameScript("dialer", "routeChanged", {
    path: eventData.path,
  });
} else if (type === "rc-call-start-notify") {
  this.communicate.runFrameScript("dialer", "callStart", { data: eventData });
} else if (type === "rc-post-message-request") {
  if (eventData.path === "/customizedPage/inputChanged") {
    const selectedRecord = eventData.body?.formData?.opportunity;
    if (selectedRecord === "new_contact") {
      this.clearToasts();
      const { callFrom } = eventData?.body?.page?.schema?.properties?.opportunity?.oneOf.find(
        (o) => o.const === "new_contact",
      );
      this.communicate.runFrameScript("dialer", "openNewContactPrompt", {
        phoneNumber: callFrom,
      });
    } else if (selectedRecord) {
      this.communicate.runFrameScript("dialer", "navigateToRecord", {
        selectedId: selectedRecord,
      });
    }

    acknowledge.bind(this)(eventData.requestId);
  } else if (eventData.path === "/log-to-kizen") {
    this.communicate.runFrameScript("dialer", "logCall", {
      payload: eventData.body,
    });

    acknowledge.bind(this)(eventData.requestId);
  } else if (eventData.path === "/log-to-kizen/match") {
    this.communicate.runFrameScript("dialer", "matcher", {
      payload: eventData,
    });
  }
}
