this.clearToasts();

this.communicate.sendMessageToOwnFrame(
  {
    type: "rc-adapter-register-third-party-service",
    service: {
      name: "KizenService",
      customizedPageInputChangedEventPath: "/customizedPage/inputChanged",
      buttonEventPath: "/button-click",
      callLoggerPath: "/log-to-kizen",
      callLoggerTitle: "Log to Kizen",
      recordingWithToken: 1,
      callLogEntityMatcherPath: "/log-to-kizen/match",
    },
  },
  "*"
);
