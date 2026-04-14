this.showToast(
  this.args.phoneNumber
    ? `Incoming call from ${this.args.phoneNumber}`
    : "Incoming call",
  { autohide: false },
);

this.expand();

if (this.args.phoneNumber && this.args.callerLookupEndpoint) {
  const [people, peopleError] = await this.postWithErrors(
    `${this.args.callerLookupEndpoint}?search=${encodeURIComponent(
      this.args.phoneNumber,
    )}`,
  );

  if (peopleError) {
    this.showToast(peopleError?.message ?? "Error looking up caller", { variant: "failure" });
    return;
  }

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
