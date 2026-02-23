this.preserve = true;
this.console.log("Dialer Frame initializing 'logCall' scripts");
this.console.log("args passed to logCall script:", this.args);

const eventData = this.args.payload;
this.console.log("Dialer Frame logCall event data:", JSON.stringify(eventData));

if (!eventData) {
  this.showToast("No event data was passed to the call logger", {
    variant: "failure",
  });

  return;
}

const callSessionId = eventData.call?.sessionId;
this.console.log("Dialer Frame determined call session ID:", callSessionId);

if (!callSessionId) {
  this.showToast("No session id was present in the event data", {
    variant: "failure",
  });

  return;
}

const objectDetails = this.args.callSummaryObject;
this.console.log("Dialer Frame determined call summary object details:", objectDetails);

const formatPhoneNumberWithExtension = (call) => {
  const { direction, to, from } = call;
  this.console.log("Formatting phone number for call with direction:", direction, "to:", to, "from:", from);
  const isInbound = direction === "Inbound";
  this.console.log("Is inbound call:", isInbound);

  const externalNumber = (isInbound ? from.phoneNumber : to.phoneNumber).replace("*", "x");
  const internalNumber = isInbound ? to.phoneNumber : from.phoneNumber;
  this.console.log("Determined external number:", externalNumber, "and internal number:", internalNumber);

  return externalNumber.length > 6 ? externalNumber : `${internalNumber}x${externalNumber}`;
};

const uploadRecording = async (recordingUri) => {
  const file = await fetch(recordingUri);
  const blob = await file.blob();
  const uploadRes = await this.uploadFile(blob, "recording.mp3");

  return uploadRes;
};

const updateExistingEntry = async (
  currentCall,
  recordingFileFieldId,
  existingLogId,
  objectId,
  hasRecordingAlready,
  manualAction,
) => {
  const recording = currentCall.recording;

  if (recording && !hasRecordingAlready) {
    const uploadRes = await uploadRecording(recording.contentUri);

    if (uploadRes?.id) {
      await this.patch(`/records/${objectId}/${existingLogId}`, {
        fields: [
          {
            id: recordingFileFieldId,
            value: [uploadRes.id],
          },
        ],
      });

      this.refreshEntityForId(existingLogId);
      this.showToast("A call recording was processed and added to the call log", { variant: "success" });
    }
  } else if (manualAction) {
    this.showToast("Call log is already up to date", { variant: "alert" });
  }
};

const createNewEntry = async (currentCall) => {
  this.console.log("Creating new call log entry for call:", currentCall);

  const direction = currentCall.direction;
  const phoneNumber = formatPhoneNumberWithExtension(currentCall);
  const duration = currentCall.duration;
  const sessionId = currentCall.sessionId;
  const startTs = currentCall.startTime;
  this.console.log(
    "Call details - phoneNumber:",
    phoneNumber,
    "duration:",
    duration,
    "direction:",
    direction,
    "sessionId:",
    sessionId,
    "startTs:",
    startTs,
  );

  const recording = currentCall.recording;
  let fileId = "";

  if (recording) {
    const uploadRes = await uploadRecording(recording.contentUri);
    fileId = uploadRes?.id;
  }
  this.console.log("Uploaded recording file ID:", fileId);

  this.communicate.runFrameScript("dialer", "end", {
    phoneNumber,
    duration,
    direction,
    sessionId,
    fileId,
    date: startTs,
  });
};

const navigateToCallLog = async (currentCall) => {
  this.console.log("Navigating to call log for call:", currentCall);
  let entityId = currentCall.activityMatches?.[0]?.id;

  if (!objectDetails) {
    return;
  }

  let objectId = objectDetails.objectId;

  if (!objectId) {
    const objects = await this.get(`/custom-objects/settings-search?name=${encodeURIComponent("phone_call")}`);

    const foundObject = objects?.find((o) => o.name === "phone_call");

    if (foundObject) {
      objectId = foundObject.id;
    }
  }

  if (objectId && entityId) {
    this.openWindow(`/custom-objects/${objectId}/${entityId}/details`, "_self");
  }
};

