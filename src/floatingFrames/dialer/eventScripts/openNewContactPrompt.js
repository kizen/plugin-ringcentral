const fetchContact = `/client/custom-object`;
const createRecordUrl = (objectId = "") => `/records/${objectId}/add`;

const newContactPrompt = await this.prompt({
  title: "Create New Contact",
  confirmButton: {
    label: "Create Contact",
    variant: "standard",
    color: "primary",
  },
  cancelButton: {
    label: "Cancel",
    variant: "text",
    color: "secondary",
  },
  content: [
    {
      type: "text",
      label: "First Name",
      placeholder: "Enter First Name",
      widthPercent: 100,
      id: "firstName",
    },
    {
      type: "text",
      label: "Last Name",
      placeholder: "Enter First Last",
      widthPercent: 100,
      id: "lastName",
    },
    {
      type: "text",
      label: "Email",
      placeholder: "Enter Email",
      widthPercent: 100,
      id: "email",
    },
    {
      type: "spacer",
      height: 1,
      widthPercent: 100,
    },
    {
      type: "description",
      content: "Mobile Phone Number",
      widthPercent: 100,
    },
    {
      type: "description",
      content: this.args.phoneNumber,
      widthPercent: 100,
    },
  ],
});
if (newContactPrompt.canceled) {
  return;
}
const contactObject = await this.get(fetchContact);
const { first_name, last_name, email, mobile_phone } =
  contactObject.undeletable_fields;
const validateEmail = (userEmail) => {
  const re = /\S+@\S+\.\S+/;
  return re.test(userEmail);
};

const newContactPayload = {
  unarchive: "prompt",
  fields: [
    { id: first_name.id, value: newContactPrompt.values.firstName },
    { id: last_name.id, value: newContactPrompt.values.lastName },
    { id: email.id, value: newContactPrompt.values.email },
    {
      id: mobile_phone.id,
      value: this.parsePhone(this.args.phoneNumber),
    },
  ].filter((f) => {
    if (f.id === email.id) {
      return validateEmail(f.value);
    }
    return f.value;
  }),
};

const createRelatedRecordResponse = await this.post(
  createRecordUrl(contactObject?.id),
  newContactPayload
);

if (!createRelatedRecordResponse?.id) {
  throw new Error("Failed to Create New Contact");
} else {
  this.clearToasts();
  this.showToast("Successfully Created Contact", {
    variant: "success",
  });
}

this.openWindow(`/client/${createRelatedRecordResponse.id}/details`, "_blank");
