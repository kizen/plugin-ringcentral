const baseUrl =
  "https://apps.ringcentral.com/integration/ringcentral-embeddable/2.x/app.html";

this.outputIframe(
  `${baseUrl}?disableInactiveTabCallEvent=1&disableMeeting=1&defaultAutoLogCallEnabled=1${
    this.args.appServer ? `&appServer=${this.args.appServer}` : ""
  }&clientId=fvoeB742xA4dMdCNypsZdS`,
  [
    "microphone",
    "speaker-selection",
    "autoplay",
    "camera",
    "display-capture",
    "hid",
  ]
);