const createOrUpdateCallLog = async (currentCall, manualAction = false) => {
  this.console.log("Creating or updating call log for call:", currentCall);
  const sessionId = currentCall.sessionId;

  if (!objectDetails) {
    return;
  }

  let objectId = objectDetails.objectId;
  this.console.log("Determined object ID:", objectId);
  if (!objectId) {
    const objects = await this.get(`/custom-objects/settings-search?name=${encodeURIComponent("phone_call")}`);

    const foundObject = objects?.find((o) => o.name === "phone_call");

    if (foundObject) {
      objectId = foundObject.id;
    }
    this.console.log("Fetched object ID from settings search:", objectId);
  }

  if (objectId) {
    this.console.log("Fetching object details for object ID:", objectId);
    const object = await this.get(`/custom-objects/${objectId}/detail`);
    const objectFields = object?.fields ?? [];

    this.console.log("Fetched object fields:", objectFields);

    const namesToIds = objectFields.reduce((acc, field) => {
      return {
        ...acc,
        [field.name]: field.id,
      };
    }, {});

    const fieldTemplate = objectDetails.objectFieldTemplate ?? [];
    const sessionIdFieldAPIName = fieldTemplate.find((f) => f.value === "{{sessionId}}");
    const recordingFileFieldApiName = fieldTemplate.find((f) => f.value === "{{callRecording}}");

    this.console.log("Determined session ID field API name:", sessionIdFieldAPIName);
    this.console.log("Determined recording file field API name:", recordingFileFieldApiName);
    this.console.log("fieldTemplate:", fieldTemplate);

    const matchingRecords = await this.post(`/records/${objectId}/search`, {
      and: false,
      query: [
        {
          id: "query-0",
          and: false,
          filters: [
            {
              type: "fields_v2",
              field: `"custom"::${namesToIds[sessionIdFieldAPIName?.name]}`,
              value: sessionId,
              subtype: "custom",
              condition: "=",
              view_model: [],
            },
          ],
        },
      ],
    });

    this.console.log("Fetched matching call log records:", matchingRecords);

    const firstMatch = matchingRecords?.results?.[0];
    this.console.log("Found matching call log record:", firstMatch);

    if (!firstMatch) {
      return createNewEntry(currentCall);
    }

    const hasRecordingAlready = firstMatch?.fields?.[namesToIds[recordingFileFieldApiName?.name]]?.value?.length > 0;

    if (recordingFileFieldApiName?.name) {
      return updateExistingEntry(
        currentCall,
        namesToIds[recordingFileFieldApiName.name],
        firstMatch.id,
        objectId,
        hasRecordingAlready,
        manualAction,
      );
    }
  }
};

/* Happens periodically with updates during a call */
if (eventData.triggerType === "presenceUpdate") {
  /* Happens when the call is disconnected */
  if (eventData.call.result === "Disconnected") {
    const direction = eventData.call.direction;
    const phoneNumber = formatPhoneNumberWithExtension(eventData.call);
    const duration = eventData.call.duration;
    const sessionId = eventData.call.sessionId;
    const startTs = eventData.call.startTime;

    this.communicate.runFrameScript("dialer", "end", {
      phoneNumber,
      duration,
      direction,
      sessionId,
      date: startTs,
    });
  }
} else if (eventData.triggerType === "callLogSync") {
  /* Happens later, after the call has finished and been processed. Can happen multiple times
  for the same call, if they manually trigger a call log sync */
  await createOrUpdateCallLog(eventData.call);
} else if (eventData.triggerType === "createLog") {
  /* When manually clicking the button to log a call */
  await createOrUpdateCallLog(eventData.call);
} else if (eventData.triggerType === "editLog") {
  /* When manually clicking the button to edit a call log */
  await createOrUpdateCallLog(eventData.call, true);
} else if (eventData.triggerType === "viewLog") {
  /* When manually clicking the button to view a call log */
  await navigateToCallLog(eventData.call);
}
