const eventData = this.args.eventData;

if (!eventData?.type) {
  return;
}

const { type, call } = eventData;

if (type === "rc-call-ring-notify" && call) {
  this.communicate.runFrameScript("dialer", "incoming", {
    phoneNumber: this.parsePhone(call.from),
  });
} else if (type === "rc-call-end-notify" && call) {
  const phoneNumber = call.direction === "Inbound" ? call.from : call.to;
  const duration = call.endTime - call.startTime;
  this.communicate.runFrameScript("dialer", "end", {
    phoneNumber,
    duration: Math.floor(duration / 1000),
    direction: call.direction,
    id: call.id,
  });
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
    this.communicate.sendMessageToOwnFrame({
      type: "rc-post-message-response",
      responseId: eventData.requestId,
      response: { data: "ok" },
    });
    const selectedRecord = eventData.body?.formData?.opportunity;
    if (selectedRecord === "new_contact") {
      this.clearToasts();
      const { callFrom } =
        eventData?.body?.page?.schema?.properties?.opportunity?.oneOf.find(
          (o) => o.const === "new_contact"
        );
      this.communicate.runFrameScript("dialer", "openNewContactPrompt", {
        phoneNumber: callFrom,
      });
    } else if (selectedRecord) {
      this.communicate.runFrameScript("dialer", "navigateToRecord", {
        selectedId: selectedRecord,
      });
    }
  }
}
