this.communicate.sendMessageToOwnFrame(
  {
    type: "rc-adapter-new-call",
    phoneNumber: this.args.phoneNumber,
    toCall: true,
  },
  "*"
);
