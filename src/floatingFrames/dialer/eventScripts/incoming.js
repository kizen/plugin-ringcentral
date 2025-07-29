this.showToast(
  this.args.phoneNumber
    ? `Incoming call from ${this.args.phoneNumber}`
    : "Incoming call",
  { autohide: false }
);

this.expand();

if (this.args.phoneNumber && this.args.callerLookupEndpoint) {
  const people = await this.post(
    `${this.args.callerLookupEndpoint}?search=${encodeURIComponent(
      this.args.phoneNumber
    )}`
  );

  if (people) {
    const names = people.results
      .map((p) => p.full_name)
      .filter(Boolean)
      .join(", ");

    this.showToast(`Incoming call from ${names || "Unknown Caller"}`, {
      autohide: false,
    });
  }
}
