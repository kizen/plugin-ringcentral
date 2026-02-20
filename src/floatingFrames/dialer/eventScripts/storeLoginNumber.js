const loginNumber = this.args.loginNumber;

if (loginNumber) {
  const mainNumber = loginNumber.split("*")[0];
  this.setSessionData({ mainNumber });
}
