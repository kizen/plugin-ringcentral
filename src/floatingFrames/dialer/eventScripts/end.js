this.communicate.sendMessageToOwnFrame(
  {
    type: "rc-adapter-register-customized-page",
    page: {
      id: "contactOptions",
      title: "Kizen",
      type: "tab",
      iconUri: "https://go.kizen.com/images/kizen-icon.png",
      activeIconUri: "https://go.kizen.com/images/kizen-icon.png",
      unreadCount: 0,
      priority: 31,
      hidden: true,
    },
  },
  "*"
);

this.communicate.sendMessageToOwnFrame(
  {
    type: "rc-adapter-navigate-to",
    path: "/dialer",
  },
  "*"
);

const summaryActivityDetails = this.args.callSummaryActivity;
const objectDetails = this.args.callSummaryObject;

if (!summaryActivityDetails && !objectDetails) {
  return;
}

let employeeId = this.currentBusiness.employee_id;

if (!employeeId || true) {
  const bootstrap = await this.get("/auth/bootstrap");
  console.log(JSON.stringify(bootstrap, null, 2));
  return;
}

let people = [];

if (this.args.phoneNumber && this.args.callerLookupEndpoint) {
  const result = await this.post(
    `${this.args.callerLookupEndpoint}?search=${encodeURIComponent(
      this.args.phoneNumber
    )}`
  );

  // TODO: Disambiguate people here

  if (result?.results) {
    people = result.results;
  }
}

const replaceFieldValue = (value, args, valueMap = {}, fieldMetadata = {}) => {
  switch (value) {
    case "{{duration}}":
      return args.duration;
    case "{{phoneNumber}}":
      return args.phoneNumber;
    case "{{currentUser}}":
      return employeeId;
    case "{{entityId}}":
      return args.entityId;
    case "{{entityIds}}":
      return args.entityIds;
    case "{{entityName}}":
      return args.entityName;
    case "{{direction}}": {
      const valueIdentifier = valueMap[args.direction] || args.direction;
      const value =
        fieldMetadata.options?.find(
          (fm) => fm.name === valueIdentifier || fm.id === valueIdentifier
        )?.id ?? "";
      return value;
    }
    case "{{sessionId}}":
      return args.sessionId;
    case "{{recordingUrl}}":
      return "";
    case "{{callRecording}}":
      return [args.fileId].filter(Boolean);
  }
  return value;
};

/* Disable the summary activity logging for now */
if (summaryActivityDetails && false) {
  let activityId = summaryActivityDetails.activityId;

  if (!activityId) {
    const activities = await this.get(
      `/activities?search=${encodeURIComponent("Phone Call")}`
    );

    const foundActivity = activities?.results?.find(
      (a) => a.name === "Phone Call"
    );

    if (foundActivity) {
      activityId = foundActivity.id;
    }
  }

  if (activityId) {
    const activityFields = await this.get(`/activities/${activityId}/fields`);

    const namesToIds = activityFields?.reduce((acc, field) => {
      return {
        ...acc,
        [field.name]: field.id,
      };
    }, {});

    await Promise.all(
      people.map(async (person) => {
        const fields = (summaryActivityDetails.activityFieldTemplate ?? []).map(
          (field) => {
            const id = namesToIds[field.name] || field.id;
            const kznField = activityFields?.find((f) => f.id === id);

            return {
              id,
              value: replaceFieldValue(
                field.value,
                {
                  duration: this.args.duration,
                  phoneNumber: this.args.phoneNumber,
                  direction: this.args.direction,
                  sessionId: this.args.sessionId,
                },
                field.valueMap || {},
                kznField
              ),
            };
          }
        );

        const relatedObjects = (
          summaryActivityDetails.relatedObjectsTemplate ?? []
        ).map((object) => {
          return {
            custom_object: object.custom_object.replace(
              "{{clientObjectId}}",
              this.clientObject.id
            ),
            entity_id: replaceFieldValue(object.entity_id, {
              entityId: person.id,
            }),
          };
        });

        const payload = {
          notes: "",
          fields,
          related_objects: relatedObjects,
          mentions: [],
        };

        await this.post(`/activities/${activityId}/log-activity`, payload);
      })
    );
  }
}

if (objectDetails) {
  let objectId = objectDetails.objectId;

  if (!objectId) {
    const objects = await this.get(
      `/custom-objects/settings-search?name=${encodeURIComponent("phone_call")}`
    );

    const foundObject = objects?.find((o) => o.name === "phone_call");

    if (foundObject) {
      objectId = foundObject.id;
    }
  }

  if (objectId) {
    const object = await this.get(`/custom-objects/${objectId}/detail`);
    const objectFields = object?.fields ?? [];

    const namesToIds = objectFields.reduce((acc, field) => {
      return {
        ...acc,
        [field.name]: field.id,
      };
    }, {});

    const fields = (objectDetails.objectFieldTemplate ?? []).map((field) => {
      const id = namesToIds[field.name] || field.id;
      const kznField = objectFields?.find((f) => f.id === id);

      return {
        id,
        value: replaceFieldValue(
          field.value,
          {
            entityIds: people.map((p) => p.id),
            entityName: new Date(this.args.date || Date.now()).toISOString(),
            duration: this.args.duration,
            phoneNumber: this.args.phoneNumber,
            direction: this.args.direction,
            sessionId: this.args.sessionId,
            fileId: this.args.fileId,
          },
          field.valueMap || {},
          kznField
        ),
      };
    });

    await this.post(`/records/${objectId}/add`, {
      fields,
    });

    this.communicate.sendMessageToOwnFrame({
      type: "rc-adapter-trigger-call-logger-match",
      sessionIds: [this.args.sessionId],
    });
  }
}

people.forEach((person) => {
  this.refreshTimelineForId(person.id);
});
