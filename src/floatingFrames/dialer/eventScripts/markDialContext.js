try {
  const result = await this.get(
    `/employee/mine/configs/plugins/${this.args.pluginId}`
  );

  const newResult = {
    ...result,
    config: {
      ...result.config,
      ["ringcentral-dialer"]: {
        ...result.config["ringcentral-dialer"],
        triggeredEntity: this.args.entityId,
      },
    },
  };

  await this.post(
    `/employee/mine/configs/plugins/${this.args.pluginId}`,
    newResult
  );
} catch (e) {
  console.log(e);
}
