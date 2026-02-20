const eventData = this.args.payload.body;
const objectDetails = this.args.callSummaryObject;

if (!eventData) {
  this.showToast("No event data was passed to the matcher", {
    variant: "failure",
  });

  return;
}

/* Array<string> of session IDs that we need to check if they've been logged */
const sessionIds = eventData.sessionIds || [];
const resultData = {};

let objectId = objectDetails?.objectId;

const completeSession = (data) => {
  this.communicate.sendMessageToOwnFrame({
    type: "rc-post-message-response",
    responseId: this.args.payload.requestId,
    response: { data },
  });
};

if (!sessionIds.length) {
  return completeSession(resultData);
}

if (!objectId) {
  const [objects, objectsError] = await this.getWithErrors(
    `/custom-objects/settings-search?name=${encodeURIComponent("phone_call")}`
  );

  if (objectsError) {
    this.showToast("Error fetching objects", { variant: "error" });
    return completeSession(resultData);
  }

  const foundObject = objects?.find((o) => o.name === "phone_call");

  if (foundObject) {
    objectId = foundObject.id;
  }
}

if (objectId) {
  const [object, objectError] = await this.getWithErrors(`/custom-objects/${objectId}/detail`);

  if (objectError) {
    this.showToast("Error fetching object details", { variant: "error" });
    return completeSession(resultData);
  }

  const objectFields = object?.fields ?? [];

  const namesToIds = objectFields.reduce((acc, field) => {
    return {
      ...acc,
      [field.name]: field.id,
    };
  }, {});

  const fieldTemplate = objectDetails.objectFieldTemplate ?? [];
  const sessionIdFieldAPIName = fieldTemplate.find(
    (f) => f.value === "{{sessionId}}"
  );

  if (sessionIdFieldAPIName) {
    const [matchingRecords, matchingRecordsError] = await this.postWithErrors(`/records/${objectId}/search`, {
      and: false,
      query: [
        {
          id: "query-0",
          and: false,
          filters: sessionIds.map((sessionId) => {
            return {
              type: "fields_v2",
              field: `"custom"::${namesToIds[sessionIdFieldAPIName?.name]}`,
              value: sessionId,
              subtype: "custom",
              condition: "=",
              view_model: [],
            };
          }),
        },
      ],
    });

    if (matchingRecordsError) {
      this.showToast("Error searching records", { variant: "error" });
      return completeSession(resultData);
    }

    matchingRecords.results.forEach((match) => {
      const sessionId =
        match.fields[namesToIds[sessionIdFieldAPIName?.name]]?.value;
      if (sessionId) {
        resultData[sessionId] = [
          {
            id: match.id,
          },
        ];
      }
    });
  } else {
    this.showToast("No session ID field found", {
      variant: "failure",
    });
  }
}

return completeSession(resultData);
