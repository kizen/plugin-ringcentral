const baseUrl =
  "https://apps.ringcentral.com/integration/ringcentral-embeddable/2.x/app.html";

this.outputIframe(
  `${baseUrl}?disableInactiveTabCallEvent=1&disableMeeting=1&defaultAutoLogCallEnabled=1${
    this.args.appServer ? `&appServer=${this.args.appServer}` : ""
  }${this.args.clientId ? `&clientId=${this.args.clientId}` : ""}`,
  [
    "microphone",
    "speaker-selection",
    "autoplay",
    "camera",
    "display-capture",
    "hid",
  ]
);
