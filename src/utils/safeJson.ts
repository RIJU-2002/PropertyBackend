export const safeJson = (data: any) => {
  return JSON.parse(
    JSON.stringify(
      data,
      (_, value) =>
        typeof value === "bigint"
          ? Number(value)
          : value
    )
  );
};