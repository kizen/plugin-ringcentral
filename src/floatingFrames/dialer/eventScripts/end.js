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
  "*",
);

this.communicate.sendMessageToOwnFrame(
  {
    type: "rc-adapter-navigate-to",
    path: "/dialer",
  },
  "*",
);

const summaryActivityDetails = this.args.callSummaryActivity;
const objectDetails = this.args.callSummaryObject;

if (!summaryActivityDetails && !objectDetails) {
  return;
}

let employeeId = this.currentBusiness.employee_id;

if (!employeeId) {
  const [bootstrap, bootstrapError] = await this.getWithErrors("/auth/bootstrap");

  if (bootstrapError) {
    throw bootstrapError;
  }

  employeeId = bootstrap?.team?.id;
}

if (!employeeId) {
  throw new Error("Employee ID could not be determined, so that call was not logged to Kizen. Please try again later.");
}

let people = [];

if (this.args.phoneNumber && this.args.callerLookupEndpoint) {
  const result = await this.post(
    `${this.args.callerLookupEndpoint}?search=${encodeURIComponent(this.args.phoneNumber)}`,
  );

  if (result?.results) {
    people = result.results.map((p) => p.id);
  }

  if (result?.results?.length > 1) {
    const promptResult = await this.prompt({
      title: "Confirm Contacts for Call Log",
      confirmButton: {
        label: "Log Call",
        variant: "standard",
      },
      cancelButton: {
        label: "Log Without Contact",
        variant: "text",
      },
      content: [
        {
          type: "description",
          content:
            "Multiple contacts matched the completed call. Please confirm the contact or contacts you would like to associate this call with, or log the call without a contact.",
          widthPercent: 100,
        },
        {
          type: "dropdown",
          id: "contacts",
          placeholder: "Choose Contacts",
          multiselect: true,
          options: result.results.map((person) => ({
            label: person.display_name,
            value: person.id,
          })),
          defaultValue: people,
          widthPercent: 100,
        },
      ],
    });

    if (promptResult.canceled) {
      people = [];
    } else if (promptResult.values?.contacts?.length > 0) {
      people = promptResult.values.contacts.map((v) => v.value);
    } else if (promptResult.values?.contacts?.length === 0) {
      people = [];
    }
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
        fieldMetadata.options?.find((fm) => fm.name === valueIdentifier || fm.id === valueIdentifier)?.id ?? "";
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
    const activities = await this.get(`/activities?search=${encodeURIComponent("Phone Call")}`);

    const foundActivity = activities?.results?.find((a) => a.name === "Phone Call");

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
        const fields = (summaryActivityDetails.activityFieldTemplate ?? []).map((field) => {
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
              kznField,
            ),
          };
        });

        const relatedObjects = (summaryActivityDetails.relatedObjectsTemplate ?? []).map((object) => {
          return {
            custom_object: object.custom_object.replace("{{clientObjectId}}", this.clientObject.id),
            entity_id: replaceFieldValue(object.entity_id, {
              entityId: person,
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
      }),
    );
  }
}

if (objectDetails) {
  let objectId = objectDetails.objectId;

  if (!objectId) {
    const objects = await this.get(`/custom-objects/settings-search?name=${encodeURIComponent("phone_call")}`);

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
            entityIds: people,
            entityName: new Date(this.args.date || Date.now()).toISOString(),
            duration: this.args.duration,
            phoneNumber: this.args.phoneNumber,
            direction: this.args.direction,
            sessionId: this.args.sessionId,
            fileId: this.args.fileId,
          },
          field.valueMap || {},
          kznField,
        ),
      };
    });

    await this.post(`/records/${objectId}/add`, {
      fields,
    });

    this.showToast("Successfully created call log", {
      variant: "success",
    });

    this.communicate.sendMessageToOwnFrame({
      type: "rc-adapter-trigger-call-logger-match",
      sessionIds: [this.args.sessionId],
    });
  }
}

people.forEach((person) => {
  this.refreshTimelineForId(person);
});
