this.communicate.runFrameScript("dialer", "dialNumber", {
  phoneNumber: this.args.value,
});

this.communicate.runFrameScript("dialer", "markDialContext", {
  entityId: this.entityId,
});
