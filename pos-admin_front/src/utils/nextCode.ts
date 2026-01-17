export function nextCodeForGroup(
  groupCode: string,
  products: { groupId: number; code: string }[],
  groupId: number,
  offset = 1
) {
  const count = products.filter((p) => p.groupId === groupId).length;
  console.log(count);
  const nextNum = (count + offset).toString().padStart(2, "0");
  return `${groupCode}${nextNum}`;
}
